//! # codecity-core
//!
//! Pure code-analysis engine. Given a corpus of source files, produces a
//! [`CitySnapshot`] containing:
//!   - Per-file parsed structure (functions, classes, types, imports, complexity)
//!   - Resolved import graph (TS path aliases, Zig dep map, Python package paths)
//!   - Network analysis (Louvain communities, entry points, hubs)
//!   - Spatial layout (district positions, FCoSE network coordinates)
//!
//! Zero I/O. Zero database. Zero HTTP. Reusable from a desktop app, CLI,
//! GitHub Action, MCP server, or anywhere else.
//!
//! ## Quick start
//!
//! ```no_run
//! use codecity_core::{
//!     create_snapshot, parse_files, resolve_internal_imports_full, TsConfigAliases, ZigDeps,
//! };
//!
//! let files: Vec<(String, String)> = vec![
//!     ("src/main.rs".to_string(), "fn main() {}".to_string()),
//! ];
//! let mut parsed = parse_files(&files, None);
//! resolve_internal_imports_full(&mut parsed, &TsConfigAliases::empty(), &ZigDeps::empty());
//! let snapshot = create_snapshot(parsed, vec![]);
//! println!("{} files, {} communities",
//!     snapshot.stats.total_files,
//!     snapshot.network.communities.len());
//! ```
//!
//! See `schemas/network.yaml` and `schemas/city.yaml` in the repo root
//! for the full data contract.

pub mod discovery;
pub mod layout;
pub mod network;
pub mod parser;

// ── Public entry points ───────────────────────────────────────────────────
//
// Top-level re-exports cover the common intake path: parse files, resolve
// imports, build a snapshot. Less-common types stay reachable via their
// owning module (e.g. `codecity_core::layout::Bounds`) but are not promoted
// to the root surface — keeping the root narrow makes the contract clearer.

pub use layout::{create_snapshot, recompute_snapshot, CitySnapshot, LayoutMode};
pub use parser::{
    parse_file_batch, parse_files, resolve_internal_imports_full, AnalysisParser, ParsedFile,
    TsConfigAliases, ZigDeps,
};
