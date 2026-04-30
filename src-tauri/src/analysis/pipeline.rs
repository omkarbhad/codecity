use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use super::db::Database;
use super::github;
use super::layout::CitySnapshot;
use super::parser;

static CANCELLED_ANALYSES: once_cell::sync::Lazy<Mutex<HashSet<String>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HashSet::new()));

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisProgress {
    pub stage: String,
    pub progress: f64,
    pub message: String,
    pub error: Option<String>,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyzeResult {
    pub success: bool,
    pub project_id: Option<String>,
    pub snapshot: Option<CitySnapshot>,
    pub error: Option<String>,
}

fn mark_cancelled(project_id: &str) {
    if let Ok(mut cancelled) = CANCELLED_ANALYSES.lock() {
        cancelled.insert(project_id.to_string());
    }
}

fn clear_cancelled(project_id: &str) {
    if let Ok(mut cancelled) = CANCELLED_ANALYSES.lock() {
        cancelled.remove(project_id);
    }
}

fn is_cancelled(project_id: &str) -> bool {
    CANCELLED_ANALYSES
        .lock()
        .map(|cancelled| cancelled.contains(project_id))
        .unwrap_or(false)
}

fn cached_repo_dir(repo_url: &str) -> Option<PathBuf> {
    let (owner, repo) = github::parse_github_url(repo_url).ok()?;
    Some(repos_dir().ok()?.join(format!("{}-{}", owner, repo)))
}

pub fn cancel_analysis(db: &Database, project_id: &str) -> Result<(), String> {
    mark_cancelled(project_id);

    if let Some(project) = db.get_project(project_id)? {
        if let Some(repo_dir) = cached_repo_dir(&project.repo_url) {
            if repo_dir.exists() {
                let _ = std::fs::remove_dir_all(repo_dir);
            }
        }
    }

    db.delete_project(project_id)
}

const SKIP_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "dist",
    ".next",
    "build",
    "target",
    "__pycache__",
    ".cache",
    "vendor",
    ".venv",
    "venv",
    "coverage",
    ".tox",
    ".mypy_cache",
    ".idea",
    ".vscode",
];

const SUPPORTED_EXTENSIONS: &[&str] = &[
    "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "css", "scss", "less", "sass", "html", "htm",
    "md", "mdx", "json", "yaml", "yml", "toml", "go", "rs", "java", "kt", "kts", "rb", "php",
    "swift", "c", "h", "cpp", "cxx", "cc", "hpp", "hxx", "hh", "sh", "bash", "zsh", "fish", "zig",
    "lua", "hs", "lhs", "dart", "ex", "exs", "scala", "r", "R", "jl", "pl", "pm", "t", "cs", "erl",
    "hrl", "nix", "glsl", "frag", "vert", "comp", "ml", "mli", "groovy", "gradle", "el",
];

const MAX_FILE_BYTES: u64 = 1_000_000;

const SKIP_FILES: &[&str] = &[
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
    "Cargo.lock",
    "poetry.lock",
    "Pipfile.lock",
    "composer.lock",
    "go.sum",
];

fn should_skip_dir(dir_name: &str) -> bool {
    SKIP_DIRS.contains(&dir_name)
}

fn should_skip_file(path: &Path) -> bool {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("");
    if SKIP_FILES.contains(&file_name) {
        return true;
    }

    let lower = file_name.to_lowercase();
    lower.ends_with(".min.js")
        || lower.ends_with(".min.css")
        || lower.ends_with(".map")
        || lower.ends_with(".snap")
        || lower.ends_with(".generated.ts")
        || lower.ends_with(".generated.js")
}

fn is_supported_extension(ext: &str) -> bool {
    SUPPORTED_EXTENSIONS.contains(&ext)
}

fn report_progress(
    db: &Database,
    project_id: &str,
    progress: f64,
    stage: &str,
    message: &str,
    files_discovered: i64,
    files_parsed: i64,
) {
    if let Err(error) = db.update_project_progress(
        project_id,
        progress,
        stage,
        message,
        files_discovered,
        files_parsed,
    ) {
        log::warn!("Failed to store analysis progress: {}", error);
    }
}

fn fail_project(
    db: &Database,
    project_id: &str,
    message: impl Into<String>,
    files_discovered: i64,
    files_parsed: i64,
) -> AnalyzeResult {
    let message = message.into();
    if let Err(error) = db.update_project_status(project_id, "FAILED", 0, 0, Some(&message)) {
        log::error!("Failed to store analysis failure: {}", error);
    }
    report_progress(
        db,
        project_id,
        100.0,
        "error",
        &message,
        files_discovered,
        files_parsed,
    );

    AnalyzeResult {
        success: false,
        project_id: Some(project_id.to_string()),
        snapshot: None,
        error: Some(message),
    }
}

/// Recursively collect supported source files from a local directory
fn collect_source_files(dir: &Path) -> Vec<PathBuf> {
    let mut result = Vec::new();

    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if !should_skip_dir(name) && !name.starts_with('.') {
                        result.extend(collect_source_files(&path));
                    }
                }
            } else if path.is_file() {
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                if is_supported_extension(ext) && !should_skip_file(&path) {
                    result.push(path);
                }
            }
        }
    }

    result
}

/// Read files from a local directory and return (relative_path, content) pairs
fn read_local_files(base_dir: &Path) -> Vec<(String, String)> {
    let files = collect_source_files(base_dir);
    let mut result = Vec::new();

    for path in files {
        if let Ok(metadata) = std::fs::metadata(&path) {
            if metadata.len() > MAX_FILE_BYTES {
                log::warn!(
                    "Skipping large file {} ({} bytes)",
                    path.display(),
                    metadata.len()
                );
                continue;
            }
        }

        let relative = path
            .strip_prefix(base_dir)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        match std::fs::read_to_string(&path) {
            Ok(content) => result.push((relative, content)),
            Err(e) => log::warn!("Skipping {}: {}", path.display(), e),
        }
    }

    result
}

fn top_level_folder(path: &str) -> String {
    let mut parts = path.split('/');
    match (parts.next(), parts.next()) {
        (Some(first), Some(_)) if !first.is_empty() => first.to_string(),
        _ => ".".to_string(),
    }
}

fn group_files_by_folder(files: Vec<(String, String)>) -> Vec<(String, Vec<(String, String)>)> {
    let mut groups = BTreeMap::<String, Vec<(String, String)>>::new();

    for file in files {
        groups
            .entry(top_level_folder(&file.0))
            .or_default()
            .push(file);
    }

    groups.into_iter().collect()
}

/// Get the repos cache directory
fn repos_dir() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or_else(|| "Could not find data directory".to_string())?;
    let dir = data_dir.join("codecity").join("repos");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn safe_archive_path(name: &str) -> Option<PathBuf> {
    let path = PathBuf::from(name);
    let mut components = path.components();
    components.next()?;

    let mut relative = PathBuf::new();
    for component in components {
        match component {
            std::path::Component::Normal(part) => relative.push(part),
            _ => return None,
        }
    }

    if relative.as_os_str().is_empty() {
        None
    } else {
        Some(relative)
    }
}

fn extract_zip_archive(bytes: &[u8], destination: &Path) -> Result<(), String> {
    let cursor = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to read downloaded archive: {}", e))?;

    if destination.exists() {
        std::fs::remove_dir_all(destination).map_err(|e| {
            format!(
                "Failed to clear cached repo {}: {}",
                destination.display(),
                e
            )
        })?;
    }
    std::fs::create_dir_all(destination).map_err(|e| {
        format!(
            "Failed to create repo cache {}: {}",
            destination.display(),
            e
        )
    })?;

    for index in 0..archive.len() {
        let mut file = archive
            .by_index(index)
            .map_err(|e| format!("Failed to read archive entry: {}", e))?;

        let Some(relative_path) = safe_archive_path(file.name()) else {
            continue;
        };

        let output_path = destination.join(relative_path);
        if file.is_dir() {
            std::fs::create_dir_all(&output_path)
                .map_err(|e| format!("Failed to create {}: {}", output_path.display(), e))?;
            continue;
        }

        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create {}: {}", parent.display(), e))?;
        }

        let mut contents = Vec::with_capacity(file.size() as usize);
        file.read_to_end(&mut contents)
            .map_err(|e| format!("Failed to extract {}: {}", file.name(), e))?;
        std::fs::write(&output_path, contents)
            .map_err(|e| format!("Failed to write {}: {}", output_path.display(), e))?;
    }

    Ok(())
}

async fn download_repo_archive(
    repo_url: &str,
    github_token: Option<&str>,
) -> Result<PathBuf, String> {
    let (owner, repo) = github::parse_github_url(repo_url).map_err(|e| e.to_string())?;

    let repos = repos_dir()?;
    let archive_dir = repos.join(format!("{}-{}", owner, repo));
    let archive_url = format!(
        "https://api.github.com/repos/{}/{}/zipball/HEAD",
        owner, repo
    );

    log::info!("Downloading repo archive: {}", repo_url);

    let client = reqwest::Client::new();
    let mut request = client
        .get(&archive_url)
        .header("User-Agent", "codecity")
        .header("Accept", "application/vnd.github+json");

    if let Some(token) = github_token {
        request = request.bearer_auth(token);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to download repo archive: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "GitHub archive download failed: {}",
            response.status()
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read repo archive: {}", e))?;

    extract_zip_archive(&bytes, &archive_dir)?;
    Ok(archive_dir)
}

/// Clone a GitHub repo to local cache, or use existing clone
async fn clone_repo(repo_url: &str, github_token: Option<&str>) -> Result<PathBuf, String> {
    let (owner, repo) = github::parse_github_url(repo_url).map_err(|e| e.to_string())?;

    let repos = repos_dir()?;
    let clone_dir = repos.join(format!("{}-{}", owner, repo));

    // If already cloned, pull latest
    if clone_dir.exists() {
        log::info!(
            "Repo already cloned, pulling latest: {}",
            clone_dir.display()
        );
        let output = tokio::process::Command::new("git")
            .args(["pull", "--ff-only"])
            .current_dir(&clone_dir)
            .output()
            .await
            .map_err(|e| format!("Failed to run git pull: {}", e))?;

        if !output.status.success() {
            log::warn!("git pull failed, using existing clone");
        }

        return Ok(clone_dir);
    }

    // Clone the repo
    let mut clone_url = if let Some(token) = github_token {
        format!(
            "https://x-access-token:{}@github.com/{}/{}.git",
            token, owner, repo
        )
    } else {
        format!("https://github.com/{}/{}.git", owner, repo)
    };

    log::info!("Cloning repo: {}", repo_url);

    let output = tokio::process::Command::new("git")
        .args(["clone", "--depth", "1", &clone_url])
        .arg(&clone_dir)
        .output()
        .await
        .map_err(|e| format!("Failed to run git clone: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Try without token in URL (might be a public repo and token auth failed)
        if github_token.is_some() {
            clone_url = format!("https://github.com/{}/{}.git", owner, repo);
            let retry = tokio::process::Command::new("git")
                .args(["clone", "--depth", "1", &clone_url])
                .arg(&clone_dir)
                .output()
                .await
                .map_err(|e| format!("Failed to run git clone: {}", e))?;

            if !retry.status.success() {
                return Err(format!(
                    "git clone failed: {}",
                    String::from_utf8_lossy(&retry.stderr)
                ));
            }
        } else {
            return Err(format!("git clone failed: {}", stderr));
        }
    }

    Ok(clone_dir)
}

async fn download_or_clone_repo(
    repo_url: &str,
    github_token: Option<&str>,
) -> Result<PathBuf, String> {
    match download_repo_archive(repo_url, github_token).await {
        Ok(dir) => Ok(dir),
        Err(download_error) => {
            log::warn!(
                "Repo archive download failed, falling back to git clone: {}",
                download_error
            );
            clone_repo(repo_url, github_token).await
        }
    }
}

/// Detect if input is a GitHub URL or a local path
fn is_github_url(input: &str) -> bool {
    let trimmed = input.trim();
    trimmed.contains("github.com")
        || trimmed.matches('/').count() == 1
            && !trimmed.starts_with('/')
            && !trimmed.starts_with('.')
            && !PathBuf::from(trimmed).exists()
}

/// Unified analyze entry point — auto-detects GitHub URL vs local path
///
/// - GitHub URL (e.g. "https://github.com/owner/repo", "owner/repo") → git clone + analyze
/// - Local path (e.g. "/Users/me/projects/myapp", "~/code/repo") → analyze directly
pub async fn analyze(
    db: &Database,
    input: &str,
    visibility: Option<&str>,
    github_token: Option<&str>,
) -> AnalyzeResult {
    let input = input.trim();
    let visibility = normalize_visibility(visibility);

    // Expand tilde
    let expanded = if input.starts_with('~') {
        dirs::home_dir()
            .map(|h| input.replacen('~', &h.to_string_lossy(), 1))
            .unwrap_or_else(|| input.to_string())
    } else {
        input.to_string()
    };

    let local_path = PathBuf::from(&expanded);

    // If it's an existing local directory, analyze directly
    if local_path.is_dir() {
        return analyze_from_dir(db, &local_path, &expanded, visibility).await;
    }

    // Otherwise treat as GitHub URL → clone then analyze
    if is_github_url(input) {
        return analyze_github(db, input, visibility, github_token).await;
    }

    // Neither a valid dir nor a GitHub URL
    AnalyzeResult {
        success: false,
        project_id: None,
        snapshot: None,
        error: Some(format!(
            "\"{}\" is not a valid local directory or GitHub URL",
            input
        )),
    }
}

pub fn enqueue_analyze(
    db: &Database,
    input: &str,
    visibility: Option<&str>,
    github_token: Option<String>,
) -> AnalyzeResult {
    let input = input.trim();
    let visibility = normalize_visibility(visibility);

    let expanded = expand_input_path(input);
    let local_path = PathBuf::from(&expanded);

    let (name, source) = if local_path.is_dir() {
        let name = local_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("local")
            .to_string();
        (name, QueuedSource::Local(expanded.clone()))
    } else if is_github_url(input) {
        let (owner, repo) = match github::parse_github_url(input) {
            Ok(result) => result,
            Err(error) => {
                return AnalyzeResult {
                    success: false,
                    project_id: None,
                    snapshot: None,
                    error: Some(error.to_string()),
                };
            }
        };
        (
            format!("{}/{}", owner, repo),
            QueuedSource::GitHub(input.to_string()),
        )
    } else {
        return AnalyzeResult {
            success: false,
            project_id: None,
            snapshot: None,
            error: Some(format!(
                "\"{}\" is not a valid local directory or GitHub URL",
                input
            )),
        };
    };

    if let Ok(Some(dup)) = db.find_duplicate(input, "local") {
        match dup.status.as_str() {
            "PENDING" | "PROCESSING" => {
                return AnalyzeResult {
                    success: true,
                    project_id: Some(dup.id),
                    snapshot: None,
                    error: None,
                };
            }
            _ => {
                let _ = db.delete_project(&dup.id);
            }
        }
    }

    let project = match db.create_project(&name, input, visibility, "PENDING", "local") {
        Ok(project) => project,
        Err(error) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some(format!("Failed to create project: {}", error)),
            };
        }
    };

    report_progress(db, &project.id, 1.0, "queued", "Queued", 0, 0);

    let project_id = project.id.clone();
    tokio::spawn(async move {
        let worker_db = match Database::new() {
            Ok(db) => db,
            Err(error) => {
                log::error!("Failed to open database for queued analysis: {}", error);
                return;
            }
        };

        run_queued_analysis(&worker_db, project, source, github_token.as_deref()).await;
    });

    AnalyzeResult {
        success: true,
        project_id: Some(project_id),
        snapshot: None,
        error: None,
    }
}

pub fn enqueue_refresh(
    db: &Database,
    project_id: &str,
    github_token: Option<String>,
) -> AnalyzeResult {
    let existing = match db.get_project(project_id) {
        Ok(Some(project)) => project,
        Ok(None) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some("Project not found".to_string()),
            };
        }
        Err(error) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some(format!("Failed to load project: {}", error)),
            };
        }
    };

    let expanded = expand_input_path(&existing.repo_url);
    let local_path = PathBuf::from(&expanded);
    let source = if local_path.is_dir() {
        QueuedSource::Local(expanded)
    } else if is_github_url(&existing.repo_url) {
        QueuedSource::GitHub(existing.repo_url.clone())
    } else {
        return AnalyzeResult {
            success: false,
            project_id: None,
            snapshot: None,
            error: Some(format!(
                "\"{}\" is not a valid local directory or GitHub URL",
                existing.repo_url
            )),
        };
    };

    let project = match db.create_project(
        &existing.name,
        &existing.repo_url,
        &existing.visibility,
        "PENDING",
        &existing.user_id,
    ) {
        Ok(project) => project,
        Err(error) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some(format!("Failed to create refresh project: {}", error)),
            };
        }
    };

    report_progress(db, &project.id, 1.0, "queued", "Queued refresh", 0, 0);

    let project_id = project.id.clone();
    tokio::spawn(async move {
        let worker_db = match Database::new() {
            Ok(db) => db,
            Err(error) => {
                log::error!("Failed to open database for queued refresh: {}", error);
                return;
            }
        };

        run_queued_analysis(&worker_db, project, source, github_token.as_deref()).await;
    });

    AnalyzeResult {
        success: true,
        project_id: Some(project_id),
        snapshot: None,
        error: None,
    }
}

enum QueuedSource {
    GitHub(String),
    Local(String),
}

fn expand_input_path(input: &str) -> String {
    if input.starts_with('~') {
        dirs::home_dir()
            .map(|h| input.replacen('~', &h.to_string_lossy(), 1))
            .unwrap_or_else(|| input.to_string())
    } else {
        input.to_string()
    }
}

async fn run_queued_analysis(
    db: &Database,
    project: super::db::ProjectRecord,
    source: QueuedSource,
    github_token: Option<&str>,
) {
    if is_cancelled(&project.id) {
        return;
    }

    if let Err(error) = db.update_project_status(&project.id, "PROCESSING", 0, 0, None) {
        log::error!("Failed to mark queued analysis as processing: {}", error);
        return;
    }

    match source {
        QueuedSource::GitHub(repo_url) => {
            run_github_analysis(db, &project, &repo_url, github_token).await;
        }
        QueuedSource::Local(path) => {
            report_progress(db, &project.id, 12.0, "scan", "Scanning local folder", 0, 0);
            parse_and_save(db, &project, Path::new(&path)).await;
        }
    };

    clear_cancelled(&project.id);
}

fn normalize_visibility(visibility: Option<&str>) -> &str {
    match visibility {
        Some("PUBLIC") => "PUBLIC",
        _ => "PRIVATE",
    }
}

/// Analyze a GitHub repo: download archive (or clone fallback) → read local files → parse → layout → save
async fn analyze_github(
    db: &Database,
    repo_url: &str,
    visibility: &str,
    github_token: Option<&str>,
) -> AnalyzeResult {
    let (owner, repo) = match github::parse_github_url(repo_url) {
        Ok(result) => result,
        Err(e) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some(e.to_string()),
            }
        }
    };

    let name = format!("{}/{}", owner, repo);

    // Check for cached result
    if let Ok(Some(dup)) = db.find_duplicate(repo_url, "local") {
        if dup.status == "COMPLETED" {
            if let Ok(Some(snapshot)) = db.get_snapshot(&dup.id) {
                return AnalyzeResult {
                    success: true,
                    project_id: Some(dup.id),
                    snapshot: Some(snapshot),
                    error: None,
                };
            }
        }
        let _ = db.delete_project(&dup.id);
    }

    // Create project record
    let project = match db.create_project(&name, repo_url, visibility, "PROCESSING", "local") {
        Ok(p) => p,
        Err(e) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some(format!("Failed to create project: {}", e)),
            }
        }
    };

    run_github_analysis(db, &project, repo_url, github_token).await
}

async fn run_github_analysis(
    db: &Database,
    project: &super::db::ProjectRecord,
    repo_url: &str,
    github_token: Option<&str>,
) -> AnalyzeResult {
    if is_cancelled(&project.id) {
        return AnalyzeResult {
            success: false,
            project_id: Some(project.id.clone()),
            snapshot: None,
            error: Some("Analysis cancelled".to_string()),
        };
    }

    report_progress(
        db,
        &project.id,
        8.0,
        "download",
        "Downloading repository archive",
        0,
        0,
    );
    // Download the repo locally first so analysis runs against the filesystem.
    let repo_dir = match download_or_clone_repo(repo_url, github_token).await {
        Ok(dir) => dir,
        Err(e) => {
            return fail_project(db, &project.id, e.to_string(), 0, 0);
        }
    };

    if is_cancelled(&project.id) {
        return AnalyzeResult {
            success: false,
            project_id: Some(project.id.clone()),
            snapshot: None,
            error: Some("Analysis cancelled".to_string()),
        };
    }

    report_progress(
        db,
        &project.id,
        35.0,
        "downloaded",
        "Repository downloaded and extracted",
        0,
        0,
    );

    // Parse from the downloaded directory
    parse_and_save(db, &project, &repo_dir).await
}

/// Analyze a local directory directly — no cloning needed
async fn analyze_from_dir(
    db: &Database,
    dir: &Path,
    dir_str: &str,
    visibility: &str,
) -> AnalyzeResult {
    let name = dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("local")
        .to_string();

    // Check for cached result
    if let Ok(Some(dup)) = db.find_duplicate(dir_str, "local") {
        if dup.status == "COMPLETED" {
            if let Ok(Some(snapshot)) = db.get_snapshot(&dup.id) {
                return AnalyzeResult {
                    success: true,
                    project_id: Some(dup.id),
                    snapshot: Some(snapshot),
                    error: None,
                };
            }
        }
        let _ = db.delete_project(&dup.id);
    }

    // Create project record
    let project = match db.create_project(&name, dir_str, visibility, "PROCESSING", "local") {
        Ok(p) => p,
        Err(e) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some(format!("Failed to create project: {}", e)),
            }
        }
    };

    report_progress(db, &project.id, 12.0, "scan", "Scanning local folder", 0, 0);

    parse_and_save(db, &project, dir).await
}

/// Shared: read files from dir, parse, compute layout, save to DB
async fn parse_and_save(
    db: &Database,
    project: &super::db::ProjectRecord,
    dir: &Path,
) -> AnalyzeResult {
    if is_cancelled(&project.id) {
        return AnalyzeResult {
            success: false,
            project_id: Some(project.id.clone()),
            snapshot: None,
            error: Some("Analysis cancelled".to_string()),
        };
    }

    report_progress(
        db,
        &project.id,
        42.0,
        "scan",
        "Collecting source files",
        0,
        0,
    );

    let files = read_local_files(dir);
    let files_discovered = files.len() as i64;

    if files.is_empty() {
        let msg = "No supported source files found";
        return fail_project(db, &project.id, msg, 0, 0);
    }

    let folder_batches = group_files_by_folder(files);
    let folder_count = folder_batches.len().max(1);
    let mut parsed = Vec::with_capacity(files_discovered as usize);
    let mut files_parsed = 0_i64;

    for (index, (folder, batch)) in folder_batches.into_iter().enumerate() {
        if is_cancelled(&project.id) {
            return AnalyzeResult {
                success: false,
                project_id: Some(project.id.clone()),
                snapshot: None,
                error: Some("Analysis cancelled".to_string()),
            };
        }

        report_progress(
            db,
            &project.id,
            55.0 + (index as f64 / folder_count as f64) * 20.0,
            "parse",
            &format!("Parsing {} ({}/{})", folder, index + 1, folder_count),
            files_discovered,
            files_parsed,
        );

        let mut folder_parsed = parser::parse_file_batch(&batch);
        files_parsed += folder_parsed.len() as i64;
        parsed.append(&mut folder_parsed);
    }

    report_progress(
        db,
        &project.id,
        76.0,
        "resolve",
        "Resolving imports across folders",
        files_discovered,
        files_parsed,
    );

    if is_cancelled(&project.id) {
        return AnalyzeResult {
            success: false,
            project_id: Some(project.id.clone()),
            snapshot: None,
            error: Some("Analysis cancelled".to_string()),
        };
    }

    parser::resolve_internal_imports(&mut parsed);
    let files_parsed = parsed.len() as i64;

    report_progress(
        db,
        &project.id,
        77.0,
        "persist",
        "Saving parsed file data",
        files_discovered,
        files_parsed,
    );

    if let Err(error) = db.save_parsed_files(&project.id, &parsed) {
        return fail_project(
            db,
            &project.id,
            format!("Failed to save parsed file data: {}", error),
            files_discovered,
            files_parsed,
        );
    }

    report_progress(
        db,
        &project.id,
        78.0,
        "layout",
        &format!("Creating city layout from {} parsed files", files_parsed),
        files_discovered,
        files_parsed,
    );

    if is_cancelled(&project.id) {
        return AnalyzeResult {
            success: false,
            project_id: Some(project.id.clone()),
            snapshot: None,
            error: Some("Analysis cancelled".to_string()),
        };
    }

    let snapshot = super::layout::create_snapshot(parsed, vec![]);

    report_progress(
        db,
        &project.id,
        92.0,
        "save",
        "Saving analysis snapshot",
        files_discovered,
        files_parsed,
    );

    if let Err(error) = db.save_snapshot(&project.id, &snapshot) {
        return fail_project(
            db,
            &project.id,
            format!("Failed to save analysis snapshot: {}", error),
            files_discovered,
            files_parsed,
        );
    }

    if let Err(error) = db.update_project_status(
        &project.id,
        "COMPLETED",
        snapshot.stats.total_files as i64,
        snapshot.stats.total_lines as i64,
        None,
    ) {
        return fail_project(
            db,
            &project.id,
            format!("Failed to mark analysis complete: {}", error),
            files_discovered,
            files_parsed,
        );
    }

    report_progress(
        db,
        &project.id,
        100.0,
        "complete",
        "Analysis complete",
        files_discovered,
        files_parsed,
    );

    AnalyzeResult {
        success: true,
        project_id: Some(project.id.clone()),
        snapshot: Some(snapshot),
        error: None,
    }
}
