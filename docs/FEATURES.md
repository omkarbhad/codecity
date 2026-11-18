# Features

What CodeCity does today, grouped the way the app is laid out. Items marked
**Beta** work but are still being improved.

## See the shape of a codebase

- **3D city.** Every file is a building. Height is its line count, and the footprint grows with its functions and its height. Folders are districts, with streets between them.
- **2D map.** The same city from above, as a flat map of districts and files, with a minimap.
- **Three ways to group files.** By folder, by file type, or by clusters of files that import each other.
- **Five colour modes.** Dependencies, complexity, unused exports, file size and type count. Keys `1` to `5` switch between them.
- **Light and dark themes.** Daylight and dusk versions of the same city.

## Discover how files connect

- **Network view.** Files and their functions as a graph of imports and calls. The more connected a file is, the larger its dot, and the best-connected files are labelled.
- **Entry points, hubs and clusters.** Lists of the files nothing imports, the files most others import, and the groups that import each other. Picking one zooms to it.
- **Trace.** From an entry point, highlight everything it reaches, to a chosen depth.
- **Dependencies of one file.** Select a building to see what it imports and what imports it, drawn as arcs in the city and listed in the file panel.

## Read and edit the files

- **File panel.** For the selected file: lines, functions and complexity, then lists of its functions, types, imports, the files that use it and the packages it needs.
- **Built-in file viewer and editor.** Open any file in a tab beside the city, with syntax highlighting for 40+ languages. Markdown opens as a preview. Jump straight to a function.
- **Edit local projects.** Save, create, rename and delete files in projects opened from a folder. Deleted files go to the system Trash.
- **Explorer.** A file tree with search, per-file and per-folder hide switches, and a filter by file type.

## Watch coding agents work (Beta)

- **Agent mode.** Shows which coding agents (Claude Code, Codex) are working in the project and which file each one is on.
- **Builders in the city.** A small builder works on the roof of the file the agent is editing and jumps to the next one. Edited buildings get scaffolding in the agent's colour.
- **Edited and uncommitted.** A list of the files each agent edited, with a mark on the ones that are not committed yet, plus other uncommitted changes.
- **Private by design.** Read from the session logs the agents keep on your computer and from git. Nothing is sent anywhere.

## Find problems

- **Security scan (Beta).** Runs opengrep rules over the project and lists findings by severity, with the file and line.
- **Complexity and unused code.** Colour the city by complexity or by exports nothing imports, to see where to look first.

## Bring in a project

- **Local folders and GitHub repositories.** Open a folder, or paste a repository URL. Sign in with GitHub's device flow to list your own repositories.
- **A dashboard of cities.** Every project you have analysed, as a live preview you click to open. Progress is shown while a city is being built.
- **Commit history.** For GitHub projects, a timeline of commits and the files each one touched.
- **40+ languages.** Parsed with tree-sitter grammars.

## For terminals and agents

- **Command line.** `codecity-cli` analyses a project and writes the full snapshot as JSON, or prints its network of entry points, hubs and communities.
- **MCP server.** `codecity-mcp` gives an LLM agent the same snapshot over MCP, with tools to find callers, callees and paths between files.

## Built to stay on your machine

- **Runs locally.** Analysis happens on your computer. No account is needed for local folders or public repositories.
- **Open source.** MIT licensed.
- **macOS, Windows and Linux.** A desktop app with verified updates.
