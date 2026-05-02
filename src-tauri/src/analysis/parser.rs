use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use tree_sitter::{Node, Parser};

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
    graphql_parser: Parser,
    make_parser: Parser,
    hcl_parser: Parser,
    proto_parser: Parser,
    yaml_parser: Parser,
    c_parser: Parser,
    cpp_parser: Parser,
    ruby_parser: Parser,
    php_parser: Parser,
    swift_parser: Parser,
    kotlin_parser: Parser,
    bash_parser: Parser,
    zig_parser: Parser,
    lua_parser: Parser,
    haskell_parser: Parser,
    dart_parser: Parser,
    elixir_parser: Parser,
    scala_parser: Parser,
    r_parser: Parser,
    julia_parser: Parser,
    perl_parser: Parser,
    csharp_parser: Parser,
    erlang_parser: Parser,
    nix_parser: Parser,
    glsl_parser: Parser,
    ocaml_parser: Parser,
    groovy_parser: Parser,
    elisp_parser: Parser,
}

impl AnalysisParser {
    pub fn new() -> Self {
        let mut ts_parser = Parser::new();
        ts_parser
            .set_language(&tree_sitter_typescript::LANGUAGE_TSX.into())
            .ok();

        let mut js_parser = Parser::new();
        js_parser
            .set_language(&tree_sitter_javascript::LANGUAGE.into())
            .ok();

        let mut py_parser = Parser::new();
        py_parser
            .set_language(&tree_sitter_python::LANGUAGE.into())
            .ok();

        let mut rust_parser = Parser::new();
        rust_parser
            .set_language(&tree_sitter_rust::LANGUAGE.into())
            .ok();

        let mut go_parser = Parser::new();
        go_parser
            .set_language(&tree_sitter_go::LANGUAGE.into())
            .ok();

        let mut java_parser = Parser::new();
        java_parser
            .set_language(&tree_sitter_java::LANGUAGE.into())
            .ok();

        let mut css_parser = Parser::new();
        css_parser
            .set_language(&tree_sitter_css::LANGUAGE.into())
            .ok();

        let mut html_parser = Parser::new();
        html_parser
            .set_language(&tree_sitter_html::LANGUAGE.into())
            .ok();

        let mut json_parser = Parser::new();
        json_parser
            .set_language(&tree_sitter_json::LANGUAGE.into())
            .ok();

        let mut graphql_parser = Parser::new();
        graphql_parser
            .set_language(&tree_sitter_graphql::LANGUAGE.into())
            .ok();

        let mut make_parser = Parser::new();
        make_parser
            .set_language(&tree_sitter_make::LANGUAGE.into())
            .ok();

        let mut hcl_parser = Parser::new();
        hcl_parser
            .set_language(&tree_sitter_hcl::LANGUAGE.into())
            .ok();

        let mut proto_parser = Parser::new();
        proto_parser
            .set_language(&tree_sitter_proto::LANGUAGE.into())
            .ok();

        let mut yaml_parser = Parser::new();
        yaml_parser
            .set_language(&tree_sitter_yaml::LANGUAGE.into())
            .ok();

        let mut c_parser = Parser::new();
        c_parser.set_language(&tree_sitter_c::LANGUAGE.into()).ok();

        let mut cpp_parser = Parser::new();
        cpp_parser
            .set_language(&tree_sitter_cpp::LANGUAGE.into())
            .ok();

        let mut ruby_parser = Parser::new();
        ruby_parser
            .set_language(&tree_sitter_ruby::LANGUAGE.into())
            .ok();

        let mut php_parser = Parser::new();
        php_parser
            .set_language(&tree_sitter_php::LANGUAGE_PHP.into())
            .ok();

        let mut swift_parser = Parser::new();
        swift_parser
            .set_language(&tree_sitter_swift::LANGUAGE.into())
            .ok();

        let mut kotlin_parser = Parser::new();
        kotlin_parser
            .set_language(&tree_sitter_kotlin_ng::LANGUAGE.into())
            .ok();

        let mut bash_parser = Parser::new();
        bash_parser
            .set_language(&tree_sitter_bash::LANGUAGE.into())
            .ok();

        let mut zig_parser = Parser::new();
        zig_parser
            .set_language(&tree_sitter_zig::LANGUAGE.into())
            .ok();

        let mut lua_parser = Parser::new();
        lua_parser
            .set_language(&tree_sitter_lua::LANGUAGE.into())
            .ok();

        let mut haskell_parser = Parser::new();
        haskell_parser
            .set_language(&tree_sitter_haskell::LANGUAGE.into())
            .ok();

        let mut dart_parser = Parser::new();
        dart_parser
            .set_language(&tree_sitter_dart::LANGUAGE.into())
            .ok();

        let mut elixir_parser = Parser::new();
        elixir_parser
            .set_language(&tree_sitter_elixir::LANGUAGE.into())
            .ok();

        let mut scala_parser = Parser::new();
        scala_parser
            .set_language(&tree_sitter_scala::LANGUAGE.into())
            .ok();

        let mut r_parser = Parser::new();
        r_parser.set_language(&tree_sitter_r::LANGUAGE.into()).ok();

        let mut julia_parser = Parser::new();
        julia_parser
            .set_language(&tree_sitter_julia::LANGUAGE.into())
            .ok();

        let mut perl_parser = Parser::new();
        perl_parser
            .set_language(&tree_sitter_perl::LANGUAGE.into())
            .ok();

        let mut csharp_parser = Parser::new();
        csharp_parser
            .set_language(&tree_sitter_c_sharp::LANGUAGE.into())
            .ok();

        let mut erlang_parser = Parser::new();
        erlang_parser
            .set_language(&tree_sitter_erlang::LANGUAGE.into())
            .ok();

        let mut nix_parser = Parser::new();
        nix_parser
            .set_language(&tree_sitter_nix::LANGUAGE.into())
            .ok();

        let mut glsl_parser = Parser::new();
        glsl_parser
            .set_language(&tree_sitter_glsl::LANGUAGE_GLSL.into())
            .ok();

        let mut ocaml_parser = Parser::new();
        ocaml_parser
            .set_language(&tree_sitter_ocaml::LANGUAGE_OCAML.into())
            .ok();

        let mut groovy_parser = Parser::new();
        groovy_parser
            .set_language(&tree_sitter_groovy::LANGUAGE.into())
            .ok();

        let mut elisp_parser = Parser::new();
        elisp_parser
            .set_language(&tree_sitter_elisp::LANGUAGE.into())
            .ok();

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
            graphql_parser,
            make_parser,
            hcl_parser,
            proto_parser,
            yaml_parser,
            c_parser,
            cpp_parser,
            ruby_parser,
            php_parser,
            swift_parser,
            kotlin_parser,
            bash_parser,
            zig_parser,
            lua_parser,
            haskell_parser,
            dart_parser,
            elixir_parser,
            scala_parser,
            r_parser,
            julia_parser,
            perl_parser,
            csharp_parser,
            erlang_parser,
            nix_parser,
            glsl_parser,
            ocaml_parser,
            groovy_parser,
            elisp_parser,
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
            FileType::Json => Some(&mut self.json_parser),
            FileType::Graphql => Some(&mut self.graphql_parser),
            FileType::Makefile => Some(&mut self.make_parser),
            FileType::Terraform => Some(&mut self.hcl_parser),
            FileType::Proto => Some(&mut self.proto_parser),
            FileType::Config => Some(&mut self.yaml_parser),
            FileType::C => Some(&mut self.c_parser),
            FileType::Cuda => Some(&mut self.cpp_parser),
            FileType::Cpp => Some(&mut self.cpp_parser),
            FileType::Ruby => Some(&mut self.ruby_parser),
            FileType::Php => Some(&mut self.php_parser),
            FileType::Swift => Some(&mut self.swift_parser),
            FileType::Kotlin => Some(&mut self.kotlin_parser),
            FileType::Bash => Some(&mut self.bash_parser),
            FileType::Zig => Some(&mut self.zig_parser),
            FileType::Lua => Some(&mut self.lua_parser),
            FileType::Haskell => Some(&mut self.haskell_parser),
            FileType::Dart => Some(&mut self.dart_parser),
            FileType::Elixir => Some(&mut self.elixir_parser),
            FileType::Scala => Some(&mut self.scala_parser),
            FileType::R => Some(&mut self.r_parser),
            FileType::Julia => Some(&mut self.julia_parser),
            FileType::Perl => Some(&mut self.perl_parser),
            FileType::CSharp => Some(&mut self.csharp_parser),
            FileType::Erlang => Some(&mut self.erlang_parser),
            FileType::Nix => Some(&mut self.nix_parser),
            FileType::Glsl => Some(&mut self.glsl_parser),
            FileType::Ocaml => Some(&mut self.ocaml_parser),
            FileType::Groovy => Some(&mut self.groovy_parser),
            FileType::Elisp => Some(&mut self.elisp_parser),
            FileType::Vue | FileType::Svelte | FileType::Astro => Some(&mut self.html_parser),
            FileType::Toml
            | FileType::Markdown
            | FileType::Mdx
            | FileType::Sql
            | FileType::Dockerfile
            | FileType::Shader
            | FileType::Llvm
            | FileType::NvidiaArtifact
            | FileType::WebAssembly
            | FileType::FSharp
            | FileType::VisualBasic
            | FileType::ObjectiveC
            | FileType::Clojure
            | FileType::Lisp
            | FileType::Idris
            | FileType::Agda
            | FileType::Lean
            | FileType::PureScript
            | FileType::Nim
            | FileType::Crystal
            | FileType::Vlang
            | FileType::Dlang
            | FileType::PowerShell
            | FileType::Batch
            | FileType::Assembly
            | FileType::Template
            | FileType::ReStructuredText
            | FileType::AsciiDoc
            | FileType::Latex
            | FileType::Gherkin
            | FileType::Data
            | FileType::Notebook
            | FileType::MlModel
            | FileType::MlCheckpoint
            | FileType::MlTensor
            | FileType::MlTokenizer
            | FileType::Binary
            | FileType::ConfigLanguage
            | FileType::Diagram
            | FileType::Hardware
            | FileType::Matlab
            | FileType::Qml
            | FileType::Other => None,
        }
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
            "import_statement" | "import_clause" | "import_declaration" | "use_declaration"
            | "import_spec" | "require_call" | "include_statement" | "load_statement"
            | "preproc_include" | "using_declaration" | "extern_declaration" => {
                self.extract_imports(node, content, imports, external_imports);
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
                let module = self
                    .get_node_text(&child, content)
                    .trim_matches('"')
                    .to_string();
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
    let paths: HashSet<String> = files.iter().map(|file| file.path.clone()).collect();

    for file in files {
        let mut internal = Vec::new();
        let mut external = file.external_imports.clone();

        for import in &file.imports {
            if let Some(resolved) = resolve_import_path(&file.path, import, &paths) {
                internal.push(resolved);
            } else if !import.starts_with('.') {
                external.push(import.split('/').next().unwrap_or(import).to_string());
            }
        }

        internal.sort();
        internal.dedup();
        external.sort();
        external.dedup();
        file.imports = internal;
        file.external_imports = external;
    }
}

fn resolve_import_path(from_path: &str, import: &str, paths: &HashSet<String>) -> Option<String> {
    if !import.starts_with('.') {
        return paths.get(import).cloned();
    }

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
