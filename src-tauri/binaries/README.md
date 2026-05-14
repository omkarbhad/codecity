# Bundled opengrep sidecar binaries

The security-scan feature shells out to a bundled [opengrep](https://github.com/opengrep/opengrep) binary. Tauri's `externalBin: ["binaries/opengrep"]` resolver expects one file per target triple:

- `opengrep-aarch64-apple-darwin`
- `opengrep-x86_64-apple-darwin`
- `opengrep-x86_64-pc-windows-msvc.exe`
- `opengrep-x86_64-unknown-linux-gnu`

## Local dev (macOS Apple Silicon)

If you installed opengrep via the official script (`curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | sh`), copy it in place:

```bash
cp ~/.opengrep/cli/latest/opengrep \
   src-tauri/binaries/opengrep-aarch64-apple-darwin
chmod +x src-tauri/binaries/opengrep-aarch64-apple-darwin
```

## Release packaging

CI fetches all four binaries from the opengrep GitHub Releases page and drops them here before `tauri build`. The files are not committed; only `.gitkeep` and this README live in git.

## License

opengrep is LGPL-2.1. We invoke it as a separate process (sidecar) so the LGPL boundary is respected. The license text ships with the installer at `licenses/LICENSE.opengrep` (see `bundle.resources` in `tauri.conf.json`).
