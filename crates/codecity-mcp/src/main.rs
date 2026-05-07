//! codecity-mcp binary. Speaks MCP over stdio.
//!
//! Logging goes to stderr — stdout is reserved for the JSON-RPC protocol
//! frames rmcp sends. Mixing log lines into stdout corrupts the wire and
//! causes the client to drop the connection silently.

use anyhow::{bail, Context, Result};
use clap::Parser;
use codecity_mcp::{loader, server::CodecityMcp};
use rmcp::{transport::stdio, ServiceExt};
use std::path::PathBuf;

#[derive(Debug, Parser)]
#[command(
    name = "codecity-mcp",
    about = "MCP server exposing codecity snapshot queries to LLM agents."
)]
struct Args {
    /// Path to a pre-baked CitySnapshot JSON file. Mutually exclusive with --repo.
    #[arg(long, conflicts_with = "repo")]
    snapshot: Option<PathBuf>,

    /// Path to a code repository to analyze on startup. Mutually exclusive with --snapshot.
    #[arg(long, conflicts_with = "snapshot")]
    repo: Option<PathBuf>,

    /// Override the directory `get_source` reads file contents from. Only
    /// meaningful with `--snapshot` (when `--repo` is used the repo path
    /// already serves as the source root). Useful when the snapshot was
    /// generated against a different machine and you've checked the same
    /// commit out locally.
    #[arg(long, requires = "snapshot")]
    source_root: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Logs to stderr only — stdout is the MCP wire.
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .target(env_logger::Target::Stderr)
        .init();

    let args = Args::parse();
    let (snapshot, source) = match (&args.snapshot, &args.repo) {
        (Some(p), None) => {
            log::info!("loading snapshot from {}", p.display());
            (
                loader::load_from_file(p)?,
                loader::SnapshotSource::File {
                    snapshot: p.clone(),
                    source_root: args.source_root.clone(),
                },
            )
        }
        (None, Some(p)) => {
            log::info!("analyzing repo at {}", p.display());
            let started = std::time::Instant::now();
            let snap = loader::load_from_repo(p)
                .with_context(|| format!("repo analysis failed: {}", p.display()))?;
            log::info!(
                "analyzed {} files in {:.2}s",
                snap.stats.total_files,
                started.elapsed().as_secs_f64()
            );
            (snap, loader::SnapshotSource::Repo(p.clone()))
        }
        (None, None) => bail!("specify either --snapshot <path> or --repo <path>"),
        (Some(_), Some(_)) => unreachable!("clap conflicts_with prevents this"),
    };

    log::info!(
        "codecity-mcp ready: {} files, {} network nodes, {} edges",
        snapshot.stats.total_files,
        snapshot.network.nodes.len(),
        snapshot.network.edges.len()
    );

    let service = CodecityMcp::new(snapshot, source).serve(stdio()).await?;
    service.waiting().await?;
    Ok(())
}
