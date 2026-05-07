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

// ── Shared corpus walker ───────────────────────────────────────────────────
//
// Every consumer (CLI, MCP `--repo` mode, desktop pipeline) needs the same
// answer to "which files are part of this codebase?". They used to walk
// independently and drift — the CLI was missing entries the desktop had,
// `graphify-out/cache/*.json` showed up because nobody respected the
// project's own `.gitignore`. One shared walker means one source of truth.
//
// The hardcoded `SKIP_DIRS` / `SKIP_FILES` lists above are the safety net:
// they always apply, so a repo that forgot to gitignore `node_modules` or
// `target` still gets sane defaults. Gitignore is the user's project-
// specific layer on top.

use std::fs;
use std::path::PathBuf;

/// How the corpus walker should behave.
#[derive(Debug, Clone)]
pub struct WalkOptions {
    /// Honor the repo's `.gitignore` (and `.git/info/exclude`, parent
    /// gitignores, the global `core.excludesFile`). Default true — users
    /// almost always mean "what would `git status` see?". Pass false via
    /// the CLI/MCP `--no-gitskip` flag when you genuinely want to analyze
    /// generated/vendored code.
    pub respect_gitignore: bool,
    /// When true (default), files matching `should_skip_file` semantics
    /// — lockfiles, source maps, minified bundles, *.generated.* — are
    /// dropped. The CLI's old hand-rolled walker didn't do this; the
    /// desktop pipeline did. Now everyone does.
    pub apply_skip_files: bool,
    /// Drop content that fails the binary-byte heuristic (`is_probably_binary`).
    /// True by default; set false if you genuinely need to feed binary
    /// content to a downstream consumer (almost never).
    pub skip_binary: bool,
    /// Caller-supplied gitignore-style globs to drop after the walker
    /// produced its candidate list. Patterns are matched against the
    /// `rel_path` (forward-slash, relative to the scan root). Useful for
    /// excluding vendored trees like `packages/` or `vendor/` without
    /// editing `.gitignore`. Empty by default; one match drops the file.
    pub exclude_globs: Vec<String>,
}

impl Default for WalkOptions {
    fn default() -> Self {
        Self {
            respect_gitignore: true,
            apply_skip_files: true,
            skip_binary: true,
            exclude_globs: Vec::new(),
        }
    }
}

/// One discovered file. `rel_path` is forward-slash-normalized so snapshot
/// keys are stable across platforms.
#[derive(Debug, Clone)]
pub struct WalkedFile {
    pub abs_path: PathBuf,
    pub rel_path: String,
    pub content: String,
}

/// Walk `root` and return every analyzable source file, honoring the
/// shared discovery rules and (by default) the repo's `.gitignore`.
///
/// Returns a deterministic order (lexicographic by `rel_path`) so
/// snapshots and analyses are reproducible across runs — Codex flagged
/// non-deterministic community counts that traced back to filesystem
/// iteration order; sorting here removes one source of variance.
pub fn walk_corpus(root: &Path, opts: WalkOptions) -> Vec<WalkedFile> {
    let mut out = Vec::new();
    // Compile user-supplied excludes once. A bad pattern is dropped from the
    // set with a `log::warn!` rather than aborting the walk — the user
    // probably meant it but a typo shouldn't kill the whole analysis.
    let exclude_set: Option<globset::GlobSet> = if opts.exclude_globs.is_empty() {
        None
    } else {
        let mut builder = globset::GlobSetBuilder::new();
        for pat in &opts.exclude_globs {
            match globset::Glob::new(pat) {
                Ok(g) => {
                    builder.add(g);
                }
                Err(e) => {
                    log::warn!("ignoring malformed --exclude pattern {:?}: {}", pat, e);
                }
            }
        }
        builder.build().ok()
    };
    let mut builder = ignore::WalkBuilder::new(root);
    builder
        .standard_filters(opts.respect_gitignore)
        .git_global(opts.respect_gitignore)
        .git_ignore(opts.respect_gitignore)
        .git_exclude(opts.respect_gitignore)
        // `hidden(true)` (default) skips dotfiles. Our hardcoded SKIP_DIRS
        // already covers `.git`, `.next`, etc., so we only need this when
        // gitignore is off — it preserves the CLI's prior dotfile-skip
        // semantics. Turn it off when respecting gitignore so the user can
        // *explicitly* whitelist a `.config` directory if they want.
        .hidden(!opts.respect_gitignore)
        // Apply our hardcoded SKIP_DIRS as a `.gitignore`-style filter so
        // they're respected even when `--no-gitskip` is set.
        .filter_entry(|entry| {
            let name = entry.file_name().to_string_lossy();
            !should_skip_dir(name.as_ref())
        });

    for result in builder.build() {
        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if opts.apply_skip_files && should_skip_file(path) {
            continue;
        }
        let bytes = match fs::read(path) {
            Ok(b) => b,
            Err(_) => continue,
        };
        if opts.skip_binary && is_probably_binary(&bytes) {
            continue;
        }
        let content = match String::from_utf8(bytes) {
            Ok(s) if !s.is_empty() => s,
            _ => continue,
        };
        let rel = path
            .strip_prefix(root)
            .map(|p| p.to_string_lossy().replace('\\', "/").to_string())
            .unwrap_or_else(|_| path.to_string_lossy().to_string());
        // Caller-supplied excludes apply against the forward-slash-normalized
        // relative path so patterns like `packages/**` work consistently
        // across platforms.
        if let Some(set) = &exclude_set {
            if set.is_match(&rel) {
                continue;
            }
        }
        out.push(WalkedFile {
            abs_path: path.to_path_buf(),
            rel_path: rel,
            content,
        });
    }

    // Deterministic order — see doc comment above.
    out.sort_by(|a, b| a.rel_path.cmp(&b.rel_path));
    out
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
