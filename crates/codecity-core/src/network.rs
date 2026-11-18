// Network analysis: builds the file+symbol graph (graphify-style), runs
// Louvain community detection, computes entry points + hubs, and bakes a
// FCoSE layout. Everything is pre-computed in Rust so the frontend just
// renders the result.

use rayon::prelude::*;
use std::collections::{HashMap, HashSet, VecDeque};

use super::layout::{
    CommunitySummary, EntryPoint, FileData, HubRef, NetworkAnalysis, NetworkEdge,
    NetworkEdgeKind, NetworkNode, NetworkNodeKind,
};

const TOP_ENTRY_POINTS: usize = 12;
const TOP_HUBS: usize = 10;
const HUBS_PER_COMMUNITY: usize = 5;

/// Internal scratch type while building the node universe.
#[derive(Clone)]
struct NodeBuild {
    id: String,
    label: String,
    kind: NetworkNodeKind,
    file_idx: usize,
}


/// Build the symbol-rich network graph (graphify-style) and run Louvain +
/// FCoSE on it. Mutates `files` to stamp file-level degree/community/position
/// so non-network views still see them, then emits the full node + edge set
/// in the returned NetworkAnalysis.
pub fn compute_network_analysis(files: &mut [FileData]) -> NetworkAnalysis {
    if files.is_empty() {
        return NetworkAnalysis::default();
    }

    // Per-phase timing, opt-in via CODECITY_TIMING=1. Off by default so
    // we don't spam stderr in production; on for benchmarking + profiling
    // before deciding what to parallelize. Cheap when off (one env lookup
    // per `phase!()` call).
    let timing = std::env::var("CODECITY_TIMING").is_ok();
    // The last `phase!()` resets the timer and nothing reads it after that
    #[allow(unused_assignments)]
    let mut phase_start = std::time::Instant::now();
    macro_rules! phase {
        ($label:expr) => {
            if timing {
                eprintln!(
                    "  [network] {:<24} {:>7.1}ms",
                    $label,
                    phase_start.elapsed().as_secs_f64() * 1000.0
                );
                phase_start = std::time::Instant::now();
            }
        };
    }

    // ── 1. Build node universe ───────────────────────────────────────────
    // One node per file. One node per function/class/type within each file.
    // Symbol IDs are stable: "<file_path>::fn::<name>", etc. — collisions
    // within a file are deduped by name (we keep the first declaration).

    let mut nodes_build: Vec<NodeBuild> = Vec::with_capacity(files.len() * 4);
    let mut id_to_idx: HashMap<String, usize> = HashMap::new();
    let mut file_node_idx: Vec<usize> = vec![usize::MAX; files.len()];

    // Pass A: file nodes first, so they get low indices and stable ids.
    for (i, file) in files.iter().enumerate() {
        let id = file.path.clone();
        let label = file
            .path
            .rsplit('/')
            .next()
            .unwrap_or(file.path.as_str())
            .to_string();
        file_node_idx[i] = nodes_build.len();
        id_to_idx.insert(id.clone(), nodes_build.len());
        nodes_build.push(NodeBuild {
            id,
            label,
            kind: NetworkNodeKind::File,
            file_idx: i,
        });
    }

    // Pass B: symbol nodes. Skip files where the symbol set is huge (>50)
    // since those are usually generated/test fixtures and would dominate
    // the graph without adding signal.
    const MAX_SYMBOLS_PER_FILE: usize = 50;
    for (i, file) in files.iter().enumerate() {
        let mut local_seen: HashSet<(NetworkNodeKind, String)> = HashSet::new();
        let mut emitted = 0usize;

        let push_symbol =
            |kind: NetworkNodeKind,
             name: &str,
             nodes_build: &mut Vec<NodeBuild>,
             id_to_idx: &mut HashMap<String, usize>,
             local_seen: &mut HashSet<(NetworkNodeKind, String)>,
             emitted: &mut usize|
             -> bool {
                if *emitted >= MAX_SYMBOLS_PER_FILE {
                    return false;
                }
                if name.is_empty() {
                    return true;
                }
                let key = (kind, name.to_string());
                if !local_seen.insert(key) {
                    return true;
                }
                let prefix = match kind {
                    NetworkNodeKind::Function => "fn",
                    NetworkNodeKind::Class => "cls",
                    NetworkNodeKind::Type => "ty",
                    NetworkNodeKind::File => unreachable!(),
                };
                let id = format!("{}::{}::{}", file.path, prefix, name);
                if id_to_idx.contains_key(&id) {
                    return true;
                }
                let label = match kind {
                    NetworkNodeKind::Function => format!("{}()", name),
                    _ => name.to_string(),
                };
                id_to_idx.insert(id.clone(), nodes_build.len());
                nodes_build.push(NodeBuild {
                    id,
                    label,
                    kind,
                    file_idx: i,
                });
                *emitted += 1;
                true
            };

        for f in &file.functions {
            if !push_symbol(
                NetworkNodeKind::Function,
                &f.name,
                &mut nodes_build,
                &mut id_to_idx,
                &mut local_seen,
                &mut emitted,
            ) {
                break;
            }
        }
        for c in &file.classes {
            if !push_symbol(
                NetworkNodeKind::Class,
                &c.name,
                &mut nodes_build,
                &mut id_to_idx,
                &mut local_seen,
                &mut emitted,
            ) {
                break;
            }
        }
        for t in &file.types {
            if !push_symbol(
                NetworkNodeKind::Type,
                &t.name,
                &mut nodes_build,
                &mut id_to_idx,
                &mut local_seen,
                &mut emitted,
            ) {
                break;
            }
        }
    }

    let n = nodes_build.len();

    phase!("1.nodes");
    // ── 2. Build edges ───────────────────────────────────────────────────
    // file → imported file (kind: imports)
    // file → owned symbol     (kind: contains)
    let mut edges: Vec<(usize, usize, NetworkEdgeKind)> = Vec::new();

    for (i, file) in files.iter().enumerate() {
        let from = file_node_idx[i];
        for tgt in &file.imports {
            let Some(&to) = id_to_idx.get(tgt.as_str()) else {
                continue;
            };
            if from == to {
                continue;
            }
            edges.push((from, to, NetworkEdgeKind::Imports));
        }
    }

    // contains edges: walk symbol nodes and link back to their parent file
    for (idx, node) in nodes_build.iter().enumerate() {
        if matches!(node.kind, NetworkNodeKind::File) {
            continue;
        }
        let parent = file_node_idx[node.file_idx];
        edges.push((parent, idx, NetworkEdgeKind::Contains));
    }

    // ── Calls edges (graphify-style bare-name matching) ─────────────────
    // Build a global label index: lowercase symbol name → set of node indices.
    // Same name in multiple files maps to multiple targets — we'll emit an
    // edge to each (call resolution is intentionally fuzzy at this scale,
    // which is what produces graphify's dense semantic graph).
    let mut label_index: HashMap<String, Vec<usize>> = HashMap::new();
    for (idx, node) in nodes_build.iter().enumerate() {
        if matches!(node.kind, NetworkNodeKind::File) {
            continue;
        }
        // Strip the "()" suffix from function labels for matching against bare callees.
        let key = node
            .label
            .trim_end_matches("()")
            .trim_start_matches('.')
            .to_lowercase();
        if !key.is_empty() {
            label_index.entry(key).or_default().push(idx);
        }
    }

    // Pre-build per-file caller indices ONCE rather than rebuilding per
    // file. The old code was O(F · N) where F = file count, N = node count
    // — on openclaw (42k files, 115k nodes) that's ~5B comparisons and
    // dominated the network pipeline (~1s of phase 2). Single pass over
    // `nodes_build` now gives us the same lookup table in O(N).
    let mut local_callers_per_file: Vec<HashMap<String, usize>> =
        vec![HashMap::new(); files.len()];
    for (idx, node) in nodes_build.iter().enumerate() {
        if matches!(node.kind, NetworkNodeKind::File) {
            continue;
        }
        let key = node
            .label
            .trim_end_matches("()")
            .trim_start_matches('.')
            .to_lowercase();
        if key.is_empty() {
            continue;
        }
        local_callers_per_file[node.file_idx]
            .entry(key)
            .or_insert(idx);
    }

    // Per-file: locate the caller node (by file + function name) and emit
    // edges to every label_index hit for the callee.
    let mut emitted_call_pairs: HashSet<(usize, usize)> = HashSet::new();
    for (file_idx, file) in files.iter().enumerate() {
        if file.calls.is_empty() {
            continue;
        }
        let local_callers = &local_callers_per_file[file_idx];
        // Module-level calls (caller name empty) attach to the file node itself.
        let file_node = file_node_idx[file_idx];

        for call in &file.calls {
            let caller_idx = if call.caller.is_empty() {
                file_node
            } else {
                *local_callers
                    .get(&call.caller.to_lowercase())
                    .unwrap_or(&file_node)
            };
            let key = call.callee.to_lowercase();
            let Some(targets) = label_index.get(&key) else {
                continue;
            };

            // Graphify-style resolution: when a bare name matches symbols in
            // multiple files, the call is too ambiguous to attribute (every
            // language has a `new`, `default`, `from`, `to_string` defined in
            // dozens of places). Skip these — false positives drown out real
            // signal. Edges are only emitted when:
            //   1. The callee resolves to a unique file (high confidence), OR
            //   2. The caller's own file is one of the candidates (local match
            //      preferred — same as graphify's "scoped" resolution).
            // We also drop intra-file edges entirely; the file node already
            // visually contains its symbols, so caller→callee within one file
            // adds no architectural information.
            //
            // KNOWN BUG (openclaw audit, 2026-05-07): the "unique cross-file
            // match" path still produces false positives across language
            // boundaries on polyglot monorepos. Concrete example:
            //   - openclaw has `private fun JsonObject.string(key)` in a
            //     Kotlin file (extension method on JsonObject).
            //   - The parser stores it as a bare name `string` with no
            //     receiver type — indistinguishable from a global `string`.
            //   - That single Kotlin definition becomes the unique cross-file
            //     match for any TypeScript call site invoking `.string(key)`
            //     on an unrelated object → hundreds of bogus TS→Kotlin edges.
            // Two fixes worth landing together:
            //   (a) Skip cross-language edges by default. Real polyglot
            //       calls (FFI, RPC, JSI, JNI) are rare and would be better
            //       modeled as explicit edges via interop config.
            //   (b) Mark extension methods at parse time (Kotlin `fun X.foo`,
            //       Swift `extension X { func foo }`, Rust `impl X { fn foo }`,
            //       Python methods) and exclude them from the bare-name
            //       index — they're never callable as `foo()` from elsewhere
            //       without resolving the receiver type first.
            // Tracking in docs/TODO.md (#cross-lang-call-fp).
            let cross_file_targets: Vec<usize> = targets
                .iter()
                .copied()
                .filter(|&t| nodes_build[t].file_idx != file_idx)
                .collect();
            let resolved: &[usize] = if cross_file_targets.len() == 1 {
                &cross_file_targets[..]
            } else if cross_file_targets.is_empty() {
                continue;
            } else {
                // Ambiguous — too many candidates. Skip rather than fan out.
                continue;
            };

            for &tgt_idx in resolved {
                if tgt_idx == caller_idx {
                    continue;
                }
                if emitted_call_pairs.insert((caller_idx, tgt_idx)) {
                    edges.push((caller_idx, tgt_idx, NetworkEdgeKind::Calls));
                }
            }
        }
    }

    phase!("2.edges");
    // ── 3. Adjacency for analysis ────────────────────────────────────────
    //
    // `undirected` is the input to Louvain and must be **deterministic** —
    // `HashSet<usize>` iteration order is randomized per process, which
    // caused community counts to drift run-to-run on the same input
    // (Codex: "1552, 1548, 1535, and 413 for scoped src/ runs"). Build
    // sorted-deduped Vecs so neighbor enumeration is reproducible.
    let mut out_adj: Vec<Vec<usize>> = vec![Vec::new(); n];
    let mut in_adj: Vec<Vec<usize>> = vec![Vec::new(); n];
    let mut undirected_sets: Vec<HashSet<usize>> = vec![HashSet::new(); n];
    for &(s, t, _) in &edges {
        out_adj[s].push(t);
        in_adj[t].push(s);
        undirected_sets[s].insert(t);
        undirected_sets[t].insert(s);
    }
    let undirected: Vec<Vec<usize>> = undirected_sets
        .into_iter()
        .map(|set| {
            let mut v: Vec<usize> = set.into_iter().collect();
            v.sort_unstable();
            v
        })
        .collect();

    phase!("3.adjacency");
    // ── 4. Per-node degrees ──────────────────────────────────────────────
    let in_degrees: Vec<u32> = (0..n).map(|i| in_adj[i].len() as u32).collect();
    let out_degrees: Vec<u32> = (0..n).map(|i| out_adj[i].len() as u32).collect();

    // Stamp file-level degrees back onto FileData by rolling every edge in
    // the full graph up to its owning file. We deliberately count both
    // file↔file imports and symbol-level call edges (mapped to their file
    // owners) — without the latter, languages where files communicate via
    // calls rather than imports (Rust, Go, Zig) would show every file as
    // degree-zero, which broke the network view's "filter degree-0 nodes"
    // heuristic and made hub files invisible.
    //
    // `Contains` edges are skipped: every file contains its symbols, so
    // counting them would just inflate every file's degree by its symbol
    // count without conveying connectivity.
    let mut file_in: Vec<u32> = vec![0; files.len()];
    let mut file_out: Vec<u32> = vec![0; files.len()];
    let mut seen_file_pairs: HashSet<(usize, usize)> = HashSet::new();
    for &(s, t, kind) in &edges {
        if matches!(kind, NetworkEdgeKind::Contains) {
            continue;
        }
        let src_file = nodes_build[s].file_idx;
        let dst_file = nodes_build[t].file_idx;
        if src_file == dst_file {
            continue;
        }
        // Dedup at the file-pair level — many symbol calls between the same
        // two files should count once, not N times.
        if !seen_file_pairs.insert((src_file, dst_file)) {
            continue;
        }
        file_out[src_file] += 1;
        file_in[dst_file] += 1;
    }
    for (i, file) in files.iter_mut().enumerate() {
        file.in_degree = file_in[i];
        file.out_degree = file_out[i];
    }

    phase!("4.degrees");
    // ── 5. Louvain on the full graph ─────────────────────────────────────
    let communities = louvain(&undirected);

    // Stamp community back onto file nodes
    for (i, file) in files.iter_mut().enumerate() {
        let node_idx = file_node_idx[i];
        let any_neighbors = !undirected[node_idx].is_empty();
        file.community = if any_neighbors {
            communities[node_idx] as i32
        } else {
            -1
        };
    }

    phase!("5.louvain");
    // ── 6. No baked positions ────────────────────────────────────────────
    // Layout happens in the browser via vis-network's ForceAtlas2 — same
    // approach graphify uses. The earlier deterministic community-grid
    // layout produced a flat regular pattern that lost the "you can see
    // the architecture" property; with the now-pruned call graph (~5k
    // edges instead of ~190k) browser physics finishes in <1s and the
    // result is recognizably clustered. Snapshots ship `position: null`
    // for every node; the FE feeds them to vis-network without coords.
    let positions: HashMap<usize, (f32, f32)> = HashMap::new();

    // Stamp file positions back onto FileData (legacy field; symbol positions
    // live on the NetworkNode entries).
    for (i, file) in files.iter_mut().enumerate() {
        let node_idx = file_node_idx[i];
        if let Some(&(x, y)) = positions.get(&node_idx) {
            file.network_x = Some(x);
            file.network_y = Some(y);
        } else {
            file.network_x = None;
            file.network_y = None;
        }
    }

    phase!("6/7.nodes");
    // ── 7. Build the public NetworkNode list ─────────────────────────────
    // Pure per-node map — rayon `par_iter().enumerate()` preserves input
    // order on collect, so the resulting Vec is identical to the
    // sequential version. Small phase (4-10ms typical) but free.
    let network_nodes: Vec<NetworkNode> = nodes_build
        .par_iter()
        .enumerate()
        .map(|(idx, nb)| {
            let file_path = files[nb.file_idx].path.clone();
            let any_neighbors = !undirected[idx].is_empty();
            let community = if any_neighbors {
                communities[idx] as i32
            } else {
                -1
            };
            let pos = positions.get(&idx).copied();
            NetworkNode {
                id: nb.id.clone(),
                label: nb.label.clone(),
                kind: nb.kind,
                file_path,
                in_degree: in_degrees[idx],
                out_degree: out_degrees[idx],
                community,
                network_x: pos.map(|p| p.0),
                network_y: pos.map(|p| p.1),
            }
        })
        .collect();

    phase!("7.public_nodes");
    // ── 8. Public edges ──────────────────────────────────────────────────
    let network_edges: Vec<NetworkEdge> = edges
        .iter()
        .map(|&(s, t, kind)| NetworkEdge {
            source: nodes_build[s].id.clone(),
            target: nodes_build[t].id.clone(),
            kind,
        })
        .collect();

    phase!("8.public_edges");
    // ── 9. Communities ───────────────────────────────────────────────────
    let mut community_members: HashMap<i32, Vec<usize>> = HashMap::new();
    for (idx, _) in nodes_build.iter().enumerate() {
        let any_neighbors = !undirected[idx].is_empty();
        if any_neighbors {
            community_members
                .entry(communities[idx] as i32)
                .or_default()
                .push(idx);
        }
    }
    let mut ranked: Vec<(i32, Vec<usize>)> = community_members.into_iter().collect();
    ranked.sort_by(|a, b| b.1.len().cmp(&a.1.len()).then(a.0.cmp(&b.0)));

    let mut community_summaries = Vec::with_capacity(ranked.len());
    for (rank, (cid, mut members)) in ranked.into_iter().enumerate() {
        members.sort_by(|&a, &b| {
            let deg_a = in_degrees[a] + out_degrees[a];
            let deg_b = in_degrees[b] + out_degrees[b];
            deg_b
                .cmp(&deg_a)
                .then(nodes_build[a].id.cmp(&nodes_build[b].id))
        });
        let member_ids: Vec<String> = members.iter().map(|&i| nodes_build[i].id.clone()).collect();
        let hubs: Vec<String> = member_ids
            .iter()
            .take(HUBS_PER_COMMUNITY)
            .cloned()
            .collect();
        community_summaries.push(CommunitySummary {
            id: cid as u32,
            rank: rank as u32,
            size: member_ids.len() as u32,
            members: member_ids,
            hubs,
        });
    }

    phase!("9.communities");
    // ── 10. Entry points (file-only): in-degree 0 file nodes that import ≥2 files ──
    // Use file-level import counts so we don't surface "files that aren't imported
    // but contain symbols" — those are always in-degree 0 in the symbol model.
    // Each candidate entry point gets its own BFS over the (read-only)
    // adjacency list — embarrassingly parallel. Used to be the network
    // pipeline's hottest phase by ~2× on hermes-agent (251ms / 530ms total)
    // because we ran hundreds of BFS calls sequentially. Rayon gives a clean
    // win: BFS state is per-task, results are independent integers, and the
    // post-sort imposes determinism regardless of which thread finishes first.
    let candidates: Vec<usize> = (0..files.len())
        .filter(|&i| files[i].in_degree == 0 && files[i].out_degree >= 2)
        .collect();
    let mut entry_with_reach: Vec<(usize, u32)> = candidates
        .par_iter()
        .map(|&i| {
            let node_idx = file_node_idx[i];
            // Reach: BFS through file→file out edges only (skip contains edges to keep
            // semantics close to "what does this entry pull in by import").
            let reach = bfs_reach_files(&out_adj, &nodes_build, node_idx);
            (i, reach)
        })
        .collect();
    entry_with_reach.sort_by(|a, b| {
        b.1.cmp(&a.1)
            .then(files[b.0].out_degree.cmp(&files[a.0].out_degree))
            // Final tiebreak by file index — without it, two candidates
            // with identical (reach, out_degree) could swap in the parallel
            // collect order. Cheap, only kicks in on ties.
            .then(a.0.cmp(&b.0))
    });
    let entry_points: Vec<EntryPoint> = entry_with_reach
        .into_iter()
        .take(TOP_ENTRY_POINTS)
        .map(|(i, reach)| EntryPoint {
            path: files[i].path.clone(),
            out_degree: files[i].out_degree,
            reachable: reach,
        })
        .collect();

    phase!("10.entry_points");
    // ── 11. Hubs (file-only): top files by file→file in-degree ───────────
    let mut hub_candidates: Vec<usize> =
        (0..files.len()).filter(|&i| files[i].in_degree >= 3).collect();
    hub_candidates.sort_by(|&a, &b| {
        files[b]
            .in_degree
            .cmp(&files[a].in_degree)
            .then(files[a].path.cmp(&files[b].path))
    });
    let hubs: Vec<HubRef> = hub_candidates
        .into_iter()
        .take(TOP_HUBS)
        .map(|i| HubRef {
            path: files[i].path.clone(),
            in_degree: files[i].in_degree,
        })
        .collect();

    // File-pair edges: every cross-file (non-Contains) edge collapsed to its
    // owning file pair. Built from the same dedup set that drove file degrees,
    // so the two views (degree counts and edge list) are guaranteed consistent.
    // Kind is `Calls` because by construction we excluded `Contains`.
    let mut file_edges: Vec<NetworkEdge> = Vec::with_capacity(seen_file_pairs.len());
    for (src_file, dst_file) in seen_file_pairs {
        file_edges.push(NetworkEdge {
            source: files[src_file].path.clone(),
            target: files[dst_file].path.clone(),
            kind: NetworkEdgeKind::Calls,
        });
    }
    // Stable order for diffable snapshots.
    file_edges.sort_by(|a, b| a.source.cmp(&b.source).then(a.target.cmp(&b.target)));
    phase!("11.hubs+file_edges");

    NetworkAnalysis {
        communities: community_summaries,
        entry_points,
        hubs,
        nodes: network_nodes,
        edges: network_edges,
        file_edges,
    }
}

/// BFS from `start` through `adj` (directed), counting how many distinct
/// **owning files** are transitively reachable. Used for entry-point reach
/// which should reflect "files this entry pulls in" regardless of whether the
/// path goes file→file (via Imports) or file→symbol→symbol→…→symbol-in-file
/// (via Contains + Calls).
///
/// Previous implementation counted only nodes whose `kind == File`, but the
/// pruned call graph rarely produces direct file→file edges in non-import-
/// heavy languages (Rust, Go, Zig) — the BFS would walk file→its-symbols and
/// stop, returning `reachable: 0` for every entry point. We now map each
/// visited node back to its `file_idx` and count distinct files; the start
/// file is excluded so a self-only entry point counts 0.
fn bfs_reach_files(adj: &[Vec<usize>], nodes_build: &[NodeBuild], start: usize) -> u32 {
    let start_file = nodes_build[start].file_idx;
    let mut visited_nodes = HashSet::new();
    visited_nodes.insert(start);
    let mut visited_files = HashSet::new();
    let mut queue = VecDeque::new();
    queue.push_back(start);
    while let Some(cur) = queue.pop_front() {
        let cur_file = nodes_build[cur].file_idx;
        if cur_file != start_file {
            visited_files.insert(cur_file);
        }
        for &next in &adj[cur] {
            if visited_nodes.insert(next) {
                queue.push_back(next);
            }
        }
    }
    visited_files.len() as u32
}

// ────────────────────────────────────────────────────────────────────────────
// Louvain modularity-based community detection.
//
// Greedy single-level implementation: each node starts in its own community,
// then we iterate moving each node to the neighboring community that maximises
// modularity gain. Repeat until no improving move exists.
//
// For our scale (1k–10k nodes) this converges in a few passes and produces
// the same kinds of communities graphify gets. Each edge is unit-weight so
// modularity reduces to 1/(2m) * Σ [A_ij - (k_i*k_j)/(2m)] * δ(c_i,c_j).
// ────────────────────────────────────────────────────────────────────────────
fn louvain(undirected: &[Vec<usize>]) -> Vec<u32> {
    let n = undirected.len();
    let mut community: Vec<u32> = (0..n as u32).collect();
    if n == 0 {
        return community;
    }

    // Degree per node (sum of edge weights = neighbor count for unweighted)
    let degree: Vec<u32> = undirected.iter().map(|s| s.len() as u32).collect();
    let total_weight: u64 = degree.iter().map(|&d| d as u64).sum::<u64>(); // = 2m
    if total_weight == 0 {
        return community;
    }
    let two_m = total_weight as f64;

    // Sum of degrees of nodes inside each community (for modularity formula)
    let mut comm_degree: Vec<u64> = degree.iter().map(|&d| d as u64).collect();

    // Iterate until a full sweep produces zero moves
    for _ in 0..50 {
        let mut moved = false;
        for i in 0..n {
            let i_deg = degree[i] as f64;
            if i_deg == 0.0 {
                continue;
            }

            // Tally weight from i to each neighboring community (own community excluded).
            // BTreeMap (vs HashMap) so the candidate-community iteration order is
            // deterministic — equal-gain ties resolve to the lowest community id
            // every run, which is what makes the final community labeling
            // reproducible.
            let mut weight_to: std::collections::BTreeMap<u32, f64> =
                std::collections::BTreeMap::new();
            let mut weight_to_self = 0.0;
            let own = community[i];
            for &j in &undirected[i] {
                let cj = community[j];
                if cj == own {
                    weight_to_self += 1.0;
                } else {
                    *weight_to.entry(cj).or_insert(0.0) += 1.0;
                }
            }

            // Remove i from its current community for the move calculation
            comm_degree[own as usize] -= degree[i] as u64;

            // Best gain: ΔQ = (k_i,in / m) - (Σ_tot * k_i) / (2m^2)
            // We want max over candidate communities; staying put yields 0 baseline.
            let mut best_comm = own;
            let mut best_gain = 0.0;
            // Always consider staying (gain 0) — if no move improves, stay put.
            for (&cand_comm, &k_i_in) in weight_to.iter() {
                let sigma_tot = comm_degree[cand_comm as usize] as f64;
                let gain = (k_i_in / two_m) - (sigma_tot * i_deg) / (two_m * two_m);
                if gain > best_gain + 1e-10 {
                    best_gain = gain;
                    best_comm = cand_comm;
                }
            }
            // Also consider rejoining own (in case removing made it more attractive)
            let sigma_tot_own = comm_degree[own as usize] as f64;
            let own_gain =
                (weight_to_self / two_m) - (sigma_tot_own * i_deg) / (two_m * two_m);
            if own_gain > best_gain + 1e-10 {
                best_comm = own;
            }

            // Apply the move
            community[i] = best_comm;
            comm_degree[best_comm as usize] += degree[i] as u64;
            if best_comm != own {
                moved = true;
            }
        }
        if !moved {
            break;
        }
    }

    // Renumber communities densely (0..k)
    let mut remap: HashMap<u32, u32> = HashMap::new();
    let mut next_id = 0u32;
    for c in community.iter_mut() {
        let new_id = *remap.entry(*c).or_insert_with(|| {
            let id = next_id;
            next_id += 1;
            id
        });
        *c = new_id;
    }
    community
}

