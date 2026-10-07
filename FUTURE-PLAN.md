# Future Plan — RAG Engine for Code

> **Vision:** Turn codecity into a local-first RAG engine for codebases — semantic search powered by symbol-level embeddings, structural retrieval powered by a real AST call graph, fused and reranked for grounded answers with `file:line` citations.

## Positioning

| Generic RAG | RAG for code (codecity) |
|---|---|
| Chunks of prose | Symbols, files, call subgraphs |
| Embeddings only | Embeddings + AST graph |
| Citations as page numbers | Citations as `file.rs:42-89` |
| "What does this doc say?" | "Where is X defined / used / called?" |
| Recall on text | Recall on structure + text |

**One-sentence pitch:** *A local-first RAG engine for codebases — semantic search powered by symbol-level embeddings, structural retrieval powered by a real AST call graph, fused and reranked for grounded answers with `file:line` citations.*

## Why this is defensible

Most "Graph RAG" systems (Microsoft GraphRAG, LightRAG) build the graph **from prose** via LLM entity extraction — expensive, lossy, non-deterministic. Codecity starts from a **deterministic AST graph** — edges are facts (imports, calls, references), not LLM guesses. Combined with vector embeddings, this is rare: most code search tools pick one axis. Sourcegraph does both, but it's a $$$ enterprise product, not an open desktop tool with a 3D city view.

## Current state (what's already done)

- ✅ Graph construction — `codecity-core` parses 40+ languages via tree-sitter, builds symbol/file/reference graph
- ✅ Community detection — Louvain clustering already groups related code
- ✅ Persistence — SQLite snapshot, deterministic, reproducible
- ✅ Multi-hop traversal — `find_path`, `find_callers`, `find_callees`
- ✅ Centrality / hubs — already computed
- ✅ LLM-consumable interface — MCP server with 11 tools
- ✅ Source retrieval — `get_source` returns actual code by node

Roughly **60% of a niche RAG engine for code already exists.**

## What's missing

In rough order of effort:

1. **Embeddings on nodes** — embed each symbol's source + leading docstring, store vectors next to the SQLite snapshot
2. **Hybrid retrieve** — vector search → expand via 1-2 graph hops → fuse
3. **Reranker** — cross-encoder rescore on (query, code_chunk) pairs
4. **`answer` MCP tool** — closes the loop: retrieve + cite, in one call
5. **Citation contract** — every answer includes `file:line` ranges
6. **Eval harness** — golden Q/A set, faithfulness measurement, CI gate

## Architectural decision (lock this in first)

**New crate `codecity-rag` that depends on `codecity-core`, consumed by both `src-tauri` and `codecity-mcp`.**

Rationale:
- Desktop app gets a "search/ask" panel
- MCP agents (Claude Code, Cursor) get an `answer` tool
- Both share one retrieval pipeline
- `codecity-core` stays pure — no embedding deps in the parser path

```
codecity-core (parser, graph, SQLite snapshot)
        ▲
        │
codecity-rag (embeddings, retrieval, fusion, rerank)
        ▲
        ├─ src-tauri (UI: search/ask panel)
        └─ codecity-mcp (LLM agent tool: `answer`)
```

## Key design decisions

### 1. Chunk granularity: symbol-level

Three natural granularities: file, symbol (function/class), community (cluster).

**Pick:** symbol-level as the primary unit, with the community as a retrievable "context expansion."

Why: files are too coarse; 500-token windows throw away the structural advantage. Symbol-level keeps citations clean (`file.rs:42-89`) and matches how developers think.

### 2. Embeddings: local-first

| Option | Pros | Cons |
|---|---|---|
| **Local** (BGE-small or nomic-embed, ~130MB) | Preserves offline desktop story, no API key, runs on CPU | Slightly worse quality, ~5min to embed a 10k-symbol repo |
| **API** (OpenAI / Voyage) | Better quality, faster | Kills the open desktop pitch, adds key management |

**Pick:** local. A Tauri desktop app that needs an API key to be useful is a worse product than one that just works.

### 3. Fusion: Reciprocal Rank Fusion (RRF)

Boring-but-correct. Don't invent a custom blender on v1.

### 4. Storage: sqlite-vec extension

Keeps the single-file snapshot story. No new infrastructure dependency. Vectors live next to the existing graph in SQLite.

### 5. Retrievers on v1: vector + graph only

**Don't** build BM25 in v1. Add in v2 if eval shows it helps. Three retrievers + reranker is too many moving parts to debug at once. Vector + graph + reranker is already hybrid.

## Phased roadmap (~4 weeks)

### Phase 1 — Vector index (1 week)
- New `codecity-rag` crate
- Symbol-level chunking from existing parser output
- Local embedding model (BGE-small via candle or fastembed-rs)
- sqlite-vec integration alongside snapshot
- CLI: `codecity-cli index <repo>` produces snapshot + vector index
- **Deliverable:** `search` query returns top-k symbols by vector similarity with `file:line`

### Phase 2 — Graph retrieval as first-class retriever (3 days)
- Wrap existing `find_callers / callees / path / community` as a retriever interface
- Given a seed set (from vector search), return ranked subgraphs via 1-2 hop expansion
- **Deliverable:** Graph retriever returns ranked nodes given a seed set

### Phase 3 — Fusion + reranker (5 days)
- RRF fusion of vector + graph candidates
- Cross-encoder reranker (bge-reranker-v2-m3 local, or Cohere Rerank API fallback)
- Rerank fused candidate set as (query, code_chunk) pairs
- **Deliverable:** Hybrid retrieve+rerank pipeline callable from Rust

### Phase 4 — `answer` MCP tool + eval harness (1 week)
- New MCP tool: query → embed → vector ∪ graph expansion → fuse → rerank → return top N with citations
- Generation stays on the client LLM (codecity returns retrieved evidence, not generated text)
- Eval harness: 50-100 golden Q/A pairs over a known repo
- Measure faithfulness (Ragas) + retrieval recall@k
- Wire to CI: every PR runs eval, build fails if quality drops below threshold
- **Deliverable:** Shippable RAG engine with measured quality

## Build the eval harness in week 1, not week 4

Without it you can't tell if the reranker is helping or hurting. Start with 20 hand-written questions over a known repo. Grow from there.

## What this changes about existing docs

Once the RAG framing lands, these need updating:

- **README.md** — lead with "RAG engine for code," not "code visualization"
- **docs/ARCHITECTURE.md** — the 3D city becomes a *feature* (visual debugger for the retrieval graph), not the *product*
- **docs/SKILL.md** — MCP server becomes the delivery mechanism for the RAG engine; document the `answer` tool

## What this is NOT

- ❌ Not "Graph RAG" in the Microsoft GraphRAG sense (no LLM entity extraction from prose)
- ❌ Not a generation engine (generation happens on the client LLM with retrieved evidence)
- ❌ Not cloud-dependent (local-first is the differentiator)
- ❌ Not a Sourcegraph clone (no team/enterprise indexing service — just a desktop+MCP tool)

## Open questions

- Embedding model: BGE-small vs nomic-embed-text vs Voyage's code-specific model — needs a quick eval bake-off in Phase 1
- Reranker: local bge-reranker vs Cohere Rerank API — leaning local for the offline story
- Caching: how do we invalidate the vector index when files change? Probably hash-based per-symbol, recompute only changed symbols on `analyze.refresh`
- Multi-repo: v1 is single-repo per snapshot. Multi-repo workspaces is v2

## Next step

`/gsd-plan-phase` for Phase 1 (vector index + symbol-chunking + sqlite-vec). That's the foundation everything else attaches to.
