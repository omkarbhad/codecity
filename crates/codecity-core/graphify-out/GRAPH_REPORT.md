# Graph Report - codecity-core  (2026-05-06)

## Corpus Check
- 6 files · ~17,378 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 167 nodes · 339 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5eaf950`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `AnalysisParser` - 25 edges
2. `node_text()` - 11 edges
3. `layout_city()` - 11 edges
4. `recompute_snapshot()` - 8 edges
5. `compute_network_analysis()` - 7 edges
6. `extract_each_dep()` - 7 edges
7. `resolve_internal_imports_full()` - 6 edges
8. `district_color()` - 6 edges
9. `subdistrict_color()` - 6 edges
10. `empty_block()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `create_snapshot_with_mode_and_source_tree()` --calls--> `compute_network_analysis()`  [INFERRED]
  layout/mod.rs → network.rs
- `new_district()` --calls--> `district_color()`  [INFERRED]
  layout/mod.rs → layout/color.rs
- `compute_subdistrict_bounds()` --calls--> `subdistrict_color()`  [INFERRED]
  layout/mod.rs → layout/color.rs

## Communities (13 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (21): BlockLayout, Bounds, CitySnapshot, CityStats, CommunitySummary, create_snapshot(), DistrictData, EntryPoint (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (20): AliasRule, callee_from_go(), callee_from_python(), callee_from_rust(), callee_from_ts_js(), callee_from_zig(), CallSite, ClassInfo (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (16): compute_stats(), create_snapshot_with_mode(), create_snapshot_with_mode_and_source_tree(), file_to_parsed(), is_path_hidden(), recompute_snapshot(), bfs_reach_files(), compute_community_grid_layout() (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.26
Nodes (13): district_color(), district_palette_wraps(), extension_color_falls_back_to_palette_when_unknown(), extension_color_matches_known_extension(), folder_mode_ignores_extension_palette(), hex_round_trips_through_hsl(), hex_to_hsl(), hsl_to_hex() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.31
Nodes (11): block_bounds(), building_dimensions(), empty_block(), layout_city(), layout_files_in_grid(), layout_recursive_bottom_up(), layout_semantic(), offset_block() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.27
Nodes (6): parse_file_batch(), parse_files(), resolve_internal_imports(), resolve_internal_imports_full(), resolve_internal_imports_with_aliases(), ZigDeps

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (5): join_rel(), normalize_relative(), strip_jsonc(), try_resolve_with_extensions(), TsConfigAliases

### Community 9 - "Community 9"
Cohesion: 0.28
Nodes (9): common_prefix(), compute_districts(), compute_extension_districts(), compute_folder_districts(), compute_semantic_districts(), empty_bounds(), extension(), grouped_districts() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.32
Nodes (3): FileType, rust_source_extracts_function_struct_and_impl(), typescript_source_extracts_interface_class_and_function()

### Community 11 - "Community 11"
Cohesion: 0.47
Nodes (6): assignment_lhs_field_name(), assignment_rhs_string(), assignment_rhs_struct(), extract_each_dep(), extract_zon_dependencies(), first_child_of_kind()

## Knowledge Gaps
- **28 isolated node(s):** `ParsedFile`, `CallSite`, `FunctionInfo`, `TypeInfo`, `ClassInfo` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AnalysisParser` connect `Community 1` to `Community 10`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Why does `compute_subdistrict_bounds()` connect `Community 4` to `Community 0`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `recompute_snapshot()` (e.g. with `.new()` and `.default()`) actually correct?**
  _`recompute_snapshot()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `compute_network_analysis()` (e.g. with `.default()` and `.new()`) actually correct?**
  _`compute_network_analysis()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ParsedFile`, `CallSite`, `FunctionInfo` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._