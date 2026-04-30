use reqwest::Client;
use serde::{Deserialize, Serialize};

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

/// Step 1: Request a device code from GitHub
pub async fn request_device_code() -> Result<DeviceCodeResponse, String> {
    let client = Client::new();
    let resp = client
        .post(GITHUB_DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .form(&[("client_id", GITHUB_CLIENT_ID), ("scope", "repo read:org")])
        .send()
        .await
        .map_err(|e| format!("Failed to request device code: {}", e))?;

    let data: DeviceCodeResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse device code response: {}", e))?;

    Ok(data)
}

/// Step 2: Poll GitHub for the access token (user must authorize in browser first)
pub async fn poll_for_token(device_code: &str) -> Result<TokenResponse, String> {
    let client = Client::new();
    let resp = client
        .post(GITHUB_TOKEN_URL)
        .header("Accept", "application/json")
        .form(&[
            ("client_id", GITHUB_CLIENT_ID),
            ("device_code", device_code),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to poll for token: {}", e))?;

    let data: TokenResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

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
