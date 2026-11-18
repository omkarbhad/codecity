# Bundled opengrep sidecar binaries

The security-scan feature shells out to a bundled [opengrep](https://github.com/opengrep/opengrep) binary. Tauri's `externalBin: ["binaries/opengrep"]` resolver expects one file per target triple:

- `opengrep-aarch64-apple-darwin`
- `opengrep-x86_64-apple-darwin`
- `opengrep-x86_64-pc-windows-msvc.exe`

On Windows opengrep also needs its DLLs next to it. Put them in `binaries/windows-dlls/`; `tauri.windows.conf.json` ships them beside the program.

## Local dev (macOS Apple Silicon)

If you installed opengrep via the official script (`curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | sh`), copy it in place:

```bash
cp ~/.opengrep/cli/latest/opengrep \
   src-tauri/binaries/opengrep-aarch64-apple-darwin
chmod +x src-tauri/binaries/opengrep-aarch64-apple-darwin
```

## Release packaging

The release workflow (`.github/workflows/release.yml`) downloads the pinned opengrep release for each target, checks its SHA-256, and drops it here before `tauri build`. To move to a newer opengrep, change `OPENGREP_VERSION` and the checksums in the workflow matrix. The files are not committed; only `.gitkeep` and this README live in git.

## License

opengrep is LGPL-2.1. We invoke it as a separate process (sidecar) so the LGPL boundary is respected. The license text ships with the installer at `licenses/LICENSE.opengrep` (see `bundle.resources` in `tauri.conf.json`).
