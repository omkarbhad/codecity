//! # codecity-mcp
//!
//! MCP server exposing codecity snapshot queries to LLM agents over stdio.
//!
//! Same data shape graphify uses (file + symbol nodes, call edges,
//! Louvain communities). Tools are graphify-style primitives the agent
//! composes — `overview`, `explain`, `find_path`, `find_callers`,
//! `find_callees`, `entry_points`, `hubs` — rather than one big
//! "answer my question" endpoint.
//!
//! Snapshot is loaded once at startup from either a pre-baked JSON file
//! (`--snapshot path.json`) or a fresh analysis of a corpus (`--repo path/`).

pub mod loader;
pub mod query;
pub mod server;
