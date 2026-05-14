//! App-layer wrappers around the pure `codecity-core` analysis engine.
//!
//! Pure analysis (parsing, network, layout) lives in `codecity-core`. This
//! module owns the persistence (db), GitHub HTTP fetches (github),
//! OAuth (auth), and pipeline orchestration (pipeline) that the desktop
//! app needs.

pub mod auth;
pub mod db;
pub mod github;
pub mod pipeline;

pub use auth::{get_github_cli_token, get_github_user, poll_for_token, request_device_code};
pub use db::Database;
pub use github::{
    fetch_commit_files, fetch_commits, fetch_file_content, fetch_repositories,
    fetch_trending_repositories, parse_github_url, CommitSummary,
};
pub use pipeline::{
    analyze, cancel_analysis, cancel_security_scan, enqueue_analyze, enqueue_refresh,
    enqueue_security_scan, AnalyzeResult,
};
pub use db::{FindingRecord, SecurityScanRecord};
