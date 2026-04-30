use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

#[derive(Debug, thiserror::Error)]
pub enum GitHubError {
    #[error("Invalid GitHub URL: {0}")]
    InvalidUrl(String),
    #[error("GitHub API error: {0}")]
    ApiError(String),
    #[error("HTTP request failed: {0}")]
    HttpError(String),
}

pub fn parse_github_url(url: &str) -> Result<(String, String), GitHubError> {
    let trimmed = url.trim().trim_end_matches('/');

    let url_pattern = regex::Regex::new(r"^(?:https?://)?github\.com/([^/]+)/([^/]+?)(?:\.git)?$")
        .map_err(|e| GitHubError::InvalidUrl(e.to_string()))?;

    if let Some(caps) = url_pattern.captures(trimmed) {
        return Ok((caps[1].to_string(), caps[2].to_string()));
    }

    let short_pattern = regex::Regex::new(r"^([^/\s]+)/([^/\s]+)$")
        .map_err(|e| GitHubError::InvalidUrl(e.to_string()))?;

    if let Some(caps) = short_pattern.captures(trimmed) {
        return Ok((caps[1].to_string(), caps[2].to_string()));
    }

    Err(GitHubError::InvalidUrl(format!(
        "Expected: https://github.com/owner/repo or owner/repo. Got: \"{}\"",
        url
    )))
}

pub async fn fetch_file_content(
    owner: &str,
    repo: &str,
    path: &str,
    github_token: Option<&str>,
) -> Result<String, GitHubError> {
    let url = format!(
        "https://raw.githubusercontent.com/{}/{}/HEAD/{}",
        owner, repo, path
    );

    let client = reqwest::Client::new();
    let mut builder = client.get(&url).header("User-Agent", "Codecity-Desktop");

    if let Some(token) = github_token {
        builder = builder.header("Authorization", format!("Bearer {}", token));
    }

    let response = builder
        .send()
        .await
        .map_err(|e| GitHubError::HttpError(e.to_string()))?;

    if !response.status().is_success() {
        return Err(GitHubError::HttpError(format!(
            "Failed to fetch {}: {}",
            path,
            response.status()
        )));
    }

    response
        .text()
        .await
        .map_err(|e| GitHubError::HttpError(e.to_string()))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitSummary {
    pub sha: String,
    pub message: String,
    pub author: String,
    pub date: String,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRepoSummary {
    pub id: i64,
    pub full_name: String,
    pub html_url: String,
    pub private: bool,
    pub owner_login: String,
    pub owner_type: String,
    pub updated_at: String,
    pub default_branch: String,
}

#[derive(Debug, Deserialize)]
struct RepoOwner {
    login: String,
    #[serde(rename = "type")]
    owner_type: String,
}

#[derive(Debug, Deserialize)]
struct RepoListItem {
    id: i64,
    full_name: String,
    html_url: String,
    private: bool,
    owner: RepoOwner,
    updated_at: String,
    default_branch: String,
}

#[derive(Debug, Deserialize)]
struct CommitListItem {
    sha: String,
    commit: CommitInfo,
}

#[derive(Debug, Deserialize)]
struct CommitInfo {
    message: String,
    author: CommitAuthor,
}

#[derive(Debug, Deserialize)]
struct CommitAuthor {
    name: String,
    date: String,
}

#[derive(Debug, Deserialize)]
struct CommitDetail {
    files: Option<Vec<CommitFile>>,
}

#[derive(Debug, Deserialize)]
struct CommitFile {
    filename: String,
}

fn github_request(
    client: &reqwest::Client,
    url: String,
    github_token: Option<&str>,
) -> reqwest::RequestBuilder {
    let builder = client
        .get(url)
        .header("Accept", "application/vnd.github.v3+json")
        .header("User-Agent", "Codecity-Desktop");

    if let Some(token) = github_token {
        builder.header("Authorization", format!("Bearer {}", token))
    } else {
        builder
    }
}

pub async fn fetch_commits(
    owner: &str,
    repo: &str,
    page: usize,
    github_token: Option<&str>,
) -> Result<Vec<CommitSummary>, GitHubError> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/commits?per_page=30&page={}",
        owner, repo, page
    );

    let client = reqwest::Client::new();
    let response = github_request(&client, url, github_token)
        .send()
        .await
        .map_err(|e| GitHubError::HttpError(e.to_string()))?;

    if !response.status().is_success() {
        return Err(GitHubError::ApiError(response.status().to_string()));
    }

    let commits: Vec<CommitListItem> = response
        .json()
        .await
        .map_err(|e| GitHubError::ApiError(e.to_string()))?;

    Ok(commits
        .into_iter()
        .map(|commit| CommitSummary {
            sha: commit.sha,
            message: commit
                .commit
                .message
                .lines()
                .next()
                .unwrap_or("")
                .to_string(),
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            files: Vec::new(),
        })
        .collect())
}

pub async fn fetch_repositories(
    visibility: &str,
    page: usize,
    github_token: &str,
) -> Result<Vec<GitHubRepoSummary>, GitHubError> {
    let visibility = match visibility {
        "private" => "private",
        "public" => "public",
        _ => "all",
    };
    let url = format!(
        "https://api.github.com/user/repos?visibility={}&affiliation=owner,collaborator,organization_member&sort=updated&direction=desc&per_page=100&page={}",
        visibility, page
    );

    let client = reqwest::Client::new();
    let response = github_request(&client, url, Some(github_token))
        .send()
        .await
        .map_err(|e| GitHubError::HttpError(e.to_string()))?;

    if !response.status().is_success() {
        return Err(GitHubError::ApiError(response.status().to_string()));
    }

    let repos: Vec<RepoListItem> = response
        .json()
        .await
        .map_err(|e| GitHubError::ApiError(e.to_string()))?;

    Ok(repos
        .into_iter()
        .map(|repo| GitHubRepoSummary {
            id: repo.id,
            full_name: repo.full_name,
            html_url: repo.html_url,
            private: repo.private,
            owner_login: repo.owner.login,
            owner_type: repo.owner.owner_type,
            updated_at: repo.updated_at,
            default_branch: repo.default_branch,
        })
        .collect())
}

pub async fn fetch_trending_repositories() -> Result<Vec<GitHubRepoSummary>, GitHubError> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://github.com/trending")
        .header("Accept", "text/html")
        .header("User-Agent", "Codecity-Desktop")
        .send()
        .await
        .map_err(|error| GitHubError::HttpError(error.to_string()))?;

    if !response.status().is_success() {
        return Ok(Vec::new());
    }

    let html = response
        .text()
        .await
        .map_err(|error| GitHubError::HttpError(error.to_string()))?;
    let article_pattern = regex::Regex::new(r#"(?s)<article\b.*?</article>"#)
        .map_err(|error| GitHubError::ApiError(error.to_string()))?;
    let repo_pattern = regex::Regex::new(r#"href="/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)""#)
        .map_err(|error| GitHubError::ApiError(error.to_string()))?;

    let mut seen = std::collections::HashSet::new();
    let mut repos = Vec::new();

    for article in article_pattern.find_iter(&html) {
        let Some(capture) = repo_pattern.captures(article.as_str()) else {
            continue;
        };
        let owner = capture[1].to_string();
        let repo = capture[2].to_string();
        let full_name = format!("{}/{}", owner, repo);

        if !seen.insert(full_name.clone()) {
            continue;
        }

        let mut hasher = DefaultHasher::new();
        full_name.hash(&mut hasher);
        repos.push(GitHubRepoSummary {
            id: (hasher.finish() & i64::MAX as u64) as i64,
            full_name,
            html_url: format!("https://github.com/{}/{}", owner, repo),
            private: false,
            owner_login: owner,
            owner_type: "User".to_string(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            default_branch: "main".to_string(),
        });

        if repos.len() >= 5 {
            break;
        }
    }

    Ok(repos)
}

pub async fn fetch_commit_files(
    owner: &str,
    repo: &str,
    sha: &str,
    github_token: Option<&str>,
) -> Result<Vec<String>, GitHubError> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/commits/{}",
        owner, repo, sha
    );

    let client = reqwest::Client::new();
    let response = github_request(&client, url, github_token)
        .send()
        .await
        .map_err(|e| GitHubError::HttpError(e.to_string()))?;

    if !response.status().is_success() {
        return Err(GitHubError::ApiError(response.status().to_string()));
    }

    let detail: CommitDetail = response
        .json()
        .await
        .map_err(|e| GitHubError::ApiError(e.to_string()))?;

    Ok(detail
        .files
        .unwrap_or_default()
        .into_iter()
        .map(|file| file.filename)
        .collect())
}
