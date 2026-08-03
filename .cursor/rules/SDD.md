# Spec-Driven Development (SDD) — Use Subagents

When the user invokes any SDD/OpenSpec phase, **always delegate to a subagent** instead of executing the phase inline.

## Phases and delegation

| Phase | User trigger | Agent action |
|-------|----------------|--------------|
| **Proposal** | `/sdd-propose` or "crear propuesta" | Launch subagent (e.g. with skill sdd-propose). Pass change name, exploration or user description, artifact store mode. Subagent produces `openspec/changes/{change}/proposal.md`. |
| **Design** | `/sdd-design` | Launch subagent for design. Pass change name, mode. Subagent reads proposal (and specs if present), produces `design.md`. |
| **Spec** | `/sdd-spec` | Launch subagent for specs. Pass change name, mode. Subagent produces delta/full specs in `specs/{domain}/spec.md`. |
| **Tasks** | `/sdd-tasks` | Launch subagent for task breakdown. Pass change name, mode. Subagent produces `tasks.md`. |
| **Apply** | `/sdd-apply` | Launch subagent to implement tasks. Pass change name, batch of tasks, mode. Subagent writes code and marks tasks in `tasks.md`. |
| **Verify** | `/sdd-verify` | Launch subagent to verify. Pass change name. Subagent produces verify report. |
| **Archive** | `/sdd-archive` | Launch subagent to archive. Pass change name. Subagent moves change to archive, syncs specs, and **MUST ALSO** update `CHANGELOG.md` and increment `package.json` version per [RELEASE.md](RELEASE.md). |

## Rule

**Do not** run proposal, design, spec, tasks, apply, verify, or archive logic in the main agent. **Do** use the task/subagent launcher (`mcp_task` or equivalent) with a clear prompt that includes:

- Change name (e.g. `pre-liquidacion-flow`)
- Artifact store mode (`openspec` | `engram` | `hybrid` | `none`)
- Path to proposal/specs/design/tasks as needed
- Instruction to read the corresponding skill first and return status, summary, artifacts, next_recommended

This keeps each phase consistent and ensures the right skill and conventions are applied.

## ⚠️ Archive Phase Mandatory Actions

When `/sdd-archive` completes, **ALWAYS**:
1. Move change folder to `openspec/changes/archive/` with date prefix
2. Sync delta specs to main capability specs
3. **Update `CHANGELOG.md`** — add new version header with Agregado/Mejorado/Corregido sections (Spanish UI copy, English technical details)
4. **Increment `package.json` version** — follow Semantic Versioning (MAJOR/MINOR/PATCH)
5. Persist archive report with all artifact IDs for traceability

See [RELEASE.md](RELEASE.md) for detailed Changelog & Versioning rules.
