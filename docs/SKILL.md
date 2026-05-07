---
name: codecity-mcp
description: "Query a code-graph snapshot of a repo through 9 MCP tools (overview, hubs, entry_points, explain, find_callers, find_callees, find_path, get_source, community, search_symbols, recent_changes). Use when the user asks structural/architectural questions about a codebase ('how does X work?', 'what depends on Y?', 'is it safe to refactor Z?'). Cheaper than reading files directly — same data shape graphify uses."
trigger: codecity-mcp
---

# codecity-mcp

A stdio MCP server exposing a `CitySnapshot` (files + symbol graph + Louvain communities) to LLM agents. Tools are graphify-style primitives the agent **composes** — there's no single "answer my question" endpoint. Same architectural metaphor: hubs, entry points, communities.

## When to use this

Reach for codecity-mcp when the user's question is about **structure**, not a specific known file:

- "What does this codebase do?" / "Walk me through it"
- "Is it safe to delete / refactor / change `X`?"
- "How does authentication work here?" / "Trace the request path"
- "Where should I add this new feature?"
- "What's tightly coupled?" / "What's load-bearing?"
- "Why did changing `A` break `B`?"

Don't use it for: small/known-shape questions (one file the user named), syntax/style questions, questions about a single function the user already pasted.

## Bootstrap

If `codecity-mcp` is not already attached as an MCP server in this session, the user needs to add it. Suggest one of:

```bash
# Live analysis on the user's current repo (~2-15s startup, depending on size)
claude mcp add codecity ~/Workspace/Code/codecity/target/release/codecity-mcp -- --repo /path/to/repo

# Or against a pre-baked snapshot (instant startup, frozen view)
claude mcp add codecity ~/Workspace/Code/codecity/target/release/codecity-mcp -- --snapshot /tmp/snap.json --source-root /path/to/repo
```

Pass `--no-gitskip` after `--repo` if the user wants vendored/generated code analyzed too. By default codecity respects `.gitignore`.

If the binary doesn't exist, build it once: `cargo build -p codecity-mcp --release` from the codecity repo root.

## Tools

| Tool | When to call it |
|---|---|
| `overview` | First call when entering an unfamiliar repo. Stats + top-level languages. |
| `entry_points` | Files nothing imports — top of the call/import tree. |
| `hubs` | Most-imported files — load-bearing utilities. |
| `explain` | One file or symbol + its callers/callees/community siblings. |
| `find_callers` | "Who depends on this?" — blast radius before a change. |
| `find_callees` | "What does this depend on?" — read order for understanding. |
| `find_path` | Connectivity between two nodes (directed by default; tagged with `calls`/`imports` per step). |
| `community` | Members + cross-boundary edges of one Louvain cluster. Treat a subsystem as a unit. |
| `search_symbols` | Discover names by substring or token (matches `_`, `-`, `.`, camelCase boundaries). Run this **before** `explain` when you don't know the exact name. |
| `recent_changes` | git-log + snapshot intersection — "what's hot AND load-bearing?". Requires `--repo` mode or `--source-root`. |
| `get_source` | Read the actual file/symbol body. Use after `explain` when you need to see the code. |

### Resolution rules

Tool args that say "name" accept any of:
- A file path (`crates/foo/src/bar.rs`)
- A unique bare symbol name (`from_path`)
- A fully-qualified node id (`crates/foo/src/bar.rs::fn::from_path`)

Ambiguous bare names return a `candidates` list — pick a specific id from it and retry. Don't guess.

### Output shape

All tools return `structuredContent` (typed JSON). Node references look like:
```json
{
  "id": "crates/foo/src/bar.rs::fn::parse",
  "label": "parse()",
  "kind": "function",          // file | function | class | type
  "file_path": "crates/foo/src/bar.rs",
  "in_degree": 17,
  "out_degree": 4,
  "community": 42
}
```

For file-kind nodes, `in_degree`/`out_degree` are the **file-pair rollup** (every cross-file call counted once between two files), not the symbol-graph adjacency. That's why a hub like `app.rs` shows `in_degree: 1799` even though no file literally imports it 1799 times — it's "1799 distinct files have at least one symbol calling into app.rs."

## Playbooks

How to compose tools for common questions. Always start with `overview` if you haven't yet — it's cheap and orients the rest.

### "What does this codebase do?"
1. `overview` — language mix, file count, network density
2. `entry_points limit=8` — production entry points (filter out `*test*`, `*spec*`, `*_env.py` benchmark files mentally)
3. For the top 1-2 entry points: `explain <path>` — one-shot context on each
4. `hubs limit=5` — what everything else leans on

Synthesize: name the dominant language, top entry, top 2-3 hubs, observation about the architecture (monolith / monorepo / multi-app).

### "Is it safe to refactor / delete `X`?"
1. `find_callers X limit=50` — every caller, ranked by degree
2. If callers are dense and high-degree: warn the user about blast radius. Show the top 5.
3. If callers are sparse or test-only: it's relatively safe. Name the few real callers.
4. Optional: `explain X` — confirms what `X` does so you don't accidentally suggest deleting something load-bearing.

### "How does authentication work here?" (substring discovery)
1. `search_symbols auth limit=15` — discover entry points
2. Pick the most likely candidate (highest degree, name like `authenticate`/`login`/`session`/`auth_handler`)
3. `find_path login → session_create` (or similar guessed pair) to trace the flow
4. `explain` each interesting node along the path
5. `get_source` on key functions for actual logic

### "Why did changing `A` break `B`?"
1. `find_path from=A to=B directed=true` — does A actually reach B?
2. If yes: read each step's edge kind (`calls` vs `imports`). A direct `calls` chain is the likely path; `imports` chains usually break less surprisingly.
3. If no path: the break is via shared state, framework hooks, or the test harness — not a direct dependency.

### "Where should I add this new feature?"
1. `search_symbols` for an existing similar feature
2. `community member_or_id=<that_file>` — the cluster it lives in is the architectural neighborhood
3. `entry_points` and `hubs` — confirm new code shouldn't BE an entry point or a hub unless intended
4. Suggest adding the new file in the same directory + community

### "What's the architecture?"
1. `overview`
2. `hubs limit=10` + `entry_points limit=10`
3. For each top-3 hub: `community member_or_id=<hub_path>` — gives the subsystems
4. Synthesize: "There are N subsystems: A (centered on X), B (centered on Y), …"

### "What's recently changed and important?"
1. `recent_changes days=14 limit=20`
2. Filter mentally for `in_snapshot: true` AND `degree > 50` — that's the intersection of "team is working on it" and "structurally load-bearing"
3. Surface those as priority files to read or ask about

## Anti-patterns

- **Don't `Read` 50 files** to understand a codebase you can `overview` + `explain` in 4 calls. Use codecity-mcp first; reach for `Read` only on specific source you've identified as relevant.
- **Don't grep for callers** if codecity-mcp is attached. `find_callers` is precise where grep has false positives.
- **Don't trust degree numbers from `network.nodes`** for file kinds — those are the symbol-graph numbers, not the file-pair rollup. The MCP tools return the rolled-up version automatically; don't go around them.
- **Don't ignore the `community` field on every node ref**. When two nodes share a community, they're probably part of the same subsystem — that's signal worth using.

## Known limitations (as of 2026-05-07)

- **Cross-language false positives** (`#cross-lang-call-fp`): bare-name resolution can link Kotlin extension methods to TypeScript call sites that share a method name. If `find_callers` on a Kotlin file lists TypeScript files, treat those as suspicious. Real polyglot calls (FFI, JNI, JSI) are rare; cross-tree language jumps in `find_callers` results are usually noise.
- **`get_source` requires source-root**. If the server was launched with `--snapshot` and no `--source-root`, the tool returns "no source root configured." Suggest the user relaunch with `--source-root <path>` or `--repo <path>`.
- **Snapshot mode is frozen.** `--snapshot` mode reflects the file state at snapshot time. If the user has edited files since, point them at `--repo` mode for a live view.

## Reference

- Tool source: `crates/codecity-mcp/src/server.rs`
- Query implementations: `crates/codecity-mcp/src/query.rs`
- Snapshot loader (`--snapshot` / `--repo` / cache): `crates/codecity-mcp/src/loader.rs`
- Snapshot data model: `docs/schemas/network.yaml`, `docs/schemas/city.yaml`
