use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::parser::{ClassInfo, FileType, FunctionInfo, ParsedFile, TypeInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistrictData {
    pub name: String,
    pub color: String,
    pub files: Vec<String>,
    pub bounds: Bounds,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bounds {
    pub x: f32,
    pub z: f32,
    pub width: f32,
    pub depth: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileData {
    pub path: String,
    pub lines: usize,
    pub size: f32,
    pub height: f32,
    pub x: f32,
    pub z: f32,
    pub color: String,
    pub file_type: FileType,
    pub functions: Vec<FunctionInfo>,
    pub types: Vec<TypeInfo>,
    pub classes: Vec<ClassInfo>,
    pub complexity: usize,
    pub is_react_component: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CityStats {
    pub total_files: usize,
    pub total_lines: usize,
    pub total_functions: usize,
    pub total_types: usize,
    pub total_classes: usize,
    pub language_breakdown: HashMap<String, usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CitySnapshot {
    pub files: Vec<FileData>,
    pub districts: Vec<DistrictData>,
    pub stats: CityStats,
    pub warnings: Option<Vec<String>>,
}

const DISTRICT_COLORS: [&str; 12] = [
    "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c",
    "#e67e22", "#34495e", "#16a085", "#c0392b", "#8e44ad", "#27ae60",
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
    (".yaml", "#cb171e"),
    (".yml", "#cb171e"),
    (".toml", "#9c4221"),
    (".rs", "#dea584"),
    (".go", "#00add8"),
    (".java", "#b07219"),
    (".rb", "#cc342d"),
    (".vue", "#42b883"),
    (".svelte", "#ff3e00"),
];

fn get_file_color(path: &str) -> String {
    let ext = path.rsplit('.').next().unwrap_or("");
    let ext_with_dot = format!(".{}", ext);
    EXTENSION_COLORS
        .iter()
        .find(|(e, _)| *e == ext_with_dot)
        .map(|(_, c)| c.to_string())
        .unwrap_or_else(|| "#888888".to_string())
}

pub fn compute_districts(files: &[ParsedFile]) -> Vec<DistrictData> {
    let mut district_map: HashMap<String, Vec<String>> = HashMap::new();

    for file in files {
        let segments: Vec<&str> = file.path.split('/').collect();
        let district_name = if segments.len() > 1 {
            segments[0].to_string()
        } else {
            "root".to_string()
        };
        district_map
            .entry(district_name)
            .or_default()
            .push(file.path.clone());
    }

    let mut districts: Vec<DistrictData> = district_map
        .into_iter()
        .map(|(name, file_paths)| {
            let color = DISTRICT_COLORS[name.len() % DISTRICT_COLORS.len()].to_string();
            DistrictData {
                name,
                color,
                files: file_paths,
                bounds: Bounds {
                    x: 0.0,
                    z: 0.0,
                    width: 0.0,
                    depth: 0.0,
                },
            }
        })
        .collect();

    districts.sort_by(|a, b| b.files.len().cmp(&a.files.len()));
    districts
}

pub fn layout_city(files: &[ParsedFile], districts: &[DistrictData]) -> Vec<FileData> {
    let mut result = Vec::new();

    for district in districts {
        let district_files: Vec<&ParsedFile> = files
            .iter()
            .filter(|f| district.files.contains(&f.path))
            .collect();

        let grid_size = (district_files.len() as f32).sqrt().ceil() as usize;
        let spacing = 12.0;

        for (i, parsed) in district_files.iter().enumerate() {
            let row = i / grid_size;
            let col = i % grid_size;

            let size = (parsed.lines as f32).sqrt() * 0.8;
            let height = (parsed.complexity as f32).min(20.0) * 0.5 + 2.0;

            result.push(FileData {
                path: parsed.path.clone(),
                lines: parsed.lines,
                size: size.max(2.0),
                height,
                x: col as f32 * spacing,
                z: row as f32 * spacing,
                color: get_file_color(&parsed.path),
                file_type: parsed.file_type.clone(),
                functions: parsed.functions.clone(),
                types: parsed.types.clone(),
                classes: parsed.classes.clone(),
                complexity: parsed.complexity,
                is_react_component: parsed.is_react_component,
            });
        }
    }

    result
}

pub fn compute_stats(files: &[FileData]) -> CityStats {
    let mut total_functions = 0;
    let mut total_types = 0;
    let mut total_classes = 0;
    let mut language_breakdown: HashMap<String, usize> = HashMap::new();

    for file in files {
        total_functions += file.functions.len();
        total_types += file.types.len();
        total_classes += file.classes.len();

        let ext = file.path.rsplit('.').next().unwrap_or("other");
        *language_breakdown.entry(ext.to_string()).or_insert(0) += 1;
    }

    CityStats {
        total_files: files.len(),
        total_lines: files.iter().map(|f| f.lines).sum(),
        total_functions,
        total_types,
        total_classes,
        language_breakdown,
    }
}

pub fn create_snapshot(
    parsed: Vec<ParsedFile>,
    warnings: Vec<String>,
) -> CitySnapshot {
    let districts = compute_districts(&parsed);
    let files = layout_city(&parsed, &districts);
    let stats = compute_stats(&files);

    CitySnapshot {
        files,
        districts,
        stats,
        warnings: if warnings.is_empty() {
            None
        } else {
            Some(warnings)
        },
    }
}
