use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
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
        return Ok(rpc_error(parsed.id, -32600, "Invalid JSON-RPC version".to_string()));
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
            to_value(analysis::analyze(
                &state.db,
                &params.input,
                params.visibility.as_deref(),
                token.as_deref(),
            )
            .await)
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
            let content = get_source_file_impl(&state.db, &params.repo_url, &params.file_path).await?;
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
            state.db.delete_project(&params.id).map_err(internal_error)?;
            Ok(Value::Null)
        }
        "projects.getSnapshot" => {
            let params: ProjectIdParams = parse_params(params)?;
            to_value(state.db.get_snapshot(&params.project_id).ok().flatten())
        }
        "git.getCommits" => {
            let params: CommitsParams = parse_params(params)?;
            let (owner, repo) = analysis::parse_github_url(&params.repo_url)
                .map_err(|error| invalid_params(error.to_string()))?;
            let token = state.db.get_setting("github_token").ok().flatten();
            let commits = analysis::fetch_commits(&owner, &repo, params.page, token.as_deref())
                .await
                .map_err(|error| internal_error(error.to_string()))?;
            to_value(commits)
        }
        "git.getCommitFiles" => {
            let params: CommitFilesParams = parse_params(params)?;
            let (owner, repo) = analysis::parse_github_url(&params.repo_url)
                .map_err(|error| invalid_params(error.to_string()))?;
            let token = state.db.get_setting("github_token").ok().flatten();
            let files = analysis::fetch_commit_files(&owner, &repo, &params.sha, token.as_deref())
                .await
                .map_err(|error| internal_error(error.to_string()))?;
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
        "github.getToken" => to_value(state.db.get_setting("github_token").ok().flatten()),
        "github.setToken" => {
            let params: TokenParams = parse_params(params)?;
            state.db.set_setting("github_token", &params.token).map_err(internal_error)?;
            Ok(Value::Null)
        }
        "github.setSession" => {
            let params: SessionParams = parse_params(params)?;
            state.db.set_setting("github_token", &params.token).map_err(internal_error)?;
            state.db.set_setting("github_user_login", &params.login).map_err(internal_error)?;
            Ok(Value::Null)
        }
        "github.logout" => {
            state.db.delete_setting("github_token").map_err(internal_error)?;
            state.db.delete_setting("github_user_login").map_err(internal_error)?;
            Ok(Value::Null)
        }
        "user.current" => to_value(state.db.get_setting("github_user_login").ok().flatten()),
        _ => Err(JsonRpcError {
            code: -32601,
            message: format!("Method not found: {method}"),
        }),
    }
}

async fn get_source_file_impl(
    db: &analysis::Database,
    repo_url: &str,
    file_path: &str,
) -> Result<String, JsonRpcError> {
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
        return std::fs::read_to_string(&full_path)
            .map_err(|error| internal_error(format!("Failed to read {}: {error}", full_path.display())));
    }

    let (owner, repo) = analysis::parse_github_url(repo_url)
        .map_err(|error| invalid_params(error.to_string()))?;
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
