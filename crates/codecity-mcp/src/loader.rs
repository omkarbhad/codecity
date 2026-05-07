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
pub fn load_from_repo(repo_dir: &Path, respect_gitignore: bool) -> Result<CitySnapshot> {
    if std::env::var("CODECITY_MCP_NO_CACHE").is_err() {
        if let Some(cached) = try_load_cached(repo_dir, respect_gitignore) {
            log::info!("snapshot cache hit for {}", repo_dir.display());
            return Ok(cached);
        }
    }
    let snap = analyze_repo_inner(repo_dir, respect_gitignore)?;
    if std::env::var("CODECITY_MCP_NO_CACHE").is_err() {
        if let Err(e) = try_save_cached(repo_dir, &snap, respect_gitignore) {
            // Cache write failures are non-fatal — log and continue.
            log::warn!("snapshot cache write failed: {e}");
        }
    }
    Ok(snap)
}

fn analyze_repo_inner(repo_dir: &Path, respect_gitignore: bool) -> Result<CitySnapshot> {
    let files = collect_files(repo_dir, respect_gitignore)?;
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
    // build.zig contributes in-tree module aliases via `b.addModule("name", ...)`.
    let build_files: Vec<(String, String)> = files
        .iter()
        .filter(|(p, _)| p.rsplit('/').next().unwrap_or(p) == "build.zig")
        .cloned()
        .collect();

    let aliases = TsConfigAliases::from_tsconfigs(&tsconfigs);
    let zig_deps = ZigDeps::from_zon_and_build_files(&zon_files, &build_files);

    let mut parsed = parse_files(&files, None);
    resolve_internal_imports_full(&mut parsed, &aliases, &zig_deps);
    Ok(create_snapshot(parsed, vec![]))
}

/// Collect `(relative_path, content)` pairs via the shared corpus walker.
/// `respect_gitignore` mirrors `--no-gitskip` on the CLI; default true.
fn collect_files(repo_dir: &Path, respect_gitignore: bool) -> Result<Vec<(String, String)>> {
    let opts = codecity_core::discovery::WalkOptions {
        respect_gitignore,
        ..Default::default()
    };
    Ok(codecity_core::discovery::walk_corpus(repo_dir, opts)
        .into_iter()
        .map(|f| (f.rel_path, f.content))
        .collect())
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
fn cache_key(repo_dir: &Path, respect_gitignore: bool) -> Option<String> {
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
    // machine don't collide. Include `respect_gitignore` in the suffix so
    // toggling `--no-gitskip` produces a different cache slot — same
    // commit + different filter scope = different snapshot.
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    abs.to_string_lossy().to_lowercase().hash(&mut hasher);
    let scope = if respect_gitignore { "gi" } else { "all" };
    Some(format!(
        "{:016x}-{}-{}.json",
        hasher.finish(),
        &sha[..sha.len().min(12)],
        scope
    ))
}

fn try_load_cached(repo_dir: &Path, respect_gitignore: bool) -> Option<CitySnapshot> {
    let key = cache_key(repo_dir, respect_gitignore)?;
    let path = cache_dir()?.join(key);
    if !path.exists() {
        return None;
    }
    let bytes = fs::read(&path).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn try_save_cached(
    repo_dir: &Path,
    snap: &CitySnapshot,
    respect_gitignore: bool,
) -> Result<()> {
    let Some(key) = cache_key(repo_dir, respect_gitignore) else {
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
