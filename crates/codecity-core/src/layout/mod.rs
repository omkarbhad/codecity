use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use super::parser::{ClassInfo, FileType, FunctionInfo, ParsedFile, SymbolInfo, TypeInfo};

mod color;
use color::{district_color, subdistrict_color};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DistrictData {
    pub name: String,
    pub color: String,
    pub files: Vec<String>,
    pub bounds: Bounds,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_districts: Option<Vec<SubDistrictData>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubDistrictData {
    pub name: String,
    pub color: String,
    pub bounds: Bounds,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_districts: Option<Vec<SubDistrictData>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bounds {
    pub x: f32,
    pub z: f32,
    pub width: f32,
    pub depth: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f32,
    pub z: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileData {
    pub path: String,
    pub lines: usize,
    #[serde(default)]
    pub size_bytes: usize,
    #[serde(default)]
    pub extension: String,
    #[serde(default)]
    pub language: String,
    pub functions: Vec<FunctionInfo>,
    pub types: Vec<TypeInfo>,
    pub classes: Vec<ClassInfo>,
    #[serde(default)]
    pub symbols: Vec<SymbolInfo>,
    pub imports: Vec<String>,
    pub imported_by: Vec<String>,
    pub external_imports: Vec<String>,
    pub decorators: Vec<String>,
    pub complexity: usize,
    #[serde(default)]
    pub frontend_frameworks: Vec<String>,
    pub is_react_component: bool,
    pub has_unused_exports: bool,
    pub file_type: FileType,
    pub position: Position,
    /// Footprint side of the building, as the layout sized its lot. Absent on
    /// snapshots made before the layout exported it (the frontend then falls
    /// back to the old function-count width).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub width: Option<f32>,
    pub district: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_folder: Option<String>,
    #[serde(default)]
    pub in_degree: u32,
    #[serde(default)]
    pub out_degree: u32,
    /// Louvain community ID; -1 means file has no internal connections.
    #[serde(default = "default_community")]
    pub community: i32,
    /// Pre-computed Network-mode position (FCoSE in Rust). None when the file
    /// has no edges in the network — frontend hides those nodes anyway.
    /// Stored as Option to keep serde JSON-clean (NaN isn't valid JSON).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub network_x: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub network_y: Option<f32>,
    /// Call sites discovered while parsing this file. Used by the network
    /// analysis pass to emit caller→callee edges. Pre-schema snapshots
    /// won't have this; defaults to empty.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub calls: Vec<crate::parser::CallSite>,
}

fn default_community() -> i32 {
    -1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceTreeEntry {
    pub path: String,
    pub is_file: bool,
    pub parsed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CityStats {
    pub total_files: usize,
    pub total_functions: usize,
    #[serde(default)]
    pub total_classes: usize,
    pub total_lines: usize,
    pub total_types: usize,
    pub total_imports: usize,
    #[serde(default)]
    pub external_imports: usize,
    pub unused_exports: usize,
    #[serde(default)]
    pub total_complexity: usize,
    #[serde(default)]
    pub average_complexity: f32,
    #[serde(default)]
    pub max_complexity: usize,
    #[serde(default)]
    pub languages: Vec<LanguageStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguageStats {
    pub language: String,
    pub files: usize,
    pub lines: usize,
    pub symbols: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommunitySummary {
    /// Louvain community id (raw, not the rank).
    pub id: u32,
    /// Rank by size (0 = largest).
    pub rank: u32,
    pub size: u32,
    /// Member file paths sorted by degree desc.
    pub members: Vec<String>,
    /// Top hub file paths (subset of members) for quick navigation.
    pub hubs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryPoint {
    pub path: String,
    pub out_degree: u32,
    /// Number of files transitively reachable via imports.
    pub reachable: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HubRef {
    pub path: String,
    pub in_degree: u32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum NetworkNodeKind {
    File,
    Function,
    Class,
    Type,
}

/// A node in the dependency network. Files plus their members (functions,
/// classes, types) — graphify-style semantic graph where shared symbols
/// reveal structural cohesion that file-only graphs miss.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkNode {
    pub id: String,
    pub label: String,
    pub kind: NetworkNodeKind,
    /// File path that owns this node. For File nodes this equals `id`.
    pub file_path: String,
    pub in_degree: u32,
    pub out_degree: u32,
    /// Louvain community id; -1 if unconnected.
    pub community: i32,
    /// Pre-computed FCoSE position. None when unconnected.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_x: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_y: Option<f32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NetworkEdgeKind {
    /// File contains this function/class/type.
    Contains,
    /// File imports another file.
    Imports,
    /// Function/method calls another function/method (resolved by bare-name match).
    Calls,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkEdge {
    pub source: String,
    pub target: String,
    pub kind: NetworkEdgeKind,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkAnalysis {
    pub communities: Vec<CommunitySummary>,
    pub entry_points: Vec<EntryPoint>,
    pub hubs: Vec<HubRef>,
    /// Full set of network nodes (files + symbols). Empty on pre-schema snapshots.
    #[serde(default)]
    pub nodes: Vec<NetworkNode>,
    /// Edges between network nodes. Empty on pre-schema snapshots.
    #[serde(default)]
    pub edges: Vec<NetworkEdge>,
    /// File-pair edges aggregated from `edges` (every symbol-level call
    /// between two files counted once, contains edges excluded). Cheap to
    /// render — typically 100-3000 entries even on large repos — so the
    /// frontend network view can use these directly without re-aggregating.
    /// Empty on pre-schema snapshots.
    #[serde(default)]
    pub file_edges: Vec<NetworkEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CitySnapshot {
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
    pub files: Vec<FileData>,
    pub districts: Vec<DistrictData>,
    pub stats: CityStats,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub source_tree: Vec<SourceTreeEntry>,
    pub warnings: Option<Vec<String>>,
    #[serde(default)]
    pub network: NetworkAnalysis,
}

fn default_schema_version() -> u32 {
    1
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LayoutMode {
    Folder,
    Extension,
    Semantic,
}

/// District name for files directly in the project root (folder mode).
pub const ROOT_DISTRICT: &str = "(root)";

/// Lowercased extension of the file name (not the whole path: `src.v2/Makefile`
/// has none), or ".other".
fn extension(path: &str) -> String {
    let name = path.rsplit('/').next().unwrap_or(path);
    name.rsplit_once('.')
        .map(|(_, ext)| format!(".{}", ext.to_lowercase()))
        .unwrap_or_else(|| ".other".to_string())
}

/// Building height in the 3D view. Keep in sync with `getBuildingHeight` in
/// src/lib/visualization/building-dimensions.ts.
fn building_height(lines: usize) -> f32 {
    const KNEE: f32 = 16.0;
    let height = (lines as f32).powf(0.7) / 11.6;
    let height = if height > KNEE {
        KNEE + (height - KNEE) * 0.4
    } else {
        height
    };
    height.clamp(0.3, 30.0)
}

/// (footprint side, height). The side grows with the function count and, for
/// towers, with the height, so a long file with few functions is a tower and
/// not a needle twenty times taller than it is wide.
fn building_dimensions(file: &ParsedFile) -> (f32, f32) {
    let height = building_height(file.lines);
    let by_functions = 1.0 + file.functions.len() as f32 * 0.12;
    let by_height = 1.0 + height * 0.07;
    (by_functions.max(by_height).clamp(1.0, 2.6), height)
}

fn empty_bounds() -> Bounds {
    Bounds {
        x: 0.0,
        z: 0.0,
        width: 0.0,
        depth: 0.0,
    }
}

fn new_district(name: String, files: Vec<String>, index: usize, mode: LayoutMode) -> DistrictData {
    DistrictData {
        color: district_color(index, &name, mode),
        name,
        files,
        bounds: empty_bounds(),
        sub_districts: None,
    }
}

fn grouped_districts(groups: HashMap<String, Vec<String>>, mode: LayoutMode) -> Vec<DistrictData> {
    let mut entries: Vec<(String, Vec<String>)> = groups.into_iter().collect();
    entries.sort_by(|a, b| b.1.len().cmp(&a.1.len()).then_with(|| a.0.cmp(&b.0)));
    entries
        .into_iter()
        .enumerate()
        .map(|(index, (name, files))| new_district(name, files, index, mode))
        .collect()
}

fn common_prefix(paths: &[String]) -> String {
    if paths.is_empty() {
        return String::new();
    }
    if paths.len() == 1 {
        let segments: Vec<&str> = paths[0].split('/').collect();
        return if segments.len() > 1 {
            segments[..segments.len() - 1].join("/")
        } else {
            paths[0].clone()
        };
    }

    let first: Vec<&str> = paths[0].split('/').collect();
    let mut depth = 0;
    'outer: for index in 0..first.len().saturating_sub(1) {
        for path in paths {
            let segments: Vec<&str> = path.split('/').collect();
            if segments.len() <= index || segments[index] != first[index] {
                break 'outer;
            }
        }
        depth = index + 1;
    }

    if depth > 0 {
        first[..depth].join("/")
    } else {
        first.first().copied().unwrap_or("cluster").to_string()
    }
}

fn compute_folder_districts(files: &[ParsedFile]) -> Vec<DistrictData> {
    let mut groups: HashMap<String, Vec<String>> = HashMap::new();
    for file in files {
        // Files at the project root share one district instead of each becoming
        // a one-building district named after itself.
        let name = match file.path.split_once('/') {
            Some((top, _)) if !top.is_empty() => top.to_string(),
            _ => ROOT_DISTRICT.to_string(),
        };
        groups.entry(name).or_default().push(file.path.clone());
    }
    grouped_districts(groups, LayoutMode::Folder)
}

fn compute_extension_districts(files: &[ParsedFile]) -> Vec<DistrictData> {
    let mut groups: HashMap<String, Vec<String>> = HashMap::new();
    for file in files {
        groups
            .entry(extension(&file.path))
            .or_default()
            .push(file.path.clone());
    }
    grouped_districts(groups, LayoutMode::Extension)
}

fn compute_semantic_districts(files: &[ParsedFile]) -> Vec<DistrictData> {
    let path_set: HashSet<&str> = files.iter().map(|file| file.path.as_str()).collect();
    let mut graph: HashMap<&str, HashSet<&str>> = HashMap::new();

    for file in files {
        graph.entry(file.path.as_str()).or_default();
        for import in &file.imports {
            if path_set.contains(import.as_str()) {
                graph
                    .entry(file.path.as_str())
                    .or_default()
                    .insert(import.as_str());
                graph
                    .entry(import.as_str())
                    .or_default()
                    .insert(file.path.as_str());
            }
        }
    }

    let mut visited = HashSet::new();
    let mut clusters = Vec::new();
    for file in files {
        if visited.contains(file.path.as_str()) {
            continue;
        }

        let mut cluster = Vec::new();
        let mut stack = vec![file.path.as_str()];
        while let Some(current) = stack.pop() {
            if !visited.insert(current) {
                continue;
            }
            cluster.push(current.to_string());
            if let Some(neighbors) = graph.get(current) {
                for neighbor in neighbors {
                    if !visited.contains(*neighbor) {
                        stack.push(*neighbor);
                    }
                }
            }
        }
        clusters.push(cluster);
    }

    let mut final_clusters = Vec::new();
    for cluster in clusters {
        if cluster.len() <= 40 {
            final_clusters.push(cluster);
            continue;
        }

        let mut sub_groups: HashMap<String, Vec<String>> = HashMap::new();
        for path in cluster {
            let segments: Vec<&str> = path.split('/').collect();
            let key = if segments.len() > 2 {
                segments[..2].join("/")
            } else {
                segments.first().copied().unwrap_or("root").to_string()
            };
            sub_groups.entry(key).or_default().push(path);
        }
        final_clusters.extend(sub_groups.into_values());
    }

    final_clusters.sort_by(|a, b| {
        b.len()
            .cmp(&a.len())
            .then_with(|| common_prefix(a).cmp(&common_prefix(b)))
    });
    let mut used_names: HashMap<String, usize> = HashMap::new();
    final_clusters
        .into_iter()
        .enumerate()
        .map(|(index, paths)| {
            let base_name = {
                let prefix = common_prefix(&paths);
                if prefix.is_empty() {
                    format!("cluster-{}", index + 1)
                } else {
                    prefix
                }
            };
            let count = used_names.entry(base_name.clone()).or_insert(0);
            let name = if *count == 0 {
                base_name
            } else {
                format!("{} ({})", base_name, *count + 1)
            };
            *count += 1;
            new_district(name, paths, index, LayoutMode::Semantic)
        })
        .collect()
}

pub fn compute_districts(files: &[ParsedFile], mode: LayoutMode) -> Vec<DistrictData> {
    match mode {
        LayoutMode::Folder => compute_folder_districts(files),
        LayoutMode::Extension => compute_extension_districts(files),
        LayoutMode::Semantic => compute_semantic_districts(files),
    }
}

#[derive(Clone)]
struct FilePosition<'a> {
    file: &'a ParsedFile,
    lx: f32,
    lz: f32,
    sub_folder: String,
}

#[derive(Clone)]
struct BlockLayout<'a> {
    name: String,
    positions: Vec<FilePosition<'a>>,
    half_w: f32,
    half_d: f32,
    children: Vec<BlockLayout<'a>>,
}

fn empty_block<'a>() -> BlockLayout<'a> {
    BlockLayout {
        name: String::new(),
        positions: Vec::new(),
        half_w: 1.0,
        half_d: 1.0,
        children: Vec::new(),
    }
}

fn layout_files_in_grid<'a>(
    files: &[&'a ParsedFile],
    gap: f32,
    sub_folder: &str,
) -> BlockLayout<'a> {
    if files.is_empty() {
        return empty_block();
    }

    let mut sorted = files.to_vec();
    sorted.sort_by(|a, b| b.lines.cmp(&a.lines).then_with(|| a.path.cmp(&b.path)));
    let cols = (sorted.len() as f32).sqrt().ceil().max(1.0) as usize;
    let rows = sorted.len().div_ceil(cols);
    let mut col_widths = vec![0.0_f32; cols];
    let mut row_depths = vec![0.0_f32; rows];

    for (index, file) in sorted.iter().enumerate() {
        let col = index % cols;
        let row = index / cols;
        let (width, _) = building_dimensions(file);
        col_widths[col] = col_widths[col].max(width);
        row_depths[row] = row_depths[row].max(width);
    }

    let mut col_x = Vec::with_capacity(cols);
    let mut x = 0.0_f32;
    for col in 0..cols {
        let width = col_widths[col].max(1.2);
        if col > 0 {
            x += col_widths[col - 1].max(1.2) / 2.0 + gap + width / 2.0;
        }
        col_x.push(x);
    }

    let mut row_z = Vec::with_capacity(rows);
    let mut z = 0.0_f32;
    for row in 0..rows {
        let depth = row_depths[row].max(1.2);
        if row > 0 {
            z += row_depths[row - 1].max(1.2) / 2.0 + gap + depth / 2.0;
        }
        row_z.push(z);
    }

    let mid_x = (col_x[0] + col_x[cols - 1]) / 2.0;
    let mid_z = (row_z[0] + row_z[rows - 1]) / 2.0;
    let mut positions = Vec::with_capacity(sorted.len());
    let mut min_x = f32::MAX;
    let mut max_x = f32::MIN;
    let mut min_z = f32::MAX;
    let mut max_z = f32::MIN;

    for (index, file) in sorted.iter().enumerate() {
        let lx = col_x[index % cols] - mid_x;
        let lz = row_z[index / cols] - mid_z;
        let (width, _) = building_dimensions(file);
        min_x = min_x.min(lx - width / 2.0);
        max_x = max_x.max(lx + width / 2.0);
        min_z = min_z.min(lz - width / 2.0);
        max_z = max_z.max(lz + width / 2.0);
        positions.push(FilePosition {
            file,
            lx,
            lz,
            sub_folder: sub_folder.to_string(),
        });
    }

    BlockLayout {
        name: String::new(),
        positions,
        half_w: (max_x - min_x) / 2.0 + 0.1,
        half_d: (max_z - min_z) / 2.0 + 0.1,
        children: Vec::new(),
    }
}

fn offset_block<'a>(block: &BlockLayout<'a>, ox: f32, oz: f32) -> BlockLayout<'a> {
    BlockLayout {
        name: block.name.clone(),
        positions: block
            .positions
            .iter()
            .map(|position| FilePosition {
                file: position.file,
                lx: ox + position.lx,
                lz: oz + position.lz,
                sub_folder: position.sub_folder.clone(),
            })
            .collect(),
        half_w: block.half_w,
        half_d: block.half_d,
        children: block
            .children
            .iter()
            .map(|child| offset_block(child, ox, oz))
            .collect(),
    }
}

fn pack_blocks_in_grid<'a>(blocks: Vec<BlockLayout<'a>>, gap: f32) -> BlockLayout<'a> {
    if blocks.is_empty() {
        return empty_block();
    }
    if blocks.len() == 1 {
        return blocks.into_iter().next().unwrap();
    }

    let mut sorted = blocks;
    sorted.sort_by(|a, b| {
        (b.half_w * b.half_d)
            .partial_cmp(&(a.half_w * a.half_d))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let sizes: Vec<(f32, f32)> = sorted
        .iter()
        .map(|block| (block.half_w, block.half_d))
        .collect();
    let centers = pack_rects(&sizes, gap);

    let mut positions = Vec::new();
    let mut children = Vec::new();
    let mut min_x = f32::MAX;
    let mut max_x = f32::MIN;
    let mut min_z = f32::MAX;
    let mut max_z = f32::MIN;

    for (block, (world_x, world_z)) in sorted.iter().zip(centers) {
        for position in &block.positions {
            let x = world_x + position.lx;
            let z = world_z + position.lz;
            let (width, _) = building_dimensions(position.file);
            min_x = min_x.min(x - width / 2.0);
            max_x = max_x.max(x + width / 2.0);
            min_z = min_z.min(z - width / 2.0);
            max_z = max_z.max(z + width / 2.0);
            positions.push(FilePosition {
                file: position.file,
                lx: x,
                lz: z,
                sub_folder: position.sub_folder.clone(),
            });
        }
        children.push(offset_block(block, world_x, world_z));
    }

    BlockLayout {
        name: String::new(),
        positions,
        half_w: if min_x == f32::MAX {
            1.0
        } else {
            (max_x - min_x) / 2.0 + 0.1
        },
        half_d: if min_z == f32::MAX {
            1.0
        } else {
            (max_z - min_z) / 2.0 + 0.1
        },
        children,
    }
}

fn layout_recursive_bottom_up<'a>(
    files: &[&'a ParsedFile],
    path_depth: usize,
    file_gap: f32,
    block_gap: f32,
    sub_folder: &str,
    max_depth: usize,
) -> BlockLayout<'a> {
    if files.is_empty() {
        return empty_block();
    }

    let mut direct_files = Vec::new();
    let mut subdir_groups: HashMap<String, Vec<&'a ParsedFile>> = HashMap::new();
    for file in files {
        let segments: Vec<&str> = file.path.split('/').collect();
        if segments.len() <= path_depth + 1 {
            direct_files.push(*file);
        } else {
            subdir_groups
                .entry(segments[path_depth].to_string())
                .or_default()
                .push(*file);
        }
    }

    if subdir_groups.is_empty() {
        return layout_files_in_grid(&direct_files, file_gap, sub_folder);
    }

    if subdir_groups.len() == 1 && direct_files.is_empty() && max_depth > 0 {
        let (subdir_name, subdir_files) = subdir_groups.into_iter().next().unwrap();
        let next_sub_folder = if sub_folder.is_empty() {
            subdir_name.as_str()
        } else {
            sub_folder
        };
        let mut child = layout_recursive_bottom_up(
            &subdir_files,
            path_depth + 1,
            file_gap,
            block_gap,
            next_sub_folder,
            max_depth - 1,
        );
        child.name = subdir_name;
        return child;
    }

    let mut entries: Vec<(String, Vec<&'a ParsedFile>)> = subdir_groups.into_iter().collect();
    entries.sort_by(|a, b| b.1.len().cmp(&a.1.len()).then_with(|| a.0.cmp(&b.0)));
    let mut child_blocks = Vec::new();

    for (subdir_name, subdir_files) in entries {
        let next_sub_folder = if sub_folder.is_empty() {
            subdir_name.as_str()
        } else {
            sub_folder
        };
        let mut block = if max_depth == 0 {
            layout_files_in_grid(&subdir_files, file_gap, next_sub_folder)
        } else {
            layout_recursive_bottom_up(
                &subdir_files,
                path_depth + 1,
                file_gap,
                (block_gap * 0.6).max(0.15),
                next_sub_folder,
                max_depth - 1,
            )
        };
        block.name = subdir_name;
        child_blocks.push(block);
    }

    if !direct_files.is_empty() {
        let next_sub_folder = if sub_folder.is_empty() {
            "_files"
        } else {
            sub_folder
        };
        let mut direct_block = layout_files_in_grid(&direct_files, file_gap, next_sub_folder);
        direct_block.name = "_files".to_string();
        child_blocks.push(direct_block);
    }

    pack_blocks_in_grid(child_blocks, block_gap)
}

fn layout_semantic<'a>(files: &[&'a ParsedFile], gap: f32) -> BlockLayout<'a> {
    if files.is_empty() {
        return empty_block();
    }

    let n = files.len();
    let path_to_index: HashMap<&str, usize> = files
        .iter()
        .enumerate()
        .map(|(index, file)| (file.path.as_str(), index))
        .collect();
    let radius = (n as f32).sqrt() * 3.0;
    let mut pos_x = vec![0.0_f32; n];
    let mut pos_z = vec![0.0_f32; n];

    for index in 0..n {
        let angle = index as f32 / n as f32 * std::f32::consts::TAU;
        let r = radius * (0.3 + 0.7 * ((index * 37 % 101) as f32 / 100.0));
        pos_x[index] = angle.cos() * r;
        pos_z[index] = angle.sin() * r;
    }

    let iterations = (20.0 + n as f32 * 0.5).min(80.0) as usize;
    for iteration in 0..iterations {
        let temp = 1.0 - iteration as f32 / iterations as f32;
        let mut force_x = vec![0.0_f32; n];
        let mut force_z = vec![0.0_f32; n];

        for i in 0..n {
            let (start, end) = if n < 300 {
                (i + 1, n)
            } else {
                (i.saturating_sub(20), (i + 20).min(n))
            };
            for j in start..end {
                if i == j {
                    continue;
                }
                let dx = pos_x[i] - pos_x[j];
                let dz = pos_z[i] - pos_z[j];
                let dist = (dx * dx + dz * dz).sqrt() + 0.1;
                let force = 8.0 / (dist * dist);
                let fx = dx / dist * force;
                let fz = dz / dist * force;
                force_x[i] += fx;
                force_z[i] += fz;
                if n < 300 {
                    force_x[j] -= fx;
                    force_z[j] -= fz;
                }
            }
        }

        for (i, file) in files.iter().enumerate() {
            for import in &file.imports {
                if let Some(&j) = path_to_index.get(import.as_str()) {
                    let dx = pos_x[j] - pos_x[i];
                    let dz = pos_z[j] - pos_z[i];
                    let dist = (dx * dx + dz * dz).sqrt() + 0.1;
                    let force = 0.15 * dist;
                    force_x[i] += dx / dist * force;
                    force_z[i] += dz / dist * force;
                    force_x[j] -= dx / dist * force * 0.5;
                    force_z[j] -= dz / dist * force * 0.5;
                }
            }
        }

        let max_move = 3.0 * temp + 0.5;
        for i in 0..n {
            let len = (force_x[i] * force_x[i] + force_z[i] * force_z[i]).sqrt() + 0.001;
            let scale = max_move.min(len) / len;
            pos_x[i] += force_x[i] * scale;
            pos_z[i] += force_z[i] * scale;
        }
    }

    let dimensions: Vec<(f32, f32)> = files.iter().map(|file| building_dimensions(file)).collect();
    for _ in 0..5 {
        for i in 0..n {
            for j in i + 1..n {
                let dx = pos_x[i] - pos_x[j];
                let dz = pos_z[i] - pos_z[j];
                let dist = (dx * dx + dz * dz).sqrt() + 0.001;
                let min_dist = (dimensions[i].0 + dimensions[j].0) / 2.0 + gap * 0.8;
                if dist < min_dist {
                    let push = (min_dist - dist) / 2.0;
                    let nx = dx / dist;
                    let nz = dz / dist;
                    pos_x[i] += nx * push;
                    pos_z[i] += nz * push;
                    pos_x[j] -= nx * push;
                    pos_z[j] -= nz * push;
                }
            }
        }
    }

    let avg_x = pos_x.iter().sum::<f32>() / n as f32;
    let avg_z = pos_z.iter().sum::<f32>() / n as f32;
    let mut positions = Vec::with_capacity(n);
    let mut min_x = f32::MAX;
    let mut max_x = f32::MIN;
    let mut min_z = f32::MAX;
    let mut max_z = f32::MIN;

    for (index, file) in files.iter().enumerate() {
        let lx = pos_x[index] - avg_x;
        let lz = pos_z[index] - avg_z;
        let folder = file.path.split('/').next().unwrap_or("_root").to_string();
        let (width, _) = dimensions[index];
        min_x = min_x.min(lx - width / 2.0);
        max_x = max_x.max(lx + width / 2.0);
        min_z = min_z.min(lz - width / 2.0);
        max_z = max_z.max(lz + width / 2.0);
        positions.push(FilePosition {
            file,
            lx,
            lz,
            sub_folder: folder,
        });
    }

    BlockLayout {
        name: String::new(),
        positions,
        half_w: if min_x == f32::MAX {
            1.0
        } else {
            (max_x - min_x) / 2.0 + 1.0
        },
        half_d: if min_z == f32::MAX {
            1.0
        } else {
            (max_z - min_z) / 2.0 + 1.0
        },
        children: Vec::new(),
    }
}

fn block_bounds(block: &BlockLayout<'_>) -> Option<Bounds> {
    let mut min_x = f32::MAX;
    let mut max_x = f32::MIN;
    let mut min_z = f32::MAX;
    let mut max_z = f32::MIN;

    for position in &block.positions {
        let (width, _) = building_dimensions(position.file);
        min_x = min_x.min(position.lx - width / 2.0);
        max_x = max_x.max(position.lx + width / 2.0);
        min_z = min_z.min(position.lz - width / 2.0);
        max_z = max_z.max(position.lz + width / 2.0);
    }

    if min_x == f32::MAX {
        None
    } else {
        Some(Bounds {
            x: min_x - 0.15,
            z: min_z - 0.15,
            width: max_x - min_x + 0.3,
            depth: max_z - min_z + 0.3,
        })
    }
}

fn compute_subdistrict_bounds(
    block: &BlockLayout<'_>,
    base_color: &str,
    depth: usize,
    max_depth: usize,
) -> Vec<SubDistrictData> {
    if block.children.is_empty() || depth >= max_depth {
        return Vec::new();
    }

    let total = block.children.len();
    block
        .children
        .iter()
        .enumerate()
        .filter_map(|(index, child)| {
            if child.name == "_files" && child.positions.len() < 2 {
                return None;
            }
            let bounds = block_bounds(child)?;
            let color = subdistrict_color(index, total, base_color);
            let children = compute_subdistrict_bounds(child, &color, depth + 1, max_depth);
            Some(SubDistrictData {
                name: child.name.clone(),
                color,
                bounds,
                sub_districts: if children.is_empty() {
                    None
                } else {
                    Some(children)
                },
            })
        })
        .collect()
}

fn offset_subdistricts(subdistricts: &mut [SubDistrictData], dx: f32, dz: f32) {
    for subdistrict in subdistricts {
        subdistrict.bounds.x += dx;
        subdistrict.bounds.z += dz;
        if let Some(children) = subdistrict.sub_districts.as_mut() {
            offset_subdistricts(children, dx, dz);
        }
    }
}

/// One packing attempt for a given row width. Returns each rectangle's top-left
/// corner plus the width and depth of the whole arrangement.
///
/// Rectangles go into rows, deepest first, so the first one sets its row's depth.
/// Later, shallower rectangles fill the space under an earlier one in the same
/// row, side by side, when they fit there; that is what keeps small districts
/// from trailing off in a long thin row of their own.
fn pack_rows(
    sizes: &[(f32, f32)],
    order: &[usize],
    gap: f32,
    row_width: f32,
) -> (Vec<(f32, f32)>, f32, f32) {
    const EPS: f32 = 1e-3;
    /// A strip under a column's first rectangle, filled left to right.
    struct Level {
        z: f32,
        depth: f32,
        used_width: f32,
    }
    struct Column {
        x: f32,
        width: f32,
        used: f32,
        levels: Vec<Level>,
    }
    struct Row {
        z: f32,
        depth: f32,
        width: f32,
        columns: Vec<Column>,
    }

    let mut rows: Vec<Row> = Vec::new();
    // (row index, x within the row, z)
    let mut placed = vec![(0_usize, 0.0_f32, 0.0_f32); sizes.len()];

    for &index in order {
        let w = sizes[index].0 * 2.0;
        let d = sizes[index].1 * 2.0;
        let mut spot = None;

        // Under an earlier rectangle: beside the ones already there, or on a new strip below them
        'stack: for (r, row) in rows.iter_mut().enumerate() {
            for column in row.columns.iter_mut() {
                for level in column.levels.iter_mut() {
                    let x = level.used_width + gap;
                    if x + w <= column.width + EPS && d <= level.depth + EPS {
                        level.used_width = x + w;
                        spot = Some((r, column.x + x, level.z));
                        break 'stack;
                    }
                }
                if w <= column.width + EPS && column.used + gap + d <= row.depth + EPS {
                    let z = row.z + column.used + gap;
                    column.levels.push(Level { z, depth: d, used_width: w });
                    column.used += gap + d;
                    spot = Some((r, column.x, z));
                    break 'stack;
                }
            }
        }
        // Otherwise at the end of the first row with room
        if spot.is_none() {
            for (r, row) in rows.iter_mut().enumerate() {
                let x = row.width + gap;
                if x + w <= row_width + EPS {
                    row.columns.push(Column { x, width: w, used: d, levels: Vec::new() });
                    row.width = x + w;
                    spot = Some((r, x, row.z));
                    break;
                }
            }
        }
        // Otherwise it starts a new row
        placed[index] = spot.unwrap_or_else(|| {
            let z = rows.last().map_or(0.0, |row| row.z + row.depth + gap);
            rows.push(Row {
                z,
                depth: d,
                width: w,
                columns: vec![Column { x: 0.0, width: w, used: d, levels: Vec::new() }],
            });
            (rows.len() - 1, 0.0, z)
        });
    }

    let width = rows.iter().fold(0.0_f32, |m, row| m.max(row.width));
    let depth = rows.last().map_or(0.0, |row| row.z + row.depth);
    // Rows narrower than the widest one are centred under it
    let corners = placed
        .into_iter()
        .map(|(r, x, z)| (x + (width - rows[r].width) / 2.0, z))
        .collect();
    (corners, width, depth)
}

/// Packs rectangles (half extents in, centres out, same order) into a compact
/// block centred on the origin, `gap` apart. Several row widths are tried and the
/// most compact result wins, leaning slightly towards wide over deep because the
/// city is viewed on a landscape screen.
fn pack_rects(sizes: &[(f32, f32)], gap: f32) -> Vec<(f32, f32)> {
    if sizes.is_empty() {
        return Vec::new();
    }
    if sizes.len() == 1 {
        return vec![(0.0, 0.0)];
    }

    let mut order: Vec<usize> = (0..sizes.len()).collect();
    order.sort_by(|a, b| {
        sizes[*b]
            .1
            .total_cmp(&sizes[*a].1)
            .then(sizes[*b].0.total_cmp(&sizes[*a].0))
            .then(a.cmp(b))
    });
    let total_area: f32 = sizes
        .iter()
        .map(|(half_w, half_d)| (half_w * 2.0 + gap) * (half_d * 2.0 + gap))
        .sum();
    let widest = sizes.iter().fold(0.0_f32, |m, size| m.max(size.0 * 2.0));

    let mut best: Option<(f32, Vec<(f32, f32)>, f32, f32)> = None;
    for step in 0..=24 {
        let row_width = (total_area.sqrt() * (0.7 + 0.05 * step as f32)).max(widest);
        let (corners, width, depth) = pack_rows(sizes, &order, gap, row_width);
        // Side of the square the arrangement needs, then its area as a tie-break
        let score = width.max(depth * 1.2) + width * depth * 1e-4;
        if best.as_ref().is_none_or(|(best_score, ..)| score < *best_score) {
            best = Some((score, corners, width, depth));
        }
    }

    let (_, corners, width, depth) = best.expect("at least one packing attempt");
    corners
        .into_iter()
        .zip(sizes)
        .map(|((x, z), (half_w, half_d))| (x + half_w - width / 2.0, z + half_d - depth / 2.0))
        .collect()
}

pub fn layout_city(
    files: &[ParsedFile],
    districts: &mut [DistrictData],
    mode: LayoutMode,
) -> Vec<FileData> {
    // Lanes between buildings, side streets between folders, avenues between districts.
    const FILE_GAP: f32 = 0.45;
    const BLOCK_GAP: f32 = 0.9;
    const DISTRICT_GAP: f32 = 2.6;
    /// Pavement between the outermost buildings and the district's edge.
    const DISTRICT_PAVEMENT: f32 = 0.35;

    let files_by_path: HashMap<&str, &ParsedFile> = files
        .iter()
        .map(|file| (file.path.as_str(), file))
        .collect();
    let visible_paths: HashSet<&str> = files.iter().map(|file| file.path.as_str()).collect();
    let mut imported_by: HashMap<&str, Vec<String>> = HashMap::new();
    for file in files {
        for import in &file.imports {
            if visible_paths.contains(import.as_str()) {
                imported_by
                    .entry(import.as_str())
                    .or_default()
                    .push(file.path.clone());
            }
        }
    }

    let mut district_layouts = Vec::with_capacity(districts.len());
    for district in districts.iter() {
        let district_files: Vec<&ParsedFile> = district
            .files
            .iter()
            .filter_map(|path| files_by_path.get(path.as_str()).copied())
            .collect();
        let mut block = match mode {
            LayoutMode::Extension => layout_files_in_grid(&district_files, FILE_GAP, ""),
            LayoutMode::Semantic => layout_semantic(&district_files, FILE_GAP),
            LayoutMode::Folder => {
                layout_recursive_bottom_up(&district_files, 1, FILE_GAP, BLOCK_GAP, "", 6)
            }
        };
        block.name = district.name.clone();
        district_layouts.push(block);
    }

    let district_sizes: Vec<(f32, f32)> = district_layouts
        .iter()
        .map(|layout| (layout.half_w, layout.half_d))
        .collect();
    let district_positions = pack_rects(&district_sizes, DISTRICT_GAP);
    let mut result = Vec::new();

    for (index, district) in districts.iter_mut().enumerate() {
        let Some(layout) = district_layouts.get(index) else {
            continue;
        };
        let Some((center_x, center_z)) = district_positions.get(index).copied() else {
            continue;
        };

        for position in &layout.positions {
            let imports = position
                .file
                .imports
                .iter()
                .filter(|import| visible_paths.contains(import.as_str()))
                .cloned()
                .collect();

            result.push(FileData {
                path: position.file.path.clone(),
                lines: position.file.lines,
                size_bytes: position.file.size_bytes,
                extension: position.file.extension.clone(),
                language: position.file.language.clone(),
                functions: position.file.functions.clone(),
                types: position.file.types.clone(),
                classes: position.file.classes.clone(),
                symbols: position.file.symbols.clone(),
                imports,
                imported_by: imported_by
                    .remove(position.file.path.as_str())
                    .unwrap_or_default(),
                external_imports: position.file.external_imports.clone(),
                decorators: position.file.decorators.clone(),
                complexity: position.file.complexity,
                frontend_frameworks: position.file.frontend_frameworks.clone(),
                is_react_component: position.file.is_react_component,
                has_unused_exports: position.file.has_unused_exports,
                file_type: position.file.file_type.clone(),
                position: Position {
                    x: center_x + position.lx,
                    z: center_z + position.lz,
                },
                width: Some(building_dimensions(position.file).0),
                district: district.name.clone(),
                sub_folder: Some(if position.sub_folder.is_empty() {
                    "_root".to_string()
                } else {
                    position.sub_folder.clone()
                }),
                in_degree: 0,
                out_degree: 0,
                community: -1,
                network_x: None,
                network_y: None,
                calls: position.file.calls.clone(),
            });
        }

        if let Some(mut bounds) = block_bounds(layout) {
            bounds.x += center_x - DISTRICT_PAVEMENT;
            bounds.z += center_z - DISTRICT_PAVEMENT;
            bounds.width += DISTRICT_PAVEMENT * 2.0;
            bounds.depth += DISTRICT_PAVEMENT * 2.0;
            district.bounds = bounds;
        } else {
            district.bounds = empty_bounds();
        }

        let mut subdistricts = compute_subdistrict_bounds(layout, &district.color, 0, 2);
        if !subdistricts.is_empty() {
            offset_subdistricts(&mut subdistricts, center_x, center_z);
            district.sub_districts = Some(subdistricts);
        }
    }

    result
}

pub fn compute_stats(files: &[FileData]) -> CityStats {
    let total_complexity: usize = files.iter().map(|file| file.complexity).sum();
    let average_complexity = if files.is_empty() {
        0.0
    } else {
        total_complexity as f32 / files.len() as f32
    };

    let mut languages_by_name: HashMap<String, LanguageStats> = HashMap::new();
    for file in files {
        let entry = languages_by_name
            .entry(file.language.clone())
            .or_insert_with(|| LanguageStats {
                language: file.language.clone(),
                files: 0,
                lines: 0,
                symbols: 0,
            });
        entry.files += 1;
        entry.lines += file.lines;
        entry.symbols += file.symbols.len();
    }

    let mut languages: Vec<LanguageStats> = languages_by_name.into_values().collect();
    languages.sort_by(|a, b| {
        b.lines
            .cmp(&a.lines)
            .then_with(|| a.language.cmp(&b.language))
    });

    CityStats {
        total_files: files.len(),
        total_functions: files.iter().map(|file| file.functions.len()).sum(),
        total_classes: files.iter().map(|file| file.classes.len()).sum(),
        total_lines: files.iter().map(|file| file.lines).sum(),
        total_types: files.iter().map(|file| file.types.len()).sum(),
        total_imports: files.iter().map(|file| file.imports.len()).sum(),
        external_imports: files.iter().map(|file| file.external_imports.len()).sum(),
        unused_exports: files.iter().filter(|file| file.has_unused_exports).count(),
        total_complexity,
        average_complexity,
        max_complexity: files.iter().map(|file| file.complexity).max().unwrap_or(0),
        languages,
    }
}

pub fn create_snapshot_with_mode(
    parsed: Vec<ParsedFile>,
    warnings: Vec<String>,
    mode: LayoutMode,
) -> CitySnapshot {
    create_snapshot_with_mode_and_source_tree(parsed, warnings, mode, Vec::new())
}

pub fn create_snapshot_with_mode_and_source_tree(
    parsed: Vec<ParsedFile>,
    warnings: Vec<String>,
    mode: LayoutMode,
    mut source_tree: Vec<SourceTreeEntry>,
) -> CitySnapshot {
    let mut districts = compute_districts(&parsed, mode);
    let mut files = layout_city(&parsed, &mut districts, mode);

    // Compute network analysis once on the Rust side: degree counts per file,
    // Louvain communities, entry points, and hubs. The frontend just renders.
    let network = super::network::compute_network_analysis(&mut files);
    let stats = compute_stats(&files);

    if source_tree.is_empty() {
        source_tree = files
            .iter()
            .map(|file| SourceTreeEntry {
                path: file.path.clone(),
                is_file: true,
                parsed: true,
            })
            .collect();
    }

    CitySnapshot {
        schema_version: 1,
        files,
        districts,
        stats,
        source_tree,
        warnings: if warnings.is_empty() {
            None
        } else {
            Some(warnings)
        },
        network,
    }
}

pub fn create_snapshot(parsed: Vec<ParsedFile>, warnings: Vec<String>) -> CitySnapshot {
    create_snapshot_with_mode(parsed, warnings, LayoutMode::Folder)
}

fn is_path_hidden(path: &str, hidden_paths: &HashSet<String>) -> bool {
    if hidden_paths.contains(path) {
        return true;
    }

    let mut current = String::new();
    for segment in path
        .split('/')
        .take(path.split('/').count().saturating_sub(1))
    {
        if !current.is_empty() {
            current.push('/');
        }
        current.push_str(segment);
        if hidden_paths.contains(&current) {
            return true;
        }
    }

    false
}

fn file_to_parsed(file: &FileData, visible_paths: &HashSet<String>) -> ParsedFile {
    ParsedFile {
        path: file.path.clone(),
        lines: file.lines,
        size_bytes: file.size_bytes,
        extension: file.extension.clone(),
        language: file.language.clone(),
        functions: file.functions.clone(),
        types: file.types.clone(),
        classes: file.classes.clone(),
        symbols: file.symbols.clone(),
        imports: file
            .imports
            .iter()
            .filter(|import| visible_paths.contains(*import))
            .cloned()
            .collect(),
        external_imports: file.external_imports.clone(),
        decorators: file.decorators.clone(),
        complexity: file.complexity,
        frontend_frameworks: file.frontend_frameworks.clone(),
        is_react_component: file.is_react_component,
        has_unused_exports: file.has_unused_exports,
        file_type: file.file_type.clone(),
        // Keep call sites so a layout toggle or hide/show doesn't drop the
        // caller→callee edges (and with them degrees, communities and hubs).
        calls: file.calls.clone(),
    }
}

pub fn recompute_snapshot(
    original: CitySnapshot,
    hidden_paths: Vec<String>,
    hidden_extensions: Vec<String>,
    mode: LayoutMode,
) -> CitySnapshot {
    let hidden_paths: HashSet<String> = hidden_paths.into_iter().collect();
    let hidden_extensions: HashSet<String> = hidden_extensions.into_iter().collect();

    let visible_files: Vec<FileData> = original
        .files
        .into_iter()
        .filter(|file| !is_path_hidden(&file.path, &hidden_paths))
        .filter(|file| !hidden_extensions.contains(&extension(&file.path)))
        .collect();

    if visible_files.is_empty() {
        return CitySnapshot {
            schema_version: original.schema_version,
            files: Vec::new(),
            districts: Vec::new(),
            stats: compute_stats(&[]),
            source_tree: original.source_tree,
            warnings: original.warnings,
            network: NetworkAnalysis::default(),
        };
    }

    let visible_paths: HashSet<String> =
        visible_files.iter().map(|file| file.path.clone()).collect();
    let parsed = visible_files
        .iter()
        .map(|file| file_to_parsed(file, &visible_paths))
        .collect();

    let mut snapshot = create_snapshot_with_mode(parsed, Vec::new(), mode);
    snapshot.warnings = original.warnings;
    snapshot.source_tree = original.source_tree;
    snapshot
}

#[cfg(test)]
mod packing_tests {
    use super::pack_rects;

    /// One big district, a few medium ones and a tail of tiny ones: the usual repository shape.
    fn city() -> Vec<(f32, f32)> {
        let mut sizes = vec![(12.0, 16.0), (6.0, 8.0), (6.0, 12.0), (7.0, 10.0), (3.5, 3.5)];
        sizes.extend([(2.0, 2.0), (1.5, 3.0), (2.0, 1.5), (1.5, 1.5), (1.6, 1.7)]);
        sizes.extend(std::iter::repeat_n((0.75, 0.75), 6));
        sizes
    }

    fn extent(sizes: &[(f32, f32)], centers: &[(f32, f32)]) -> (f32, f32, f32, f32) {
        let mut b = (f32::MAX, f32::MIN, f32::MAX, f32::MIN);
        for ((x, z), (w, d)) in centers.iter().zip(sizes) {
            b = (b.0.min(x - w), b.1.max(x + w), b.2.min(z - d), b.3.max(z + d));
        }
        b
    }

    #[test]
    fn rectangles_keep_the_gap_between_them() {
        let sizes = city();
        let gap = 2.6;
        let centers = pack_rects(&sizes, gap);
        assert_eq!(centers.len(), sizes.len());
        for i in 0..sizes.len() {
            for j in i + 1..sizes.len() {
                let dx = (centers[i].0 - centers[j].0).abs() - sizes[i].0 - sizes[j].0;
                let dz = (centers[i].1 - centers[j].1).abs() - sizes[i].1 - sizes[j].1;
                assert!(dx.max(dz) >= gap - 1e-2, "{i} and {j} are {} apart", dx.max(dz));
            }
        }
    }

    #[test]
    fn result_is_compact_and_centred() {
        let sizes = city();
        let centers = pack_rects(&sizes, 2.6);
        let (x0, x1, z0, z1) = extent(&sizes, &centers);
        assert!((x0 + x1).abs() < 1e-2 && (z0 + z1).abs() < 1e-2, "not centred");
        let (width, depth) = (x1 - x0, z1 - z0);
        let ratio = width.max(depth) / width.min(depth);
        assert!(ratio < 1.6, "{width} x {depth} is too stretched");
        let used: f32 = sizes.iter().map(|(w, d)| 4.0 * w * d).sum();
        assert!(used / (width * depth) > 0.5, "only {} of the block is used", used / (width * depth));
    }

    #[test]
    fn packing_is_deterministic_and_handles_small_inputs() {
        let sizes = city();
        assert_eq!(pack_rects(&sizes, 2.6), pack_rects(&sizes, 2.6));
        assert!(pack_rects(&[], 1.0).is_empty());
        assert_eq!(pack_rects(&[(3.0, 2.0)], 1.0), vec![(0.0, 0.0)]);
    }
}
