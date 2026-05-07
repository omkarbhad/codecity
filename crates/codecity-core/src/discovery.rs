//! Corpus discovery rules — which directories to skip, which files to include.
//!
//! Pure data + predicates. No I/O. Lives in `codecity-core` so every consumer
//! (desktop pipeline, CLI, future MCP server) walks the corpus the same way.
//! Previously these rules were inlined in the desktop pipeline and the CLI
//! had its own ad-hoc fork — drift between the two caused the CLI to ingest
//! files the desktop app skipped.

use std::path::Path;

/// Directory names that should never be descended into when walking a corpus.
pub const SKIP_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "dist",
    ".next",
    "build",
    "target",
    "__pycache__",
    ".cache",
    "vendor",
    ".venv",
    "venv",
    "coverage",
    ".tox",
    ".mypy_cache",
    ".idea",
    ".vscode",
    "zig-cache",
    ".zig-cache",
    "zig-out",
];

/// Specific file names that should be skipped even if their extension is
/// otherwise supported (lockfiles dominate by size and add no signal).
pub const SKIP_FILES: &[&str] = &[
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
    "Cargo.lock",
    "poetry.lock",
    "Pipfile.lock",
    "composer.lock",
    "go.sum",
];

/// File extensions (without the leading dot, lowercase) recognised by the
/// analyzer. Adding a language here is necessary but not sufficient — the
/// parser must also have a matching `FileType` arm.
pub const SUPPORTED_EXTENSIONS: &[&str] = &[
    "ts", "tsx", "js", "jsx", "mjs", "cjs", "mts", "cts", "es", "es6", "vue", "svelte", "astro",
    "css", "scss", "less", "sass", "html", "htm", "svg", "md", "mdx", "json", "jsonc", "yaml",
    "yml", "toml", "webmanifest", "ipynb", "py", "pyi", "pyx", "pxd", "pxi", "go", "rs", "java",
    "kt", "kts", "rb", "php", "swift", "c", "h", "cu", "cuh", "cpp", "cxx", "cc", "hpp", "hxx",
    "hh", "cs", "fs", "fsi", "fsx", "vb", "m", "mm", "zig", "zon", "lua", "dart", "scala",
    "groovy", "r", "R", "jl", "hs", "lhs", "ex", "exs", "erl", "hrl", "beam", "ml", "mli", "clj",
    "cljs", "cljc", "edn", "lisp", "lsp", "cl", "scm", "ss", "idr", "lidr", "agda", "lean",
    "purs", "nim", "cr", "v", "d", "sh", "bash", "zsh", "fish", "ksh", "awk", "ps1", "bat",
    "cmd", "asm", "s", "o", "obj", "a", "lib", "so", "dylib", "dll", "exe", "rlib", "class",
    "jar", "war", "ear", "wasm", "wat", "xml", "xsd", "xsl", "ini", "cfg", "conf", "env", "csv",
    "tsv", "ndjson", "avro", "parquet", "orc", "npy", "npz", "h5", "hdf5", "hdf", "feather",
    "arrow", "duckdb", "db", "sqlite", "sqlite3", "pkl", "pickle", "joblib", "model", "weights",
    "pt", "pth", "ckpt", "safetensors", "onnx", "pb", "pbtxt", "tflite", "lite", "keras",
    "mlmodel", "mar", "engine", "trt", "caffemodel", "prototxt", "params", "bin", "gguf", "ggml",
    "tiktoken", "spm", "bpe", "vocab", "proto", "thrift", "dockerfile", "makefile", "mk",
    "gradle", "bazel", "bzl", "tf", "tfvars", "hcl", "nix", "ejs", "pug", "hbs", "mustache",
    "liquid", "njk", "rst", "adoc", "asciidoc", "tex", "latex", "bib", "feature", "spec", "snap",
    "tap", "log", "patch", "diff", "lock", "glsl", "frag", "vert", "comp", "hlsl", "wgsl", "cg",
    "ptx", "cubin", "fatbin", "nvvm", "ll", "bc", "coffee", "lit", "marko", "graphql", "gql",
    "sql", "dockerignore", "gitignore", "gitattributes", "editorconfig", "properties", "plist",
    "xcconfig", "bicep", "cue", "dhall", "ron", "rego", "nomad", "hurl", "http", "rest", "vhd",
    "vhdl", "sv", "svh", "matlab", "octave", "sas", "stata", "do", "qml", "qss", "plantuml",
    "puml", "mermaid", "mmd",
];

/// Extension-less file names that should be analyzed (Dockerfile, Makefile,
/// package.json, etc.). Case-sensitive — entries match the filename verbatim.
pub const SUPPORTED_FILENAMES: &[&str] = &[
    ".babelrc",
    ".browserslistrc",
    ".dockerignore",
    ".editorconfig",
    ".env",
    ".env.development",
    ".env.example",
    ".env.local",
    ".env.production",
    ".env.test",
    ".eslintignore",
    ".eslintrc",
    ".gitattributes",
    ".gitignore",
    ".graphqlrc",
    ".npmrc",
    ".nvmrc",
    ".prettierignore",
    ".prettierrc",
    ".stylelintrc",
    ".yamllint",
    "Brewfile",
    "Containerfile",
    "Dockerfile",
    "Gemfile",
    "Justfile",
    "Makefile",
    "Podfile",
    "Procfile",
    "Rakefile",
    "Tiltfile",
    "Vagrantfile",
    "WORKSPACE",
    "angular.json",
    "bun.lock",
    "bun.lockb",
    "compose.yaml",
    "compose.yml",
    "deno.json",
    "deno.jsonc",
    "docker-compose.yaml",
    "docker-compose.yml",
    "eslint.config.cjs",
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.ts",
    "go.mod",
    "go.sum",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "package.json",
    "pnpm-workspace.yaml",
    "postcss.config.cjs",
    "postcss.config.js",
    "postcss.config.mjs",
    "postcss.config.ts",
    "prettier.config.cjs",
    "prettier.config.js",
    "prettier.config.mjs",
    "pyproject.toml",
    "remix.config.js",
    "remix.config.mjs",
    "requirements.txt",
    "environment.yml",
    "environment.yaml",
    "conda.yaml",
    "conda.yml",
    "Pipfile",
    "dvc.yaml",
    "params.yaml",
    "mlproject",
    "MLproject",
    "model-card.md",
    "ModelCard.md",
    "rust-toolchain",
    "rust-toolchain.toml",
    "svelte.config.js",
    "svelte.config.ts",
    "tailwind.config.cjs",
    "tailwind.config.js",
    "tailwind.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json",
    "turbo.json",
    "vite.config.js",
    "vite.config.mjs",
    "vite.config.ts",
    "vitest.config.js",
    "vitest.config.mjs",
    "vitest.config.ts",
];

/// True if this directory should not be descended into.
pub fn should_skip_dir(dir_name: &str) -> bool {
    SKIP_DIRS.contains(&dir_name)
}

/// True if this file should be excluded even when its extension/name would
/// otherwise be supported (lockfiles, generated artifacts, source maps, …).
pub fn should_skip_file(path: &Path) -> bool {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("");
    if SKIP_FILES.contains(&file_name) {
        return true;
    }
    let lower = file_name.to_lowercase();
    lower.ends_with(".min.js")
        || lower.ends_with(".min.css")
        || lower.ends_with(".map")
        || lower.ends_with(".snap")
        || lower.ends_with(".generated.ts")
        || lower.ends_with(".generated.js")
}

/// True if `ext` (lowercased, no leading dot) is a recognised analyzable
/// extension.
pub fn is_supported_extension(ext: &str) -> bool {
    SUPPORTED_EXTENSIONS.contains(&ext)
}

/// True if `file_name` is a recognised extension-less file (Dockerfile,
/// package.json, …). Case-sensitive — `Dockerfile` matches but `dockerfile`
/// does not.
pub fn is_supported_filename(file_name: &str) -> bool {
    SUPPORTED_FILENAMES.contains(&file_name)
}

/// Cheap heuristic: presence of a NUL byte in the leading bytes implies
/// binary content. Sufficient for filtering before tree-sitter parse.
pub fn is_probably_binary(bytes: &[u8]) -> bool {
    bytes.contains(&0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn skip_dir_known_entries() {
        assert!(should_skip_dir("node_modules"));
        assert!(should_skip_dir(".git"));
        assert!(should_skip_dir("zig-cache"));
        assert!(!should_skip_dir("src"));
    }

    #[test]
    fn skip_file_lockfiles() {
        assert!(should_skip_file(&PathBuf::from("pnpm-lock.yaml")));
        assert!(should_skip_file(&PathBuf::from("path/to/Cargo.lock")));
    }

    #[test]
    fn skip_file_generated_and_minified() {
        assert!(should_skip_file(&PathBuf::from("vendor.min.js")));
        assert!(should_skip_file(&PathBuf::from("schema.generated.ts")));
        assert!(should_skip_file(&PathBuf::from("bundle.js.map")));
    }

    #[test]
    fn keep_normal_source_file() {
        assert!(!should_skip_file(&PathBuf::from("src/main.rs")));
        assert!(!should_skip_file(&PathBuf::from("index.tsx")));
    }

    #[test]
    fn supported_extensions_cover_common_languages() {
        for ext in ["rs", "ts", "tsx", "py", "go", "zig", "java", "rb"] {
            assert!(is_supported_extension(ext), "missing {ext}");
        }
    }

    #[test]
    fn supported_filenames_cover_common_configs() {
        for name in ["Dockerfile", "package.json", "pyproject.toml", "Makefile"] {
            assert!(is_supported_filename(name), "missing {name}");
        }
    }

    #[test]
    fn binary_detection_via_nul() {
        assert!(is_probably_binary(b"\x00binary"));
        assert!(!is_probably_binary(b"plain text"));
    }
}
