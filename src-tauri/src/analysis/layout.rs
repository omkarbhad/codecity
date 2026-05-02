use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use super::parser::{ClassInfo, FileType, FunctionInfo, ParsedFile, SymbolInfo, TypeInfo};

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
    pub district: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_folder: Option<String>,
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
pub struct CitySnapshot {
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
    pub files: Vec<FileData>,
    pub districts: Vec<DistrictData>,
    pub stats: CityStats,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub source_tree: Vec<SourceTreeEntry>,
    pub warnings: Option<Vec<String>>,
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

const DISTRICT_COLORS: [&str; 12] = [
    "#00e5ff", "#00e676", "#448aff", "#ffea00", "#b388ff", "#ff9100", "#ff4081", "#1de9b6",
    "#aeea00", "#ff1744", "#8c9eff", "#ffc400",
];

const EXTENSION_COLORS: &[(&str, &str)] = &[
    (".ts", "#3178c6"),
    (".tsx", "#61dafb"),
    (".js", "#f7df1e"),
    (".jsx", "#61dafb"),
    (".py", "#3572a5"),
    (".css", "#264de4"),
    (".scss", "#cd6799"),
    (".html", "#e34c26"),
    (".json", "#a0a0a0"),
    (".md", "#083fa1"),
    (".mdx", "#1f6feb"),
    (".yaml", "#cb171e"),
    (".yml", "#cb171e"),
    (".toml", "#9c4221"),
    (".rs", "#dea584"),
    (".go", "#00add8"),
    (".java", "#b07219"),
    (".rb", "#cc342d"),
    (".vue", "#42b883"),
    (".svelte", "#ff3e00"),
    (".astro", "#ff5d01"),
    (".cu", "#76b900"),
    (".cuh", "#76b900"),
    (".ptx", "#76b900"),
    (".cubin", "#5a8f00"),
    (".fatbin", "#5a8f00"),
];

fn extension(path: &str) -> String {
    path.rsplit_once('.')
        .map(|(_, ext)| format!(".{}", ext.to_lowercase()))
        .unwrap_or_else(|| ".other".to_string())
}

fn district_color(index: usize, name: &str, mode: LayoutMode) -> String {
    if matches!(mode, LayoutMode::Extension) {
        if let Some((_, color)) = EXTENSION_COLORS.iter().find(|(ext, _)| *ext == name) {
            return color.to_string();
        }
    }
    DISTRICT_COLORS[index % DISTRICT_COLORS.len()].to_string()
}

fn building_dimensions(file: &ParsedFile) -> (f32, f32) {
    let height = (file.lines as f32 / 60.0).clamp(0.3, 50.0);
    let width = (1.0 + file.functions.len() as f32 * 0.12).clamp(1.0, 2.2);
    (width, height)
}

fn hex_to_hsl(hex: &str) -> (f32, f32, f32) {
    let color = u32::from_str_radix(hex.trim_start_matches('#'), 16).unwrap_or(0x00e5ff);
    let r = ((color >> 16) & 0xff) as f32 / 255.0;
    let g = ((color >> 8) & 0xff) as f32 / 255.0;
    let b = (color & 0xff) as f32 / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if (max - min).abs() < f32::EPSILON {
        return (0.0, 0.0, l);
    }

    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };
    let h = if (max - r).abs() < f32::EPSILON {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) / 6.0
    } else if (max - g).abs() < f32::EPSILON {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };

    (h, s, l)
}

fn hue_to_rgb(p: f32, q: f32, mut t: f32) -> f32 {
    if t < 0.0 {
        t += 1.0;
    }
    if t > 1.0 {
        t -= 1.0;
    }
    if t < 1.0 / 6.0 {
        return p + (q - p) * 6.0 * t;
    }
    if t < 1.0 / 2.0 {
        return q;
    }
    if t < 2.0 / 3.0 {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    p
}

fn hsl_to_hex(h: f32, s: f32, l: f32) -> String {
    if s == 0.0 {
        let value = (l * 255.0).round() as u8;
        return format!("#{value:02x}{value:02x}{value:02x}");
    }

    let q = if l < 0.5 {
        l * (1.0 + s)
    } else {
        l + s - l * s
    };
    let p = 2.0 * l - q;
    let r = (hue_to_rgb(p, q, h + 1.0 / 3.0) * 255.0).round() as u8;
    let g = (hue_to_rgb(p, q, h) * 255.0).round() as u8;
    let b = (hue_to_rgb(p, q, h - 1.0 / 3.0) * 255.0).round() as u8;
    format!("#{r:02x}{g:02x}{b:02x}")
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
        let name = file
            .path
            .split('/')
            .next()
            .filter(|segment| !segment.is_empty())
            .unwrap_or("root")
            .to_string();
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
    let total_area: f32 = sorted
        .iter()
        .map(|block| (block.half_w * 2.0 + gap) * (block.half_d * 2.0 + gap))
        .sum();
    let target_width = total_area.sqrt() * 1.05;

    let mut shelves: Vec<(Vec<(BlockLayout<'a>, f32)>, f32, f32)> = Vec::new();
    let mut current = Vec::new();
    let mut current_width = 0.0_f32;
    let mut current_half_d = 0.0_f32;
    for block in sorted {
        let new_width =
            current_width + if current.is_empty() { 0.0 } else { gap } + block.half_w * 2.0;
        if !current.is_empty() && new_width > target_width {
            shelves.push((current, current_width, current_half_d));
            current = Vec::new();
            current_width = 0.0;
            current_half_d = 0.0;
        }
        let ox = current_width + if current.is_empty() { 0.0 } else { gap } + block.half_w;
        current_width = ox + block.half_w;
        current_half_d = current_half_d.max(block.half_d);
        current.push((block, ox));
    }
    if !current.is_empty() {
        shelves.push((current, current_width, current_half_d));
    }

    let total_depth: f32 = shelves
        .iter()
        .map(|(_, _, half_d)| half_d * 2.0)
        .sum::<f32>()
        + shelves.len().saturating_sub(1) as f32 * gap;
    let mut positions = Vec::new();
    let mut children = Vec::new();
    let mut min_x = f32::MAX;
    let mut max_x = f32::MIN;
    let mut min_z = f32::MAX;
    let mut max_z = f32::MIN;
    let mut offset_z = -total_depth / 2.0;

    for (items, shelf_width, shelf_half_d) in shelves {
        let center_z = offset_z + shelf_half_d;
        let shelf_offset_x = -shelf_width / 2.0;
        for (block, ox) in items {
            let world_x = shelf_offset_x + ox;
            let world_z = center_z;
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
            children.push(offset_block(&block, world_x, world_z));
        }
        offset_z += shelf_half_d * 2.0 + gap;
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

fn subdistrict_color(index: usize, total: usize, base_color: &str) -> String {
    let (h, s, l) = hex_to_hsl(base_color);
    let hue_shift = if total > 1 {
        index as f32 / (total - 1) as f32 * 0.15 - 0.075
    } else {
        0.0
    };
    let lightness_shift = if index % 2 == 0 { 0.05 } else { -0.05 };
    hsl_to_hex(
        (h + hue_shift).rem_euclid(1.0),
        s.clamp(0.3, 1.0),
        (l + lightness_shift).clamp(0.25, 0.8),
    )
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

fn pack_districts_square(sizes: &[(f32, f32)], gap: f32) -> Vec<(f32, f32)> {
    if sizes.is_empty() {
        return Vec::new();
    }
    if sizes.len() == 1 {
        return vec![(0.0, 0.0)];
    }

    let mut indices: Vec<usize> = (0..sizes.len()).collect();
    indices.sort_by(|a, b| {
        (sizes[*b].0 * sizes[*b].1)
            .partial_cmp(&(sizes[*a].0 * sizes[*a].1))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let total_area: f32 = indices
        .iter()
        .map(|idx| (sizes[*idx].0 * 2.0 + gap) * (sizes[*idx].1 * 2.0 + gap))
        .sum();
    let target_width = total_area.sqrt() * 1.05;

    let mut shelves: Vec<(Vec<(usize, f32)>, f32, f32)> = Vec::new();
    let mut current = Vec::new();
    let mut current_width = 0.0_f32;
    let mut current_half_d = 0.0_f32;
    for index in indices {
        let new_width =
            current_width + if current.is_empty() { 0.0 } else { gap } + sizes[index].0 * 2.0;
        if !current.is_empty() && new_width > target_width {
            shelves.push((current, current_width, current_half_d));
            current = Vec::new();
            current_width = 0.0;
            current_half_d = 0.0;
        }
        let ox = current_width + if current.is_empty() { 0.0 } else { gap } + sizes[index].0;
        current_width = ox + sizes[index].0;
        current_half_d = current_half_d.max(sizes[index].1);
        current.push((index, ox));
    }
    if !current.is_empty() {
        shelves.push((current, current_width, current_half_d));
    }

    let total_depth: f32 = shelves
        .iter()
        .map(|(_, _, half_d)| half_d * 2.0)
        .sum::<f32>()
        + shelves.len().saturating_sub(1) as f32 * gap;
    let mut positions = vec![(0.0, 0.0); sizes.len()];
    let mut offset_z = -total_depth / 2.0;
    for (items, shelf_width, shelf_half_d) in shelves {
        let center_z = offset_z + shelf_half_d;
        let shelf_offset_x = -shelf_width / 2.0;
        for (index, ox) in items {
            positions[index] = (shelf_offset_x + ox, center_z);
        }
        offset_z += shelf_half_d * 2.0 + gap;
    }
    positions
}

pub fn layout_city(
    files: &[ParsedFile],
    districts: &mut [DistrictData],
    mode: LayoutMode,
) -> Vec<FileData> {
    const FILE_GAP: f32 = 0.15;
    const BLOCK_GAP: f32 = 0.3;
    const DISTRICT_GAP: f32 = 0.8;

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
    let district_positions = pack_districts_square(&district_sizes, DISTRICT_GAP);
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
                district: district.name.clone(),
                sub_folder: Some(if position.sub_folder.is_empty() {
                    "_root".to_string()
                } else {
                    position.sub_folder.clone()
                }),
            });
        }

        if let Some(mut bounds) = block_bounds(layout) {
            bounds.x += center_x - 0.1;
            bounds.z += center_z - 0.1;
            bounds.width += 0.2;
            bounds.depth += 0.2;
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
    let files = layout_city(&parsed, &mut districts, mode);
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
