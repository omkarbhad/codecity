//! Snapshot loading. The MCP server holds one immutable `CitySnapshot` for
//! its lifetime — every tool call queries that snapshot in-memory. We support
//! two startup modes so users can pick the right tradeoff:
//!
//! - **`--snapshot path.json`** — load a pre-baked snapshot. Fast startup,
//!   stable view of the codebase. Suits agents that should reason about a
//!   specific known-good state (CI, code review, post-mortem).
//! - **`--repo path/`** — run a fresh analysis on launch. Slower startup but
//!   always reflects the current working tree. Suits interactive use where
//!   the agent should see the user's latest edits.
//!
//! The loader returns the same `CitySnapshot` either way; consumers don't
//! know or care which path produced it.

use anyhow::{Context, Result};
use codecity_core::{
    create_snapshot, parse_files, resolve_internal_imports_full, CitySnapshot, TsConfigAliases,
    ZigDeps,
};
use std::fs;
use std::path::{Path, PathBuf};

/// Where the snapshot came from. Returned alongside the snapshot so the
/// server's `instructions` field can tell the agent which mode is active,
/// and so `get_source` knows where to look for file contents.
#[derive(Debug, Clone)]
pub enum SnapshotSource {
    File {
        snapshot: PathBuf,
        /// Optional override for resolving file contents on `get_source`
        /// calls. When `None`, source-reading tools return an explanatory
        /// "no source root configured" error rather than guessing.
        source_root: Option<PathBuf>,
    },
    Repo(PathBuf),
}

impl SnapshotSource {
    /// The base directory to resolve file paths against for `get_source`,
    /// or `None` if the server can't read source.
    pub fn source_root(&self) -> Option<&Path> {
        match self {
            SnapshotSource::File { source_root, .. } => source_root.as_deref(),
            SnapshotSource::Repo(p) => Some(p.as_path()),
        }
    }
}

/// Load a snapshot from a pre-baked JSON file.
///
/// The file must be a serialized `CitySnapshot` (the same shape
/// `codecity-cli analyze --json` writes). Schema version is checked
/// implicitly via serde — a mismatched shape fails fast on deserialization.
pub fn load_from_file(path: &Path) -> Result<CitySnapshot> {
    let bytes = fs::read(path)
        .with_context(|| format!("failed to read snapshot file: {}", path.display()))?;
    serde_json::from_slice(&bytes)
        .with_context(|| format!("snapshot file is not a valid CitySnapshot: {}", path.display()))
}

/// Build a snapshot from scratch by analyzing the given repo directory.
///
/// Mirrors `codecity-cli analyze`'s pipeline: walk the corpus respecting
/// the shared discovery rules, parse via tree-sitter, resolve imports,
/// then emit the snapshot. No DB writes, no network — pure in-memory.
///
/// Cache: when the repo is a git repo and its working tree is clean (no
/// uncommitted changes), we look in the user's cache dir for a snapshot
/// keyed on `(absolute_repo_path, HEAD_sha)`. Hit → load instantly. Miss
/// → analyze and write back. Set `CODECITY_MCP_NO_CACHE=1` to disable.
pub fn load_from_repo(repo_dir: &Path) -> Result<CitySnapshot> {
    if std::env::var("CODECITY_MCP_NO_CACHE").is_err() {
        if let Some(cached) = try_load_cached(repo_dir) {
            log::info!("snapshot cache hit for {}", repo_dir.display());
            return Ok(cached);
        }
    }
    let snap = analyze_repo_inner(repo_dir)?;
    if std::env::var("CODECITY_MCP_NO_CACHE").is_err() {
        if let Err(e) = try_save_cached(repo_dir, &snap) {
            // Cache write failures are non-fatal — log and continue.
            log::warn!("snapshot cache write failed: {e}");
        }
    }
    Ok(snap)
}

fn analyze_repo_inner(repo_dir: &Path) -> Result<CitySnapshot> {
    let files = collect_files(repo_dir)?;
    if files.is_empty() {
        anyhow::bail!(
            "no analyzable source files found under {}",
            repo_dir.display()
        );
    }

    // tsconfig + build.zig.zon discovery for cross-file import resolution.
    // Done here (not inside `parse_files`) because the parser is intentionally
    // ignorant of project-level config files.
    let tsconfigs: Vec<(String, String)> = files
        .iter()
        .filter(|(p, _)| {
            let n = p.rsplit('/').next().unwrap_or(p);
            n == "tsconfig.json"
                || n == "tsconfig.base.json"
                || (n.starts_with("tsconfig.") && n.ends_with(".json"))
                || n == "jsconfig.json"
        })
        .cloned()
        .collect();
    let zon_files: Vec<(String, String)> = files
        .iter()
        .filter(|(p, _)| p.rsplit('/').next().unwrap_or(p) == "build.zig.zon")
        .cloned()
        .collect();

    let aliases = TsConfigAliases::from_tsconfigs(&tsconfigs);
    let zig_deps = ZigDeps::from_zon_files(&zon_files);

    let mut parsed = parse_files(&files, None);
    resolve_internal_imports_full(&mut parsed, &aliases, &zig_deps);
    Ok(create_snapshot(parsed, vec![]))
}

/// Walk `repo_dir` collecting `(relative_path, content)` pairs for every
/// supported source file. Hidden directories (dot-prefixed) are skipped at
/// the directory level alongside the shared discovery skip list, matching
/// the CLI's behavior.
fn collect_files(repo_dir: &Path) -> Result<Vec<(String, String)>> {
    use codecity_core::discovery::{is_probably_binary, should_skip_dir, should_skip_file};

    let mut out = Vec::new();
    let mut stack = vec![repo_dir.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name();
            let name = name.to_string_lossy();

            if path.is_dir() {
                if name.starts_with('.') {
                    continue;
                }
                if should_skip_dir(name.as_ref()) {
                    continue;
                }
                stack.push(path);
                continue;
            }

            if !path.is_file() || should_skip_file(&path) {
                continue;
            }

            // Read + UTF-8 check + binary heuristic. The discovery filter
            // already excludes most binary extensions; this catches files
            // with text extensions that happen to contain NUL bytes.
            let bytes = match fs::read(&path) {
                Ok(b) => b,
                Err(_) => continue,
            };
            if is_probably_binary(&bytes) {
                continue;
            }
            let content = match String::from_utf8(bytes) {
                Ok(s) if !s.is_empty() => s,
                _ => continue,
            };
            let rel = path
                .strip_prefix(repo_dir)
                .map(|p| p.to_string_lossy().replace('\\', "/").to_string())
                .unwrap_or_else(|_| path.to_string_lossy().to_string());
            out.push((rel, content));
        }
    }
    Ok(out)
}

// ── Snapshot cache ─────────────────────────────────────────────────────────
//
// Repo analysis is the slow part of `--repo` startup (sub-second on small
// repos but tens of seconds on graphify-scale corpora). Caching keyed on
// `(absolute_repo_path, HEAD_sha)` makes restarts free when the user hasn't
// committed since the last run, which is the dominant case in interactive
// sessions. We deliberately *don't* cache when the working tree is dirty —
// the snapshot would lie about uncommitted changes.

fn cache_dir() -> Option<PathBuf> {
    // Prefer the OS cache dir (~/.cache on Linux, Library/Caches on macOS,
    // %LOCALAPPDATA% on Windows). Falls back to the temp dir so we still
    // cache something on systems without a cache home.
    dirs::cache_dir()
        .or_else(|| Some(std::env::temp_dir()))
        .map(|d| d.join("codecity-mcp/snapshots"))
}

/// Compute the cache key for a repo: lowercase the absolute path then hash
/// it together with the HEAD sha. Returns None if the repo isn't a git
/// repo or the working tree is dirty (don't cache stale views).
fn cache_key(repo_dir: &Path) -> Option<String> {
    use std::process::Command;

    let abs = std::fs::canonicalize(repo_dir).ok()?;
    if !abs.join(".git").exists() {
        return None;
    }

    let sha_out = Command::new("git")
        .arg("-C")
        .arg(&abs)
        .args(["rev-parse", "HEAD"])
        .output()
        .ok()?;
    if !sha_out.status.success() {
        return None;
    }
    let sha = String::from_utf8(sha_out.stdout).ok()?.trim().to_string();
    if sha.is_empty() {
        return None;
    }

    // Skip cache when there are uncommitted changes — `--porcelain` is
    // empty iff the tree is clean.
    let dirty_out = Command::new("git")
        .arg("-C")
        .arg(&abs)
        .args(["status", "--porcelain"])
        .output()
        .ok()?;
    if !dirty_out.stdout.is_empty() {
        return None;
    }

    // Hash the absolute path so two checkouts of the same repo on the same
    // machine don't collide.
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    abs.to_string_lossy().to_lowercase().hash(&mut hasher);
    Some(format!("{:016x}-{}.json", hasher.finish(), &sha[..sha.len().min(12)]))
}

fn try_load_cached(repo_dir: &Path) -> Option<CitySnapshot> {
    let key = cache_key(repo_dir)?;
    let path = cache_dir()?.join(key);
    if !path.exists() {
        return None;
    }
    let bytes = fs::read(&path).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn try_save_cached(repo_dir: &Path, snap: &CitySnapshot) -> Result<()> {
    let Some(key) = cache_key(repo_dir) else {
        return Ok(()); // dirty tree or non-git repo — silently skip
    };
    let dir = cache_dir().context("no cache dir available")?;
    fs::create_dir_all(&dir).with_context(|| format!("create cache dir: {}", dir.display()))?;
    let tmp = dir.join(format!(".{key}.tmp"));
    let final_path = dir.join(&key);
    let bytes = serde_json::to_vec(snap)?;
    fs::write(&tmp, &bytes)?;
    fs::rename(&tmp, &final_path)?;
    log::info!("snapshot cached at {}", final_path.display());
    Ok(())
}
