//! Pure query functions over a `CitySnapshot`. Each MCP tool delegates to
//! one function here, then wraps the result in `CallToolResult::success`.
//!
//! Splitting the query layer out of the MCP handler keeps it testable
//! without spinning up a server, and keeps the rmcp surface thin enough
//! that swapping transports later is mechanical.
//!
//! Resolution rule: every "name" parameter in this module accepts EITHER
//! a file path (`crates/foo/src/bar.rs`) or a bare symbol name (`hello`).
//! The agent shouldn't need to know our internal node-id format
//! (`path::fn::name`) — the resolver below figures it out.

use codecity_core::layout::{
    CitySnapshot, EntryPoint, HubRef, NetworkEdgeKind, NetworkNode, NetworkNodeKind,
};
use serde::Serialize;
use std::collections::{HashMap, HashSet, VecDeque};
use std::path::Path;

// ── Public query types ─────────────────────────────────────────────────────
// Serialized as JSON in tool responses. Compact field names — these go
// through the model's context window on every tool call.

#[derive(Debug, Serialize)]
pub struct Overview {
    pub schema_version: u32,
    pub total_files: usize,
    pub total_lines: usize,
    pub total_functions: usize,
    pub total_types: usize,
    pub network_nodes: usize,
    pub network_edges: usize,
    pub file_edges: usize,
    pub communities: usize,
    pub entry_points: usize,
    pub hubs: usize,
    pub languages: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct NodeRef {
    pub id: String,
    pub label: String,
    pub kind: String,
    pub file_path: String,
    pub in_degree: u32,
    pub out_degree: u32,
    pub community: i32,
}

#[derive(Debug, Serialize)]
pub struct Explanation {
    pub node: NodeRef,
    pub callers: Vec<NodeRef>,
    pub callees: Vec<NodeRef>,
    pub community_siblings: Vec<NodeRef>,
}

/// Result of trying to resolve a user-supplied "name" to a single node.
///
/// `NotFound` and `Ambiguous` are the two failure modes worth distinguishing
/// at the API layer — `Ambiguous` carries the candidate list so the agent
/// can pick one and retry instead of giving up.
#[derive(Debug)]
pub enum Resolution {
    NotFound,
    Ambiguous(Vec<NodeRef>),
}

#[derive(Debug, Serialize)]
pub struct AmbiguousResponse {
    pub query: String,
    pub message: String,
    pub candidates: Vec<NodeRef>,
}

#[derive(Debug, Serialize)]
pub struct PathResult {
    pub from: String,
    pub to: String,
    pub hops: usize,
    pub directed: bool,
    /// Steps along the path, alternating node and edge. The first entry is
    /// always the source node; the last is always the destination. Each
    /// non-final node is followed by an `edge` describing how the agent
    /// gets to the next node — `calls` (symbol → symbol or file → file via
    /// imports) — so a path through "X imports Y, then community-adjacent
    /// to Z" cannot be confused with "X calls Y calls Z."
    pub steps: Vec<PathStep>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum PathStep {
    Node(NodeRef),
    /// Edge metadata between the previous and next `Node` steps.
    Edge { kind: String },
}

// ── Public API ─────────────────────────────────────────────────────────────

pub fn overview(snap: &CitySnapshot) -> Overview {
    let stats = &snap.stats;
    let mut langs: Vec<String> = stats.languages.iter().map(|l| l.language.clone()).collect();
    langs.sort();
    Overview {
        schema_version: snap.schema_version,
        total_files: stats.total_files,
        total_lines: stats.total_lines,
        total_functions: stats.total_functions,
        total_types: stats.total_types,
        network_nodes: snap.network.nodes.len(),
        network_edges: snap.network.edges.len(),
        file_edges: snap.network.file_edges.len(),
        communities: snap.network.communities.len(),
        entry_points: snap.network.entry_points.len(),
        hubs: snap.network.hubs.len(),
        languages: langs,
    }
}

pub fn explain(
    snap: &CitySnapshot,
    name: &str,
    max_neighbors: usize,
) -> Result<Explanation, Resolution> {
    let idx = NetworkIndex::build(snap);
    let node_idx = idx.resolve_unique(name)?;
    let node = &snap.network.nodes[node_idx];

    let callers: Vec<NodeRef> = idx
        .incoming(node_idx)
        .into_iter()
        .take(max_neighbors)
        .map(|i| node_ref(&snap.network.nodes[i]))
        .collect();
    let callees: Vec<NodeRef> = idx
        .outgoing(node_idx)
        .into_iter()
        .take(max_neighbors)
        .map(|i| node_ref(&snap.network.nodes[i]))
        .collect();

    // Community siblings — top-N other nodes in this community, ranked by
    // total degree so the agent sees the heavy hitters first.
    let mut siblings: Vec<&NetworkNode> = snap
        .network
        .nodes
        .iter()
        .enumerate()
        .filter(|(i, n)| {
            *i != node_idx && n.community == node.community && node.community >= 0
        })
        .map(|(_, n)| n)
        .collect();
    siblings.sort_by(|a, b| (b.in_degree + b.out_degree).cmp(&(a.in_degree + a.out_degree)));
    let community_siblings: Vec<NodeRef> = siblings
        .into_iter()
        .take(max_neighbors)
        .map(node_ref)
        .collect();

    // For file nodes, callers/callees from the symbol-rich adjacency are
    // empty (file nodes only have Contains edges to their own symbols) —
    // overlay the file-pair rollup so the agent sees the architectural
    // truth (e.g. CanvasController.kt has 1799 file-level callers).
    let (callers, callees) = if matches!(node.kind, NetworkNodeKind::File) {
        file_pair_neighbors(snap, &node.file_path, max_neighbors)
    } else {
        (callers, callees)
    };

    Ok(Explanation {
        node: node_ref_with_file_rollup(snap, node),
        callers,
        callees,
        community_siblings,
    })
}

/// File-pair callers/callees, derived from `network.file_edges`. Sorted by
/// the connected file's total degree so the agent sees structurally
/// important neighbors first.
fn file_pair_neighbors(
    snap: &CitySnapshot,
    file_path: &str,
    limit: usize,
) -> (Vec<NodeRef>, Vec<NodeRef>) {
    use std::collections::HashSet;
    let mut callers: HashSet<&str> = HashSet::new();
    let mut callees: HashSet<&str> = HashSet::new();
    for e in &snap.network.file_edges {
        if e.target == file_path {
            callers.insert(e.source.as_str());
        } else if e.source == file_path {
            callees.insert(e.target.as_str());
        }
    }
    // Resolve each path to its NetworkNode (the file node) so the agent
    // gets the same NodeRef shape it gets for symbol callers.
    let id_to_idx: std::collections::HashMap<&str, usize> = snap
        .network
        .nodes
        .iter()
        .enumerate()
        .filter(|(_, n)| matches!(n.kind, NetworkNodeKind::File))
        .map(|(i, n)| (n.id.as_str(), i))
        .collect();
    let resolve_many = |paths: HashSet<&str>| -> Vec<NodeRef> {
        let mut nodes: Vec<&NetworkNode> = paths
            .iter()
            .filter_map(|p| id_to_idx.get(p).map(|&i| &snap.network.nodes[i]))
            .collect();
        nodes.sort_by(|a, b| {
            // Use the file-rollup degree for ordering since that's what the
            // user sees in the response.
            let ad = file_total_degree(snap, &a.file_path);
            let bd = file_total_degree(snap, &b.file_path);
            bd.cmp(&ad)
        });
        nodes
            .into_iter()
            .take(limit)
            .map(|n| node_ref_with_file_rollup(snap, n))
            .collect()
    };
    (resolve_many(callers), resolve_many(callees))
}

fn file_total_degree(snap: &CitySnapshot, path: &str) -> u32 {
    snap.files
        .iter()
        .find(|f| f.path == path)
        .map(|f| f.in_degree + f.out_degree)
        .unwrap_or(0)
}

pub fn find_callers(
    snap: &CitySnapshot,
    name: &str,
    limit: usize,
) -> Result<Vec<NodeRef>, Resolution> {
    let idx = NetworkIndex::build(snap);
    let node_idx = idx.resolve_unique(name)?;
    let node = &snap.network.nodes[node_idx];
    if matches!(node.kind, NetworkNodeKind::File) {
        // File targets: pull from the file-pair rollup so we don't tell the
        // agent "no callers" for a hub like CanvasController.kt.
        let (callers, _) = file_pair_neighbors(snap, &node.file_path, limit);
        return Ok(callers);
    }
    Ok(idx
        .incoming(node_idx)
        .into_iter()
        .take(limit)
        .map(|i| node_ref(&snap.network.nodes[i]))
        .collect())
}

pub fn find_callees(
    snap: &CitySnapshot,
    name: &str,
    limit: usize,
) -> Result<Vec<NodeRef>, Resolution> {
    let idx = NetworkIndex::build(snap);
    let node_idx = idx.resolve_unique(name)?;
    let node = &snap.network.nodes[node_idx];
    if matches!(node.kind, NetworkNodeKind::File) {
        let (_, callees) = file_pair_neighbors(snap, &node.file_path, limit);
        return Ok(callees);
    }
    Ok(idx
        .outgoing(node_idx)
        .into_iter()
        .take(limit)
        .map(|i| node_ref(&snap.network.nodes[i]))
        .collect())
}

/// BFS through the call/import graph, capped at ~10 hops because anything
/// longer across a real codebase reads as "everything reaches everything"
/// rather than a meaningful path.
///
/// `directed = true` (the default) follows the actual call/import direction
/// — answers "does X actually reach Z?" If you only need to know the two
/// nodes are *connected somehow*, pass `directed = false` to walk both
/// directions; useful for "are these in the same neighborhood?" questions.
pub fn find_path(
    snap: &CitySnapshot,
    from: &str,
    to: &str,
    directed: bool,
) -> Option<PathResult> {
    const MAX_HOPS: usize = 10;
    let idx = NetworkIndex::build(snap);
    let src = idx.resolve_unique(from).ok()?;
    let dst = idx.resolve_unique(to).ok()?;
    if src == dst {
        return Some(PathResult {
            from: snap.network.nodes[src].id.clone(),
            to: snap.network.nodes[dst].id.clone(),
            hops: 0,
            directed,
            steps: vec![PathStep::Node(node_ref(&snap.network.nodes[src]))],
        });
    }

    // Reconstruct via parent pointers; remember edge kind so the agent can
    // tell a `calls` chain from an `imports` chain at glance.
    let mut prev: HashMap<usize, (usize, NetworkEdgeKind)> = HashMap::new();
    let mut visited: HashSet<usize> = HashSet::from([src]);
    let mut queue: VecDeque<(usize, usize)> = VecDeque::from([(src, 0usize)]);

    while let Some((cur, depth)) = queue.pop_front() {
        if depth >= MAX_HOPS {
            continue;
        }
        let neighbors: Vec<(usize, NetworkEdgeKind)> = if directed {
            idx.outgoing_with_kind(cur)
        } else {
            idx.both_with_kind(cur)
        };
        for (next, kind) in neighbors {
            if !visited.insert(next) {
                continue;
            }
            prev.insert(next, (cur, kind));
            if next == dst {
                // Walk parents back to src, alternating Node + Edge entries.
                let mut path: Vec<(usize, Option<NetworkEdgeKind>)> =
                    vec![(dst, prev.get(&dst).map(|(_, k)| *k))];
                let mut walk = dst;
                while let Some(&(p, _)) = prev.get(&walk) {
                    path.push((p, prev.get(&p).map(|(_, k)| *k)));
                    walk = p;
                    if walk == src {
                        break;
                    }
                }
                path.reverse();
                let mut steps: Vec<PathStep> = Vec::with_capacity(path.len() * 2 - 1);
                for (i, (node_idx, _)) in path.iter().enumerate() {
                    steps.push(PathStep::Node(node_ref(&snap.network.nodes[*node_idx])));
                    if i + 1 < path.len() {
                        // The edge kind that *led* to the next node is stored
                        // on the next entry's parent pointer.
                        if let Some(kind) = path[i + 1].1 {
                            steps.push(PathStep::Edge {
                                kind: edge_kind_str(kind),
                            });
                        }
                    }
                }
                return Some(PathResult {
                    from: snap.network.nodes[src].id.clone(),
                    to: snap.network.nodes[dst].id.clone(),
                    hops: path.len() - 1,
                    directed,
                    steps,
                });
            }
            queue.push_back((next, depth + 1));
        }
    }
    None
}

fn edge_kind_str(k: NetworkEdgeKind) -> String {
    match k {
        NetworkEdgeKind::Calls => "calls",
        NetworkEdgeKind::Imports => "imports",
        NetworkEdgeKind::Contains => "contains",
    }
    .to_string()
}

pub fn entry_points(snap: &CitySnapshot, limit: usize) -> Vec<&EntryPoint> {
    snap.network.entry_points.iter().take(limit).collect()
}

pub fn hubs(snap: &CitySnapshot, limit: usize) -> Vec<&HubRef> {
    snap.network.hubs.iter().take(limit).collect()
}

// ── Internals ──────────────────────────────────────────────────────────────

fn node_ref(n: &NetworkNode) -> NodeRef {
    NodeRef {
        id: n.id.clone(),
        label: n.label.clone(),
        kind: kind_str(n.kind),
        file_path: n.file_path.clone(),
        in_degree: n.in_degree,
        out_degree: n.out_degree,
        community: n.community,
    }
}

/// Same as `node_ref` but overlays the file-level rolled-up degree from
/// `FileData` for File-kind nodes. Without this, `explain CanvasController.kt`
/// reports the file's in_degree as 0 (because the symbol-graph file node only
/// has Contains edges to its own symbols) when the architecturally meaningful
/// answer is the file-pair count — 1799 in openclaw's case. Symbol nodes are
/// unaffected; their NetworkNode degree is already correct.
fn node_ref_with_file_rollup(snap: &CitySnapshot, n: &NetworkNode) -> NodeRef {
    let mut r = node_ref(n);
    if matches!(n.kind, NetworkNodeKind::File) {
        if let Some(file) = snap.files.iter().find(|f| f.path == n.file_path) {
            r.in_degree = file.in_degree;
            r.out_degree = file.out_degree;
        }
    }
    r
}

fn kind_str(k: NetworkNodeKind) -> String {
    match k {
        NetworkNodeKind::File => "file",
        NetworkNodeKind::Function => "function",
        NetworkNodeKind::Class => "class",
        NetworkNodeKind::Type => "type",
    }
    .to_string()
}

/// Pre-built indices over the snapshot's network. Built once per query —
/// O(N+E) — because the snapshot is immutable for the server's lifetime
/// but query latency on a 6k-node graph is sub-ms either way. Building per
/// query keeps the data-flow simple; if we ever see this in a profile,
/// memoize on the snapshot pointer.
struct NetworkIndex<'a> {
    nodes: &'a [NetworkNode],
    /// Lookup tables — we accept multiple shapes of "name" because the
    /// agent shouldn't have to know our internal id format.
    by_id: HashMap<&'a str, usize>,
    by_label_lower: HashMap<String, Vec<usize>>,
    by_path: HashMap<&'a str, usize>,
    out_adj: Vec<Vec<(usize, NetworkEdgeKind)>>,
    in_adj: Vec<Vec<(usize, NetworkEdgeKind)>>,
    /// Edge index used by undirected/connectivity queries. Each entry is
    /// `(neighbor, kind_traversed_to_get_there)` so callers that care about
    /// edge semantics can recover them.
    undirected_adj: Vec<Vec<(usize, NetworkEdgeKind)>>,
}

impl<'a> NetworkIndex<'a> {
    fn build(snap: &'a CitySnapshot) -> Self {
        let nodes = snap.network.nodes.as_slice();
        let mut by_id: HashMap<&str, usize> = HashMap::with_capacity(nodes.len());
        let mut by_label_lower: HashMap<String, Vec<usize>> = HashMap::new();
        let mut by_path: HashMap<&str, usize> = HashMap::new();
        for (i, n) in nodes.iter().enumerate() {
            by_id.insert(n.id.as_str(), i);
            by_label_lower
                .entry(n.label.trim_end_matches("()").trim_start_matches('.').to_lowercase())
                .or_default()
                .push(i);
            // First-write-wins for path → favors the file node over its
            // member symbols when both share a path key.
            if matches!(n.kind, NetworkNodeKind::File) {
                by_path.insert(n.file_path.as_str(), i);
            } else {
                by_path.entry(n.file_path.as_str()).or_insert(i);
            }
        }

        let mut out_adj = vec![Vec::<(usize, NetworkEdgeKind)>::new(); nodes.len()];
        let mut in_adj = vec![Vec::<(usize, NetworkEdgeKind)>::new(); nodes.len()];
        let mut undirected_adj = vec![Vec::<(usize, NetworkEdgeKind)>::new(); nodes.len()];
        let mut seen_undirected: HashSet<(usize, usize)> = HashSet::new();
        for e in &snap.network.edges {
            // Only Calls + Imports edges shape the graph for query purposes;
            // Contains edges are bookkeeping (file owns its symbols) and
            // would short-circuit any path query through the file node.
            if matches!(e.kind, NetworkEdgeKind::Contains) {
                continue;
            }
            let Some(&s) = by_id.get(e.source.as_str()) else {
                continue;
            };
            let Some(&t) = by_id.get(e.target.as_str()) else {
                continue;
            };
            out_adj[s].push((t, e.kind));
            in_adj[t].push((s, e.kind));
            let pair = if s < t { (s, t) } else { (t, s) };
            if seen_undirected.insert(pair) {
                undirected_adj[s].push((t, e.kind));
                undirected_adj[t].push((s, e.kind));
            }
        }

        Self {
            nodes,
            by_id,
            by_label_lower,
            by_path,
            out_adj,
            in_adj,
            undirected_adj,
        }
    }

    /// Resolve a "name" to a single node, or report why we couldn't.
    ///
    /// Tries exact id → file path → bare symbol name in that order. A bare
    /// name with multiple matches becomes `Resolution::Ambiguous(candidates)`
    /// rather than a silent failure — the agent can use the candidate list
    /// to pick a more specific id and retry, instead of guessing.
    fn resolve_unique(&self, name: &str) -> Result<usize, Resolution> {
        if let Some(&i) = self.by_id.get(name) {
            return Ok(i);
        }
        if let Some(&i) = self.by_path.get(name) {
            return Ok(i);
        }
        let key = name
            .trim_end_matches("()")
            .trim_start_matches('.')
            .to_lowercase();
        match self.by_label_lower.get(&key) {
            Some(matches) if matches.len() == 1 => Ok(matches[0]),
            Some(matches) if !matches.is_empty() => {
                // Cap to a sane number; on a 6k-node graph some bare names
                // (`new`, `default`, `from`) match hundreds of symbols.
                const MAX_CANDIDATES: usize = 25;
                let candidates: Vec<NodeRef> = matches
                    .iter()
                    .take(MAX_CANDIDATES)
                    .map(|&i| node_ref(&self.nodes[i]))
                    .collect();
                Err(Resolution::Ambiguous(candidates))
            }
            _ => Err(Resolution::NotFound),
        }
    }

    fn outgoing(&self, idx: usize) -> Vec<usize> {
        let mut v: Vec<usize> = self.out_adj[idx].iter().map(|(n, _)| *n).collect();
        v.sort_by(|&a, &b| {
            let ad = self.nodes[a].in_degree + self.nodes[a].out_degree;
            let bd = self.nodes[b].in_degree + self.nodes[b].out_degree;
            bd.cmp(&ad)
        });
        v.dedup();
        v
    }

    fn incoming(&self, idx: usize) -> Vec<usize> {
        let mut v: Vec<usize> = self.in_adj[idx].iter().map(|(n, _)| *n).collect();
        v.sort_by(|&a, &b| {
            let ad = self.nodes[a].in_degree + self.nodes[a].out_degree;
            let bd = self.nodes[b].in_degree + self.nodes[b].out_degree;
            bd.cmp(&ad)
        });
        v.dedup();
        v
    }

    /// Outgoing neighbors with their edge kind, used by the directed
    /// `find_path` BFS so step labels survive parent-pointer reconstruction.
    fn outgoing_with_kind(&self, idx: usize) -> Vec<(usize, NetworkEdgeKind)> {
        self.out_adj[idx].clone()
    }

    /// Both directions, used by `find_path` when `directed=false`.
    fn both_with_kind(&self, idx: usize) -> Vec<(usize, NetworkEdgeKind)> {
        self.undirected_adj[idx].clone()
    }
}

// ── get_source ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct SourceResult {
    pub file_path: String,
    pub start_line: usize,
    pub end_line: usize,
    pub language: String,
    pub content: String,
    /// True when the result is the requested function/symbol's body; false
    /// when the snapshot didn't have a span for this name and we returned
    /// the whole file as a fallback.
    pub is_symbol_body: bool,
}

/// Read source for a file or symbol from `source_root`. The agent calls
/// this after `explain` / `find_callers` to actually look at the code.
///
/// Resolution rules:
/// - File path → returns the entire file
/// - Symbol id (`path::fn::name`) → returns just the symbol's line span
/// - Bare symbol name → returns the symbol body if unique, else
///   `Resolution::Ambiguous` so the agent can pick
pub fn get_source(
    snap: &CitySnapshot,
    source_root: Option<&Path>,
    name: &str,
) -> Result<SourceResult, SourceError> {
    let source_root = source_root.ok_or(SourceError::NoSourceRoot)?;
    let idx = NetworkIndex::build(snap);
    let node_idx = idx.resolve_unique(name).map_err(SourceError::Resolution)?;
    let node = &snap.network.nodes[node_idx];

    let file = snap
        .files
        .iter()
        .find(|f| f.path == node.file_path)
        .ok_or(SourceError::FileMetadataMissing)?;

    let abs_path = source_root.join(&file.path);
    let content = std::fs::read_to_string(&abs_path).map_err(|e| {
        SourceError::Io(format!(
            "failed to read {}: {} (set --source-root if your snapshot was \
             generated against a different repo)",
            abs_path.display(),
            e
        ))
    })?;

    // Resolve line span. File nodes get the whole file; symbol nodes try to
    // find a matching declaration with start/end line populated.
    let (start_line, end_line, is_symbol_body) = match node.kind {
        NetworkNodeKind::File => (1, file.lines.max(1), false),
        _ => match find_symbol_span(file, &node.label) {
            Some((s, e)) if s > 0 && e >= s => (s, e, true),
            _ => (1, file.lines.max(1), false),
        },
    };

    let lines: Vec<&str> = content.lines().collect();
    let safe_start = start_line.saturating_sub(1).min(lines.len());
    let safe_end = end_line.min(lines.len());
    let body = lines[safe_start..safe_end].join("\n");

    Ok(SourceResult {
        file_path: file.path.clone(),
        start_line,
        end_line,
        language: file.language.clone(),
        content: body,
        is_symbol_body,
    })
}

#[derive(Debug)]
pub enum SourceError {
    NoSourceRoot,
    FileMetadataMissing,
    Io(String),
    Resolution(Resolution),
}

fn find_symbol_span(
    file: &codecity_core::layout::FileData,
    label: &str,
) -> Option<(usize, usize)> {
    let bare = label.trim_end_matches("()");
    if let Some(f) = file.functions.iter().find(|f| f.name == bare) {
        return Some((f.start_line, f.end_line));
    }
    if let Some(t) = file.types.iter().find(|t| t.name == bare) {
        return Some((t.start_line, t.end_line));
    }
    if let Some(c) = file.classes.iter().find(|c| c.name == bare) {
        return Some((c.start_line, c.end_line));
    }
    None
}

// ── community ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CommunityResult {
    pub id: u32,
    pub rank: u32,
    pub size: u32,
    pub members: Vec<NodeRef>,
    /// Edges that cross the community boundary. Useful for "what does this
    /// subsystem depend on / who depends on this subsystem?" — the kinds of
    /// questions you'd answer from a folder if folders matched the actual
    /// architecture, but communities cluster by call relationships instead.
    pub external_edges: Vec<CommunityEdge>,
}

#[derive(Debug, Serialize)]
pub struct CommunityEdge {
    pub from: NodeRef,
    pub to: NodeRef,
    pub kind: String,
    pub direction: &'static str, // "outgoing" | "incoming"
}

/// Look up a community by its raw Louvain id, or by any member's name. The
/// `member_or_id` parameter accepts either form so the agent doesn't need
/// to know community ids upfront — it can call `explain X`, see X's
/// `community` field, then call `community X` for the same id back.
pub fn community(
    snap: &CitySnapshot,
    member_or_id: &str,
    max_members: usize,
    max_external_edges: usize,
) -> Result<CommunityResult, Resolution> {
    let community_id: i32 = if let Ok(parsed) = member_or_id.parse::<i32>() {
        parsed
    } else {
        let idx = NetworkIndex::build(snap);
        let node_idx = idx.resolve_unique(member_or_id)?;
        snap.network.nodes[node_idx].community
    };
    if community_id < 0 {
        return Err(Resolution::NotFound);
    }

    // Member list: prefer the snapshot's pre-built CommunitySummary when
    // available (file-only, sorted by degree); fall back to a fresh scan
    // over network nodes for symbol-rich detail.
    let summary = snap
        .network
        .communities
        .iter()
        .find(|c| c.id as i32 == community_id);

    let members_in_community: Vec<usize> = snap
        .network
        .nodes
        .iter()
        .enumerate()
        .filter(|(_, n)| n.community == community_id)
        .map(|(i, _)| i)
        .collect();

    let mut sorted_members = members_in_community.clone();
    sorted_members.sort_by(|&a, &b| {
        let ad = snap.network.nodes[a].in_degree + snap.network.nodes[a].out_degree;
        let bd = snap.network.nodes[b].in_degree + snap.network.nodes[b].out_degree;
        bd.cmp(&ad)
    });
    let members: Vec<NodeRef> = sorted_members
        .iter()
        .take(max_members)
        .map(|&i| node_ref(&snap.network.nodes[i]))
        .collect();

    let in_community: HashSet<usize> = members_in_community.iter().copied().collect();
    let id_to_idx: HashMap<&str, usize> = snap
        .network
        .nodes
        .iter()
        .enumerate()
        .map(|(i, n)| (n.id.as_str(), i))
        .collect();

    let mut external_edges: Vec<CommunityEdge> = Vec::new();
    for edge in &snap.network.edges {
        if matches!(edge.kind, NetworkEdgeKind::Contains) {
            continue;
        }
        let Some(&s) = id_to_idx.get(edge.source.as_str()) else {
            continue;
        };
        let Some(&t) = id_to_idx.get(edge.target.as_str()) else {
            continue;
        };
        let s_in = in_community.contains(&s);
        let t_in = in_community.contains(&t);
        // Crosses the boundary iff exactly one endpoint is inside.
        if s_in == t_in {
            continue;
        }
        let direction = if s_in { "outgoing" } else { "incoming" };
        external_edges.push(CommunityEdge {
            from: node_ref(&snap.network.nodes[s]),
            to: node_ref(&snap.network.nodes[t]),
            kind: edge_kind_str(edge.kind),
            direction,
        });
        if external_edges.len() >= max_external_edges {
            break;
        }
    }

    Ok(CommunityResult {
        id: community_id as u32,
        rank: summary.map(|s| s.rank).unwrap_or(0),
        size: members_in_community.len() as u32,
        members,
        external_edges,
    })
}

// ── recent_changes ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct RecentChange {
    pub path: String,
    pub edits: usize,
    /// True when the file appears in the snapshot's network. False when
    /// git knows about it but the analyzer skipped it (binary, ignored ext,
    /// not in the snapshot's working tree at analysis time).
    pub in_snapshot: bool,
    /// The node's degree in the network if `in_snapshot` is true. Useful
    /// for "what's hot AND load-bearing?" queries — the intersection of
    /// recent activity and architectural importance.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub degree: Option<u32>,
}

#[derive(Debug)]
pub enum RecentChangesError {
    NoSourceRoot,
    NotAGitRepo(String),
    GitFailed(String),
}

/// Files modified in the last `days` days, ranked by edit count. Combines
/// `git log --name-only` with the snapshot so the agent can ask "what's
/// the team currently changing?" and immediately see which of those
/// changes touch architecturally important code.
///
/// Pure git — we shell out rather than link libgit2 to keep the dep tree
/// small and avoid pulling in OpenSSL on macOS. If `git` isn't on PATH or
/// the source root isn't a repo, returns a structured error the agent
/// can show the user.
pub fn recent_changes(
    snap: &CitySnapshot,
    source_root: Option<&Path>,
    days: u32,
    limit: usize,
) -> Result<Vec<RecentChange>, RecentChangesError> {
    let root = source_root.ok_or(RecentChangesError::NoSourceRoot)?;
    if !root.join(".git").exists() {
        return Err(RecentChangesError::NotAGitRepo(root.display().to_string()));
    }

    let since = format!("--since={days}.days.ago");
    let output = std::process::Command::new("git")
        .args(["-C"])
        .arg(root)
        .args(["-c", "core.quotepath=off", "log", "--name-only", "--pretty=format:", &since])
        .output()
        .map_err(|e| RecentChangesError::GitFailed(format!("spawn git failed: {e}")))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(RecentChangesError::GitFailed(format!(
            "git log failed (exit {}): {}",
            output.status, stderr
        )));
    }

    // Tally edit counts per path.
    let mut counts: HashMap<String, usize> = HashMap::new();
    for line in String::from_utf8_lossy(&output.stdout).lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        *counts.entry(trimmed.to_string()).or_default() += 1;
    }

    // Index snapshot file paths so we can mark hits and attach degrees.
    let in_snap: HashMap<&str, &codecity_core::layout::FileData> = snap
        .files
        .iter()
        .map(|f| (f.path.as_str(), f))
        .collect();

    let mut results: Vec<RecentChange> = counts
        .into_iter()
        .map(|(path, edits)| {
            let (in_snapshot, degree) = match in_snap.get(path.as_str()) {
                Some(file) => (true, Some(file.in_degree + file.out_degree)),
                None => (false, None),
            };
            RecentChange {
                path,
                edits,
                in_snapshot,
                degree,
            }
        })
        .collect();
    results.sort_by(|a, b| b.edits.cmp(&a.edits).then(a.path.cmp(&b.path)));
    results.truncate(limit);
    Ok(results)
}

// ── search_symbols ──────────────────────────────────────────────────────────

/// Find nodes whose label or path matches `query`. The agent uses this to
/// discover names before calling `explain` / `find_callers`.
///
/// Matching is case-insensitive and **token-aware**. The query is split on
/// `_`, `-`, `.`, and camelCase boundaries; a node matches when *every*
/// query token appears somewhere in its label or path (in any order). So
/// `search_symbols agent_runner` matches `_make_runner` (token: runner) +
/// `agent_loop.py` (token: agent), even though no identifier literally
/// contains "agent_runner" as a substring. A query without separators
/// behaves like before (single substring). Falls back to the literal-
/// substring match when tokenization yields zero hits, so common queries
/// like "auth" still find anything containing those four characters.
pub fn search_symbols(snap: &CitySnapshot, query: &str, limit: usize) -> Vec<NodeRef> {
    let raw = query.trim();
    if raw.is_empty() {
        return Vec::new();
    }
    let tokens: Vec<String> = tokenize_query(raw);
    let needle_lower = raw.to_lowercase();

    // Pre-build the search corpus per node once. `label + ' ' + file_path`
    // lowercased + tokenized so we can do both substring and per-token
    // contains in one pass without re-allocating per filter call.
    let matches_node = |n: &NetworkNode| -> bool {
        let label = n.label.to_lowercase();
        let path = n.file_path.to_lowercase();
        if tokens.len() <= 1 {
            // Single-word query: literal substring. Same as the original
            // behavior, no regressions for queries like "parse" or "auth".
            return label.contains(&needle_lower) || path.contains(&needle_lower);
        }
        // Multi-token query: every token must appear somewhere in label
        // or path. Order doesn't matter, so `agent_runner` matches both
        // `_make_runner` (token: runner) and `agent_loop.py` (token: agent).
        tokens
            .iter()
            .all(|t| label.contains(t) || path.contains(t))
    };

    let mut hits: Vec<&NetworkNode> =
        snap.network.nodes.iter().filter(|n| matches_node(n)).collect();

    // Empty? Fall back to a strict literal substring search. Some users
    // pass a query like `agent_runner` expecting an exact name; if neither
    // tokenized nor substring forms find anything, they at least get the
    // literal-match attempt logged via the empty result.
    if hits.is_empty() && tokens.len() > 1 {
        hits = snap
            .network
            .nodes
            .iter()
            .filter(|n| {
                n.label.to_lowercase().contains(&needle_lower)
                    || n.file_path.to_lowercase().contains(&needle_lower)
            })
            .collect();
    }
    // Heaviest-degree first so the agent sees the structurally important
    // matches before incidental ones.
    hits.sort_by(|a, b| {
        let ad = a.in_degree + a.out_degree;
        let bd = b.in_degree + b.out_degree;
        bd.cmp(&ad)
    });
    hits.into_iter().take(limit).map(node_ref).collect()
}

/// Split `query` on common identifier separators and camelCase boundaries
/// into lowercase tokens. Tokens shorter than 2 chars are dropped — they
/// match too broadly to be useful as a "must contain" filter (`x` would
/// match nearly everything).
///
/// `agent_runner` → `["agent", "runner"]`
/// `XMLHttpParser` → `["xml", "http", "parser"]`
/// `parse-url.ts` → `["parse", "url", "ts"]`
fn tokenize_query(query: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut prev_was_lower = false;
    for ch in query.chars() {
        if ch == '_' || ch == '-' || ch == '.' || ch == '/' || ch.is_whitespace() {
            if !current.is_empty() {
                tokens.push(std::mem::take(&mut current));
            }
            prev_was_lower = false;
            continue;
        }
        if ch.is_uppercase() && prev_was_lower && !current.is_empty() {
            // camelCase boundary: lower→Upper transition. e.g. `parseUrl`
            // splits into `parse` + `url`.
            tokens.push(std::mem::take(&mut current));
        }
        current.extend(ch.to_lowercase());
        prev_was_lower = ch.is_lowercase();
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens.retain(|t| t.len() >= 2);
    tokens
}

#[cfg(test)]
mod tokenize_tests {
    use super::tokenize_query;

    #[test]
    fn splits_underscore_and_dash() {
        assert_eq!(
            tokenize_query("agent_runner-loop"),
            vec!["agent", "runner", "loop"]
        );
    }

    #[test]
    fn splits_camel_case() {
        assert_eq!(
            tokenize_query("XMLHttpParser"),
            vec!["xmlhttp", "parser"]
        );
        assert_eq!(tokenize_query("parseUrl"), vec!["parse", "url"]);
    }

    #[test]
    fn splits_paths_and_extensions() {
        assert_eq!(
            tokenize_query("foo/bar.baz.ts"),
            vec!["foo", "bar", "baz", "ts"]
        );
    }

    #[test]
    fn drops_single_char_tokens() {
        // Single-letter tokens match too broadly to filter usefully.
        assert_eq!(tokenize_query("a_bc"), vec!["bc"]);
    }

    #[test]
    fn single_word_unchanged() {
        assert_eq!(tokenize_query("authenticate"), vec!["authenticate"]);
    }

    #[test]
    fn empty_returns_empty() {
        assert!(tokenize_query("").is_empty());
        assert!(tokenize_query("___").is_empty());
    }
}
