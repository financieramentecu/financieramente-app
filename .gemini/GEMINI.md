# Engram

**Persistent memory for AI coding agents**

> _Engram_ is a neuroscience term for the physical trace of a memory in the brain.

## What is Engram?

An agent-agnostic persistent memory system. A Go binary with SQLite + FTS5 full-text search, exposed via CLI, HTTP API, and MCP server. Thin adapter plugins connect it to specific agents (OpenCode, Claude Code, Cursor, Windsurf, etc.).

**Why Go?** Single binary, cross-platform, no runtime dependencies. Uses `modernc.org/sqlite` (pure Go, no CGO).

- **Module**: `github.com/alanbuscaglia/engram`
- **Version**: 0.1.0

---

## Architecture

The Go binary is the brain. Thin adapter plugins per-agent talk to it via HTTP or MCP stdio.

```
Agent (OpenCode/Claude Code/Cursor/etc.)
    ↓ (plugin or MCP)
Engram Go Binary
    ↓
SQLite + FTS5 (~/.engram/engram.db)
```

Six interfaces:

1. **CLI** — Direct terminal usage (`engram search`, `engram save`, etc.)
2. **HTTP API** — REST API on port 7437 for plugins and integrations
3. **MCP Server** — stdio transport for any MCP-compatible agent
4. **TUI** — Interactive terminal UI for browsing memories (`engram tui`)
5. **Cloud Server** — Postgres-backed HTTP API for multi-device sync (`engram cloud serve`)
6. **Cloud Dashboard** — Server-rendered web UI for browsing knowledge in the browser (`/dashboard/`)

---

## Project Structure

```
engram/
├── cmd/engram/main.go              # CLI entrypoint — all commands
├── internal/
│   ├── store/store.go              # Core: SQLite + FTS5 + all data operations
│   ├── server/server.go            # HTTP REST API server (port 7437)
│   ├── mcp/mcp.go                  # MCP stdio server (13 tools)
│   ├── sync/sync.go                # Git sync: manifest + chunks (gzipped JSONL)
│   ├── cloud/                      # Cloud sync subsystem (Postgres backend)
│   │   ├── config.go               # Shared Config struct + ConfigFromEnv()
│   │   ├── cloudstore/             # Postgres storage (schema, CRUD, FTS via tsvector, project controls)
│   │   │   ├── cloudstore.go       # CloudStore struct, user/session/observation/chunk ops
│   │   │   ├── project_controls.go # Org-managed per-project sync pause/resume policy
│   │   │   ├── schema.go           # DDL for all cloud_* tables
│   │   │   └── search.go           # Full-text search (ts_rank_cd + plainto_tsquery)
│   │   ├── auth/                   # JWT + API key authentication
│   │   │   ├── auth.go             # Service, token generation/validation, register/login
│   │   │   └── apikey.go           # eng_-prefixed API key generation + SHA-256 validation
│   │   ├── cloudserver/            # HTTP API for cloud mode
│   │   │   ├── cloudserver.go      # Route registration, health, auth, search, context
│   │   │   ├── middleware.go       # JWT/API key auth middleware
│   │   │   └── push_pull.go        # Chunk + mutation push/pull handlers
│   │   ├── dashboard/              # Embedded web dashboard (templ + htmx, zero JS build)
│   │   │   ├── dashboard.go        # Mount(), handlers, admin guard
│   │   │   ├── middleware.go       # Cookie-based auth (JWT in HTTP-only cookie)
│   │   │   ├── config.go           # DashboardConfig (AdminEmail)
│   │   │   ├── helpers.go          # Truncation, badge variant helpers
│   │   │   ├── embed.go            # go:embed static assets (htmx, CSS)
│   │   │   ├── *.templ             # templ templates (login, layout, components)
│   │   │   ├── *_templ.go          # Generated Go from templ (checked in)
│   │   │   └── static/             # htmx.min.js, pico.min.css, styles.css
│   │   ├── autosync/               # Background auto-sync manager
│   │   │   └── manager.go          # Lease-guarded push/pull worker with backoff
│   │   └── remote/                 # Remote sync transport (HTTP client)
│   │       └── transport.go        # RemoteTransport: push/pull + mutation push/pull via HTTP
│   └── tui/                        # Bubbletea terminal UI
│       ├── model.go                # Screen constants, Model struct, Init(), custom messages
│       ├── styles.go               # Lipgloss styles (Catppuccin Mocha palette)
│       ├── update.go               # Update(), handleKeyPress(), per-screen handlers
│       └── view.go                 # View(), per-screen renderers
├── docker-compose.yml              # Postgres 16-alpine for local cloud dev/testing
├── skills/
│   └── gentleman-bubbletea/
│       └── SKILL.md                # Bubbletea TUI patterns reference
├── DOCS.md
├── go.mod
├── go.sum
└── .gitignore
```

---

## Database Schema

### Tables

- **sessions** — `id` (TEXT PK), `project`, `directory`, `started_at`, `ended_at`, `summary`, `status`
- **observations** — `id` (INTEGER PK AUTOINCREMENT), `session_id` (FK), `type`, `title`, `content`, `tool_name`, `project`, `scope`, `topic_key`, `normalized_hash`, `revision_count`, `duplicate_count`, `last_seen_at`, `created_at`, `updated_at`, `deleted_at`
- **observations_fts** — FTS5 virtual table synced via triggers (`title`, `content`, `tool_name`, `type`, `project`)
- **user_prompts** — `id` (INTEGER PK AUTOINCREMENT), `session_id` (FK), `content`, `project`, `created_at`
- **prompts_fts** — FTS5 virtual table synced via triggers (`content`, `project`)
- **sync_chunks** — `chunk_id` (TEXT PK), `imported_at` — tracks which chunks have been imported to prevent duplicates
- **sync_state** — `target_key` (TEXT PK), `lifecycle`, `last_enqueued_seq`, `last_acked_seq`, `last_pulled_seq`, `consecutive_failures`, `backoff_until`, `lease_owner`, `lease_until`, `last_error`, `updated_at` — tracks auto-sync coordination (cursors, lease, backoff)
- **sync_mutations** — `seq` (INTEGER PK AUTOINCREMENT), `entity`, `entity_key`, `op`, `payload` (JSON), `project` (TEXT), `occurred_at`, `acked_at` — append-only mutation journal for reliable cloud replication. The `project` column is populated at enqueue time from the entity payload.
- **sync_enrolled_projects** — `project` (TEXT PK), `enrolled_at` — tracks which projects are enrolled for cloud sync. Only mutations belonging to enrolled projects are pushed to the cloud.
- **cloud_project_controls** — organization-managed sync policy table with `project`, `sync_enabled`, `paused_reason`, `updated_by`, and `updated_at`. Lets admins pause or resume cloud sync per project without changing local enrollment.

### SQLite Configuration

- WAL mode for concurrent reads
- Busy timeout 5000ms
- Synchronous NORMAL
- Foreign keys ON

---

## CLI Commands

```
engram serve [port]       Start HTTP API server (default: 7437)
engram mcp                Start MCP server (stdio transport)
engram tui                Launch interactive terminal UI
engram search <query>     Search memories [--type TYPE] [--project PROJECT] [--scope SCOPE] [--limit N]
                            [--remote URL] [--token TOKEN]  Query cloud server instead of local DB
engram save <title> <msg> Save a memory [--type TYPE] [--project PROJECT] [--scope SCOPE] [--topic TOPIC_KEY]
engram timeline <obs_id>  Show chronological context around an observation [--before N] [--after N]
engram context [project]  Show recent context from previous sessions
                            [--remote URL] [--token TOKEN]  Query cloud server instead of local DB
engram stats              Show memory system statistics
engram export [file]      Export all memories to JSON (default: engram-export.json)
engram import <file>      Import memories from a JSON export file
engram sync               Export new memories as chunk [--import] [--status] [--project NAME] [--all]
engram cloud serve        Start cloud server (Postgres backend)
                            --port PORT          HTTP port (default: 8080)
                            --database-url URL   Postgres DSN (or ENGRAM_DATABASE_URL env)
engram cloud register     Register a new cloud account (--server URL required)
engram cloud login        Login to an existing cloud account (--server URL required)
engram cloud sync         Sync local mutations to cloud (push + pull)
                            --legacy   Use legacy chunk-based sync (deprecated)
engram cloud sync-status  Show local sync journal state (pending mutations, degraded state)
engram cloud status       Show cloud sync status (local vs remote chunks, legacy)
engram cloud api-key      Generate a new API key for the cloud server
engram cloud enroll <p>   Enroll a project for cloud sync (only enrolled projects are pushed)
engram cloud unenroll <p> Unenroll a project from cloud sync
engram cloud projects     List projects currently enrolled for cloud sync
engram version            Print version
engram help               Show help
```

### Environment Variables

| Variable                    | Description                                                          | Default                                                                    |
| --------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `ENGRAM_DATA_DIR`           | Override data directory                                              | `~/.engram`                                                                |
| `ENGRAM_PORT`               | Override HTTP server port                                            | `7437`                                                                     |
| `ENGRAM_REMOTE_URL`         | Cloud server URL for `--remote` flag                                 | (none)                                                                     |
| `ENGRAM_TOKEN`              | Cloud auth token for `--token` flag                                  | (none)                                                                     |
| `ENGRAM_DATABASE_URL`       | Postgres DSN for `engram cloud serve` (preferred)                    | (none)                                                                     |
| `ENGRAM_JWT_SECRET`         | JWT signing secret for `engram cloud serve` (preferred, >= 32 chars) | (none)                                                                     |
| `ENGRAM_CLOUD_DSN`          | Legacy alias for `ENGRAM_DATABASE_URL`                               | `postgres://engram:engram_dev@localhost:5433/engram_cloud?sslmode=disable` |
| `ENGRAM_CLOUD_JWT_SECRET`   | Legacy alias for `ENGRAM_JWT_SECRET`                                 | (none)                                                                     |
| `ENGRAM_CLOUD_CORS_ORIGINS` | Comma-separated CORS origins                                         | `*`                                                                        |
| `ENGRAM_CLOUD_MAX_POOL`     | Max Postgres connection pool size                                    | `10`                                                                       |

---

## Terminal UI (TUI)

Interactive Bubbletea-based terminal UI. Launch with `engram tui`.

Built with [Bubbletea](https://github.com/charmbracelet/bubbletea) v1, [Lipgloss](https://github.com/charmbracelet/lipgloss), and [Bubbles](https://github.com/charmbracelet/bubbles) components. Follows the Gentleman Bubbletea skill patterns.

### Screens

| Screen                  | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| **Dashboard**           | Stats overview (sessions, observations, prompts, projects) + menu |
| **Search**              | FTS5 text search with text input                                  |
| **Search Results**      | Browsable results list from search                                |
| **Recent Observations** | Browse all observations, newest first                             |
| **Observation Detail**  | Full content of a single observation, scrollable                  |
| **Timeline**            | Chronological context around an observation (before/after)        |
| **Sessions**            | Browse all sessions                                               |
| **Session Detail**      | Observations within a specific session                            |

### Navigation

- `j/k` or `↑/↓` — Navigate lists
- `Enter` — Select / drill into detail
- `t` — View timeline for selected observation
- `s` or `/` — Quick search from any screen
- `Esc` or `q` — Go back / quit
- `Ctrl+C` — Force quit

### Visual Features

- **Catppuccin Mocha** color palette
- **`(active)` badge** — shown next to sessions and observations from active (non-completed) sessions, sorted to the top of every list
- **Scroll indicators** — shows position in long lists (e.g. "showing 1-20 of 50")
- **2-line items** — each observation shows title + content preview

### Architecture (Gentleman Bubbletea patterns)

- `model.go` — Screen constants as `Screen int` iota, single `Model` struct holds ALL state
- `styles.go` — Lipgloss styles organized by concern (layout, dashboard, list, detail, timeline, search)
- `update.go` — `Update()` with type switch, `handleKeyPress()` routes to per-screen handlers, each returns `(tea.Model, tea.Cmd)`
- `view.go` — `View()` routes to per-screen renderers, shared `renderObservationListItem()` for consistent list formatting

### Store Methods (TUI-specific)

The TUI uses dedicated store methods that don't filter by session status (unlike `RecentSessions`/`RecentObservations` which only show completed sessions for MCP context injection):

- `AllSessions()` — All sessions regardless of status, active sorted first
- `AllObservations()` — All observations regardless of session status, active sorted first
- `SessionObservations(sessionID)` — All observations for a specific session, chronological order

---

## HTTP API Endpoints

All endpoints return JSON. Server listens on `127.0.0.1:7437`.

### Health

- `GET /health` — Returns `{"status": "ok", "service": "engram", "version": "0.1.0"}`

### Sessions

- `POST /sessions` — Create session. Body: `{id, project, directory}`
- `POST /sessions/{id}/end` — End session. Body: `{summary}`
- `GET /sessions/recent` — Recent sessions. Query: `?project=X&limit=N`

### Observations

- `POST /observations` — Add observation. Body: `{session_id, type, title, content, tool_name?, project?, scope?, topic_key?}`
- `GET /observations/recent` — Recent observations. Query: `?project=X&scope=project|personal&limit=N`
- `GET /observations/{id}` — Get single observation by ID
- `PATCH /observations/{id}` — Update fields. Body: `{title?, content?, type?, project?, scope?, topic_key?}`
- `DELETE /observations/{id}` — Delete observation (`?hard=true` for hard delete, soft delete by default)

### Search

- `GET /search` — FTS5 search. Query: `?q=QUERY&type=TYPE&project=PROJECT&scope=SCOPE&limit=N`

### Timeline

- `GET /timeline` — Chronological context. Query: `?observation_id=N&before=5&after=5`

### Prompts

- `POST /prompts` — Save user prompt. Body: `{session_id, content, project?}`
- `GET /prompts/recent` — Recent prompts. Query: `?project=X&limit=N`
- `GET /prompts/search` — Search prompts. Query: `?q=QUERY&project=X&limit=N`

### Context

- `GET /context` — Formatted context. Query: `?project=X&scope=project|personal`

### Export / Import

- `GET /export` — Export all data as JSON
- `POST /import` — Import data from JSON. Body: ExportData JSON

### Stats

- `GET /stats` — Memory statistics

### Sync Status

- `GET /sync/status` — Background sync status. Returns `{"enabled": false, ...}` when autosync is not configured, or `{"enabled": true, "phase": "...", "last_error": "...", "consecutive_failures": N, "backoff_until": "...", "last_sync_at": "..."}` when active.

---

## MCP Tools (13 tools)

### mem_search

Search persistent memory across all sessions. Supports FTS5 full-text search with type/project/scope/limit filters.

### mem_save

Save structured observations. The tool description teaches agents the format:

- **title**: Short, searchable (e.g. "JWT auth middleware")
- **type**: `decision` | `architecture` | `bugfix` | `pattern` | `config` | `discovery` | `learning`
- **scope**: `project` (default) | `personal`
- **topic_key**: optional canonical topic id (e.g. `architecture/auth-model`) used to upsert evolving memories
- **content**: Structured with `**What**`, `**Why**`, `**Where**`, `**Learned**`

Exact duplicate saves are deduplicated in a rolling time window using a normalized content hash + project + scope + type + title.
When `topic_key` is provided, `mem_save` upserts the latest observation in the same `project + scope + topic_key`, incrementing `revision_count`.

### mem_update

Update an observation by ID. Supports partial updates for `title`, `content`, `type`, `project`, `scope`, and `topic_key`.

### mem_suggest_topic_key

Suggest a stable `topic_key` from `type + title` (or content fallback). Uses family heuristics like `architecture/*`, `bug/*`, `decision/*`, etc. Use before `mem_save` when you want evolving topics to upsert into a single observation.

### mem_delete

Delete an observation by ID. Uses soft-delete by default (`deleted_at`); optional hard-delete for permanent removal.

### mem_save_prompt

Save user prompts — records what the user asked so future sessions have context about user goals.

### mem_context

Get recent memory context from previous sessions — shows sessions, prompts, and observations, with optional scope filtering for observations.

### mem_stats

Show memory system statistics — sessions, observations, prompts, projects.

### mem_timeline

Progressive disclosure: after searching, drill into chronological context around a specific observation. Shows N observations before and after within the same session.

### mem_get_observation

Get full untruncated content of a specific observation by ID.

### mem_session_summary

Save comprehensive end-of-session summary using OpenCode-style format:

```
## Goal
## Instructions
## Discoveries
## Accomplished (✅ done, 🔲 pending)
## Relevant Files
```

### mem_session_start

Register the start of a new coding session.

### mem_session_end

Mark a session as completed with optional summary.

---

## MCP Configuration

Add to any agent's config:

```json
{
	"mcp": {
		"engram": {
			"type": "stdio",
			"command": "engram",
			"args": ["mcp"]
		}
	}
}
```

---

## Memory Protocol Full Text

The Memory Protocol teaches agents **when** and **how** to use Engram's MCP tools. Without it, the agent has the tools but no behavioral guidance. Add this to your agent's prompt file (see README for per-agent locations).

### WHEN TO SAVE (mandatory — not optional)

Call `mem_save` IMMEDIATELY after any of these:

- Bug fix completed
- Architecture or design decision made
- Non-obvious discovery about the codebase
- Configuration change or environment setup
- Pattern established (naming, structure, convention)
- User preference or constraint learned

Format for `mem_save`:

- **title**: Verb + what — short, searchable (e.g. "Fixed N+1 query in UserList", "Chose Zustand over Redux")
- **type**: `bugfix` | `decision` | `architecture` | `discovery` | `pattern` | `config` | `preference`
- **scope**: `project` (default) | `personal`
- **topic_key** (optional, recommended for evolving decisions): stable key like `architecture/auth-model`
- **content**:
  ```
  **What**: One sentence — what was done
  **Why**: What motivated it (user request, bug, performance, etc.)
  **Where**: Files or paths affected
  **Learned**: Gotchas, edge cases, things that surprised you (omit if none)
  ```

### Topic update rules (mandatory)

- Different topics must not overwrite each other (e.g. architecture vs bugfix)
- Reuse the same `topic_key` to update an evolving topic instead of creating new observations
- If unsure about the key, call `mem_suggest_topic_key` first and then reuse it
- Use `mem_update` when you have an exact observation ID to correct

### WHEN TO SEARCH MEMORY

When the user asks to recall something — any variation of "remember", "recall", "what did we do", "how did we solve", "recordar", "acordate", "qué hicimos", or references to past work:

1. First call `mem_context` — checks recent session history (fast, cheap)
2. If not found, call `mem_search` with relevant keywords (FTS5 full-text search)
3. If you find a match, use `mem_get_observation` for full untruncated content

Also search memory PROACTIVELY when:

- Starting work on something that might have been done before
- The user mentions a topic you have no context on — check if past sessions covered it

### SESSION CLOSE PROTOCOL (mandatory)

Before ending a session or saying "done" / "listo" / "that's it", you MUST call `mem_session_summary` with this structure:

```
## Goal
[What we were working on this session]

## Instructions
[User preferences or constraints discovered — skip if none]

## Discoveries
- [Technical findings, gotchas, non-obvious learnings]

## Accomplished
- [Completed items with key details]

## Next Steps
- [What remains to be done — for the next session]

## Relevant Files
- path/to/file — [what it does or what changed]
```

This is NOT optional. If you skip this, the next session starts blind.

### PASSIVE CAPTURE — automatic learning extraction

When completing a task or subtask, include a `## Key Learnings:` section at the end of your response with numbered items. Engram will automatically extract and save these as observations.

Example:

```
## Key Learnings:

1. bcrypt cost=12 is the right balance for our server performance
2. JWT refresh tokens need atomic rotation to prevent race conditions
```

You can also call `mem_capture_passive(content)` directly with any text that contains a learning section. This is a safety net — it captures knowledge even if you forget to call `mem_save` explicitly.

### AFTER COMPACTION

If you see a message about compaction or context reset, or if you see "FIRST ACTION REQUIRED" in your context:

1. IMMEDIATELY call `mem_session_summary` with the compacted summary content — this persists what was done before compaction
2. Then call `mem_context` to recover any additional context from previous sessions
3. Only THEN continue working

Do not skip step 1. Without it, everything done before compaction is lost from memory.

---

## Features

### 1. Full-Text Search (FTS5)

- Searches across title, content, tool_name, type, and project
- Query sanitization: wraps each word in quotes to avoid FTS5 syntax errors
- Supports type and project filters

### 2. Timeline (Progressive Disclosure)

Three-layer pattern for token-efficient memory retrieval:

1. `mem_search` — Find relevant observations
2. `mem_timeline` — Drill into chronological neighborhood of a result
3. `mem_get_observation` — Get full untruncated content

### 3. Privacy Tags

`<private>...</private>` content is stripped at TWO levels:

1. **Plugin layer** (TypeScript) — Strips before data leaves the process
2. **Store layer** (Go) — `stripPrivateTags()` runs inside `AddObservation()` and `AddPrompt()`

Example: `Set up API with <private>sk-abc123</private>` becomes `Set up API with [REDACTED]`

### 4. User Prompt Storage

Separate table captures what the USER asked (not just tool calls). Gives future sessions the "why" behind the "what". Full FTS5 search support.

### 5. Export / Import

Share memories across machines, backup, or migrate:

- `engram export` — JSON dump of all sessions, observations, prompts
- `engram import <file>` — Load from JSON, sessions use INSERT OR IGNORE (skip duplicates), atomic transaction

### 6. Git Sync (Chunked)

Share memories through git repositories using compressed chunks with a manifest index.

- `engram sync` — Exports new memories as a gzipped JSONL chunk to `.engram/chunks/`
- `engram sync --all` — Exports ALL memories from every project (ignores directory-based filter)
- `engram sync --import` — Imports chunks listed in the manifest that haven't been imported yet
- `engram sync --status` — Shows how many chunks exist locally vs remotely, and how many are pending import
- `engram sync --project NAME` — Filters export to a specific project

**Architecture**:

```
.engram/
├── manifest.json          ← index of all chunks (small, git-mergeable)
├── chunks/
│   ├── a3f8c1d2.jsonl.gz ← chunk 1 (gzipped JSONL)
│   ├── b7d2e4f1.jsonl.gz ← chunk 2
│   └── ...
└── engram.db              ← local working DB (gitignored)
```

**Why chunks?**

- Each `engram sync` creates a NEW chunk — old chunks are never modified
- No merge conflicts: each dev creates independent chunks, git just adds files
- Chunks are content-hashed (SHA-256 prefix) — each chunk is imported only once
- The manifest is the only file git diffs — it's small and append-only
- Compressed: a chunk with 8 sessions + 10 observations = ~2KB

**Auto-import**: The OpenCode plugin detects `.engram/manifest.json` at startup and runs `engram sync --import` to load any new chunks. Clone a repo → open OpenCode → team memories are loaded.

**Tracking**: The local DB stores a `sync_chunks` table with chunk IDs that have been imported. This prevents re-importing the same data if `sync --import` runs multiple times.

### 7. AI Compression (Agent-Driven)

Instead of a separate LLM service, the agent itself compresses observations. The agent already has the model, context, and API key.

**Two levels:**

- **Per-action** (`mem_save`): Structured summaries after each significant action

  ```
  **What**: [what was done]
  **Why**: [reasoning]
  **Where**: [files affected]
  **Learned**: [gotchas, decisions]
  ```

- **Session summary** (`mem_session_summary`): OpenCode-style comprehensive summary

  ```
  ## Goal
  ## Instructions
  ## Discoveries
  ## Accomplished
  ## Relevant Files
  ```

The OpenCode plugin injects the **Memory Protocol** via system prompt to teach agents both formats, plus strict rules about when to save and a mandatory session close protocol.

### 8. No Raw Auto-Capture (Agent-Only Memory)

The OpenCode plugin does NOT auto-capture raw tool calls. All memory comes from the agent itself:

- **`mem_save`** — Agent saves structured observations after significant work (decisions, bugfixes, patterns)
- **`mem_session_summary`** — Agent saves comprehensive end-of-session summaries

**Why?** Raw tool calls (`edit: {file: "foo.go"}`, `bash: {command: "go build"}`) are noisy and pollute FTS5 search results. The agent's curated summaries are higher signal, more searchable, and don't bloat the database. Shell history and git provide the raw audit trail.

The plugin still counts tool calls per session (for session end summary stats) but doesn't persist them as observations.

### 9. Cloud Sync

Sync memories across machines via a centralized Postgres-backed cloud server. Unlike Git Sync (which uses files committed to a repository), Cloud Sync uses an HTTP API with JWT authentication.

**Auto-Sync (default)**: Long-lived processes (`engram serve`, `engram mcp`) automatically start a background sync manager when cloud credentials are configured (`~/.engram/cloud.json`). Every local write (save observation, end session, add prompt, etc.) triggers an immediate push/pull cycle — no manual `engram cloud sync` needed.

**Architecture**:

```
Local Machine                              Cloud Server
─────────────                              ────────────
SQLite (~/.engram/engram.db)               Postgres (cloud_* tables)
    ↓ write                                     ↑
internal/store (mutation journal)          engram cloud serve
    ↓ notify                                    ↑
autosync.Manager ──── HTTP + JWT ─────→ CloudServer
  (push mutations,    (Bearer token)     (auth + store)
   pull by cursor)
```

**How it works**:

1. Every write to SQLite (insert, update, soft-delete) appends a row to the `sync_mutations` journal with a monotonic sequence number.
2. The autosync manager wakes on dirty notification (or a periodic poll) and pushes pending mutations (`last_acked_seq` → `last_enqueued_seq`).
3. After push, it pulls remote mutations since `last_pulled_seq` and applies them locally with conflict resolution.
4. On failure, the manager enters exponential backoff with jitter — local reads and writes are never blocked.

**Sync status**: The HTTP server exposes `GET /sync/status` to inspect the background sync phase, error state, and last successful sync time. The CLI command `engram cloud sync-status` shows the local mutation journal state (pending mutations, degraded state, lease info).

**Foreground sync**: `engram cloud sync` runs a single push/pull cycle using the same autosync engine (no background polling), then exits. This is useful for one-off syncs or CI scripts.

**Legacy mode**: The previous chunk-based sync protocol is preserved behind `engram cloud sync --legacy`. This flag is deprecated and will be removed in a future version.

**Project-Scoped Sync**:

By default, all mutations are eligible for cloud push. Project-scoped sync lets you control which projects sync to the cloud — only enrolled projects are pushed, while non-enrolled data stays local-only.

```bash
# Enroll a project for cloud sync
engram cloud enroll my-project

# List enrolled projects
engram cloud projects

# Unenroll a project (stops syncing, existing cloud data stays)
engram cloud unenroll my-project
```

How it works:

- Each mutation in the local journal carries the `project` field extracted from the entity payload at enqueue time.
- At push time, `ListPendingSyncMutations()` uses a SQL JOIN against `sync_enrolled_projects` to return only mutations from enrolled projects (plus empty-project mutations, which always sync).
- The autosync manager runs a skip-ack pass before each push cycle, marking non-enrolled mutations as acknowledged without sending them. This prevents journal bloat from non-enrolled project writes accumulating indefinitely.
- Enrollment/unenrollment is idempotent — enrolling an already-enrolled project is a no-op, unenrolling a non-enrolled project is a no-op.
- Enrollment is a local-only operation (stored in `sync_enrolled_projects` SQLite table). The cloud server requires zero changes.

**Cloud Server** (`engram cloud serve`):

- Postgres backend with tsvector full-text search (weighted: title A, content B, type/project C)
- JWT authentication (HMAC-SHA256, 1h access + 7d refresh tokens)
- API key authentication (`eng_`-prefixed, SHA-256 hashed in storage)
- Row-level user isolation — every query filters by `user_id`
- Mutation-based sync (push pending mutations, pull by cursor) — replaces the chunk-based protocol
- Cloud-managed project controls (`/dashboard/admin/projects`) can pause sync per project with audit metadata
- Body limit: 50 MB for push requests
- Retry logic: exponential backoff (3 retries, 500ms base) for 429/5xx errors

**Cloud Project Pause Policy**:

- Project enrollment is still local-only and controls what a client _wants_ to sync.
- Cloud project controls are organization-level policy and control what the server _allows_ to sync.
- Admins can pause or resume a project from the dashboard and store a reason for the decision.
- When a project is paused, the cloud server rejects pushes for that project and hides its mutations from pull.
- The dashboard surfaces pause state, reason, updater, and update time in both admin and project-facing views.
- Autosync now batches pushes by project so one paused project does not block unrelated project mutations in the same local queue.

**Connectivity Contract**:

Cloud mode keeps the client-side setup intentionally small:

- One reachable base URL for the server, such as `https://engram.company.internal` or `http://10.0.0.15:8080`
- One auth credential, usually the token Engram stores after `engram cloud login` or `engram cloud register`

That same base URL + token pair powers both sync and direct remote queries:

```bash
engram cloud login --server https://engram.company.internal
engram cloud sync

engram search "auth middleware" --remote https://engram.company.internal --token <token>
engram context myproject --remote https://engram.company.internal --token <token>
```

If you already ran `engram cloud login` or `engram cloud register`, Engram saves the server URL and token in `~/.engram/cloud.json`, so later `engram cloud sync` and remote CLI calls can reuse them automatically.

**Deployment / Networking Options**:

Engram does not require any specific tunnel, VPN, or ingress product. Use whatever your environment already trusts.

1. **Existing company URL** — Best production path. Run `engram cloud serve` behind your normal DNS, TLS, and load balancer or gateway, then point clients at that URL.
2. **LAN / VPN** — Good for internal teams. If each machine can already reach the host over office LAN, Tailscale, WireGuard, OpenVPN, ZeroTier, or an equivalent company VPN, just use that reachable server URL.
3. **Reverse proxy in front of `engram cloud serve`** — Recommended when you want TLS termination, standard auth controls, or path/domain routing. Engram only needs the final externally reachable base URL.

**Primary Workflow**:

```bash
# 1. Start the cloud server (needs Postgres)
docker compose up -d
export ENGRAM_DATABASE_URL="postgres://engram:engram_dev@localhost:5433/engram_cloud?sslmode=disable"
export ENGRAM_JWT_SECRET="your-secret-at-least-32-characters-long"
engram cloud serve

# 2. Register an account
engram cloud register --server http://localhost:8080

# 3. Login (if already registered)
engram cloud login --server http://localhost:8080

# 4. Auto-sync: start the local server — background sync begins automatically
engram serve
# Every mem_save, session end, etc. now pushes/pulls automatically.

# 5. Manual sync (one-off push/pull, no background process)
engram cloud sync

# 6. Check sync status
engram cloud sync-status    # local journal state (pending mutations, degraded state)
engram cloud status         # legacy chunk-based status

# 7. Generate an API key (for CI/scripts)
engram cloud api-key

# 8. Enroll projects for selective sync (optional)
engram cloud enroll my-project     # only 'my-project' mutations sync to cloud
engram cloud enroll other-project  # add more projects
engram cloud projects              # list enrolled projects
engram cloud unenroll my-project   # stop syncing 'my-project'
```

**Quick Evaluation Fallback**:

If you are just testing across machines and do not already have shared networking, expose a local `engram cloud serve` instance through any free tunnel or temporary ingress tool you trust, then use that temporary HTTPS URL as the `--server` / `--remote` value.

- Treat this as evaluation infrastructure, not a required Engram dependency
- The product contract stays the same: reachable base URL + token
- For longer-lived environments, move to your normal LAN/VPN/reverse-proxy setup

**Two-Machine Local Testing**:

For the simplest local QA, use one machine as the temporary server host and a second machine as the client:

1. On machine A, run Postgres + `engram cloud serve`.
2. Make machine A reachable from machine B using whichever is easiest in your environment: same-LAN IP, VPN address, reverse proxy hostname, or a temporary free tunnel.
3. On machine B, run `engram cloud register --server <reachable-url>` once, then `engram cloud sync`.
4. Verify remote reads with `engram search ... --remote <reachable-url>` or `engram context ... --remote <reachable-url>`.

**Cloud Config File** (`~/.engram/cloud.json`):

After `register` or `login`, credentials are saved with `0600` permissions:

```json
{
	"server_url": "http://localhost:8080",
	"token": "<jwt-access-token>",
	"refresh_token": "<jwt-refresh-token>",
	"user_id": "<uuid>",
	"username": "alan"
}
```

Remote sync now uses the saved `refresh_token` automatically when the access token expires mid-sync. On a successful refresh, Engram rewrites `cloud.json` with the new access token before retrying the failed sync request.

**docker-compose.yml** (included in the project root):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: engram_cloud
      POSTGRES_USER: engram
      POSTGRES_PASSWORD: engram_dev
    ports:
      - '5433:5432' # Port 5433 to avoid conflicts with local Postgres
    volumes:
      - engram_pg_data:/var/lib/postgresql/data
```

**Cloud HTTP API Endpoints**:

| Method   | Path                    | Auth | Description                                                |
| -------- | ----------------------- | ---- | ---------------------------------------------------------- |
| `GET`    | `/health`               | No   | Health check (`{"status":"ok","service":"engram-cloud"}`)  |
| `POST`   | `/auth/register`        | No   | Register new user (username, email, password)              |
| `POST`   | `/auth/login`           | No   | Login (username or email, password) -> JWT tokens          |
| `POST`   | `/auth/refresh`         | No   | Refresh access token                                       |
| `POST`   | `/auth/api-key`         | Yes  | Generate API key (`eng_`-prefixed)                         |
| `DELETE` | `/auth/api-key`         | Yes  | Revoke API key                                             |
| `POST`   | `/sync/mutations/push`  | Yes  | Push local mutations (array of entity/op/payload)          |
| `GET`    | `/sync/mutations/pull`  | Yes  | Pull remote mutations (`?since_seq=N&limit=M`)             |
| `POST`   | `/sync/push`            | Yes  | Push a chunk — legacy (sessions, observations, prompts)    |
| `GET`    | `/sync/pull`            | Yes  | Get chunk manifest — legacy                                |
| `GET`    | `/sync/pull/{chunk_id}` | Yes  | Download a specific chunk — legacy                         |
| `GET`    | `/sync/search`          | Yes  | Full-text search (`?q=QUERY&type=&project=&scope=&limit=`) |
| `GET`    | `/sync/context`         | Yes  | Formatted context (`?project=&scope=`)                     |

**Dashboard Routes** (browser, served from `engram cloud serve`):

| Method | Path                              | Auth         | Description                                                        |
| ------ | --------------------------------- | ------------ | ------------------------------------------------------------------ |
| `GET`  | `/dashboard/health`               | No           | Dashboard health check (`{"status":"ok","subsystem":"dashboard"}`) |
| `GET`  | `/dashboard/login`                | No           | Login page (HTML form)                                             |
| `POST` | `/dashboard/login`                | No           | Submit login (sets `engram_session` cookie)                        |
| `POST` | `/dashboard/logout`               | No           | Clear session cookie, redirect to login                            |
| `GET`  | `/dashboard/static/*`             | No           | Embedded static assets (htmx.min.js, CSS)                          |
| `GET`  | `/dashboard/`                     | Cookie       | Dashboard overview (project stats, enrolled projects)              |
| `GET`  | `/dashboard/stats`                | Cookie       | Project stats partial (htmx)                                       |
| `GET`  | `/dashboard/browser`              | Cookie       | Knowledge browser (observations, sessions, prompts)                |
| `GET`  | `/dashboard/browser/observations` | Cookie       | Observations partial (htmx, `?project=&q=`)                        |
| `GET`  | `/dashboard/browser/sessions`     | Cookie       | Sessions partial (htmx, `?project=`)                               |
| `GET`  | `/dashboard/browser/prompts`      | Cookie       | Prompts partial (htmx, `?project=&q=`)                             |
| `GET`  | `/dashboard/projects`             | Cookie       | Projects list with stats                                           |
| `GET`  | `/dashboard/projects/{name}`      | Cookie       | Project detail (sessions, observations, prompts)                   |
| `GET`  | `/dashboard/contributors`         | Cookie       | Contributors list with per-user stats                              |
| `GET`  | `/dashboard/admin`                | Cookie+Admin | Admin overview (system health, user count)                         |
| `GET`  | `/dashboard/admin/users`          | Cookie+Admin | User management (list all users, API key status)                   |
| `GET`  | `/dashboard/admin/health`         | Cookie+Admin | System health detail (DB version, table counts)                    |

**Security Notes**:

- `ENGRAM_JWT_SECRET` must be at least 32 characters. Use a cryptographically random string in production.
- The cloud server does NOT use HTTPS by default. In production, put it behind your normal reverse proxy, ingress, or load balancer with TLS termination.
- API keys are stored as SHA-256 hashes — the plain key is shown only once at generation time.
- Passwords are hashed with bcrypt (cost 10). Login uses constant-time comparison to prevent timing attacks.
- All database queries include `WHERE user_id = $N` for row-level data isolation.
- The `--remote` and `--token` flags (or `ENGRAM_REMOTE_URL` / `ENGRAM_TOKEN` env vars) also fall back to the saved `cloud.json` config for the token.

**Postgres Schema** (auto-created on first `cloud serve` start):

- `cloud_users` — UUID PK, unique username + email, bcrypt password, optional API key hash
- `cloud_sessions` — composite PK (user_id, id), project, directory, timestamps, summary
- `cloud_observations` — BIGSERIAL PK, user-scoped, tsvector GENERATED STORED column for FTS
- `cloud_prompts` — BIGSERIAL PK, user-scoped, tsvector GENERATED STORED for FTS
- `cloud_chunks` — raw chunk BYTEA storage, composite PK (user_id, chunk_id)
- `cloud_sync_chunks` — tracks which chunks have been synced per user

---

### 10. Cloud Dashboard

A server-rendered web UI embedded in the `engram cloud serve` binary. Provides browser-based access to organizational knowledge, project health, contributor stats, and admin controls. Built with **templ** (Go HTML templates) + **htmx** (partial page updates), zero JS build step. Ships as part of the single binary — no separate frontend deployment.

**Access**: Navigate to `http://<cloud-server>/dashboard/` in a browser. Log in with the same credentials used for `engram cloud register`/`engram cloud login`.

**Architecture**:

- Cookie-based sessions: Login wraps the JWT access token in an HTTP-only, Secure, SameSite=Lax cookie (`engram_session`). Existing API auth (Bearer header / API key) is unaffected.
- All templates compiled to Go via `templ generate` (checked into repo). Static assets embedded via `go:embed`.
- Dashboard package (`internal/cloud/dashboard/`) receives `CloudStore` and `auth.Service` as dependencies. Mounted on the existing `CloudServer.mux` via `dashboard.Mount()`.

**Tabs**:

- **Dashboard** — Shared-memory overview with per-project session/observation/prompt counts. Stats loaded via htmx on page load.
- **Browser** — Knowledge browser with project filter, type pills, and search. Three sub-views: Observations, Sessions, Prompts, plus connected drill-down pages for observations, sessions, prompts, and contributors.
- **Projects** — Project cards with stats and pause state. Click through to project detail (recent sessions, observations, prompts, and cloud-managed sync status).
- **Contributors** — Per-user stats table with drill-down pages showing recent sessions, observations, and prompts for a contributor.
- **Admin** (visible only to admin) — System health, user management, DB diagnostics, and org-managed project sync controls.

**Admin Configuration**:

```bash
# Set the admin email — this user sees the Admin tab
export ENGRAM_CLOUD_ADMIN="admin@example.com"
engram cloud serve
```

The admin guard checks the authenticated user's email (or username as fallback) against `ENGRAM_CLOUD_ADMIN`. Non-admin users get a 403 Forbidden page.

**Quick Start**:

```bash
# 1. Start Postgres + cloud server (same as cloud sync setup)
docker compose up -d
export ENGRAM_DATABASE_URL="postgres://engram:engram_dev@localhost:5433/engram_cloud?sslmode=disable"
export ENGRAM_JWT_SECRET="your-secret-at-least-32-characters-long"
export ENGRAM_CLOUD_ADMIN="admin@example.com"
engram cloud serve

# 2. Open browser
open http://localhost:8080/dashboard/

# 3. Log in with your cloud credentials
# (same username/email + password used with 'engram cloud register')
```

**Theme**: Dark TUI-aligned theme using Pico CSS (classless) with custom CSS variables. Fully responsive, server-rendered, and intentionally aligned with Engram's terminal identity instead of a generic admin panel.

---

## OpenCode Plugin

Install with `engram setup opencode` — this copies the plugin to `~/.config/opencode/plugins/engram.ts` AND auto-registers the MCP server in `opencode.json`.

A thin TypeScript adapter that:

1. **Auto-starts** the engram binary if not running
2. **Auto-imports** git-synced memories from `.engram/memories.json` if present in the project
3. **Captures events**: `session.created`, `session.idle`, `session.deleted`, `message.updated`
4. **Tracks tool count**: Counts tool calls per session (for session end stats), but does NOT persist raw tool observations
5. **Captures user prompts**: From `message.updated` events (>10 chars)
6. **Injects Memory Protocol**: Strict rules for when to save, when to search, and mandatory session close protocol — via `chat.system.transform`
7. **Injects context on compaction**: Auto-saves checkpoint + injects previous session context + reminds compressor
8. **Privacy**: Strips `<private>` tags before sending to HTTP API

### Session Resilience

The plugin uses `ensureSession()` — an idempotent function that creates the session in engram if it doesn't exist yet. This is called from every hook that receives a `sessionID`, not just `session.created`. This means:

- **Plugin reload**: If OpenCode restarts or the plugin is reloaded mid-session, the session is re-created on the next tool call or compaction event
- **Reconnect**: If you reconnect to an existing session, the session is created on-demand
- **No lost data**: Prompts, tool counts, and compaction context all work even if `session.created` was missed

Session IDs come from OpenCode's hook inputs (`input.sessionID` in `tool.execute.after`, `input.sessionID` in `experimental.session.compacting`) rather than from a fragile in-memory Map populated by events.

### Plugin API Types (OpenCode `@opencode-ai/plugin`)

The `tool.execute.after` hook receives:

- **`input`**: `{ tool, sessionID, callID, args }` — `input.sessionID` identifies the OpenCode session
- **`output`**: `{ title, output, metadata }` — `output.output` has the result string

### ENGRAM_TOOLS (excluded from tool count)

`mem_search`, `mem_save`, `mem_update`, `mem_delete`, `mem_suggest_topic_key`, `mem_save_prompt`, `mem_session_summary`, `mem_context`, `mem_stats`, `mem_timeline`, `mem_get_observation`, `mem_session_start`, `mem_session_end`

---

## Dependencies

### Go

- `github.com/mark3labs/mcp-go v0.44.0` — MCP protocol implementation
- `modernc.org/sqlite v1.45.0` — Pure Go SQLite driver (no CGO)
- `github.com/charmbracelet/bubbletea v1.3.10` — Terminal UI framework
- `github.com/charmbracelet/lipgloss v1.1.0` — Terminal styling
- `github.com/charmbracelet/bubbles v1.0.0` — TUI components (textinput, etc.)
- `github.com/lib/pq` — Postgres driver (for cloud server)
- `github.com/golang-jwt/jwt/v5` — JWT token generation and validation (for cloud auth)
- `golang.org/x/crypto` — bcrypt password hashing (for cloud auth)

### OpenCode Plugin

- `@opencode-ai/plugin` — OpenCode plugin types and helpers
- Runtime: Bun (built into OpenCode)

---

## Installation

### From source

```bash
git clone https://github.com/alanbuscaglia/engram.git
cd engram
go build -o engram ./cmd/engram
go install ./cmd/engram
```

### Binary location

After `go install`: `$GOPATH/bin/engram` (typically `~/go/bin/engram`)

### Data location

`~/.engram/engram.db` (SQLite database, created on first run)

---

## Design Decisions

1. **Go over TypeScript** — Single binary, cross-platform, no runtime. The initial prototype was TS but was rewritten.
2. **SQLite + FTS5 over vector DB** — FTS5 covers 95% of use cases. No ChromaDB/Pinecone complexity.
3. **Agent-agnostic core** — Go binary is the brain, thin plugins per-agent. Not locked to any agent.
4. **Agent-driven compression** — The agent already has an LLM. No separate compression service.
5. **Privacy at two layers** — Strip in plugin AND store. Defense in depth.
6. **Pure Go SQLite (modernc.org/sqlite)** — No CGO means true cross-platform binary distribution.
7. **No raw auto-capture** — Raw tool calls (edit, bash, etc.) are noisy, pollute search results, and bloat the database. The agent saves curated summaries via `mem_save` and `mem_session_summary` instead. Shell history and git provide the raw audit trail.
8. **TUI with Bubbletea** — Interactive terminal UI for browsing memories without leaving the terminal. Follows Gentleman Bubbletea patterns (screen constants, single Model struct, vim keys).
9. **Cloud Sync via Postgres** — Optional centralized sync with row-level user isolation. Postgres tsvector for full-text search (weighted: title > content > type/project).
10. **Local-first auto-sync** — SQLite stays authoritative. A mutation journal (`sync_mutations`) records every write as an append-only log. Long-lived processes run a lease-guarded background manager that pushes/pulls mutations automatically. Cloud failures degrade gracefully (exponential backoff with jitter) — local reads and writes are never blocked. Legacy chunk-based sync preserved with `--legacy` flag for backward compatibility.
11. **Project-scoped sync** — Enrollment-based filtering lets developers choose which projects sync to the cloud. A denormalized `project` column on `sync_mutations` enables SQL-level filtering at push time (no in-memory filtering). Non-enrolled mutations are skip-acked to prevent journal bloat. Empty-project mutations always sync. All filtering is client-side — the cloud server requires zero changes.
12. **Embedded web dashboard (templ + htmx)** — Server-rendered HTML shipped inside the Go binary via `go:embed`. No separate frontend build, no Node.js, no bundler. templ compiles to Go at development time; htmx handles partial page updates. Cookie-based browser sessions wrap the existing JWT infrastructure. Admin access gated by a single `ENGRAM_CLOUD_ADMIN` env var.

---

## Inspired By

[claude-mem](https://github.com/thedotmack/claude-mem) — But agent-agnostic and with a Go core instead of TypeScript.

Key differences from claude-mem:

- Agent-agnostic (not locked to Claude Code)
- Go binary (not Node.js/TypeScript)
- FTS5 instead of ChromaDB
- Agent-driven compression instead of separate LLM calls
- Simpler architecture (single binary, embedded web dashboard)
