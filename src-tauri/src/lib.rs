use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::PathBuf;
use tauri::{Manager, State};

mod analysis;

pub struct AppState {
    db: analysis::Database,
}

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    method: String,
    #[serde(default)]
    params: Value,
    #[serde(default)]
    id: Value,
}

#[derive(Debug, Serialize)]
struct JsonRpcError {
    code: i64,
    message: String,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    jsonrpc: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
    id: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AnalyzeParams {
    input: String,
    #[serde(default)]
    visibility: Option<String>,
    #[serde(default)]
    github_token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdParams {
    id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectIdParams {
    project_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RefreshAnalysisParams {
    project_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecomputeSnapshotParams {
    snapshot: analysis::CitySnapshot,
    hidden_paths: Vec<String>,
    hidden_extensions: Vec<String>,
    layout_mode: analysis::LayoutMode,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SourceFileParams {
    repo_url: String,
    file_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CommitsParams {
    repo_url: String,
    page: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CommitFilesParams {
    repo_url: String,
    sha: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RepoListParams {
    #[serde(default = "default_repo_visibility")]
    visibility: String,
    #[serde(default = "default_page")]
    page: usize,
}

fn default_repo_visibility() -> String {
    "all".to_string()
}

fn default_page() -> usize {
    1
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeviceCodeParams {
    device_code: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TokenParams {
    token: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionParams {
    token: String,
    login: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AnalyzeCodeParams {
    files: Vec<(String, String)>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ParseFileParams {
    path: String,
    content: String,
}

#[tauri::command]
async fn rpc(state: State<'_, AppState>, request: Value) -> Result<JsonRpcResponse, String> {
    let id = request.get("id").cloned().unwrap_or(Value::Null);
    let parsed = match serde_json::from_value::<JsonRpcRequest>(request) {
        Ok(request) => request,
        Err(error) => return Ok(rpc_error(id, -32700, format!("Parse error: {error}"))),
    };

    if parsed.jsonrpc != "2.0" {
        return Ok(rpc_error(
            parsed.id,
            -32600,
            "Invalid JSON-RPC version".to_string(),
        ));
    }

    let response = match dispatch_rpc(&state, &parsed.method, parsed.params).await {
        Ok(result) => rpc_result(parsed.id, result),
        Err(error) => rpc_error(parsed.id, error.code, error.message),
    };

    Ok(response)
}

async fn dispatch_rpc(
    state: &State<'_, AppState>,
    method: &str,
    params: Value,
) -> Result<Value, JsonRpcError> {
    match method {
        "analysis.analyze" => {
            let params: AnalyzeParams = parse_params(params)?;
            let token = params
                .github_token
                .or_else(|| state.db.get_setting("github_token").ok().flatten());
            to_value(
                analysis::analyze(
                    &state.db,
                    &params.input,
                    params.visibility.as_deref(),
                    token.as_deref(),
                )
                .await,
            )
        }
        "analysis.enqueue" => {
            let params: AnalyzeParams = parse_params(params)?;
            let token = params
                .github_token
                .or_else(|| state.db.get_setting("github_token").ok().flatten());
            to_value(analysis::enqueue_analyze(
                &state.db,
                &params.input,
                params.visibility.as_deref(),
                token,
            ))
        }
        "analysis.refresh" => {
            let params: RefreshAnalysisParams = parse_params(params)?;
            let token = state.db.get_setting("github_token").ok().flatten();
            to_value(analysis::enqueue_refresh(
                &state.db,
                &params.project_id,
                token,
            ))
        }
        "analysis.analyzeCode" => {
            let params: AnalyzeCodeParams = parse_params(params)?;
            let parsed = analysis::parse_files(&params.files, None);
            to_value(analysis::AnalyzeResult {
                success: true,
                project_id: None,
                snapshot: Some(analysis::create_snapshot(parsed, vec![])),
                error: None,
            })
        }
        "analysis.parseFile" => {
            let params: ParseFileParams = parse_params(params)?;
            let mut parser = analysis::AnalysisParser::new();
            to_value(parser.parse_file(&params.path, &params.content))
        }
        "analysis.recomputeSnapshot" => {
            let params: RecomputeSnapshotParams = parse_params(params)?;
            to_value(analysis::recompute_snapshot(
                params.snapshot,
                params.hidden_paths,
                params.hidden_extensions,
                params.layout_mode,
            ))
        }
        "analysis.getSourceFile" => {
            let params: SourceFileParams = parse_params(params)?;
            let content =
                get_source_file_impl(&state.db, &params.repo_url, &params.file_path).await?;
            Ok(json!(content))
        }
        "projects.get" => {
            let params: IdParams = parse_params(params)?;
            to_value(state.db.get_project(&params.id).ok().flatten())
        }
        "projects.list" => to_value(state.db.get_projects_by_user("local").unwrap_or_default()),
        "projects.listPublic" => to_value(state.db.get_all_public_projects().unwrap_or_default()),
        "projects.delete" => {
            let params: IdParams = parse_params(params)?;
            state
                .db
                .delete_project(&params.id)
                .map_err(internal_error)?;
            Ok(Value::Null)
        }
        "projects.cancel" => {
            let params: IdParams = parse_params(params)?;
            analysis::cancel_analysis(&state.db, &params.id).map_err(internal_error)?;
            Ok(Value::Null)
        }
        "projects.getSnapshot" => {
            let params: ProjectIdParams = parse_params(params)?;
            to_value(state.db.get_snapshot(&params.project_id).ok().flatten())
        }
        "projects.getParsedFiles" => {
            let params: ProjectIdParams = parse_params(params)?;
            to_value(state.db.get_parsed_files(&params.project_id).ok().flatten())
        }
        "git.getCommits" => {
            let params: CommitsParams = parse_params(params)?;
            let commits = get_commits_impl(&state.db, &params.repo_url, params.page).await?;
            to_value(commits)
        }
        "git.getCommitFiles" => {
            let params: CommitFilesParams = parse_params(params)?;
            let files = get_commit_files_impl(&state.db, &params.repo_url, &params.sha).await?;
            to_value(files)
        }
        "github.loginStart" => to_value(
            analysis::request_device_code()
                .await
                .map_err(internal_error)?,
        ),
        "github.loginPoll" => {
            let params: DeviceCodeParams = parse_params(params)?;
            to_value(
                analysis::poll_for_token(&params.device_code)
                    .await
                    .map_err(internal_error)?,
            )
        }
        "github.getUser" => {
            let params: TokenParams = parse_params(params)?;
            to_value(
                analysis::get_github_user(&params.token)
                    .await
                    .map_err(internal_error)?,
            )
        }
        "github.importCliSession" => {
            let token = analysis::get_github_cli_token()
                .await
                .map_err(internal_error)?;
            let user = analysis::get_github_user(&token)
                .await
                .map_err(internal_error)?;
            state
                .db
                .set_setting("github_token", &token)
                .map_err(internal_error)?;
            state
                .db
                .set_setting("github_user_login", &user.login)
                .map_err(internal_error)?;
            to_value(user)
        }
        "github.getToken" => to_value(state.db.get_setting("github_token").ok().flatten()),
        "github.listRepos" => {
            let params: RepoListParams = parse_params(params)?;
            let token = state
                .db
                .get_setting("github_token")
                .map_err(internal_error)?
                .ok_or_else(|| invalid_params("GitHub is not connected".to_string()))?;
            let repos = analysis::fetch_repositories(&params.visibility, params.page, &token)
                .await
                .map_err(|error| internal_error(error.to_string()))?;
            to_value(repos)
        }
        "github.trendingRepos" => {
            let repos = analysis::fetch_trending_repositories()
                .await
                .unwrap_or_default();
            to_value(repos)
        }
        "github.setToken" => {
            let params: TokenParams = parse_params(params)?;
            state
                .db
                .set_setting("github_token", &params.token)
                .map_err(internal_error)?;
            Ok(Value::Null)
        }
        "github.setSession" => {
            let params: SessionParams = parse_params(params)?;
            state
                .db
                .set_setting("github_token", &params.token)
                .map_err(internal_error)?;
            state
                .db
                .set_setting("github_user_login", &params.login)
                .map_err(internal_error)?;
            Ok(Value::Null)
        }
        "github.logout" => {
            state
                .db
                .delete_setting("github_token")
                .map_err(internal_error)?;
            state
                .db
                .delete_setting("github_user_login")
                .map_err(internal_error)?;
            Ok(Value::Null)
        }
        "user.current" => to_value(state.db.get_setting("github_user_login").ok().flatten()),
        _ => Err(JsonRpcError {
            code: -32601,
            message: format!("Method not found: {method}"),
        }),
    }
}

fn expand_local_path(input: &str) -> String {
    if input.starts_with('~') {
        dirs::home_dir()
            .map(|home| input.replacen('~', &home.to_string_lossy(), 1))
            .unwrap_or_else(|| input.to_string())
    } else {
        input.to_string()
    }
}

fn cached_repo_dir(repo_url: &str) -> Option<PathBuf> {
    let (owner, repo) = analysis::parse_github_url(repo_url).ok()?;
    Some(
        dirs::data_dir()?
            .join("codecity")
            .join("repos")
            .join(format!("{owner}-{repo}")),
    )
}

fn local_git_dir(repo_url: &str) -> Option<PathBuf> {
    let expanded = expand_local_path(repo_url);
    let local_path = PathBuf::from(expanded);
    if local_path.join(".git").is_dir() {
        return Some(local_path);
    }

    cached_repo_dir(repo_url).filter(|path| path.join(".git").is_dir())
}

async fn get_local_commits(
    repo_dir: PathBuf,
    page: usize,
) -> Result<Vec<analysis::CommitSummary>, JsonRpcError> {
    let skip = page.saturating_sub(1) * 30;
    let output = tokio::process::Command::new("git")
        .args([
            "log",
            "--date=iso-strict",
            "--pretty=format:%H%x1f%an%x1f%aI%x1f%s",
            "--name-only",
            "-n",
            "30",
            "--skip",
            &skip.to_string(),
        ])
        .current_dir(&repo_dir)
        .output()
        .await
        .map_err(|error| internal_error(format!("Failed to run git log: {error}")))?;

    if !output.status.success() {
        return Err(internal_error(format!(
            "git log failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();
    let mut current: Option<analysis::CommitSummary> = None;

    for line in text.lines() {
        if line.contains('\x1f') {
            if let Some(commit) = current.take() {
                commits.push(commit);
            }
            let parts: Vec<&str> = line.split('\x1f').collect();
            current = Some(analysis::CommitSummary {
                sha: parts.first().copied().unwrap_or("").to_string(),
                author: parts.get(1).copied().unwrap_or("").to_string(),
                date: parts.get(2).copied().unwrap_or("").to_string(),
                message: parts.get(3).copied().unwrap_or("").to_string(),
                files: Vec::new(),
            });
        } else if let Some(commit) = current.as_mut() {
            let path = line.trim();
            if !path.is_empty() {
                commit.files.push(path.to_string());
            }
        }
    }

    if let Some(commit) = current {
        commits.push(commit);
    }

    Ok(commits)
}

async fn get_local_commit_files(repo_dir: PathBuf, sha: &str) -> Result<Vec<String>, JsonRpcError> {
    let output = tokio::process::Command::new("git")
        .args(["show", "--pretty=format:", "--name-only", sha])
        .current_dir(&repo_dir)
        .output()
        .await
        .map_err(|error| internal_error(format!("Failed to run git show: {error}")))?;

    if !output.status.success() {
        return Err(internal_error(format!(
            "git show failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }

    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect())
}

async fn get_commits_impl(
    db: &analysis::Database,
    repo_url: &str,
    page: usize,
) -> Result<Vec<analysis::CommitSummary>, JsonRpcError> {
    if let Some(repo_dir) = local_git_dir(repo_url) {
        return get_local_commits(repo_dir, page).await;
    }

    let (owner, repo) =
        analysis::parse_github_url(repo_url).map_err(|error| invalid_params(error.to_string()))?;
    let token = db.get_setting("github_token").ok().flatten();
    analysis::fetch_commits(&owner, &repo, page, token.as_deref())
        .await
        .map_err(|error| internal_error(error.to_string()))
}

async fn get_commit_files_impl(
    db: &analysis::Database,
    repo_url: &str,
    sha: &str,
) -> Result<Vec<String>, JsonRpcError> {
    if let Some(repo_dir) = local_git_dir(repo_url) {
        return get_local_commit_files(repo_dir, sha).await;
    }

    let (owner, repo) =
        analysis::parse_github_url(repo_url).map_err(|error| invalid_params(error.to_string()))?;
    let token = db.get_setting("github_token").ok().flatten();
    analysis::fetch_commit_files(&owner, &repo, sha, token.as_deref())
        .await
        .map_err(|error| internal_error(error.to_string()))
}

async fn get_source_file_impl(
    db: &analysis::Database,
    repo_url: &str,
    file_path: &str,
) -> Result<String, JsonRpcError> {
    let requested_path = std::path::Path::new(file_path);
    if requested_path.is_absolute() || file_path.split('/').any(|part| part == "..") {
        return Err(invalid_params(format!("Invalid source path: {file_path}")));
    }

    let expanded = if repo_url.starts_with('~') {
        dirs::home_dir()
            .map(|home| repo_url.replacen('~', &home.to_string_lossy(), 1))
            .unwrap_or_else(|| repo_url.to_string())
    } else {
        repo_url.to_string()
    };

    let local_path = std::path::PathBuf::from(&expanded);
    if local_path.is_dir() {
        let full_path = local_path.join(file_path);
        return std::fs::read_to_string(&full_path).map_err(|error| {
            internal_error(format!("Failed to read {}: {error}", full_path.display()))
        });
    }

    let (owner, repo) =
        analysis::parse_github_url(repo_url).map_err(|error| invalid_params(error.to_string()))?;

    if let Some(data_dir) = dirs::data_dir() {
        let cached_repo = data_dir
            .join("codecity")
            .join("repos")
            .join(format!("{owner}-{repo}"));

        if cached_repo.is_dir() {
            let cached_file = cached_repo.join(file_path);

            if cached_file.is_file() {
                return std::fs::read_to_string(&cached_file).map_err(|error| {
                    internal_error(format!("Failed to read {}: {error}", cached_file.display()))
                });
            }

            return Err(internal_error(format!(
                "Source file is missing from the downloaded checkout: {}. The folder or file may have been moved or deleted; refresh the city to reparse the latest files.",
                file_path
            )));
        }
    }

    let token = db.get_setting("github_token").ok().flatten();
    analysis::fetch_file_content(&owner, &repo, file_path, token.as_deref())
        .await
        .map_err(|error| internal_error(error.to_string()))
}

fn parse_params<T: for<'de> Deserialize<'de>>(params: Value) -> Result<T, JsonRpcError> {
    serde_json::from_value(params).map_err(|error| invalid_params(error.to_string()))
}

fn to_value<T: Serialize>(value: T) -> Result<Value, JsonRpcError> {
    serde_json::to_value(value).map_err(|error| internal_error(error.to_string()))
}

fn invalid_params(message: String) -> JsonRpcError {
    JsonRpcError {
        code: -32602,
        message,
    }
}

fn internal_error(message: String) -> JsonRpcError {
    JsonRpcError {
        code: -32603,
        message,
    }
}

fn rpc_result(id: Value, result: Value) -> JsonRpcResponse {
    JsonRpcResponse {
        jsonrpc: "2.0",
        result: Some(result),
        error: None,
        id,
    }
}

fn rpc_error(id: Value, code: i64, message: String) -> JsonRpcResponse {
    JsonRpcResponse {
        jsonrpc: "2.0",
        result: None,
        error: Some(JsonRpcError { code, message }),
        id,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = analysis::Database::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState { db })
        .invoke_handler(tauri::generate_handler![rpc])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
