use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::process::Command;

const GITHUB_DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const GITHUB_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const GITHUB_API_USER_URL: &str = "https://api.github.com/user";

/// GitHub OAuth App client ID — register one at https://github.com/settings/applications/new
/// For the desktop app, use the "Native application" type.
/// The client secret is NOT needed for the device flow.
const GITHUB_CLIENT_ID: &str = "Ov23li9F2c6j3q2MQb8I";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    #[serde(rename = "access_token")]
    pub access_token: Option<String>,
    pub token_type: Option<String>,
    pub scope: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubUser {
    pub id: i64,
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
}

fn github_error_from_body(context: &str, status: reqwest::StatusCode, body: &str) -> String {
    if let Ok(value) = serde_json::from_str::<Value>(body) {
        if let Some(error_description) = value.get("error_description").and_then(Value::as_str) {
            return format!("{context}: {error_description}");
        }
        if let Some(message) = value.get("message").and_then(Value::as_str) {
            return format!("{context}: {message}");
        }
        if let Some(error) = value.get("error").and_then(Value::as_str) {
            return format!("{context}: {error}");
        }
    }

    let trimmed = body.trim();
    if trimmed.is_empty() {
        format!("{context}: GitHub returned HTTP {status}")
    } else {
        format!("{context}: GitHub returned HTTP {status}: {trimmed}")
    }
}

/// Step 1: Request a device code from GitHub
pub async fn request_device_code() -> Result<DeviceCodeResponse, String> {
    let client = Client::new();
    let resp = client
        .post(GITHUB_DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .header("User-Agent", "CodeCity-Desktop")
        .form(&[("client_id", GITHUB_CLIENT_ID), ("scope", "repo read:org")])
        .send()
        .await
        .map_err(|e| format!("Failed to request device code: {}", e))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read device code response: {}", e))?;

    if !status.is_success() {
        return Err(github_error_from_body(
            "Failed to request device code",
            status,
            &body,
        ));
    }

    let data: DeviceCodeResponse = serde_json::from_str(&body).map_err(|e| {
        github_error_from_body(
            &format!("Failed to parse device code response ({e})"),
            status,
            &body,
        )
    })?;

    Ok(data)
}

/// Step 2: Poll GitHub for the access token (user must authorize in browser first)
pub async fn poll_for_token(device_code: &str) -> Result<TokenResponse, String> {
    let client = Client::new();
    let resp = client
        .post(GITHUB_TOKEN_URL)
        .header("Accept", "application/json")
        .header("User-Agent", "CodeCity-Desktop")
        .form(&[
            ("client_id", GITHUB_CLIENT_ID),
            ("device_code", device_code),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to poll for token: {}", e))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read token response: {}", e))?;

    if !status.is_success() {
        return Err(github_error_from_body(
            "Failed to poll for token",
            status,
            &body,
        ));
    }

    let data: TokenResponse = serde_json::from_str(&body).map_err(|e| {
        github_error_from_body(
            &format!("Failed to parse token response ({e})"),
            status,
            &body,
        )
    })?;

    Ok(data)
}

/// Step 3: Get the authenticated GitHub user info
pub async fn get_github_user(token: &str) -> Result<GitHubUser, String> {
    let client = Client::new();
    let resp = client
        .get(GITHUB_API_USER_URL)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "CodeCity-Desktop")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch GitHub user: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GitHub API returned status {}", resp.status()));
    }

    let user: GitHubUser = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub user: {}", e))?;

    Ok(user)
}

pub async fn get_github_cli_token() -> Result<String, String> {
    let output = Command::new("gh")
        .args(["auth", "token"])
        .output()
        .await
        .map_err(|error| {
            format!(
                "GitHub device login is unavailable and GitHub CLI fallback failed. Install GitHub CLI and run `gh auth login --web --scopes repo,read:org`, then try again. ({error})"
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "GitHub device login is unavailable and no GitHub CLI session was found. Run `gh auth login --web --scopes repo,read:org`, then try again.".to_string()
        } else {
            format!(
                "GitHub device login is unavailable and GitHub CLI is not authenticated. Run `gh auth login --web --scopes repo,read:org`, then try again. ({stderr})"
            )
        });
    }

    let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if token.is_empty() {
        return Err(
            "GitHub CLI returned an empty token. Run `gh auth login --web --scopes repo,read:org`, then try again."
                .to_string(),
        );
    }

    Ok(token)
}
