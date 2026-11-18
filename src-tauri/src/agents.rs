//! Agent mode: which coding agents have been working in a project, on which
//! files, and which of those files still have uncommitted changes.
//!
//! Everything is read from this machine and nothing is written or sent anywhere:
//! - Claude Code keeps one JSON-lines transcript per session under
//!   `~/.claude/projects/<folder>/`. Its `Edit`, `Write` and `Read` tool calls
//!   carry the absolute path of the file.
//! - Codex keeps one per session under `~/.codex/sessions/<y>/<m>/<d>/`. Its
//!   patches name each file on a `*** Update File: <path>` line.
//! - `git status` says which files in the project have uncommitted changes.
//!
//! The transcript formats are not documented, so every line is parsed
//! defensively: anything unexpected is skipped, never an error.

use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, SystemTime};

use once_cell::sync::Lazy;
use regex::Regex;
use serde::Serialize;
use serde_json::Value;

/// Sessions untouched for longer than this are not shown.
const SESSION_WINDOW: Duration = Duration::from_secs(12 * 60 * 60);
/// A session whose transcript changed this recently counts as working now.
const ACTIVE_WINDOW: Duration = Duration::from_secs(120);
/// Only the end of a transcript is read; long sessions run to hundreds of megabytes.
const TAIL_BYTES: u64 = 6 * 1024 * 1024;
const MAX_FILES_PER_SESSION: usize = 400;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentActivity {
    pub sessions: Vec<AgentSession>,
    /// Project-relative paths with uncommitted changes (empty when the folder is not a git repository).
    pub uncommitted: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSession {
    /// "claude" or "codex".
    pub agent: &'static str,
    pub id: String,
    pub active: bool,
    /// Seconds since the transcript last changed.
    pub idle_seconds: u64,
    /// The file of the most recent tool call, newest first in `files` too.
    pub current_file: Option<String>,
    pub files: Vec<AgentFile>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentFile {
    /// Project-relative, with forward slashes.
    pub path: String,
    /// True once the agent has edited the file; false while it has only read it.
    pub edited: bool,
    pub edits: u32,
    /// Timestamp of the latest touch, as written in the transcript (ISO 8601).
    pub at: String,
}

pub fn activity(root: &Path) -> AgentActivity {
    let mut sessions = Vec::new();
    if let Some(home) = dirs::home_dir() {
        sessions.extend(claude_sessions(&home.join(".claude").join("projects"), root));
        sessions.extend(codex_sessions(&home.join(".codex").join("sessions"), root));
    }
    sessions.retain(|session: &AgentSession| !session.files.is_empty());
    sessions.sort_by_key(|session| session.idle_seconds);
    AgentActivity {
        sessions,
        uncommitted: uncommitted_files(root),
    }
}

// ── Transcripts ────────────────────────────────────────────────────────────

/// Transcript files under `dir` (searched `depth` folders down) changed within the session window.
fn recent_transcripts(dir: &Path, depth: usize, found: &mut Vec<(PathBuf, Duration)>) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(meta) = entry.metadata() else { continue };
        if meta.is_dir() {
            if depth > 0 {
                recent_transcripts(&path, depth - 1, found);
            }
        } else if path.extension().is_some_and(|ext| ext == "jsonl") {
            let idle = meta
                .modified()
                .ok()
                .and_then(|modified| SystemTime::now().duration_since(modified).ok())
                .unwrap_or(Duration::ZERO);
            if idle <= SESSION_WINDOW {
                found.push((path, idle));
            }
        }
    }
}

/// The last `TAIL_BYTES` of a file as text, starting at a line boundary.
fn read_tail(path: &Path) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let len = file.metadata().ok()?.len();
    let start = len.saturating_sub(TAIL_BYTES);
    file.seek(SeekFrom::Start(start)).ok()?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).ok()?;
    let text = String::from_utf8_lossy(&bytes).into_owned();
    if start == 0 {
        return Some(text);
    }
    // The first line is cut off mid-way; drop it
    text.find('\n').map(|newline| text[newline + 1..].to_string())
}

/// `path` relative to the project, or None when it is outside it.
fn relative_to_root(root: &Path, path: &str, cwd: Option<&Path>) -> Option<String> {
    let candidate = Path::new(path.trim());
    let absolute = if candidate.is_absolute() {
        candidate.to_path_buf()
    } else {
        cwd?.join(candidate)
    };
    let relative = absolute.strip_prefix(root).ok()?;
    let text = relative.to_string_lossy().replace('\\', "/");
    (!text.is_empty() && !text.starts_with("..")).then_some(text)
}

/// Collects a session's file touches in the order they happened.
#[derive(Default)]
struct Touches {
    files: HashMap<String, AgentFile>,
    current: Option<String>,
}

impl Touches {
    fn record(&mut self, path: String, edited: bool, at: &str) {
        let file = self.files.entry(path.clone()).or_insert_with(|| AgentFile {
            path: path.clone(),
            edited: false,
            edits: 0,
            at: String::new(),
        });
        if edited {
            file.edited = true;
            file.edits += 1;
        }
        file.at = at.to_string();
        self.current = Some(path);
    }

    fn into_session(self, agent: &'static str, id: String, idle: Duration) -> AgentSession {
        let mut files: Vec<AgentFile> = self.files.into_values().collect();
        files.sort_by(|a, b| b.at.cmp(&a.at).then_with(|| a.path.cmp(&b.path)));
        files.truncate(MAX_FILES_PER_SESSION);
        AgentSession {
            agent,
            id,
            active: idle <= ACTIVE_WINDOW,
            idle_seconds: idle.as_secs(),
            current_file: self.current,
            files,
        }
    }
}

fn session_id(path: &Path) -> String {
    path.file_stem()
        .map(|stem| stem.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn claude_sessions(projects_dir: &Path, root: &Path) -> Vec<AgentSession> {
    let mut transcripts = Vec::new();
    recent_transcripts(projects_dir, 1, &mut transcripts);
    let root_text = root.to_string_lossy();

    transcripts
        .into_iter()
        .filter_map(|(path, idle)| {
            let text = read_tail(&path)?;
            let mut touches = Touches::default();
            for line in text.lines() {
                // Cheap filter before parsing: a tool call on a file in this project
                if !line.contains("\"tool_use\"") || !line.contains(root_text.as_ref()) {
                    continue;
                }
                let Ok(record) = serde_json::from_str::<Value>(line) else { continue };
                let at = record["timestamp"].as_str().unwrap_or_default();
                let Some(content) = record["message"]["content"].as_array() else { continue };
                for item in content {
                    if item["type"] != "tool_use" {
                        continue;
                    }
                    let edited = match item["name"].as_str() {
                        Some("Edit" | "Write" | "MultiEdit" | "NotebookEdit") => true,
                        Some("Read") => false,
                        _ => continue,
                    };
                    let input = &item["input"];
                    let Some(file) = input["file_path"].as_str().or_else(|| input["notebook_path"].as_str()) else {
                        continue;
                    };
                    if let Some(relative) = relative_to_root(root, file, None) {
                        touches.record(relative, edited, at);
                    }
                }
            }
            Some(touches.into_session("claude", session_id(&path), idle))
        })
        .collect()
}

/// `*** Update File: path` inside a JSON string: the path ends at the escaped newline or the quote.
static CODEX_PATCH_FILE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"\*\*\* (?:Update|Add|Delete) File: ([^\\"\n]+)"#).expect("valid regex"));

fn codex_sessions(sessions_dir: &Path, root: &Path) -> Vec<AgentSession> {
    let mut transcripts = Vec::new();
    recent_transcripts(sessions_dir, 3, &mut transcripts);

    transcripts
        .into_iter()
        .filter_map(|(path, idle)| {
            // The first line says which folder the session runs in; relative patch paths start there
            let cwd = codex_cwd(&path)?;
            if !cwd.starts_with(root) && !root.starts_with(&cwd) {
                return None;
            }
            let text = read_tail(&path)?;
            let mut touches = Touches::default();
            for line in text.lines() {
                if !line.contains("*** ") {
                    continue;
                }
                let at = serde_json::from_str::<Value>(line)
                    .ok()
                    .and_then(|record| record["timestamp"].as_str().map(str::to_string))
                    .unwrap_or_default();
                for capture in CODEX_PATCH_FILE.captures_iter(line) {
                    if let Some(relative) = relative_to_root(root, &capture[1], Some(&cwd)) {
                        touches.record(relative, true, &at);
                    }
                }
            }
            Some(touches.into_session("codex", session_id(&path), idle))
        })
        .collect()
}

fn codex_cwd(path: &Path) -> Option<PathBuf> {
    let mut file = File::open(path).ok()?;
    let mut head = vec![0_u8; 64 * 1024];
    let read = file.read(&mut head).ok()?;
    let text = String::from_utf8_lossy(&head[..read]);
    let first = text.lines().next()?;
    // The first line can be longer than what was read; find the field without parsing all of it
    static CWD: Lazy<Regex> = Lazy::new(|| Regex::new(r#""cwd"\s*:\s*"((?:[^"\\]|\\.)*)""#).expect("valid regex"));
    let raw = CWD.captures(first)?.get(1)?.as_str();
    let cwd: String = serde_json::from_str(&format!("\"{raw}\"")).ok()?;
    Some(PathBuf::from(cwd))
}

// ── Git ────────────────────────────────────────────────────────────────────

/// Paths `git status` reports as changed or untracked, relative to `root`.
fn uncommitted_files(root: &Path) -> Vec<String> {
    let Ok(output) = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(["status", "--porcelain", "-z", "--untracked-files=all"])
        .output()
    else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }
    // `git status` paths are relative to the repository's top folder, which can be above `root`
    let prefix = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(["rev-parse", "--show-prefix"])
        .output()
        .ok()
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .unwrap_or_default();

    let text = String::from_utf8_lossy(&output.stdout);
    let mut entries = text.split('\0');
    let mut paths = Vec::new();
    while let Some(entry) = entries.next() {
        if entry.len() < 4 {
            continue;
        }
        let (status, path) = entry.split_at(3);
        // A rename or copy is followed by its old path as a separate entry
        if status.starts_with('R') || status.starts_with('C') {
            entries.next();
        }
        if let Some(relative) = path.strip_prefix(prefix.as_str()) {
            paths.push(relative.to_string());
        }
    }
    paths
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paths_outside_the_project_are_dropped() {
        let root = Path::new("/work/app");
        assert_eq!(relative_to_root(root, "/work/app/src/main.rs", None).as_deref(), Some("src/main.rs"));
        assert_eq!(relative_to_root(root, "/work/other/main.rs", None), None);
        assert_eq!(relative_to_root(root, "src/lib.rs", Some(Path::new("/work/app"))).as_deref(), Some("src/lib.rs"));
        assert_eq!(relative_to_root(root, "src/lib.rs", None), None);
        assert_eq!(relative_to_root(root, "/work/app", None), None);
    }

    #[test]
    fn codex_patch_lines_name_their_files() {
        let line = r#"{"payload":{"input":"*** Begin Patch\n*** Update File: src/a.ts\n@@\n*** Add File: /work/app/b.ts\n"}}"#;
        let files: Vec<&str> = CODEX_PATCH_FILE.captures_iter(line).map(|c| c.get(1).unwrap().as_str()).collect();
        assert_eq!(files, ["src/a.ts", "/work/app/b.ts"]);
    }

    #[test]
    fn an_edit_after_a_read_marks_the_file_edited_and_current() {
        let mut touches = Touches::default();
        touches.record("a.ts".into(), false, "2026-01-01T00:00:01Z");
        touches.record("b.ts".into(), true, "2026-01-01T00:00:02Z");
        touches.record("a.ts".into(), true, "2026-01-01T00:00:03Z");
        let session = touches.into_session("claude", "s".into(), Duration::from_secs(5));
        assert!(session.active);
        assert_eq!(session.current_file.as_deref(), Some("a.ts"));
        assert_eq!(session.files[0].path, "a.ts");
        assert!(session.files[0].edited && session.files[0].edits == 1);
    }
}
