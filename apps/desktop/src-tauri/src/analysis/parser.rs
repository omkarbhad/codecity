use serde::{Deserialize, Serialize};
use tree_sitter::{Node, Parser};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedFile {
    pub path: String,
    pub lines: usize,
    pub functions: Vec<FunctionInfo>,
    pub types: Vec<TypeInfo>,
    pub classes: Vec<ClassInfo>,
    pub imports: Vec<String>,
    pub external_imports: Vec<String>,
    pub decorators: Vec<String>,
    pub complexity: usize,
    pub is_react_component: bool,
    pub has_unused_exports: bool,
    pub file_type: FileType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionInfo {
    pub name: String,
    pub exported: bool,
    pub lines: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeInfo {
    pub name: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassInfo {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    TypeScript,
    JavaScript,
    Python,
    Rust,
    Go,
    Java,
    Css,
    Markup,
    Config,
    Other,
}

impl FileType {
    pub fn from_extension(ext: &str) -> Self {
        match ext {
            "ts" | "tsx" => FileType::TypeScript,
            "js" | "jsx" | "mjs" | "cjs" => FileType::JavaScript,
            "py" => FileType::Python,
            "rs" => FileType::Rust,
            "go" => FileType::Go,
            "java" => FileType::Java,
            "css" | "scss" | "less" | "sass" => FileType::Css,
            "html" | "htm" | "xml" | "svg" => FileType::Markup,
            "json" | "yaml" | "yml" | "toml" | "ini" | "env" => FileType::Config,
            _ => FileType::Other,
        }
    }
}

pub struct AnalysisParser {
    ts_parser: Parser,
    js_parser: Parser,
    py_parser: Parser,
    rust_parser: Parser,
    go_parser: Parser,
    java_parser: Parser,
    css_parser: Parser,
    html_parser: Parser,
    json_parser: Parser,
}

impl AnalysisParser {
    pub fn new() -> Self {
        let mut ts_parser = Parser::new();
        ts_parser.set_language(&tree_sitter_typescript::LANGUAGE_TSX.into()).ok();

        let mut js_parser = Parser::new();
        js_parser.set_language(&tree_sitter_javascript::LANGUAGE.into()).ok();

        let mut py_parser = Parser::new();
        py_parser.set_language(&tree_sitter_python::LANGUAGE.into()).ok();

        let mut rust_parser = Parser::new();
        rust_parser.set_language(&tree_sitter_rust::LANGUAGE.into()).ok();

        let mut go_parser = Parser::new();
        go_parser.set_language(&tree_sitter_go::LANGUAGE.into()).ok();

        let mut java_parser = Parser::new();
        java_parser.set_language(&tree_sitter_java::LANGUAGE.into()).ok();

        let mut css_parser = Parser::new();
        css_parser.set_language(&tree_sitter_css::LANGUAGE.into()).ok();

        let mut html_parser = Parser::new();
        html_parser.set_language(&tree_sitter_html::LANGUAGE.into()).ok();

        let mut json_parser = Parser::new();
        json_parser.set_language(&tree_sitter_json::LANGUAGE.into()).ok();

        Self {
            ts_parser,
            js_parser,
            py_parser,
            rust_parser,
            go_parser,
            java_parser,
            css_parser,
            html_parser,
            json_parser,
        }
    }

    fn get_parser_for_type(&mut self, file_type: &FileType) -> Option<&mut Parser> {
        match file_type {
            FileType::TypeScript => Some(&mut self.ts_parser),
            FileType::JavaScript => Some(&mut self.js_parser),
            FileType::Python => Some(&mut self.py_parser),
            FileType::Rust => Some(&mut self.rust_parser),
            FileType::Go => Some(&mut self.go_parser),
            FileType::Java => Some(&mut self.java_parser),
            FileType::Css => Some(&mut self.css_parser),
            FileType::Markup => Some(&mut self.html_parser),
            FileType::Config => Some(&mut self.json_parser),
            FileType::Other => None,
        }
    }

    pub fn parse_file(&mut self, path: &str, content: &str) -> ParsedFile {
        let ext = path.rsplit('.').next().unwrap_or("");
        let file_type = FileType::from_extension(ext);
        let lines = content.lines().count();

        if let Some(parser) = self.get_parser_for_type(&file_type) {
            if let Some(tree) = parser.parse(content, None) {
                return self.analyze_tree(path, content, &tree.root_node(), file_type, lines);
            }
        }

        ParsedFile {
            path: path.to_string(),
            lines,
            functions: vec![],
            types: vec![],
            classes: vec![],
            imports: vec![],
            external_imports: vec![],
            decorators: vec![],
            complexity: 1,
            is_react_component: false,
            has_unused_exports: false,
            file_type,
        }
    }

    fn analyze_tree(
        &self,
        path: &str,
        content: &str,
        root: &Node,
        file_type: FileType,
        lines: usize,
    ) -> ParsedFile {
        let mut functions = Vec::new();
        let mut types = Vec::new();
        let mut classes = Vec::new();
        let mut imports = Vec::new();
        let mut external_imports = Vec::new();
        let mut decorators = Vec::new();
        let mut complexity = 1;
        let mut is_react_component = false;

        self.walk_tree(
            root,
            content,
            &mut functions,
            &mut types,
            &mut classes,
            &mut imports,
            &mut external_imports,
            &mut decorators,
            &mut complexity,
            &mut is_react_component,
        );

        ParsedFile {
            path: path.to_string(),
            lines,
            functions,
            types,
            classes,
            imports,
            external_imports,
            decorators,
            complexity,
            is_react_component,
            has_unused_exports: false,
            file_type,
        }
    }

    fn walk_tree(
        &self,
        node: &Node,
        content: &str,
        functions: &mut Vec<FunctionInfo>,
        types: &mut Vec<TypeInfo>,
        classes: &mut Vec<ClassInfo>,
        imports: &mut Vec<String>,
        external_imports: &mut Vec<String>,
        decorators: &mut Vec<String>,
        complexity: &mut usize,
        is_react_component: &mut bool,
    ) {
        let kind = node.kind();

        match kind {
            // JS/TS functions
            "function_declaration" | "function_expression" | "arrow_function" => {
                if let Some(name) = self.get_function_name(node, content) {
                    let exported = self.has_export_keyword(node);
                    let node_lines = node.end_position().row - node.start_position().row + 1;
                    functions.push(FunctionInfo {
                        name,
                        exported,
                        lines: node_lines,
                    });
                }
            }
            // Python functions
            "function_definition" => {
                if let Some(name) = self.get_function_name(node, content) {
                    let node_lines = node.end_position().row - node.start_position().row + 1;
                    functions.push(FunctionInfo {
                        name,
                        exported: false,
                        lines: node_lines,
                    });
                }
            }
            // Rust functions
            "function_item" => {
                if let Some(name) = self.get_function_name(node, content) {
                    let node_lines = node.end_position().row - node.start_position().row + 1;
                    functions.push(FunctionInfo {
                        name,
                        exported: false,
                        lines: node_lines,
                    });
                }
            }
            // Go functions
            "method_declaration" => {
                if let Some(name) = self.get_function_name(node, content) {
                    let node_lines = node.end_position().row - node.start_position().row + 1;
                    functions.push(FunctionInfo {
                        name,
                        exported: true,
                        lines: node_lines,
                    });
                }
            }
            // Java methods/constructors
            "constructor_declaration" => {
                if let Some(name) = self.get_function_name(node, content) {
                    let node_lines = node.end_position().row - node.start_position().row + 1;
                    functions.push(FunctionInfo {
                        name,
                        exported: true,
                        lines: node_lines,
                    });
                }
            }
            // Classes (all languages)
            "class_declaration" | "class_definition" => {
                if let Some(name) = self.get_class_name(node, content) {
                    classes.push(ClassInfo { name });
                }
            }
            // TS/JS types
            "type_alias_declaration" | "interface_declaration" | "enum_declaration" => {
                if let Some(name) = self.get_type_name(node, content) {
                    let kind_str = match kind {
                        "type_alias_declaration" => "type",
                        "interface_declaration" => "interface",
                        "enum_declaration" => "enum",
                        _ => "type",
                    };
                    types.push(TypeInfo {
                        name,
                        kind: kind_str.to_string(),
                    });
                }
            }
            // Rust struct/enum/trait
            "struct_item" | "enum_item" | "trait_item" => {
                if let Some(name) = self.get_type_name(node, content) {
                    let kind_str = match kind {
                        "struct_item" => "struct",
                        "enum_item" => "enum",
                        "trait_item" => "trait",
                        _ => "type",
                    };
                    types.push(TypeInfo {
                        name,
                        kind: kind_str.to_string(),
                    });
                }
            }
            // Go struct/interface
            "type_declaration" => {
                if let Some(name) = self.get_type_name(node, content) {
                    types.push(TypeInfo {
                        name,
                        kind: "type".to_string(),
                    });
                }
            }
            // Imports
            "import_statement" | "import_clause" | "import_declaration"
            | "use_declaration" | "import_spec" => {
                self.extract_imports(node, content, imports, external_imports);
            }
            // Decorators
            "decorator" => {
                if let Some(name) = self.get_decorator_name(node, content) {
                    decorators.push(name);
                }
            }
            // Complexity (all languages)
            "if_statement" | "for_statement" | "for_in_statement" | "for_of_statement"
            | "while_statement" | "do_statement" | "case_clause" | "switch_statement"
            | "if_expression" | "for_expression" | "while_expr" | "if_expr"
            | "match_expression" | "match_arm"
            | "try_statement" | "catch_clause" | "elif_clause" => {
                *complexity += 1;
            }
            // React detection
            "jsx_element" | "jsx_self_closing_element" | "jsx_fragment" => {
                *is_react_component = true;
            }
            _ => {}
        }

        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            self.walk_tree(
                &child,
                content,
                functions,
                types,
                classes,
                imports,
                external_imports,
                decorators,
                complexity,
                is_react_component,
            );
        }
    }

    fn get_function_name(&self, node: &Node, content: &str) -> Option<String> {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "identifier" {
                return Some(self.get_node_text(&child, content));
            }
        }
        None
    }

    fn get_class_name(&self, node: &Node, content: &str) -> Option<String> {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "identifier" {
                return Some(self.get_node_text(&child, content));
            }
        }
        None
    }

    fn get_type_name(&self, node: &Node, content: &str) -> Option<String> {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "identifier" {
                return Some(self.get_node_text(&child, content));
            }
        }
        None
    }

    fn get_decorator_name(&self, node: &Node, content: &str) -> Option<String> {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "identifier" {
                return Some(self.get_node_text(&child, content));
            }
        }
        None
    }

    fn extract_imports(
        &self,
        node: &Node,
        content: &str,
        imports: &mut Vec<String>,
        external_imports: &mut Vec<String>,
    ) {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "string" {
                let module = self.get_node_text(&child, content).trim_matches('"').to_string();
                if module.starts_with('.') {
                    imports.push(module);
                } else {
                    external_imports.push(module.split('/').next().unwrap_or(&module).to_string());
                }
            }
        }
    }

    fn has_export_keyword(&self, node: &Node) -> bool {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "export" {
                return true;
            }
        }
        false
    }

    fn get_node_text(&self, node: &Node, content: &str) -> String {
        let start = node.start_byte();
        let end = node.end_byte();
        content[start..end].to_string()
    }
}

impl Default for AnalysisParser {
    fn default() -> Self {
        Self::new()
    }
}

pub fn parse_files(
    files: &[(String, String)],
    _on_progress: Option<fn(f64)>,
) -> Vec<ParsedFile> {
    let mut parser = AnalysisParser::new();

    files
        .iter()
        .map(|(path, content)| parser.parse_file(path, content))
        .collect()
}
