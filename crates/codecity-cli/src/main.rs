//! `codecity` — command-line interface for the codecity-core analysis engine.
//!
//! Subcommands:
//!   analyze <path> [--json] [-o out.json]
//!     Walk a directory, parse all supported source files, build the network
//!     analysis, and either print a human summary or dump the full snapshot.
//!
//!   network <path> [--communities|--entries|--hubs]
//!     Same parse pass, but print only the network analysis section.
//!
//!   inspect <snapshot.json> [--node <path>]
//!     Read a saved snapshot and pretty-print it (or one specific file).

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

use clap::{Parser, Subcommand};

use codecity_core::{
    create_snapshot, parse_file_batch, resolve_internal_imports_full, CitySnapshot,
    TsConfigAliases, ZigDeps,
};

#[derive(Parser)]
#[command(name = "codecity", version, about = "Analyze a codebase as a 3D city / dependency network.")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Analyze a directory and produce a CitySnapshot.
    Analyze {
        /// Path to the project root.
        path: PathBuf,
        /// Emit the full snapshot as JSON instead of a human summary.
        #[arg(long)]
        json: bool,
        /// Write JSON output to a file (implies --json).
        #[arg(short, long)]
        output: Option<PathBuf>,
        /// Pretty-print the JSON output (default when writing to a TTY).
        #[arg(long)]
        pretty: bool,
        /// Abort if analysis takes longer than this many seconds. Default 60s.
        /// Pass 0 to disable.
        #[arg(long, default_value_t = 60)]
        timeout: u64,
    },

    /// Show only the network analysis section of a fresh analysis.
    Network {
        path: PathBuf,
        /// List the top communities + their hub members.
        #[arg(long)]
        communities: bool,
        /// List entry points (files nothing imports).
        #[arg(long)]
        entries: bool,
        /// List hub files (most imported).
        #[arg(long)]
        hubs: bool,
        /// Abort if analysis takes longer than this many seconds. Default 60s.
        #[arg(long, default_value_t = 60)]
        timeout: u64,
    },

    /// Inspect a saved snapshot JSON without re-running analysis.
    Inspect {
        /// Path to a snapshot JSON file (as produced by `analyze --json`).
        snapshot: PathBuf,
        /// Show only the entry for one file path.
        #[arg(long)]
        node: Option<String>,
    },
}

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp(None)
        .format_target(false)
        .init();

    let cli = Cli::parse();
    let result = match cli.command {
        Command::Analyze {
            path,
            json,
            output,
            pretty,
            timeout,
        } => cmd_analyze(&path, json || output.is_some(), output, pretty, timeout),
        Command::Network {
            path,
            communities,
            entries,
            hubs,
            timeout,
        } => cmd_network(&path, communities, entries, hubs, timeout),
        Command::Inspect { snapshot, node } => cmd_inspect(&snapshot, node.as_deref()),
    };
    if let Err(err) = result {
        eprintln!("error: {err}");
        std::process::exit(1);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// analyze
// ────────────────────────────────────────────────────────────────────────────
fn cmd_analyze(
    path: &Path,
    json: bool,
    output: Option<PathBuf>,
    pretty: bool,
    timeout_secs: u64,
) -> Result<(), String> {
    let snapshot = analyze_with_timeout(path, timeout_secs)?;

    if json || output.is_some() {
        let serialized = if pretty || output.is_some() {
            serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?
        } else {
            serde_json::to_string(&snapshot).map_err(|e| e.to_string())?
        };
        match output {
            Some(out) => {
                fs::write(&out, serialized).map_err(|e| e.to_string())?;
                eprintln!("wrote snapshot → {}", out.display());
            }
            None => println!("{serialized}"),
        }
    } else {
        print_summary(&snapshot);
    }
    Ok(())
}

// ────────────────────────────────────────────────────────────────────────────
// network
// ────────────────────────────────────────────────────────────────────────────
fn cmd_network(
    path: &Path,
    communities: bool,
    entries: bool,
    hubs: bool,
    timeout_secs: u64,
) -> Result<(), String> {
    let snapshot = analyze_with_timeout(path, timeout_secs)?;
    let n = &snapshot.network;

    let want_default = !(communities || entries || hubs);

    if want_default || communities {
        println!("Communities ({}):", n.communities.len());
        for c in n.communities.iter().take(10) {
            println!(
                "  rank {:>2} (id {:>3}): {} members  hubs: {}",
                c.rank,
                c.id,
                c.size,
                c.hubs.iter().take(3).cloned().collect::<Vec<_>>().join(", ")
            );
        }
        if n.communities.len() > 10 {
            println!("  … and {} more", n.communities.len() - 10);
        }
    }

    if want_default || entries {
        println!("\nEntry points ({}):", n.entry_points.len());
        for e in &n.entry_points {
            println!(
                "  out={:<3} reach={:<4}  {}",
                e.out_degree, e.reachable, e.path
            );
        }
    }

    if want_default || hubs {
        println!("\nHubs ({}):", n.hubs.len());
        for h in &n.hubs {
            println!("  in={:<3}  {}", h.in_degree, h.path);
        }
    }

    Ok(())
}

// ────────────────────────────────────────────────────────────────────────────
// inspect
// ────────────────────────────────────────────────────────────────────────────
fn cmd_inspect(snapshot_path: &Path, node: Option<&str>) -> Result<(), String> {
    let raw = fs::read_to_string(snapshot_path).map_err(|e| e.to_string())?;
    let snapshot: CitySnapshot = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    if let Some(target) = node {
        match snapshot.files.iter().find(|f| f.path == target) {
            Some(f) => {
                let s = serde_json::to_string_pretty(f).map_err(|e| e.to_string())?;
                println!("{s}");
            }
            None => return Err(format!("no file with path {target} in snapshot")),
        }
    } else {
        print_summary(&snapshot);
    }
    Ok(())
}

// ────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────────

/// Run `analyze_dir` on a worker thread with a hard wall-clock timeout.
///
/// `secs == 0` disables the timeout. On timeout we leak the worker thread
/// (it's about to be killed when main exits anyway) and return an error
/// with how long the user waited and what stage we got stuck in.
fn analyze_with_timeout(dir: &Path, secs: u64) -> Result<CitySnapshot, String> {
    if secs == 0 {
        return analyze_dir(dir);
    }
    let dir = dir.to_path_buf();
    let (tx, rx) = mpsc::channel();
    let started = Instant::now();
    thread::spawn(move || {
        let _ = tx.send(analyze_dir(&dir));
    });
    match rx.recv_timeout(Duration::from_secs(secs)) {
        Ok(result) => result,
        Err(mpsc::RecvTimeoutError::Timeout) => Err(format!(
            "analysis exceeded {}s timeout (waited {:.1}s). Pass --timeout=0 to disable, or a larger value.",
            secs,
            started.elapsed().as_secs_f64()
        )),
        Err(mpsc::RecvTimeoutError::Disconnected) => {
            Err("analysis worker thread panicked".to_string())
        }
    }
}

fn analyze_dir(dir: &Path) -> Result<CitySnapshot, String> {
    if !dir.is_dir() {
        return Err(format!("not a directory: {}", dir.display()));
    }
    eprintln!("scanning {}", dir.display());
    let files = read_local_files(dir);
    eprintln!("discovered {} files", files.len());

    if files.is_empty() {
        return Err("no readable source files found".to_string());
    }

    // Capture tsconfigs + Zig zon files for resolver context.
    let tsconfigs: Vec<(String, String)> = files
        .iter()
        .filter(|(p, _)| {
            let n = p.rsplit('/').next().unwrap_or(p);
            n == "tsconfig.json"
                || n == "tsconfig.base.json"
                || (n.starts_with("tsconfig.") && n.ends_with(".json"))
                || n == "jsconfig.json"
        })
        .map(|(p, c)| (p.clone(), c.clone()))
        .collect();
    let zon_files: Vec<(String, String)> = files
        .iter()
        .filter(|(p, _)| p.rsplit('/').next().unwrap_or(p) == "build.zig.zon")
        .map(|(p, c)| (p.clone(), c.clone()))
        .collect();

    let aliases = TsConfigAliases::from_tsconfigs(&tsconfigs);
    let zig_deps = ZigDeps::from_zon_files(&zon_files);
    eprintln!(
        "tsconfig alias rules: {} | zig dep entries: {}",
        aliases.rule_count(),
        zig_deps.entry_count()
    );

    let t = std::time::Instant::now();
    let mut parsed = parse_file_batch(&files);
    eprintln!("parsed {} files in {:.2}s", parsed.len(), t.elapsed().as_secs_f64());

    let t = std::time::Instant::now();
    resolve_internal_imports_full(&mut parsed, &aliases, &zig_deps);
    eprintln!("resolved imports in {:.2}s", t.elapsed().as_secs_f64());

    let t = std::time::Instant::now();
    let snapshot = create_snapshot(parsed, vec![]);
    eprintln!("built snapshot (layout + network + FCoSE) in {:.2}s", t.elapsed().as_secs_f64());

    eprintln!(
        "snapshot: {} files · {} districts · {} communities · {} entry points",
        snapshot.stats.total_files,
        snapshot.districts.len(),
        snapshot.network.communities.len(),
        snapshot.network.entry_points.len()
    );
    Ok(snapshot)
}

fn print_summary(s: &CitySnapshot) {
    println!("Files:       {}", s.stats.total_files);
    println!("Lines:       {}", s.stats.total_lines);
    println!("Functions:   {}", s.stats.total_functions);
    println!("Classes:     {}", s.stats.total_classes);
    println!("Types:       {}", s.stats.total_types);
    println!("Imports:     {}", s.stats.total_imports);
    println!("External:    {}", s.stats.external_imports);
    println!("Districts:   {}", s.districts.len());
    println!("Communities: {}", s.network.communities.len());
    println!("Entries:     {}", s.network.entry_points.len());
    println!("Hubs:        {}", s.network.hubs.len());
}

/// Recursively collect text files under `base_dir`, returning `(rel_path, content)` pairs.
/// Skips obvious noise dirs and binary files.
fn read_local_files(base_dir: &Path) -> Vec<(String, String)> {
    let mut paths = Vec::new();
    collect_recursive(base_dir, &mut paths);
    let mut out = Vec::with_capacity(paths.len());
    for path in paths {
        let rel = path
            .strip_prefix(base_dir)
            .map(|p| p.to_string_lossy().replace('\\', "/").to_string())
            .unwrap_or_else(|_| path.to_string_lossy().to_string());
        if let Ok(bytes) = fs::read(&path) {
            if let Ok(content) = String::from_utf8(bytes) {
                if !content.is_empty() {
                    out.push((rel, content));
                }
            }
        }
    }
    out
}

fn collect_recursive(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();
        // CLI is conservative about dotfiles to avoid pulling in editor caches
        // and CI configs that bloat the corpus without adding signal. The
        // shared skip list catches the rest.
        if name.starts_with('.') {
            continue;
        }
        if codecity_core::discovery::should_skip_dir(name.as_ref()) {
            continue;
        }
        if path.is_dir() {
            collect_recursive(&path, out);
        } else if path.is_file() {
            out.push(path);
        }
    }
}
