//! File editing for local projects: write, create, delete (to the OS Trash) and
//! rename, always confined to the project's folder.
//!
//! Errors are plain strings because the UI shows them to the user as-is.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

use crate::analysis;

pub const MAX_WRITE_BYTES: usize = 5 * 1024 * 1024;

pub const GITHUB_READ_ONLY: &str =
    "This project is a GitHub download; files are read-only. Analyze a local folder to edit.";

/// The canonical folder of an analysed local project, or why it can't be edited.
pub fn local_project_root(db: &analysis::Database, repo_url: &str) -> Result<PathBuf, String> {
    let known = db
        .get_projects_by_user("local")
        .unwrap_or_default()
        .iter()
        .any(|project| project.repo_url == repo_url);
    let folder = PathBuf::from(crate::expand_local_path(repo_url));

    if !(known && folder.is_dir()) && analysis::parse_github_url(repo_url).is_ok() {
        return Err(GITHUB_READ_ONLY.to_string());
    }
    if !known {
        return Err(format!("Not an analysed project: {repo_url}"));
    }
    if !folder.is_dir() {
        return Err(format!(
            "Project folder not found: {repo_url}. It may have been moved or deleted."
        ));
    }
    folder
        .canonicalize()
        .map_err(|error| format!("Cannot open project folder {repo_url}: {error}"))
}

/// Resolve `relative` inside `root` (already canonical) for editing.
///
/// Rejects absolute paths, `..`, anything under `.git/`, and anything whose
/// existing part resolves (through symlinks) outside `root`. The path does not
/// need to exist: the nearest existing ancestor is resolved and the rest is
/// appended. The final component is kept as-is (not followed), so deleting or
/// renaming a symlink acts on the link, but if it exists its target must also
/// be inside `root`.
pub fn resolve_in_root(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let invalid = || format!("Invalid file path: {relative}");
    if relative.trim().is_empty() || relative.contains('\0') || relative.contains('\\') {
        return Err(invalid());
    }
    let mut names = Vec::new();
    for component in Path::new(relative).components() {
        match component {
            Component::Normal(name) => names.push(name),
            Component::CurDir => {}
            Component::ParentDir => {
                return Err(format!("File path may not contain '..': {relative}"))
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(format!("File path must be relative to the project: {relative}"))
            }
        }
    }
    let Some((last, parents)) = names.split_last() else {
        return Err(invalid());
    };

    let inside = |path: &Path| -> Result<(), String> {
        let rest = path
            .strip_prefix(root)
            .map_err(|_| format!("File path leaves the project folder: {relative}"))?;
        if rest
            .components()
            .any(|c| c.as_os_str().to_string_lossy().eq_ignore_ascii_case(".git"))
        {
            return Err(format!("Files inside .git/ can't be edited: {relative}"));
        }
        Ok(())
    };

    let mut dir = root.to_path_buf();
    let mut exists = true;
    for name in parents {
        dir.push(name);
        if exists && std::fs::symlink_metadata(&dir).is_ok() {
            dir = dir
                .canonicalize()
                .map_err(|error| format!("Cannot resolve {relative}: {error}"))?;
        } else {
            exists = false;
        }
        inside(&dir)?;
    }

    let full = dir.join(last);
    inside(&full)?;
    if exists && std::fs::symlink_metadata(&full).is_ok() {
        let target = full
            .canonicalize()
            .map_err(|error| format!("Cannot resolve {relative}: {error}"))?;
        inside(&target)?;
    }
    Ok(full)
}

fn check_size(content: &str) -> Result<(), String> {
    if content.len() > MAX_WRITE_BYTES {
        return Err(format!(
            "File is too large to save ({:.1} MB; the limit is 5 MB).",
            content.len() as f64 / (1024.0 * 1024.0)
        ));
    }
    Ok(())
}

pub fn write(root: &Path, file_path: &str, content: &str) -> Result<(), String> {
    check_size(content)?;
    let path = resolve_in_root(root, file_path)?;
    if !path.is_file() {
        return Err(format!("File not found: {file_path}"));
    }
    std::fs::write(&path, content).map_err(|error| format!("Could not save {file_path}: {error}"))
}

pub fn create(root: &Path, file_path: &str, content: &str) -> Result<(), String> {
    check_size(content)?;
    let path = resolve_in_root(root, file_path)?;
    if std::fs::symlink_metadata(&path).is_ok() {
        return Err(format!("A file or folder named {file_path} already exists."));
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create folders for {file_path}: {error}"))?;
    }
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|error| match error.kind() {
            std::io::ErrorKind::AlreadyExists => {
                format!("A file or folder named {file_path} already exists.")
            }
            _ => format!("Could not create {file_path}: {error}"),
        })?;
    file.write_all(content.as_bytes())
        .map_err(|error| format!("Could not write {file_path}: {error}"))
}

pub fn delete(root: &Path, file_path: &str) -> Result<(), String> {
    let path = resolve_in_root(root, file_path)?;
    if std::fs::symlink_metadata(&path).is_err() {
        return Err(format!("File not found: {file_path}"));
    }
    #[cfg(target_os = "macos")]
    let context = {
        use trash::macos::{DeleteMethod, TrashContextExtMacos};
        let mut context = trash::TrashContext::default();
        // NSFileManager needs no Finder automation permission and makes no sound.
        context.set_delete_method(DeleteMethod::NsFileManager);
        context
    };
    #[cfg(not(target_os = "macos"))]
    let context = trash::TrashContext::default();
    context
        .delete(&path)
        .map_err(|error| format!("Could not move {file_path} to the Trash: {error}"))
}

pub fn rename(root: &Path, from_path: &str, to_path: &str) -> Result<(), String> {
    let from = resolve_in_root(root, from_path)?;
    let to = resolve_in_root(root, to_path)?;
    if std::fs::symlink_metadata(&from).is_err() {
        return Err(format!("File not found: {from_path}"));
    }
    if std::fs::symlink_metadata(&to).is_ok() {
        // A case-only rename on a case-insensitive disk sees the file itself.
        let same = from.canonicalize().ok() == to.canonicalize().ok();
        if !same || from == to {
            return Err(format!("A file or folder named {to_path} already exists."));
        }
    }
    if let Some(parent) = to.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create folders for {to_path}: {error}"))?;
    }
    std::fs::rename(&from, &to)
        .map_err(|error| format!("Could not rename {from_path} to {to_path}: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TempDir(PathBuf);
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn temp_root() -> (TempDir, PathBuf) {
        let base = std::env::temp_dir().join(format!("codecity-files-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(base.join("project/src")).unwrap();
        std::fs::create_dir_all(base.join("project/.git")).unwrap();
        std::fs::create_dir_all(base.join("outside")).unwrap();
        std::fs::write(base.join("project/src/a.ts"), "a").unwrap();
        std::fs::write(base.join("outside/secret"), "s").unwrap();
        let root = base.join("project").canonicalize().unwrap();
        (TempDir(base), root)
    }

    #[test]
    fn inside_root_is_allowed() {
        let (_guard, root) = temp_root();
        assert_eq!(resolve_in_root(&root, "src/a.ts").unwrap(), root.join("src/a.ts"));
        assert_eq!(resolve_in_root(&root, "./src/a.ts").unwrap(), root.join("src/a.ts"));
        // Not existing yet (create / rename target).
        assert_eq!(
            resolve_in_root(&root, "new/dir/b.ts").unwrap(),
            root.join("new/dir/b.ts")
        );
    }

    #[test]
    fn parent_and_absolute_paths_are_rejected() {
        let (_guard, root) = temp_root();
        assert!(resolve_in_root(&root, "../outside/secret").is_err());
        assert!(resolve_in_root(&root, "src/../../outside/secret").is_err());
        assert!(resolve_in_root(&root, "/etc/passwd").is_err());
        assert!(resolve_in_root(&root, "").is_err());
        assert!(resolve_in_root(&root, ".").is_err());
    }

    #[test]
    fn git_dir_is_rejected() {
        let (_guard, root) = temp_root();
        assert!(resolve_in_root(&root, ".git/config").is_err());
        assert!(resolve_in_root(&root, ".git").is_err());
        assert!(resolve_in_root(&root, "src/.GIT/hooks/x").is_err());
    }

    #[cfg(unix)]
    #[test]
    fn symlink_escapes_are_rejected() {
        let (guard, root) = temp_root();
        let outside = guard.0.join("outside");
        std::os::unix::fs::symlink(outside.join("secret"), root.join("link")).unwrap();
        std::os::unix::fs::symlink(&outside, root.join("linkdir")).unwrap();
        std::os::unix::fs::symlink(root.join(".git"), root.join("gitlink")).unwrap();
        assert!(resolve_in_root(&root, "link").is_err());
        assert!(resolve_in_root(&root, "linkdir/new.ts").is_err());
        assert!(resolve_in_root(&root, "gitlink/config").is_err());
        // An in-root link is fine.
        std::os::unix::fs::symlink(root.join("src/a.ts"), root.join("alias.ts")).unwrap();
        assert!(resolve_in_root(&root, "alias.ts").is_ok());
    }

    #[test]
    fn create_write_rename_round_trip() {
        let (_guard, root) = temp_root();
        create(&root, "new/b.ts", "one").unwrap();
        assert!(create(&root, "new/b.ts", "").is_err());
        write(&root, "new/b.ts", "two").unwrap();
        assert!(write(&root, "missing.ts", "x").is_err());
        assert!(write(&root, "new/b.ts", &"x".repeat(MAX_WRITE_BYTES + 1)).is_err());
        assert!(rename(&root, "new/b.ts", "src/a.ts").is_err());
        rename(&root, "new/b.ts", "moved/c.ts").unwrap();
        assert_eq!(std::fs::read_to_string(root.join("moved/c.ts")).unwrap(), "two");
    }
}
