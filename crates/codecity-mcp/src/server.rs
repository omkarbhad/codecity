//! rmcp server. Owns the snapshot, exposes 7 tools.
//!
//! The tool surface is intentionally a set of graphify-style primitives —
//! not one big "answer my question" endpoint. The agent composes them:
//! `overview` to get oriented, `entry_points` / `hubs` to find the spine,
//! `explain` to dig into a node, `find_callers` / `find_callees` for
//! locality, `find_path` for connectivity questions.

use codecity_core::layout::CitySnapshot;
use rmcp::{
    handler::server::{router::tool::ToolRouter, wrapper::Parameters},
    model::*,
    schemars,
    tool, tool_handler, tool_router, ErrorData as McpError, ServerHandler,
};
use serde::Deserialize;
use std::path::PathBuf;
use std::sync::Arc;

use crate::loader::SnapshotSource;
use crate::query::{AmbiguousResponse, RecentChangesError, Resolution, SourceError};

#[derive(Clone)]
pub struct CodecityMcp {
    snapshot: Arc<CitySnapshot>,
    source_label: String,
    /// Filesystem root for `get_source` reads. `None` when launched with
    /// `--snapshot path.json` and no `--source-root` override — the source
    /// tool then returns a clear "no source root configured" error rather
    /// than silently failing or guessing a path.
    source_root: Option<PathBuf>,
    // Used by rmcp's expanded `#[tool_handler]` impl; the dead-code analyzer
    // doesn't see through the macro, so suppress the warning rather than
    // pretend the field is optional.
    #[allow(dead_code)]
    tool_router: ToolRouter<CodecityMcp>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct NameArg {
    /// File path (e.g. `crates/foo/src/bar.rs`) or bare symbol name
    /// (e.g. `from_path`). For symbols, the name must be unique across
    /// the codebase — use `find_callers` / `find_callees` on a more
    /// specific name when ambiguous.
    pub name: String,
    /// Cap how many neighbors to return on each side. Defaults to 25.
    #[serde(default)]
    pub max_neighbors: Option<usize>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct PathArg {
    /// Source file path or symbol name. Same resolution rules as `explain`.
    pub from: String,
    /// Target file path or symbol name.
    pub to: String,
    /// Follow edges in their actual direction (default true). Set false to
    /// find any connectivity regardless of who calls whom — useful for
    /// "are these in the same neighborhood?" rather than "does X reach Z?".
    #[serde(default)]
    pub directed: Option<bool>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct LimitArg {
    /// Cap the result count. Defaults to 12.
    #[serde(default)]
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct CommunityArg {
    /// Either a Louvain community id (integer as string), or any node name
    /// in the community. The agent typically gets a community id from a
    /// previous `explain` call's response.
    pub member_or_id: String,
    /// Cap on member nodes returned. Defaults to 25.
    #[serde(default)]
    pub max_members: Option<usize>,
    /// Cap on cross-boundary edges returned. Defaults to 50.
    #[serde(default)]
    pub max_external_edges: Option<usize>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct SearchArg {
    /// Substring to look for in node labels and file paths
    /// (case-insensitive). Empty queries return nothing.
    pub query: String,
    /// Cap on results. Defaults to 25.
    #[serde(default)]
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct RecentChangesArg {
    /// Look back this many days. Defaults to 14.
    #[serde(default)]
    pub days: Option<u32>,
    /// Cap on results. Defaults to 25.
    #[serde(default)]
    pub limit: Option<usize>,
}

#[tool_router]
impl CodecityMcp {
    pub fn new(snapshot: CitySnapshot, source: SnapshotSource) -> Self {
        let source_label = match &source {
            SnapshotSource::File { snapshot, .. } => {
                format!("snapshot file {}", snapshot.display())
            }
            SnapshotSource::Repo(p) => format!("repo {}", p.display()),
        };
        let source_root = source.source_root().map(|p| p.to_path_buf());
        Self {
            snapshot: Arc::new(snapshot),
            source_label,
            source_root,
            tool_router: Self::tool_router(),
        }
    }

    #[tool(
        description = "High-level snapshot stats — file count, total functions/types, network size, community count, and the languages present. Always start here when reasoning about an unfamiliar codebase."
    )]
    async fn overview(&self) -> Result<CallToolResult, McpError> {
        let result = crate::query::overview(&self.snapshot);
        json_result(&result)
    }

    #[tool(
        description = "Files that nothing imports — the top of the call/import tree. Useful for finding the public API surface, CLI entry points, test entry points, and any orphaned-but-shipped modules."
    )]
    async fn entry_points(
        &self,
        Parameters(args): Parameters<LimitArg>,
    ) -> Result<CallToolResult, McpError> {
        let limit = args.limit.unwrap_or(12);
        let result = crate::query::entry_points(&self.snapshot, limit);
        json_result(&result)
    }

    #[tool(
        description = "The most-imported files — load-bearing utilities every other module pulls in. Touching a hub safely usually requires understanding all of its callers."
    )]
    async fn hubs(
        &self,
        Parameters(args): Parameters<LimitArg>,
    ) -> Result<CallToolResult, McpError> {
        let limit = args.limit.unwrap_or(12);
        let result = crate::query::hubs(&self.snapshot, limit);
        json_result(&result)
    }

    #[tool(
        description = "Describe one file or symbol and its immediate neighborhood: callers, callees, and other members of its Louvain community. \
                       Accepts a file path or a bare symbol name. Ambiguous bare names return a candidate list — pick a more specific id and retry. \
                       Example: `explain crates/core/src/lib.rs` → {node: {...}, callers: [...], callees: [...], community_siblings: [...]}."
    )]
    async fn explain(
        &self,
        Parameters(args): Parameters<NameArg>,
    ) -> Result<CallToolResult, McpError> {
        let max = args.max_neighbors.unwrap_or(25);
        resolve_to_result(crate::query::explain(&self.snapshot, &args.name, max), &args.name)
    }

    #[tool(
        description = "Symbols/files that call into the named target, sorted by total degree (heaviest callers first). Use to estimate blast radius before changing a function or file. \
                       Example: `find_callers parse_url limit=10` → [{id, label, kind, file_path, in_degree, out_degree, community}, ...]."
    )]
    async fn find_callers(
        &self,
        Parameters(args): Parameters<NameArg>,
    ) -> Result<CallToolResult, McpError> {
        let limit = args.max_neighbors.unwrap_or(25);
        resolve_to_result(
            crate::query::find_callers(&self.snapshot, &args.name, limit),
            &args.name,
        )
    }

    #[tool(
        description = "What the named symbol/file calls into, sorted by total degree. Use to understand downstream dependencies before reading a function. \
                       Example: `find_callees authenticate` → [{id, label, file_path, ...}]."
    )]
    async fn find_callees(
        &self,
        Parameters(args): Parameters<NameArg>,
    ) -> Result<CallToolResult, McpError> {
        let limit = args.max_neighbors.unwrap_or(25);
        resolve_to_result(
            crate::query::find_callees(&self.snapshot, &args.name, limit),
            &args.name,
        )
    }

    #[tool(
        description = "Shortest path between two nodes (BFS, capped at 10 hops). Each step is annotated with the edge kind (`calls` / `imports`) so you can tell a real call chain from an import-only neighborhood. \
                       Set `directed=false` to find any connectivity (both directions); default `directed=true` answers 'does X actually reach Z?'. \
                       Example: `find_path from=auth.rs to=db.rs` → {hops: 3, directed: true, steps: [{type:'node',...}, {type:'edge',kind:'calls'}, {type:'node',...}, ...]}."
    )]
    async fn find_path(
        &self,
        Parameters(args): Parameters<PathArg>,
    ) -> Result<CallToolResult, McpError> {
        let directed = args.directed.unwrap_or(true);
        match crate::query::find_path(&self.snapshot, &args.from, &args.to, directed) {
            Some(result) => json_result(&result),
            None => Ok(CallToolResult::success(vec![Content::text(format!(
                "no {} path found between {} and {} within 10 hops",
                if directed { "directed" } else { "undirected" },
                args.from,
                args.to,
            ))])),
        }
    }

    #[tool(
        description = "Read source code for a file or symbol. For symbol nodes returns just the function/class/type body via the snapshot's line span; for file nodes returns the whole file. Falls back to the whole file when no symbol span is available. \
                       Requires the server to know where the source lives (`--repo` mode, or `--source-root` with `--snapshot`). \
                       Example: `get_source from_path` → {file_path, start_line: 186, end_line: 199, content: 'pub fn from_path(...) {...}', is_symbol_body: true}."
    )]
    async fn get_source(
        &self,
        Parameters(args): Parameters<NameArg>,
    ) -> Result<CallToolResult, McpError> {
        match crate::query::get_source(
            &self.snapshot,
            self.source_root.as_deref(),
            &args.name,
        ) {
            Ok(result) => json_result(&result),
            Err(SourceError::NoSourceRoot) => Ok(CallToolResult::success(vec![Content::text(
                "no source root configured — relaunch with `--repo <path>` or `--snapshot file.json --source-root <path>`",
            )])),
            Err(SourceError::FileMetadataMissing) => not_found(&args.name),
            Err(SourceError::Io(msg)) => Ok(CallToolResult::success(vec![Content::text(msg)])),
            Err(SourceError::Resolution(r)) => resolution_to_result(r, &args.name),
        }
    }

    #[tool(
        description = "Members of one Louvain community plus the edges that cross its boundary. Use to reason about a subsystem as a unit — 'what does this cluster depend on / who depends on this cluster?'. \
                       The argument is either a community id (integer) or any node name; for the latter we look up the node's community. \
                       Example: `community auth.rs` → {id, size, members: [...], external_edges: [{from, to, kind, direction}, ...]}."
    )]
    async fn community(
        &self,
        Parameters(args): Parameters<CommunityArg>,
    ) -> Result<CallToolResult, McpError> {
        let max_members = args.max_members.unwrap_or(25);
        let max_edges = args.max_external_edges.unwrap_or(50);
        resolve_to_result(
            crate::query::community(&self.snapshot, &args.member_or_id, max_members, max_edges),
            &args.member_or_id,
        )
    }

    #[tool(
        description = "Find nodes whose label or file path contains a substring (case-insensitive). Use to discover names before calling other tools — 'find anything related to auth' → `search_symbols auth`. \
                       Example: `search_symbols parse limit=8` → [{id, label, kind, file_path, in_degree, out_degree, community}, ...]."
    )]
    async fn search_symbols(
        &self,
        Parameters(args): Parameters<SearchArg>,
    ) -> Result<CallToolResult, McpError> {
        let limit = args.limit.unwrap_or(25);
        let result = crate::query::search_symbols(&self.snapshot, &args.query, limit);
        json_result(&result)
    }

    #[tool(
        description = "Files modified in the last N days (via `git log --name-only`), ranked by edit count. Each entry is annotated with whether the file appears in the snapshot and its degree, so you can spot 'hot AND load-bearing' files at a glance. \
                       Requires the source root to be a git repo (`--repo` mode, or `--snapshot file.json --source-root <git-repo>`). \
                       Example: `recent_changes days=7 limit=10` → [{path, edits: 12, in_snapshot: true, degree: 47}, ...]."
    )]
    async fn recent_changes(
        &self,
        Parameters(args): Parameters<RecentChangesArg>,
    ) -> Result<CallToolResult, McpError> {
        let days = args.days.unwrap_or(14);
        let limit = args.limit.unwrap_or(25);
        match crate::query::recent_changes(&self.snapshot, self.source_root.as_deref(), days, limit) {
            Ok(rows) => json_result(&rows),
            Err(RecentChangesError::NoSourceRoot) => Ok(CallToolResult::success(vec![Content::text(
                "no source root configured — relaunch with `--repo <path>` or `--snapshot file.json --source-root <path>`",
            )])),
            Err(RecentChangesError::NotAGitRepo(p)) => Ok(CallToolResult::success(vec![Content::text(
                format!("source root `{p}` is not a git repository"),
            )])),
            Err(RecentChangesError::GitFailed(msg)) => Ok(CallToolResult::success(vec![Content::text(msg)])),
        }
    }
}

#[tool_handler]
impl ServerHandler for CodecityMcp {
    fn get_info(&self) -> ServerInfo {
        ServerInfo::new(
            ServerCapabilities::builder().enable_tools().build(),
        )
        // Identify ourselves as `codecity-mcp` rather than rmcp's default
        // `from_build_env()` which reports `rmcp` (the SDK crate name).
        // Clients route, cache, and display by serverInfo.name — they
        // need to see *our* identity, not the transport library's.
        .with_server_info(Implementation::new(
            "codecity-mcp",
            env!("CARGO_PKG_VERSION"),
        ))
        .with_protocol_version(ProtocolVersion::V_2024_11_05)
        .with_instructions(format!(
            "codecity-mcp — query a code-graph snapshot of {}. \
             Start with `overview` for orientation, then use `entry_points` / `hubs` to find architecturally important files. \
             For specific files or symbols, use `explain` (one-shot context), `find_callers` / `find_callees` (focused lists), or `get_source` (read the actual code). \
             Use `find_path` (directed by default; tagged with `calls` / `imports` per step) to ask connectivity questions. \
             Use `community` to see a subsystem as a unit; use `search_symbols` to discover names by substring before drilling in. \
             Resolution accepts file paths and unique bare symbol names; ambiguous names return a candidate list — pick one and retry. \
             `get_source` requires source-root configuration{}.",
            self.source_label,
            if self.source_root.is_some() {
                ""
            } else {
                " (currently unavailable — relaunch with --repo or --source-root)"
            }
        ))
    }
}

/// Serialize a typed result and emit it as both structured content (for
/// rmcp ≥ 0.4 clients that consume `structured_content` directly) and a
/// pretty-printed text mirror (for older or text-only clients). The two
/// always describe the same payload — `CallToolResult::structured` does
/// the mirroring internally.
fn json_result<T: serde::Serialize>(value: &T) -> Result<CallToolResult, McpError> {
    let json = serde_json::to_value(value)
        .map_err(|e| McpError::internal_error(format!("serialization failed: {e}"), None))?;
    Ok(CallToolResult::structured(json))
}

/// Map any tool that returns `Result<T, Resolution>` into a single response
/// shape. On Ambiguous, hands the agent a candidate list so it can pick a
/// more specific id and retry — much better UX than a flat "not found."
fn resolve_to_result<T: serde::Serialize>(
    result: Result<T, Resolution>,
    query: &str,
) -> Result<CallToolResult, McpError> {
    match result {
        Ok(value) => json_result(&value),
        Err(r) => resolution_to_result(r, query),
    }
}

fn resolution_to_result(r: Resolution, query: &str) -> Result<CallToolResult, McpError> {
    match r {
        Resolution::NotFound => not_found(query),
        Resolution::Ambiguous(candidates) => {
            let body = AmbiguousResponse {
                query: query.to_string(),
                message: format!(
                    "'{query}' matches {} nodes; retry with a specific id from `candidates`",
                    candidates.len()
                ),
                candidates,
            };
            json_result(&body)
        }
    }
}

fn not_found(name: &str) -> Result<CallToolResult, McpError> {
    Ok(CallToolResult::success(vec![Content::text(format!(
        "no node found for '{name}' (file path or unique symbol name expected)"
    ))]))
}
