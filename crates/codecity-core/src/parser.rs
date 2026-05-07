use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use tree_sitter::{Language, Node, Parser};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedFile {
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
    pub external_imports: Vec<String>,
    pub decorators: Vec<String>,
    pub complexity: usize,
    #[serde(default)]
    pub frontend_frameworks: Vec<String>,
    pub is_react_component: bool,
    pub has_unused_exports: bool,
    pub file_type: FileType,
    /// Call sites discovered while walking function bodies. Each one names a
    /// callee by its bare identifier (e.g. `foo` from `foo()`, or `bar` from
    /// `obj.bar()`). Resolution to a concrete symbol happens later, in the
    /// network analysis pass — we use a global label index across the whole
    /// project. This mirrors graphify's approach.
    #[serde(default)]
    pub calls: Vec<CallSite>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CallSite {
    /// Name of the function in this file whose body contains the call,
    /// or empty when the call is at module level (free-standing).
    pub caller: String,
    /// Bare callee name as it appears at the call site (without `()`,
    /// without dots; the last identifier of `a.b.c()` is "c").
    pub callee: String,
    pub line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FunctionInfo {
    pub name: String,
    pub exported: bool,
    pub lines: usize,
    #[serde(default)]
    pub start_line: usize,
    #[serde(default)]
    pub end_line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeInfo {
    pub name: String,
    pub kind: String,
    #[serde(default)]
    pub start_line: usize,
    #[serde(default)]
    pub end_line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassInfo {
    pub name: String,
    #[serde(default)]
    pub start_line: usize,
    #[serde(default)]
    pub end_line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SymbolInfo {
    pub name: String,
    pub kind: String,
    pub exported: bool,
    pub start_line: usize,
    pub end_line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
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
    Json,
    Markdown,
    Mdx,
    Toml,
    C,
    Cpp,
    Ruby,
    Php,
    Swift,
    Kotlin,
    Bash,
    Zig,
    Lua,
    Haskell,
    Dart,
    Elixir,
    Scala,
    R,
    Julia,
    Perl,
    CSharp,
    Erlang,
    Nix,
    Glsl,
    Ocaml,
    Groovy,
    Elisp,
    Vue,
    Svelte,
    Astro,
    Graphql,
    Sql,
    Proto,
    Dockerfile,
    Makefile,
    Shader,
    Cuda,
    Llvm,
    NvidiaArtifact,
    WebAssembly,
    FSharp,
    VisualBasic,
    ObjectiveC,
    Clojure,
    Lisp,
    Idris,
    Agda,
    Lean,
    PureScript,
    Nim,
    Crystal,
    Vlang,
    Dlang,
    PowerShell,
    Batch,
    Assembly,
    Terraform,
    Template,
    ReStructuredText,
    AsciiDoc,
    Latex,
    Gherkin,
    Data,
    Notebook,
    MlModel,
    MlCheckpoint,
    MlTensor,
    MlTokenizer,
    Binary,
    ConfigLanguage,
    Diagram,
    Hardware,
    Matlab,
    Qml,
    Other,
}

impl FileType {
    pub fn from_path(path: &str) -> Self {
        let file_name = Path::new(path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("");
        match file_name {
            "Dockerfile" | "Containerfile" => return FileType::Dockerfile,
            "Makefile" | "makefile" | "GNUmakefile" => return FileType::Makefile,
            _ => {}
        }

        let ext = path.rsplit('.').next().unwrap_or("");
        Self::from_extension(ext)
    }

    pub fn from_extension(ext: &str) -> Self {
        match ext {
            "ts" | "tsx" | "mts" | "cts" => FileType::TypeScript,
            "js" | "jsx" | "mjs" | "cjs" | "es" | "es6" => FileType::JavaScript,
            "py" | "pyi" | "pyx" | "pxd" | "pxi" => FileType::Python,
            "rs" => FileType::Rust,
            "go" => FileType::Go,
            "java" => FileType::Java,
            "css" | "scss" | "less" | "sass" => FileType::Css,
            "html" | "htm" | "xml" | "svg" => FileType::Markup,
            "json" | "jsonc" | "webmanifest" => FileType::Json,
            "ipynb" => FileType::Notebook,
            "md" => FileType::Markdown,
            "mdx" => FileType::Mdx,
            "toml" => FileType::Toml,
            "yaml" | "yml" | "ini" | "env" | "cfg" | "conf" | "properties" | "plist"
            | "xcconfig" | "ron" => FileType::Config,
            "c" | "h" => FileType::C,
            "cu" | "cuh" => FileType::Cuda,
            "cpp" | "cxx" | "cc" | "hpp" | "hxx" | "hh" => FileType::Cpp,
            "rb" => FileType::Ruby,
            "php" => FileType::Php,
            "swift" => FileType::Swift,
            "kt" | "kts" => FileType::Kotlin,
            "sh" | "bash" | "zsh" | "fish" | "ksh" | "awk" => FileType::Bash,
            "zig" => FileType::Zig,
            "lua" => FileType::Lua,
            "hs" | "lhs" => FileType::Haskell,
            "dart" => FileType::Dart,
            "ex" | "exs" => FileType::Elixir,
            "scala" => FileType::Scala,
            "r" | "R" => FileType::R,
            "jl" => FileType::Julia,
            "pl" | "pm" | "t" => FileType::Perl,
            "cs" => FileType::CSharp,
            "erl" | "hrl" => FileType::Erlang,
            "nix" => FileType::Nix,
            "glsl" | "frag" | "vert" | "comp" => FileType::Glsl,
            "ml" | "mli" => FileType::Ocaml,
            "groovy" | "gradle" => FileType::Groovy,
            "el" => FileType::Elisp,
            "vue" => FileType::Vue,
            "svelte" => FileType::Svelte,
            "astro" => FileType::Astro,
            "graphql" | "gql" => FileType::Graphql,
            "sql" => FileType::Sql,
            "proto" | "thrift" => FileType::Proto,
            "dockerfile" => FileType::Dockerfile,
            "makefile" | "mk" => FileType::Makefile,
            "hlsl" | "wgsl" | "cg" => FileType::Shader,
            "ptx" => FileType::NvidiaArtifact,
            "cubin" | "fatbin" => FileType::NvidiaArtifact,
            "nvvm" | "ll" | "bc" => FileType::Llvm,
            "wasm" | "wat" => FileType::WebAssembly,
            "fs" | "fsi" | "fsx" => FileType::FSharp,
            "vb" => FileType::VisualBasic,
            "m" | "mm" => FileType::ObjectiveC,
            "clj" | "cljs" | "cljc" | "edn" => FileType::Clojure,
            "lisp" | "lsp" | "cl" | "scm" | "ss" => FileType::Lisp,
            "idr" | "lidr" => FileType::Idris,
            "agda" => FileType::Agda,
            "lean" => FileType::Lean,
            "purs" => FileType::PureScript,
            "nim" => FileType::Nim,
            "cr" => FileType::Crystal,
            "v" => FileType::Vlang,
            "d" => FileType::Dlang,
            "ps1" => FileType::PowerShell,
            "bat" | "cmd" => FileType::Batch,
            "asm" | "s" => FileType::Assembly,
            "tf" | "tfvars" | "hcl" | "bicep" | "cue" | "dhall" | "rego" | "nomad" => {
                FileType::Terraform
            }
            "ejs" | "pug" | "hbs" | "mustache" | "liquid" | "njk" | "marko" | "lit" => {
                FileType::Template
            }
            "rst" => FileType::ReStructuredText,
            "adoc" | "asciidoc" => FileType::AsciiDoc,
            "tex" | "latex" | "bib" => FileType::Latex,
            "feature" => FileType::Gherkin,
            "csv" | "tsv" | "ndjson" | "avro" | "parquet" | "orc" | "feather" | "arrow"
            | "duckdb" | "db" | "sqlite" | "sqlite3" => FileType::Data,
            "npy" | "npz" | "h5" | "hdf5" | "hdf" => FileType::MlTensor,
            "pt" | "pth" | "ckpt" => FileType::MlCheckpoint,
            "onnx" | "pb" | "pbtxt" | "tflite" | "lite" | "keras" | "mlmodel" | "mar"
            | "engine" | "trt" | "caffemodel" | "prototxt" | "params" | "gguf" | "ggml"
            | "model" | "weights" => FileType::MlModel,
            "safetensors" => FileType::MlTensor,
            "pkl" | "pickle" | "joblib" => FileType::MlCheckpoint,
            "tiktoken" | "spm" | "bpe" | "vocab" => FileType::MlTokenizer,
            "o" | "obj" | "a" | "lib" | "so" | "dylib" | "dll" | "exe" | "rlib" | "class"
            | "jar" | "war" | "ear" | "beam" | "bin" => FileType::Binary,
            "lock" | "log" | "patch" | "diff" | "snap" | "tap" | "spec" | "hurl" | "http"
            | "rest" | "dockerignore" | "gitignore" | "gitattributes" | "editorconfig" => {
                FileType::ConfigLanguage
            }
            "plantuml" | "puml" | "mermaid" | "mmd" => FileType::Diagram,
            "vhd" | "vhdl" | "sv" | "svh" => FileType::Hardware,
            "matlab" | "octave" | "sas" | "stata" | "do" => FileType::Matlab,
            "qml" | "qss" => FileType::Qml,
            "coffee" => FileType::JavaScript,
            _ => FileType::Other,
        }
    }

    pub fn language_name(&self) -> &'static str {
        match self {
            FileType::TypeScript => "TypeScript",
            FileType::JavaScript => "JavaScript",
            FileType::Python => "Python",
            FileType::Rust => "Rust",
            FileType::Go => "Go",
            FileType::Java => "Java",
            FileType::Css => "CSS",
            FileType::Markup => "Markup",
            FileType::Config => "Config",
            FileType::Json => "JSON",
            FileType::Markdown => "Markdown",
            FileType::Mdx => "MDX",
            FileType::Toml => "TOML",
            FileType::C => "C",
            FileType::Cpp => "C++",
            FileType::Ruby => "Ruby",
            FileType::Php => "PHP",
            FileType::Swift => "Swift",
            FileType::Kotlin => "Kotlin",
            FileType::Bash => "Shell",
            FileType::Zig => "Zig",
            FileType::Lua => "Lua",
            FileType::Haskell => "Haskell",
            FileType::Dart => "Dart",
            FileType::Elixir => "Elixir",
            FileType::Scala => "Scala",
            FileType::R => "R",
            FileType::Julia => "Julia",
            FileType::Perl => "Perl",
            FileType::CSharp => "C#",
            FileType::Erlang => "Erlang",
            FileType::Nix => "Nix",
            FileType::Glsl => "GLSL",
            FileType::Ocaml => "OCaml",
            FileType::Groovy => "Groovy",
            FileType::Elisp => "Elisp",
            FileType::Vue => "Vue",
            FileType::Svelte => "Svelte",
            FileType::Astro => "Astro",
            FileType::Graphql => "GraphQL",
            FileType::Sql => "SQL",
            FileType::Proto => "Protocol Buffers",
            FileType::Dockerfile => "Dockerfile",
            FileType::Makefile => "Makefile",
            FileType::Shader => "Shader",
            FileType::Cuda => "CUDA",
            FileType::Llvm => "LLVM IR",
            FileType::NvidiaArtifact => "NVIDIA Compiler Artifact",
            FileType::WebAssembly => "WebAssembly",
            FileType::FSharp => "F#",
            FileType::VisualBasic => "Visual Basic",
            FileType::ObjectiveC => "Objective-C",
            FileType::Clojure => "Clojure",
            FileType::Lisp => "Lisp",
            FileType::Idris => "Idris",
            FileType::Agda => "Agda",
            FileType::Lean => "Lean",
            FileType::PureScript => "PureScript",
            FileType::Nim => "Nim",
            FileType::Crystal => "Crystal",
            FileType::Vlang => "V",
            FileType::Dlang => "D",
            FileType::PowerShell => "PowerShell",
            FileType::Batch => "Batch",
            FileType::Assembly => "Assembly",
            FileType::Terraform => "Infrastructure",
            FileType::Template => "Template",
            FileType::ReStructuredText => "reStructuredText",
            FileType::AsciiDoc => "AsciiDoc",
            FileType::Latex => "LaTeX",
            FileType::Gherkin => "Gherkin",
            FileType::Data => "Data",
            FileType::Notebook => "Notebook",
            FileType::MlModel => "ML Model",
            FileType::MlCheckpoint => "ML Checkpoint",
            FileType::MlTensor => "ML Tensor",
            FileType::MlTokenizer => "ML Tokenizer",
            FileType::Binary => "Binary",
            FileType::ConfigLanguage => "Config",
            FileType::Diagram => "Diagram",
            FileType::Hardware => "Hardware",
            FileType::Matlab => "MATLAB",
            FileType::Qml => "QML",
            FileType::Other => "Other",
        }
    }
}

/// One row per `(FileType, tree-sitter Language)` binding. The list is the
/// single source of truth for which file types have a parser; `new()` walks
/// it once at startup. Adding a language is a single-line append here plus
/// a dispatch arm in `walk_tree` — no struct fields, no `match`/init pair.
fn language_table() -> Vec<(FileType, Language)> {
    vec![
        (FileType::TypeScript, tree_sitter_typescript::LANGUAGE_TSX.into()),
        (FileType::JavaScript, tree_sitter_javascript::LANGUAGE.into()),
        (FileType::Python, tree_sitter_python::LANGUAGE.into()),
        (FileType::Rust, tree_sitter_rust::LANGUAGE.into()),
        (FileType::Go, tree_sitter_go::LANGUAGE.into()),
        (FileType::Java, tree_sitter_java::LANGUAGE.into()),
        (FileType::Css, tree_sitter_css::LANGUAGE.into()),
        // Markup + the HTML-templated frameworks share the HTML grammar.
        (FileType::Markup, tree_sitter_html::LANGUAGE.into()),
        (FileType::Vue, tree_sitter_html::LANGUAGE.into()),
        (FileType::Svelte, tree_sitter_html::LANGUAGE.into()),
        (FileType::Astro, tree_sitter_html::LANGUAGE.into()),
        (FileType::Json, tree_sitter_json::LANGUAGE.into()),
        (FileType::Graphql, tree_sitter_graphql::LANGUAGE.into()),
        (FileType::Makefile, tree_sitter_make::LANGUAGE.into()),
        (FileType::Terraform, tree_sitter_hcl::LANGUAGE.into()),
        (FileType::Proto, tree_sitter_proto::LANGUAGE.into()),
        // Generic Config gets parsed as YAML (the most common case).
        (FileType::Config, tree_sitter_yaml::LANGUAGE.into()),
        (FileType::C, tree_sitter_c::LANGUAGE.into()),
        // CUDA is C++ with extensions — reuse the C++ grammar.
        (FileType::Cuda, tree_sitter_cpp::LANGUAGE.into()),
        (FileType::Cpp, tree_sitter_cpp::LANGUAGE.into()),
        (FileType::Ruby, tree_sitter_ruby::LANGUAGE.into()),
        (FileType::Php, tree_sitter_php::LANGUAGE_PHP.into()),
        (FileType::Swift, tree_sitter_swift::LANGUAGE.into()),
        (FileType::Kotlin, tree_sitter_kotlin_ng::LANGUAGE.into()),
        (FileType::Bash, tree_sitter_bash::LANGUAGE.into()),
        (FileType::Zig, tree_sitter_zig::LANGUAGE.into()),
        (FileType::Lua, tree_sitter_lua::LANGUAGE.into()),
        (FileType::Haskell, tree_sitter_haskell::LANGUAGE.into()),
        (FileType::Dart, tree_sitter_dart::LANGUAGE.into()),
        (FileType::Elixir, tree_sitter_elixir::LANGUAGE.into()),
        (FileType::Scala, tree_sitter_scala::LANGUAGE.into()),
        (FileType::R, tree_sitter_r::LANGUAGE.into()),
        (FileType::Julia, tree_sitter_julia::LANGUAGE.into()),
        (FileType::Perl, tree_sitter_perl::LANGUAGE.into()),
        (FileType::CSharp, tree_sitter_c_sharp::LANGUAGE.into()),
        (FileType::Erlang, tree_sitter_erlang::LANGUAGE.into()),
        (FileType::Nix, tree_sitter_nix::LANGUAGE.into()),
        (FileType::Glsl, tree_sitter_glsl::LANGUAGE_GLSL.into()),
        (FileType::Ocaml, tree_sitter_ocaml::LANGUAGE_OCAML.into()),
        (FileType::Groovy, tree_sitter_groovy::LANGUAGE.into()),
        (FileType::Elisp, tree_sitter_elisp::LANGUAGE.into()),
    ]
}

pub struct AnalysisParser {
    /// Parser instance per file type. Populated once at construction from
    /// [`language_table`]; missing entries mean the type has no grammar
    /// (text-only formats like Markdown, binary blobs, etc.) and produces
    /// an empty `ParsedFile`.
    parsers: HashMap<FileType, Parser>,
}

impl AnalysisParser {
    pub fn new() -> Self {
        let mut parsers = HashMap::with_capacity(language_table().len());
        for (file_type, language) in language_table() {
            let mut parser = Parser::new();
            // `set_language` only fails when the grammar's ABI version is
            // incompatible with the runtime — a build-time issue, not a
            // user-input one. Silently skip; the type just produces an
            // empty `ParsedFile` (same behavior as the previous code).
            if parser.set_language(&language).is_ok() {
                parsers.insert(file_type, parser);
            }
        }
        Self { parsers }
    }

    fn get_parser_for_type(&mut self, file_type: &FileType) -> Option<&mut Parser> {
        self.parsers.get_mut(file_type)
    }

    pub fn parse_file(&mut self, path: &str, content: &str) -> ParsedFile {
        let ext = path.rsplit('.').next().unwrap_or("");
        let file_type = FileType::from_path(path);
        let lines = content.lines().count();
        let size_bytes = content.len();
        let extension = if ext.is_empty() {
            String::new()
        } else {
            format!(".{}", ext.to_lowercase())
        };
        let language = file_type.language_name().to_string();

        if let Some(parser) = self.get_parser_for_type(&file_type) {
            if let Some(tree) = parser.parse(content, None) {
                return self.analyze_tree(
                    path,
                    content,
                    &tree.root_node(),
                    file_type,
                    lines,
                    size_bytes,
                    extension,
                    language,
                );
            }
        }

        ParsedFile {
            path: path.to_string(),
            lines,
            size_bytes,
            extension,
            language,
            functions: vec![],
            types: vec![],
            classes: vec![],
            symbols: vec![],
            imports: vec![],
            external_imports: vec![],
            decorators: vec![],
            complexity: 1,
            frontend_frameworks: self.detect_frontend_frameworks(path, content, &[]),
            is_react_component: false,
            has_unused_exports: false,
            file_type,
            calls: vec![],
        }
    }

    fn analyze_tree(
        &self,
        path: &str,
        content: &str,
        root: &Node,
        file_type: FileType,
        lines: usize,
        size_bytes: usize,
        extension: String,
        language: String,
    ) -> ParsedFile {
        let mut functions = Vec::new();
        let mut types = Vec::new();
        let mut classes = Vec::new();
        let mut symbols = Vec::new();
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
            &mut symbols,
            &mut imports,
            &mut external_imports,
            &mut decorators,
            &mut complexity,
            &mut is_react_component,
        );

        // Per-language call extraction (Tier A). Walks function bodies for
        // call_expression / call nodes and records (caller, callee, line).
        // Resolution to specific symbols happens in the network analysis pass.
        let calls = self.extract_calls(root, content, &file_type);

        let frontend_frameworks = self.detect_frontend_frameworks(path, content, &external_imports);

        ParsedFile {
            path: path.to_string(),
            lines,
            size_bytes,
            extension,
            language,
            functions,
            types,
            classes,
            symbols,
            imports,
            external_imports,
            decorators,
            complexity,
            frontend_frameworks,
            is_react_component,
            has_unused_exports: false,
            file_type,
            calls,
        }
    }

    fn walk_tree(
        &self,
        node: &Node,
        content: &str,
        functions: &mut Vec<FunctionInfo>,
        types: &mut Vec<TypeInfo>,
        classes: &mut Vec<ClassInfo>,
        symbols: &mut Vec<SymbolInfo>,
        imports: &mut Vec<String>,
        external_imports: &mut Vec<String>,
        decorators: &mut Vec<String>,
        complexity: &mut usize,
        is_react_component: &mut bool,
    ) {
        let kind = node.kind();

        match kind {
            // Functions (all languages — grouped by shared node kind names)
            "function_declaration" | "function_expression" | "arrow_function" => {
                // JS/TS/Swift/Kotlin/Zig share this node kind
                if let Some(name) = self.get_function_name(node, content) {
                    let exported = self.has_export_keyword(node);
                    self.push_function(node, name, exported, functions, symbols);
                }
            }
            "function_definition" => {
                // Python/C/C++/PHP/Bash share this node kind
                if let Some(name) = self.get_function_name(node, content) {
                    self.push_function(node, name, true, functions, symbols);
                }
            }
            "function_item" => {
                // Rust
                if let Some(name) = self.get_function_name(node, content) {
                    self.push_function(node, name, self.has_pub_keyword(node), functions, symbols);
                }
            }
            "method_declaration" => {
                // Go/Java/PHP methods
                if let Some(name) = self.get_function_name(node, content) {
                    self.push_function(node, name, true, functions, symbols);
                }
            }
            "constructor_declaration" => {
                // Java
                if let Some(name) = self.get_function_name(node, content) {
                    self.push_function(node, name, true, functions, symbols);
                }
            }
            "method" | "singleton_method" => {
                // Ruby
                if let Some(name) = self.get_function_name(node, content) {
                    self.push_function(node, name, true, functions, symbols);
                }
            }
            // Scala
            "def_definition" => {
                if let Some(name) = self.get_function_name(node, content) {
                    self.push_function(node, name, true, functions, symbols);
                }
            }
            // Perl
            "subroutine_declaration" | "subroutine_definition" => {
                if let Some(name) = self.get_function_name(node, content) {
                    self.push_function(node, name, true, functions, symbols);
                }
            }
            // Erlang
            "function_clause" => {
                if let Some(name) = self.get_function_name(node, content) {
                    self.push_function(node, name, true, functions, symbols);
                }
            }
            // OCaml
            "value_definition" | "let_binding" => {
                if let Some(name) = self.get_function_name(node, content) {
                    self.push_function(node, name, true, functions, symbols);
                }
            }
            // Classes (all languages)
            "class_declaration" | "class_definition" => {
                if let Some(name) = self.get_class_name(node, content) {
                    self.push_class(node, name, classes, symbols);
                }
            }
            "class" | "module" => {
                // Ruby
                if let Some(name) = self.get_class_name(node, content) {
                    self.push_class(node, name, classes, symbols);
                }
            }
            // Types — TS/JS/C# (share enum_declaration, interface_declaration)
            "type_alias_declaration"
            | "interface_declaration"
            | "enum_declaration"
            | "delegate_declaration" => {
                if let Some(name) = self.get_type_name(node, content) {
                    let kind_str = match kind {
                        "type_alias_declaration" => "type",
                        "interface_declaration" => "interface",
                        "enum_declaration" => "enum",
                        "delegate_declaration" => "delegate",
                        _ => "type",
                    };
                    self.push_type(node, name, kind_str, types, symbols);
                }
            }
            // Types — Rust
            "struct_item" | "enum_item" | "trait_item" => {
                if let Some(name) = self.get_type_name(node, content) {
                    let kind_str = match kind {
                        "struct_item" => "struct",
                        "enum_item" => "enum",
                        "trait_item" => "trait",
                        _ => "type",
                    };
                    self.push_type(node, name, kind_str, types, symbols);
                }
            }
            // Types — Go
            "type_declaration" => {
                if let Some(name) = self.get_type_name(node, content) {
                    self.push_type(node, name, "type", types, symbols);
                }
            }
            // Types — C/C++
            "struct_specifier" | "enum_specifier" | "class_specifier" => {
                if let Some(name) = self.get_type_name(node, content) {
                    let kind_str = match kind {
                        "struct_specifier" => "struct",
                        "enum_specifier" => "enum",
                        "class_specifier" => "class",
                        _ => "type",
                    };
                    self.push_type(node, name, kind_str, types, symbols);
                }
            }
            // Types — PHP
            "trait_declaration" => {
                if let Some(name) = self.get_type_name(node, content) {
                    self.push_type(node, name, "trait", types, symbols);
                }
            }
            // Types — Swift/Zig (share struct_declaration)
            "struct_declaration" | "protocol_declaration" | "opaque_declaration" => {
                if let Some(name) = self.get_type_name(node, content) {
                    let kind_str = match kind {
                        "struct_declaration" => "struct",
                        "protocol_declaration" => "protocol",
                        "opaque_declaration" => "opaque",
                        _ => "type",
                    };
                    self.push_type(node, name, kind_str, types, symbols);
                }
            }
            // Types — Kotlin
            "object_declaration" => {
                if let Some(name) = self.get_type_name(node, content) {
                    self.push_type(node, name, "object", types, symbols);
                }
            }
            // Types — Haskell
            "data_type" | "newtype" | "type_signature" => {
                if let Some(name) = self.get_type_name(node, content) {
                    let kind_str = match kind {
                        "data_type" => "data",
                        "newtype" => "newtype",
                        "type_signature" => "type",
                        _ => "type",
                    };
                    self.push_type(node, name, kind_str, types, symbols);
                }
            }
            // Types — Scala (class_definition also used as class — handled in classes section)
            "trait_definition" | "object_definition" => {
                if let Some(name) = self.get_type_name(node, content) {
                    let kind_str = match kind {
                        "trait_definition" => "trait",
                        "object_definition" => "object",
                        _ => "type",
                    };
                    self.push_type(node, name, kind_str, types, symbols);
                }
            }
            // Types — Dart
            "mixin_declaration" | "extension_declaration" => {
                if let Some(name) = self.get_type_name(node, content) {
                    let kind_str = match kind {
                        "mixin_declaration" => "mixin",
                        "extension_declaration" => "extension",
                        _ => "type",
                    };
                    self.push_type(node, name, kind_str, types, symbols);
                }
            }
            // Types — Elixir (defmodule — module is used by Ruby classes above)
            "defmodule" => {
                if let Some(name) = self.get_type_name(node, content) {
                    self.push_type(node, name, "module", types, symbols);
                }
            }
            // Types — OCaml
            "type_binding" => {
                if let Some(name) = self.get_type_name(node, content) {
                    self.push_type(node, name, "type", types, symbols);
                }
            }
            // Imports
            "import_statement" | "import_from_statement" | "import_clause"
            | "import_declaration" | "use_declaration" | "import_spec" | "require_call"
            | "include_statement" | "load_statement" | "preproc_include"
            | "using_declaration" | "extern_declaration" => {
                self.extract_imports(node, content, imports, external_imports);
            }
            // Zig: imports are `@import("foo.zig")` — a builtin_function call.
            "builtin_function" => {
                self.extract_zig_import(node, content, imports, external_imports);
            }
            // Decorators
            "decorator" => {
                if let Some(name) = self.get_decorator_name(node, content) {
                    decorators.push(name);
                }
            }
            // Complexity (all languages)
            "if_statement"
            | "for_statement"
            | "for_in_statement"
            | "for_of_statement"
            | "while_statement"
            | "do_statement"
            | "case_clause"
            | "switch_statement"
            | "if_expression"
            | "for_expression"
            | "while_expr"
            | "if_expr"
            | "match_expression"
            | "match_arm"
            | "try_statement"
            | "catch_clause"
            | "elif_clause"
            | "conditional_expression"
            | "ternary_expression"
            | "unless_expression"
            | "until_statement"
            | "guard_statement"
            | "defer_if" => {
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
                symbols,
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
            if child.kind() == "identifier" || child.kind() == "name" || child.kind() == "variable"
            {
                return Some(self.get_node_text(&child, content));
            }
        }
        None
    }

    fn get_class_name(&self, node: &Node, content: &str) -> Option<String> {
        // TS/JS classes name themselves with `type_identifier` (since
        // tree-sitter-typescript ~0.21); Python/Ruby use `identifier` /
        // `constant`; Scala uses `identifier`. Accept any of them — first
        // match in source order is the declared name.
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            match child.kind() {
                "identifier" | "type_identifier" | "name" | "constant" => {
                    return Some(self.get_node_text(&child, content));
                }
                _ => {}
            }
        }
        None
    }

    fn get_type_name(&self, node: &Node, content: &str) -> Option<String> {
        // Tree-sitter grammars disagree on the child node kind that holds the
        // declared name — Rust/Swift/Kotlin use `type_identifier`, while
        // Python/TS/Go/C/Ruby use `identifier`, and a few use `name`. Accept
        // any of them; `node.children` is in source order, so the first match
        // is the declared name.
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            match child.kind() {
                "identifier" | "type_identifier" | "name" => {
                    return Some(self.get_node_text(&child, content));
                }
                _ => {}
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
        // For Python `import_from_statement`, the module-being-imported-from is the
        // FIRST `dotted_name` / `relative_import` child. Subsequent `dotted_name` children
        // are imported NAMES (e.g. `from foo.bar import baz, qux`), which we must NOT
        // treat as separate modules. Track whether we've consumed the module slot yet.
        let kind = node.kind();
        let is_python_from = kind == "import_from_statement";
        let mut python_module_consumed = false;

        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            // For `import x` statements we emit a module per `dotted_name` (`import a, b`).
            // For `from x import y, z` we emit only ONE module (the source).
            match child.kind() {
                "string" => {
                    let module = self
                        .get_node_text(&child, content)
                        .trim_matches('"')
                        .trim_matches('\'')
                        .to_string();
                    if !module.is_empty() {
                        self.push_module(&module, imports, external_imports);
                    }
                }
                "dotted_name" => {
                    if is_python_from && python_module_consumed {
                        continue; // imported name, not a module
                    }
                    let dotted = self.get_node_text(&child, content);
                    let module = dotted.replace('.', "/");
                    if !module.is_empty() {
                        self.push_module(&module, imports, external_imports);
                    }
                    python_module_consumed = true;
                }
                "relative_import" => {
                    // `from .foo import x` or `from ..bar import y` — convert leading dots
                    // into `./` / `../` segments so the resolver can match them.
                    let module = self.python_relative_to_path(&child, content);
                    if !module.is_empty() {
                        self.push_module(&module, imports, external_imports);
                    }
                    python_module_consumed = true;
                }
                "aliased_import" => {
                    // `import foo as bar` — the inner dotted_name is what we want
                    let mut inner = child.walk();
                    for ic in child.children(&mut inner) {
                        if ic.kind() == "dotted_name" {
                            let module = self.get_node_text(&ic, content).replace('.', "/");
                            if !module.is_empty() {
                                self.push_module(&module, imports, external_imports);
                            }
                            break;
                        }
                    }
                }
                _ => {}
            }
        }
    }

    fn push_module(
        &self,
        module: &str,
        imports: &mut Vec<String>,
        external_imports: &mut Vec<String>,
    ) {
        // Keep ALL module specifiers in imports[] — the resolver decides which
        // are internal (relative / alias-resolved) vs external.
        imports.push(module.to_string());
        if !module.starts_with('.') {
            external_imports.push(module.split('/').next().unwrap_or(module).to_string());
        }
    }

    /// Zig: extract imports from `@import("foo.zig")` (and `@embedFile`, `@cImport`).
    /// AST shape: builtin_function → (builtin_identifier "@import", arguments → string).
    /// Standard-library refs like `@import("std")` get classified as external.
    fn extract_zig_import(
        &self,
        node: &Node,
        content: &str,
        imports: &mut Vec<String>,
        external_imports: &mut Vec<String>,
    ) {
        let mut name: Option<String> = None;
        let mut args_node: Option<Node> = None;
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            match child.kind() {
                "builtin_identifier" => {
                    name = Some(self.get_node_text(&child, content));
                }
                "arguments" => {
                    args_node = Some(child);
                }
                _ => {}
            }
        }

        let Some(name) = name else { return };
        // Only the file-loading builtins matter for the dependency graph.
        if name != "@import" && name != "@embedFile" && name != "@cImport" {
            return;
        }
        let Some(args) = args_node else { return };

        // Find the first string literal argument.
        let mut arg_cursor = args.walk();
        for arg in args.children(&mut arg_cursor) {
            // tree-sitter-zig labels string literals as "string" — same convention as TS/JS.
            if arg.kind() == "string" || arg.kind() == "string_literal" {
                let module = self
                    .get_node_text(&arg, content)
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string();
                if module.is_empty() {
                    continue;
                }
                // Zig stdlib / well-known builtins → external.
                if matches!(module.as_str(), "std" | "builtin" | "root" | "c") {
                    external_imports.push(module);
                    continue;
                }
                // Everything else is a path to a local .zig file.
                self.push_module(&module, imports, external_imports);
                break; // @import takes exactly one string arg
            }
        }
    }

    /// Convert Python relative-import dots (`.`, `..`, `..foo`) into a relative path
    /// the resolver understands (`./`, `../`, `../foo`).
    fn python_relative_to_path(&self, node: &Node, content: &str) -> String {
        let mut prefix_dots = 0usize;
        let mut tail = String::new();
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            match child.kind() {
                "import_prefix" => {
                    let text = self.get_node_text(&child, content);
                    prefix_dots = text.chars().filter(|c| *c == '.').count();
                }
                "dotted_name" => {
                    tail = self.get_node_text(&child, content).replace('.', "/");
                }
                _ => {}
            }
        }
        // tree-sitter sometimes inlines the dots without a separate import_prefix node —
        // fall back to scanning the raw text.
        if prefix_dots == 0 {
            let text = self.get_node_text(node, content);
            prefix_dots = text.chars().take_while(|c| *c == '.').count();
        }
        if prefix_dots == 0 && tail.is_empty() {
            return String::new();
        }
        // 1 dot = current package = ./, 2 dots = ../, 3 = ../../, etc.
        let mut path = if prefix_dots <= 1 {
            "./".to_string()
        } else {
            "../".repeat(prefix_dots - 1)
        };
        if !tail.is_empty() {
            path.push_str(&tail);
        }
        path
    }

    // ────────────────────────────────────────────────────────────────────
    // Call-site extraction (Tier A languages).
    //
    // For each language we walk function/method bodies, find call expressions,
    // and record the bare callee name plus the function we're inside (so the
    // network pass can build proper caller→callee edges instead of just
    // file→file). The same approach graphify uses.
    //
    // What gets extracted:
    //   `foo()`                → callee = "foo"
    //   `obj.bar()`            → callee = "bar"
    //   `foo::bar::baz()` (Rs) → callee = "baz"
    //   `Vec::new()`           → callee = "new"
    //
    // Module/scope is intentionally collapsed — graphify proves bare-name
    // matching is good enough at this scale and dramatically simpler than
    // proper resolution.
    // ────────────────────────────────────────────────────────────────────
    fn extract_calls(&self, root: &Node, content: &str, file_type: &FileType) -> Vec<CallSite> {
        let mut calls = Vec::new();
        match file_type {
            FileType::TypeScript | FileType::JavaScript | FileType::Vue | FileType::Svelte => {
                walk_calls_generic(
                    root,
                    content,
                    "",
                    &mut calls,
                    &["function_declaration", "method_definition", "arrow_function", "function_expression"],
                    &["call_expression", "new_expression"],
                    callee_from_ts_js,
                    function_name_ts_js,
                );
            }
            FileType::Python => {
                walk_calls_generic(
                    root,
                    content,
                    "",
                    &mut calls,
                    &["function_definition"],
                    &["call"],
                    callee_from_python,
                    function_name_python,
                );
            }
            FileType::Rust => {
                walk_calls_generic(
                    root,
                    content,
                    "",
                    &mut calls,
                    &["function_item"],
                    &["call_expression", "macro_invocation"],
                    callee_from_rust,
                    function_name_rust,
                );
            }
            FileType::Go => {
                walk_calls_generic(
                    root,
                    content,
                    "",
                    &mut calls,
                    &["function_declaration", "method_declaration"],
                    &["call_expression"],
                    callee_from_go,
                    function_name_go,
                );
            }
            FileType::Zig => {
                walk_calls_generic(
                    root,
                    content,
                    "",
                    &mut calls,
                    &["function_declaration"],
                    &["call_expression"],
                    callee_from_zig,
                    function_name_zig,
                );
            }
            // Tier B / C / D — no call extraction yet. They still get
            // import + symbol nodes; the network just lacks calls edges.
            _ => {}
        }
        calls
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

    fn has_pub_keyword(&self, node: &Node) -> bool {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "visibility_modifier" {
                return true;
            }
        }
        false
    }

    fn line_span(&self, node: &Node) -> (usize, usize, usize) {
        let start_line = node.start_position().row + 1;
        let end_line = node.end_position().row + 1;
        (
            start_line,
            end_line,
            end_line.saturating_sub(start_line) + 1,
        )
    }

    fn push_function(
        &self,
        node: &Node,
        name: String,
        exported: bool,
        functions: &mut Vec<FunctionInfo>,
        symbols: &mut Vec<SymbolInfo>,
    ) {
        let (start_line, end_line, lines) = self.line_span(node);
        functions.push(FunctionInfo {
            name: name.clone(),
            exported,
            lines,
            start_line,
            end_line,
        });
        symbols.push(SymbolInfo {
            name,
            kind: "function".to_string(),
            exported,
            start_line,
            end_line,
        });
    }

    fn push_type(
        &self,
        node: &Node,
        name: String,
        kind: &str,
        types: &mut Vec<TypeInfo>,
        symbols: &mut Vec<SymbolInfo>,
    ) {
        let (start_line, end_line, _) = self.line_span(node);
        types.push(TypeInfo {
            name: name.clone(),
            kind: kind.to_string(),
            start_line,
            end_line,
        });
        symbols.push(SymbolInfo {
            name,
            kind: kind.to_string(),
            exported: self.has_export_keyword(node) || self.has_pub_keyword(node),
            start_line,
            end_line,
        });
    }

    fn push_class(
        &self,
        node: &Node,
        name: String,
        classes: &mut Vec<ClassInfo>,
        symbols: &mut Vec<SymbolInfo>,
    ) {
        let (start_line, end_line, _) = self.line_span(node);
        classes.push(ClassInfo {
            name: name.clone(),
            start_line,
            end_line,
        });
        symbols.push(SymbolInfo {
            name,
            kind: "class".to_string(),
            exported: self.has_export_keyword(node) || self.has_pub_keyword(node),
            start_line,
            end_line,
        });
    }

    fn get_node_text(&self, node: &Node, content: &str) -> String {
        let start = node.start_byte();
        let end = node.end_byte();
        content[start..end].to_string()
    }

    fn detect_frontend_frameworks(
        &self,
        path: &str,
        content: &str,
        external_imports: &[String],
    ) -> Vec<String> {
        let mut detected = HashSet::<&'static str>::new();
        let lower_path = path.to_lowercase();
        let lower_content = content.to_lowercase();
        let file_name = Path::new(path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("");

        match file_name {
            "vite.config.ts" | "vite.config.js" | "vite.config.mts" | "vite.config.mjs" => {
                detected.insert("Vite");
            }
            "next.config.ts" | "next.config.js" | "next.config.mts" | "next.config.mjs" => {
                detected.insert("Next.js");
                detected.insert("React");
            }
            "remix.config.js" | "remix.config.cjs" | "remix.config.mjs" => {
                detected.insert("Remix");
            }
            "nuxt.config.ts" | "nuxt.config.js" | "nuxt.config.mjs" => {
                detected.insert("Nuxt");
                detected.insert("Vue");
            }
            "svelte.config.js" | "svelte.config.ts" => {
                detected.insert("SvelteKit");
                detected.insert("Svelte");
            }
            "angular.json" => {
                detected.insert("Angular");
            }
            "astro.config.ts" | "astro.config.js" | "astro.config.mjs" => {
                detected.insert("Astro");
            }
            "qwik.config.ts" | "qwik.config.js" | "qwik.config.mjs" => {
                detected.insert("Qwik");
            }
            _ => {}
        }

        if lower_path.ends_with(".tsx") || lower_path.ends_with(".jsx") {
            detected.insert("React");
        }
        if lower_path.ends_with(".vue") {
            detected.insert("Vue");
        }
        if lower_path.ends_with(".svelte") {
            detected.insert("Svelte");
        }
        if lower_path.ends_with(".astro") {
            detected.insert("Astro");
        }

        if lower_path.ends_with("package.json") {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(content) {
                for section in ["dependencies", "devDependencies", "peerDependencies"] {
                    if let Some(deps) = value.get(section).and_then(|deps| deps.as_object()) {
                        for package in deps.keys() {
                            Self::detect_framework_from_package(package, &mut detected);
                        }
                    }
                }
            }
        }

        for import in external_imports {
            Self::detect_framework_from_package(import, &mut detected);
        }

        for package in [
            "@vitejs/",
            "next",
            "vite",
            "@remix-run/",
            "react-router",
            "react",
            "vue",
            "nuxt",
            "svelte",
            "@sveltejs/kit",
            "@angular/",
            "astro",
            "solid-js",
            "solid-start",
            "@solidjs/start",
            "@builder.io/qwik",
        ] {
            if lower_content.contains(package) {
                Self::detect_framework_from_package(package, &mut detected);
            }
        }

        [
            "React",
            "Next.js",
            "Vite",
            "Remix",
            "React Router",
            "Vue",
            "Nuxt",
            "Svelte",
            "SvelteKit",
            "Angular",
            "Astro",
            "Solid",
            "SolidStart",
            "Qwik",
        ]
        .iter()
        .filter(|framework| detected.contains(**framework))
        .map(|framework| framework.to_string())
        .collect()
    }

    fn detect_framework_from_package(package: &str, detected: &mut HashSet<&'static str>) {
        let package = package.to_lowercase();
        match package.as_str() {
            "react" | "react-dom" => {
                detected.insert("React");
            }
            "next" => {
                detected.insert("Next.js");
                detected.insert("React");
            }
            "vite" => {
                detected.insert("Vite");
            }
            "remix" | "@remix-run/react" | "@remix-run/node" | "@remix-run/dev"
            | "@remix-run/serve" => {
                detected.insert("Remix");
            }
            "react-router" | "react-router-dom" => {
                detected.insert("React Router");
            }
            "@vitejs/plugin-react" | "@vitejs/plugin-react-swc" => {
                detected.insert("Vite");
                detected.insert("React");
            }
            "vue" | "@vitejs/plugin-vue" => {
                detected.insert("Vite");
                detected.insert("Vue");
            }
            "nuxt" | "@nuxt/kit" | "@nuxt/schema" => {
                detected.insert("Nuxt");
                detected.insert("Vue");
            }
            "svelte" | "@vitejs/plugin-svelte" => {
                detected.insert("Vite");
                detected.insert("Svelte");
            }
            "@sveltejs/kit" | "@sveltejs/adapter-auto" | "@sveltejs/vite-plugin-svelte" => {
                detected.insert("SvelteKit");
                detected.insert("Svelte");
            }
            "@angular/core" | "@angular/cli" | "@angular/common" | "@angular/router" => {
                detected.insert("Angular");
            }
            "astro" => {
                detected.insert("Astro");
            }
            "solid-js" => {
                detected.insert("Solid");
            }
            "solid-start" | "@solidjs/start" => {
                detected.insert("SolidStart");
                detected.insert("Solid");
            }
            "@builder.io/qwik" | "@builder.io/qwik-city" => {
                detected.insert("Qwik");
            }
            _ if package.starts_with("@angular/") => {
                detected.insert("Angular");
            }
            _ if package.starts_with("@vitejs/") => {
                detected.insert("Vite");
            }
            _ if package.starts_with("@remix-run/") => {
                detected.insert("Remix");
            }
            _ if package.starts_with("@nuxt/") => {
                detected.insert("Nuxt");
                detected.insert("Vue");
            }
            _ if package.starts_with("@astrojs/") => {
                detected.insert("Astro");
            }
            _ => {}
        }
    }
}

impl Default for AnalysisParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod parser_registry_tests {
    use super::*;

    /// Every entry in the language table must produce a working parser.
    /// If a `tree-sitter-*` crate bumps its ABI and the integration breaks,
    /// this catches it at test time instead of silently turning files into
    /// empty `ParsedFile`s in production.
    #[test]
    fn every_table_entry_produces_a_parser() {
        let p = AnalysisParser::new();
        for (file_type, _) in language_table() {
            assert!(
                p.parsers.contains_key(&file_type),
                "language_table entry for {file_type:?} failed to register a parser \
                 — likely a tree-sitter ABI mismatch"
            );
        }
    }

    /// End-to-end: TypeScript source must extract interfaces, classes,
    /// and functions. Catches grammar-API drift the same way the Rust test
    /// does — different tree-sitter crates use different child node kinds
    /// for the declared name.
    #[test]
    fn typescript_source_extracts_interface_class_and_function() {
        let mut p = AnalysisParser::new();
        let parsed = p.parse_file(
            "App.tsx",
            "export interface User { id: number; name: string }\n\
             export class UserService { findById(id: number): User | null { return null } }\n\
             export function greet(u: User): string { return `hello ${u.name}` }\n\
             export type Id = number | string;\n",
        );
        assert_eq!(parsed.file_type, FileType::TypeScript);
        let names = |xs: &[String]| xs.join(",");
        let fn_names: Vec<String> = parsed.functions.iter().map(|f| f.name.clone()).collect();
        let type_names: Vec<String> = parsed.types.iter().map(|t| t.name.clone()).collect();
        let class_names: Vec<String> = parsed.classes.iter().map(|c| c.name.clone()).collect();
        let symbol_names: Vec<String> = parsed.symbols.iter().map(|s| s.name.clone()).collect();
        assert!(
            fn_names.iter().any(|n| n == "greet"),
            "expected `greet` in functions; got [{}], symbols=[{}]",
            names(&fn_names),
            names(&symbol_names)
        );
        assert!(
            class_names.iter().any(|n| n == "UserService"),
            "expected `UserService` in classes; got [{}], types=[{}], symbols=[{}]",
            names(&class_names),
            names(&type_names),
            names(&symbol_names)
        );
        assert!(
            type_names.iter().any(|n| n == "User"),
            "expected `User` interface in types; got [{}], classes=[{}], symbols=[{}]",
            names(&type_names),
            names(&class_names),
            names(&symbol_names)
        );
        assert!(
            type_names.iter().any(|n| n == "Id"),
            "expected `Id` type alias in types; got [{}]",
            names(&type_names)
        );
    }

    /// End-to-end: feed a real Rust source string through the public
    /// `parse_file` API and assert the parser actually extracted symbols.
    /// Catches regressions where the registry says it has a Rust parser but
    /// dispatch (`get_parser_for_type`) or `walk_tree` silently no-ops.
    #[test]
    fn rust_source_extracts_function_struct_and_impl() {
        let mut p = AnalysisParser::new();
        let parsed = p.parse_file(
            "test.rs",
            "fn hello() {}\n\
             pub struct Foo { bar: i32 }\n\
             impl Foo { pub fn new() -> Self { Self { bar: 0 } } }\n",
        );
        assert_eq!(parsed.file_type, FileType::Rust);
        assert_eq!(parsed.language, "Rust");
        assert!(
            parsed.functions.iter().any(|f| f.name == "hello"),
            "expected `hello` in functions, got: {:?}",
            parsed.functions.iter().map(|f| &f.name).collect::<Vec<_>>()
        );
        assert!(
            parsed.functions.iter().any(|f| f.name == "new"),
            "expected `new` in functions"
        );
        assert!(
            parsed.types.iter().any(|t| t.name == "Foo")
                || parsed.classes.iter().any(|c| c.name == "Foo"),
            "expected `Foo` as a type or class. \
             types={:?} classes={:?} symbols={:?}",
            parsed.types.iter().map(|t| &t.name).collect::<Vec<_>>(),
            parsed.classes.iter().map(|c| &c.name).collect::<Vec<_>>(),
            parsed.symbols.iter().map(|s| &s.name).collect::<Vec<_>>(),
        );
    }

    /// Sanity check that the registry covers the file types the dispatch
    /// previously hand-listed. If someone adds a `FileType` that needs a
    /// grammar but forgets to add a row to `language_table`, this fails.
    #[test]
    fn registry_covers_known_grammar_types() {
        let p = AnalysisParser::new();
        for ft in [
            FileType::TypeScript,
            FileType::JavaScript,
            FileType::Python,
            FileType::Rust,
            FileType::Go,
            FileType::Java,
            FileType::Zig,
            FileType::Ruby,
            FileType::CSharp,
        ] {
            assert!(
                p.parsers.contains_key(&ft),
                "missing grammar registration for {ft:?}"
            );
        }
    }
}

pub fn parse_files(files: &[(String, String)], _on_progress: Option<fn(f64)>) -> Vec<ParsedFile> {
    let mut parsed = parse_file_batch(files);

    resolve_internal_imports(&mut parsed);
    parsed
}

pub fn parse_file_batch(files: &[(String, String)]) -> Vec<ParsedFile> {
    files
        .par_iter()
        .map_init(AnalysisParser::new, |parser, (path, content)| {
            parser.parse_file(path, content)
        })
        .collect()
}

pub fn resolve_internal_imports(files: &mut [ParsedFile]) {
    resolve_internal_imports_with_aliases(files, &TsConfigAliases::empty());
}

/// Resolve imports, consulting tsconfig.json `paths` aliases before falling back
/// to relative-path resolution. Critical for monorepos and projects with `@/*` aliases.
pub fn resolve_internal_imports_with_aliases(files: &mut [ParsedFile], aliases: &TsConfigAliases) {
    resolve_internal_imports_full(files, aliases, &ZigDeps::empty())
}

/// Full-featured resolver: applies tsconfig path aliases AND Zig build.zig.zon
/// dependency declarations. Different language families use different lookup
/// strategies, so we treat Zig imports specially to avoid false bare-basename
/// matches (e.g. `@import("build")` should NOT match a random `build.zig`).
pub fn resolve_internal_imports_full(
    files: &mut [ParsedFile],
    aliases: &TsConfigAliases,
    zig_deps: &ZigDeps,
) {
    let paths: HashSet<String> = files.iter().map(|file| file.path.clone()).collect();

    for file in files {
        let mut internal = Vec::new();
        let mut external = file.external_imports.clone();
        let is_zig = file.path.ends_with(".zig");

        for import in &file.imports {
            // 1. Relative imports (./foo, ../bar) — works for every language
            if import.starts_with('.') {
                if let Some(resolved) = resolve_relative_import(&file.path, import, &paths) {
                    internal.push(resolved);
                    continue;
                }
                // Couldn't resolve a relative import — skip without classifying as external
                continue;
            }

            // 2. Zig: consult build.zig.zon dep map, anchored to importer's location.
            //    No fallback to bare-basename matching (which would create noise edges).
            if is_zig {
                if let Some(resolved) = zig_deps.resolve(&file.path, import, &paths) {
                    internal.push(resolved);
                    continue;
                }
                external.push(import.split('/').next().unwrap_or(import).to_string());
                continue;
            }

            // 3. Non-Zig non-relative: try exact path, then tsconfig aliases,
            //    then extension-probe (Python style: `foo.bar` → `foo/bar.py`).
            if let Some(hit) = paths.get(import) {
                internal.push(hit.clone());
                continue;
            }
            if let Some(resolved) = aliases.resolve(import, &paths) {
                internal.push(resolved);
                continue;
            }
            if let Some(resolved) = try_resolve_with_extensions(import, &paths) {
                internal.push(resolved);
                continue;
            }
            external.push(import.split('/').next().unwrap_or(import).to_string());
        }

        internal.sort();
        internal.dedup();
        external.sort();
        external.dedup();
        file.imports = internal;
        file.external_imports = external;
    }
}

/// Expanded path alias from tsconfig.json — maps an import prefix to a list of
/// file-system prefixes to try, in order.
#[derive(Debug, Clone)]
pub struct TsConfigAliases {
    /// Each entry: (import_prefix_without_star, [target_prefix_without_star, ...], has_wildcard)
    rules: Vec<AliasRule>,
}

#[derive(Debug, Clone)]
struct AliasRule {
    /// e.g. "@trpc/" for pattern "@trpc/*", or "lodash" for exact match
    pattern_prefix: String,
    /// True if pattern ended in "*"
    wildcard: bool,
    /// Resolved target prefixes (relative to project root, normalized with forward slashes)
    /// e.g. ["packages/server/src/", "packages/client/src/"]
    targets: Vec<String>,
}

const RESOLVE_EXTENSIONS: &[&str] = &[
    "", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".d.ts", ".json", ".py", ".pyi", ".zig",
];

impl TsConfigAliases {
    pub fn empty() -> Self {
        Self { rules: Vec::new() }
    }

    /// Build alias map from a list of (tsconfig_path, content) pairs.
    /// Each tsconfig contributes rules anchored at its directory.
    pub fn from_tsconfigs(tsconfigs: &[(String, String)]) -> Self {
        let mut rules = Vec::new();

        for (path, content) in tsconfigs {
            // tsconfigs sometimes contain // comments and trailing commas — strip the obvious ones
            let cleaned = strip_jsonc(content);
            let json: serde_json::Value = match serde_json::from_str(&cleaned) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let compiler_opts = match json.get("compilerOptions") {
                Some(v) => v,
                None => continue,
            };

            let tsconfig_dir = Path::new(path)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            let base_url = compiler_opts
                .get("baseUrl")
                .and_then(|v| v.as_str())
                .unwrap_or(".");

            // Anchor: tsconfig_dir + baseUrl, normalized
            let anchor = normalize_relative(&join_rel(&tsconfig_dir, base_url));

            let paths_obj = match compiler_opts.get("paths").and_then(|v| v.as_object()) {
                Some(o) => o,
                None => continue,
            };

            for (pattern, targets) in paths_obj {
                let target_array = match targets.as_array() {
                    Some(a) => a,
                    None => continue,
                };

                let (pattern_prefix, wildcard) = if let Some(stripped) = pattern.strip_suffix("/*") {
                    (format!("{}/", stripped), true)
                } else if let Some(stripped) = pattern.strip_suffix('*') {
                    (stripped.to_string(), true)
                } else {
                    (pattern.clone(), false)
                };

                let resolved_targets: Vec<String> = target_array
                    .iter()
                    .filter_map(|t| t.as_str())
                    .map(|raw| {
                        let stripped = if let Some(s) = raw.strip_suffix("/*") {
                            format!("{}/", s)
                        } else if let Some(s) = raw.strip_suffix('*') {
                            s.to_string()
                        } else {
                            raw.to_string()
                        };
                        normalize_relative(&join_rel(&anchor, &stripped))
                    })
                    .collect();

                if resolved_targets.is_empty() {
                    continue;
                }

                rules.push(AliasRule {
                    pattern_prefix,
                    wildcard,
                    targets: resolved_targets,
                });
            }
        }

        // Longest pattern first so "@trpc/server" beats "@trpc/" when both exist
        rules.sort_by(|a, b| b.pattern_prefix.len().cmp(&a.pattern_prefix.len()));

        Self { rules }
    }

    pub fn rule_count(&self) -> usize {
        self.rules.len()
    }

    fn resolve(&self, import: &str, paths: &HashSet<String>) -> Option<String> {
        for rule in &self.rules {
            let suffix = if rule.wildcard {
                if !import.starts_with(&rule.pattern_prefix) {
                    continue;
                }
                &import[rule.pattern_prefix.len()..]
            } else {
                if import != rule.pattern_prefix {
                    continue;
                }
                ""
            };

            for target in &rule.targets {
                let candidate = if rule.wildcard {
                    format!("{}{}", target, suffix)
                } else {
                    target.clone()
                };
                let candidate = candidate.trim_end_matches('/').to_string();

                if let Some(hit) = try_resolve_with_extensions(&candidate, paths) {
                    return Some(hit);
                }
            }
        }
        None
    }
}

fn try_resolve_with_extensions(candidate: &str, paths: &HashSet<String>) -> Option<String> {
    for ext in RESOLVE_EXTENSIONS {
        let p = format!("{}{}", candidate, ext);
        if paths.contains(&p) {
            return Some(p);
        }
    }
    // Directory imports: JS/TS use index.*, Python uses __init__.py
    for ext in RESOLVE_EXTENSIONS.iter().filter(|e| !e.is_empty()) {
        let p = format!("{}/index{}", candidate, ext);
        if paths.contains(&p) {
            return Some(p);
        }
    }
    let py_init = format!("{}/__init__.py", candidate);
    if paths.contains(&py_init) {
        return Some(py_init);
    }
    None
}

/// Strip // line comments and /* block comments from JSONC. Naive but adequate
/// for tsconfigs which never contain comment markers inside string literals in practice.
fn strip_jsonc(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let bytes = input.as_bytes();
    let mut i = 0;
    let mut in_string = false;
    let mut escape = false;
    while i < bytes.len() {
        let b = bytes[i];
        if in_string {
            out.push(b as char);
            if escape {
                escape = false;
            } else if b == b'\\' {
                escape = true;
            } else if b == b'"' {
                in_string = false;
            }
            i += 1;
            continue;
        }
        if b == b'"' {
            in_string = true;
            out.push('"');
            i += 1;
            continue;
        }
        if b == b'/' && i + 1 < bytes.len() {
            if bytes[i + 1] == b'/' {
                while i < bytes.len() && bytes[i] != b'\n' {
                    i += 1;
                }
                continue;
            }
            if bytes[i + 1] == b'*' {
                i += 2;
                while i + 1 < bytes.len() && !(bytes[i] == b'*' && bytes[i + 1] == b'/') {
                    i += 1;
                }
                i = (i + 2).min(bytes.len());
                continue;
            }
        }
        out.push(b as char);
        i += 1;
    }
    // Strip trailing commas before ] or }
    let mut cleaned = String::with_capacity(out.len());
    let chars: Vec<char> = out.chars().collect();
    let mut j = 0;
    while j < chars.len() {
        if chars[j] == ',' {
            let mut k = j + 1;
            while k < chars.len() && chars[k].is_whitespace() {
                k += 1;
            }
            if k < chars.len() && (chars[k] == ']' || chars[k] == '}') {
                j += 1;
                continue;
            }
        }
        cleaned.push(chars[j]);
        j += 1;
    }
    cleaned
}

fn join_rel(base: &str, rel: &str) -> String {
    if base.is_empty() || base == "." {
        return rel.to_string();
    }
    if rel.is_empty() || rel == "." {
        return base.to_string();
    }
    format!("{}/{}", base.trim_end_matches('/'), rel)
}

fn normalize_relative(path: &str) -> String {
    let mut parts: Vec<&str> = Vec::new();
    for component in path.split('/') {
        match component {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            other => parts.push(other),
        }
    }
    parts.join("/")
}

/// Resolve a relative import (must start with `.`) by joining against the importer's
/// directory and probing common file extensions + index/__init__ variants.
fn resolve_relative_import(
    from_path: &str,
    import: &str,
    paths: &HashSet<String>,
) -> Option<String> {
    debug_assert!(import.starts_with('.'));
    let base = Path::new(from_path)
        .parent()
        .unwrap_or_else(|| Path::new(""));
    let candidate = normalize_path(base.join(import));
    let extensions = [
        "", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go", ".java", ".css",
        ".scss", ".json", ".yaml", ".yml", ".toml", ".rb", ".php", ".swift", ".kt", ".kts", ".c",
        ".h", ".cpp", ".hpp", ".zig", ".lua", ".dart",
    ];
    for ext in extensions {
        let path = format!("{}{}", candidate, ext);
        if paths.contains(&path) {
            return Some(path);
        }
    }
    for ext in extensions.iter().filter(|ext| !ext.is_empty()) {
        let path = format!("{}/index{}", candidate, ext);
        if paths.contains(&path) {
            return Some(path);
        }
    }
    let py_init = format!("{}/__init__.py", candidate);
    if paths.contains(&py_init) {
        return Some(py_init);
    }
    None
}

fn normalize_path(path: PathBuf) -> String {
    let mut parts = Vec::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => {
                parts.pop();
            }
            std::path::Component::Normal(part) => parts.push(part.to_string_lossy().to_string()),
            _ => {}
        }
    }
    parts.join("/")
}

// ────────────────────────────────────────────────────────────────────────────
// ZigDeps — parses build.zig.zon dependency declarations to resolve `@import("name")`
// calls. Without this, Zig non-relative imports degrade to bare-basename guessing.
// ────────────────────────────────────────────────────────────────────────────

/// One Zig dependency declaration: maps a module name to a directory containing
/// the package's source. Anchored at the directory containing the build.zig.zon
/// file that declared it (so relative `.path` like "../foo" resolves correctly).
#[derive(Debug, Clone)]
struct ZigDepEntry {
    /// Directory that owns this declaration (containing the build.zig.zon).
    /// Empty string = project root.
    anchor_dir: String,
    /// Module name as referenced in `@import("name")`.
    name: String,
    /// Resolved target directory (relative to project root, no trailing slash).
    target_dir: String,
}

#[derive(Debug, Clone)]
pub struct ZigDeps {
    entries: Vec<ZigDepEntry>,
}

impl ZigDeps {
    pub fn empty() -> Self {
        Self { entries: Vec::new() }
    }

    /// Parse every build.zig.zon in the corpus and extract its `dependencies`.
    /// Falls back gracefully (zero entries) if the Zig grammar isn't available
    /// or a particular zon file fails to parse.
    pub fn from_zon_files(zon_files: &[(String, String)]) -> Self {
        let mut parser = Parser::new();
        if parser
            .set_language(&tree_sitter_zig::LANGUAGE.into())
            .is_err()
        {
            return Self::empty();
        }

        let mut entries = Vec::new();
        for (path, content) in zon_files {
            let anchor = Path::new(path)
                .parent()
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .unwrap_or_default();
            let Some(tree) = parser.parse(content, None) else {
                continue;
            };
            extract_zon_dependencies(&tree.root_node(), content, &anchor, &mut entries);
        }
        Self { entries }
    }

    pub fn entry_count(&self) -> usize {
        self.entries.len()
    }

    /// Resolve a Zig `@import("name")` or `@import("name/sub.zig")` call by
    /// matching against declared dependencies whose anchor is at-or-above the
    /// importer (most-specific anchor wins).
    fn resolve(
        &self,
        from_path: &str,
        import: &str,
        paths: &HashSet<String>,
    ) -> Option<String> {
        // The import may be just a module name ("vaxis") or a sub-path within it
        // ("vaxis/main.zig"). Split on first slash.
        let (head, tail) = match import.split_once('/') {
            Some((h, t)) => (h, Some(t)),
            None => (import, None),
        };

        // Pick the dep entry with the longest anchor that's a prefix of from_path.
        // This handles nested workspaces where a sub-package has its own deps.
        let mut best: Option<&ZigDepEntry> = None;
        for entry in &self.entries {
            if entry.name != head {
                continue;
            }
            let anchor_matches = entry.anchor_dir.is_empty()
                || from_path.starts_with(&format!("{}/", entry.anchor_dir));
            if !anchor_matches {
                continue;
            }
            if best.map(|b| entry.anchor_dir.len() > b.anchor_dir.len()).unwrap_or(true) {
                best = Some(entry);
            }
        }
        let entry = best?;

        // Build candidate paths. If the import has a sub-path, append it; otherwise
        // probe for the package's entry file (build.zig.zon's `.paths` ideally points
        // to it but Zig convention is src/<name>.zig or src/main.zig or root.zig).
        let candidates: Vec<String> = match tail {
            Some(sub) => vec![format!("{}/{}", entry.target_dir, sub)],
            None => vec![
                format!("{}/src/{}.zig", entry.target_dir, head),
                format!("{}/src/main.zig", entry.target_dir),
                format!("{}/src/root.zig", entry.target_dir),
                format!("{}/{}.zig", entry.target_dir, head),
                format!("{}/main.zig", entry.target_dir),
                format!("{}/root.zig", entry.target_dir),
            ],
        };

        for candidate in candidates {
            if paths.contains(&candidate) {
                return Some(candidate);
            }
            // Also try with .zig appended if not already
            if !candidate.ends_with(".zig") {
                let with_ext = format!("{}.zig", candidate);
                if paths.contains(&with_ext) {
                    return Some(with_ext);
                }
            }
        }
        None
    }
}

/// Walk a parsed build.zig.zon to find `.dependencies = .{ .<name> = .{ .path = "..." } }`
/// entries. Skips deps that have no `.path` (URL-fetched packages live outside the corpus).
fn extract_zon_dependencies(
    root: &Node,
    src: &str,
    anchor_dir: &str,
    out: &mut Vec<ZigDepEntry>,
) {
    // Walk the tree looking for assignment_expression where LHS is `.dependencies`.
    let mut stack = vec![*root];
    while let Some(node) = stack.pop() {
        if node.kind() == "assignment_expression" {
            if assignment_lhs_field_name(&node, src) == Some("dependencies") {
                if let Some(rhs) = assignment_rhs_struct(&node) {
                    extract_each_dep(&rhs, src, anchor_dir, out);
                }
                // Don't recurse further into this branch
                continue;
            }
        }
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            stack.push(child);
        }
    }
}

/// Inside the `.dependencies = .{ ... }` initializer_list, each child is an
/// assignment_expression like `.vaxis = .{ .path = "packages/vaxis" }`.
fn extract_each_dep(
    deps_struct: &Node,
    src: &str,
    anchor_dir: &str,
    out: &mut Vec<ZigDepEntry>,
) {
    // deps_struct is an anonymous_struct_initializer; we want its initializer_list.
    let init_list = first_child_of_kind(deps_struct, "initializer_list");
    let Some(init_list) = init_list else { return };

    let mut cursor = init_list.walk();
    for child in init_list.children(&mut cursor) {
        if child.kind() != "assignment_expression" {
            continue;
        }
        let Some(name) = assignment_lhs_field_name(&child, src) else { continue };
        let Some(rhs) = assignment_rhs_struct(&child) else { continue };

        // Inside the rhs `.{ .path = "...", .url = "...", ... }`, look for `.path`.
        let inner_list = first_child_of_kind(&rhs, "initializer_list");
        let Some(inner_list) = inner_list else { continue };

        let mut inner_cursor = inner_list.walk();
        for field in inner_list.children(&mut inner_cursor) {
            if field.kind() != "assignment_expression" {
                continue;
            }
            if assignment_lhs_field_name(&field, src) != Some("path") {
                continue;
            }
            if let Some(path_str) = assignment_rhs_string(&field, src) {
                // Resolve relative to anchor_dir
                let target = if anchor_dir.is_empty() || path_str.starts_with('/') {
                    normalize_relative(&path_str)
                } else {
                    normalize_relative(&format!("{}/{}", anchor_dir, path_str))
                };
                out.push(ZigDepEntry {
                    anchor_dir: anchor_dir.to_string(),
                    name: name.to_string(),
                    target_dir: target,
                });
            }
        }
    }
}

/// For an assignment_expression node, get the identifier name from its LHS
/// `field_expression` (e.g. `.dependencies` → "dependencies").
fn assignment_lhs_field_name<'a>(node: &Node<'a>, src: &'a str) -> Option<&'a str> {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "field_expression" {
            let mut fc = child.walk();
            for f in child.children(&mut fc) {
                if f.kind() == "identifier" {
                    return f.utf8_text(src.as_bytes()).ok();
                }
            }
        }
    }
    None
}

/// Get the RHS anonymous_struct_initializer of an assignment_expression.
fn assignment_rhs_struct<'a>(node: &Node<'a>) -> Option<Node<'a>> {
    let mut cursor = node.walk();
    let mut seen_eq = false;
    for child in node.children(&mut cursor) {
        if !seen_eq {
            if child.kind() == "=" {
                seen_eq = true;
            }
            continue;
        }
        if child.kind() == "anonymous_struct_initializer" {
            return Some(child);
        }
    }
    None
}

/// Get the RHS string literal value of an assignment_expression (returns the
/// content without surrounding quotes).
fn assignment_rhs_string(node: &Node, src: &str) -> Option<String> {
    let mut cursor = node.walk();
    let mut seen_eq = false;
    for child in node.children(&mut cursor) {
        if !seen_eq {
            if child.kind() == "=" {
                seen_eq = true;
            }
            continue;
        }
        if child.kind() == "string" {
            // The string node has a string_content child holding the unquoted content.
            let mut sc = child.walk();
            for s in child.children(&mut sc) {
                if s.kind() == "string_content" {
                    return s.utf8_text(src.as_bytes()).ok().map(|s| s.to_string());
                }
            }
            // Fallback: strip quotes from full text
            if let Ok(text) = child.utf8_text(src.as_bytes()) {
                return Some(text.trim_matches('"').to_string());
            }
        }
    }
    None
}

fn first_child_of_kind<'a>(node: &Node<'a>, kind: &str) -> Option<Node<'a>> {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == kind {
            return Some(child);
        }
    }
    None
}

// ────────────────────────────────────────────────────────────────────────────
// Call-graph extraction helpers (free functions — used by `extract_calls`)
//
// `walk_calls_generic` is a parameterised tree walker. It pushes each
// function/method declaration onto a stack so call sites know the caller,
// then for every call expression it asks the language-specific `callee_fn`
// to extract a bare identifier.
// ────────────────────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
fn walk_calls_generic(
    node: &Node,
    content: &str,
    caller: &str,
    out: &mut Vec<CallSite>,
    function_decl_kinds: &[&str],
    call_kinds: &[&str],
    callee_fn: fn(&Node, &str) -> Option<String>,
    func_name_fn: fn(&Node, &str) -> Option<String>,
) {
    let kind = node.kind();

    // Entering a function / method body — switch the caller name for descendants.
    if function_decl_kinds.contains(&kind) {
        let new_caller = func_name_fn(node, content).unwrap_or_default();
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            walk_calls_generic(
                &child,
                content,
                &new_caller,
                out,
                function_decl_kinds,
                call_kinds,
                callee_fn,
                func_name_fn,
            );
        }
        return;
    }

    // Call site — record (caller, callee, line). Self-calls are still recorded;
    // network pass will dedupe edges.
    if call_kinds.contains(&kind) {
        if let Some(callee) = callee_fn(node, content) {
            if !callee.is_empty() {
                out.push(CallSite {
                    caller: caller.to_string(),
                    callee,
                    line: node.start_position().row + 1,
                });
            }
        }
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk_calls_generic(
            &child,
            content,
            caller,
            out,
            function_decl_kinds,
            call_kinds,
            callee_fn,
            func_name_fn,
        );
    }
}

fn node_text<'a>(node: &Node, content: &'a str) -> &'a str {
    let start = node.start_byte();
    let end = node.end_byte();
    if end <= content.len() {
        &content[start..end]
    } else {
        ""
    }
}

// ── TypeScript / JavaScript ────────────────────────────────────────────────
fn function_name_ts_js(node: &Node, content: &str) -> Option<String> {
    if let Some(name) = node.child_by_field_name("name") {
        return Some(node_text(&name, content).to_string());
    }
    if let Some(parent) = node.parent() {
        if parent.kind() == "variable_declarator" {
            if let Some(name) = parent.child_by_field_name("name") {
                return Some(node_text(&name, content).to_string());
            }
        }
    }
    None
}

fn callee_from_ts_js(node: &Node, content: &str) -> Option<String> {
    let func = node.child_by_field_name("function")?;
    match func.kind() {
        "identifier" | "type_identifier" | "shorthand_property_identifier" => {
            Some(node_text(&func, content).to_string())
        }
        "member_expression" => {
            let prop = func.child_by_field_name("property")?;
            Some(node_text(&prop, content).to_string())
        }
        _ => None,
    }
}

// ── Python ─────────────────────────────────────────────────────────────────
fn function_name_python(node: &Node, content: &str) -> Option<String> {
    let name = node.child_by_field_name("name")?;
    Some(node_text(&name, content).to_string())
}

fn callee_from_python(node: &Node, content: &str) -> Option<String> {
    let func = node.child_by_field_name("function")?;
    match func.kind() {
        "identifier" => Some(node_text(&func, content).to_string()),
        "attribute" => {
            let attr = func.child_by_field_name("attribute")?;
            Some(node_text(&attr, content).to_string())
        }
        _ => None,
    }
}

// ── Rust ───────────────────────────────────────────────────────────────────
fn function_name_rust(node: &Node, content: &str) -> Option<String> {
    let name = node.child_by_field_name("name")?;
    Some(node_text(&name, content).to_string())
}

fn callee_from_rust(node: &Node, content: &str) -> Option<String> {
    if node.kind() == "macro_invocation" {
        let macro_name = node.child_by_field_name("macro")?;
        match macro_name.kind() {
            "identifier" => return Some(node_text(&macro_name, content).to_string()),
            "scoped_identifier" => {
                let name = macro_name.child_by_field_name("name")?;
                return Some(node_text(&name, content).to_string());
            }
            _ => return None,
        }
    }

    let func = node.child_by_field_name("function")?;
    match func.kind() {
        "identifier" => Some(node_text(&func, content).to_string()),
        "field_expression" => {
            let field = func.child_by_field_name("field")?;
            Some(node_text(&field, content).to_string())
        }
        "scoped_identifier" => {
            let name = func.child_by_field_name("name")?;
            Some(node_text(&name, content).to_string())
        }
        "generic_function" => {
            let mut cursor = func.walk();
            for child in func.children(&mut cursor) {
                if let Some(name) = match child.kind() {
                    "identifier" => Some(node_text(&child, content).to_string()),
                    "scoped_identifier" => child
                        .child_by_field_name("name")
                        .map(|n| node_text(&n, content).to_string()),
                    "field_expression" => child
                        .child_by_field_name("field")
                        .map(|n| node_text(&n, content).to_string()),
                    _ => None,
                } {
                    return Some(name);
                }
            }
            None
        }
        _ => None,
    }
}

// ── Go ─────────────────────────────────────────────────────────────────────
fn function_name_go(node: &Node, content: &str) -> Option<String> {
    let name = node.child_by_field_name("name")?;
    Some(node_text(&name, content).to_string())
}

fn callee_from_go(node: &Node, content: &str) -> Option<String> {
    let func = node.child_by_field_name("function")?;
    match func.kind() {
        "identifier" => Some(node_text(&func, content).to_string()),
        "selector_expression" => {
            let field = func.child_by_field_name("field")?;
            Some(node_text(&field, content).to_string())
        }
        _ => None,
    }
}

// ── Zig ────────────────────────────────────────────────────────────────────
fn function_name_zig(node: &Node, content: &str) -> Option<String> {
    if let Some(name) = node.child_by_field_name("name") {
        return Some(node_text(&name, content).to_string());
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "identifier" {
            return Some(node_text(&child, content).to_string());
        }
    }
    None
}

fn callee_from_zig(node: &Node, content: &str) -> Option<String> {
    let func = node
        .child_by_field_name("function")
        .or_else(|| node.child(0))?;
    match func.kind() {
        "identifier" => Some(node_text(&func, content).to_string()),
        "field_expression" => {
            let mut cursor = func.walk();
            let mut last_ident: Option<String> = None;
            for child in func.children(&mut cursor) {
                if child.kind() == "identifier" {
                    last_ident = Some(node_text(&child, content).to_string());
                }
            }
            last_ident
        }
        "builtin_function" => None,
        _ => None,
    }
}
