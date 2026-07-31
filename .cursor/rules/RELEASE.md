# Release Management: Changelog & Versioning

**MANDATORY RULE:** When archiving an SDD feature/functionality via `/sdd-archive`, you MUST update the project version and changelog.

## 1. Update CHANGELOG.md

Add a new version entry at the **top** of the changelog (before all other version headers):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Agregado
- Feature 1 description (user-facing, in Spanish)
- Feature 2 description

### Mejorado
- Enhancement 1 (in Spanish)

### Corregido
- Bug fix 1 (in Spanish)

### Técnico
- Technical implementation detail 1 (in English)
- Technical implementation detail 2
```

**Guidelines:**
- **Agregado/Mejorado/Corregido**: Write in Spanish for end-users (UI labels, feature names)
- **Técnico**: Write in English for developers (models, APIs, implementation details)
- **Timing**: Add changelog entry **when archiving the change** (at close of SDD cycle)
- **Format**: Follow [Keep a Changelog](https://keepachangelog.com/es-ES/) conventions

## 2. Increment package.json Version

Update the `"version"` field in `package.json` following **Semantic Versioning**:

| Type | When | Example |
|------|------|---------|
| **MAJOR** | Breaking changes (API incompatibilities, data schema removals, irreversible migrations) | `1.0.0` → `2.0.0` |
| **MINOR** | New features, backward-compatible additions, new capabilities | `1.25.0` → `1.26.0` |
| **PATCH** | Bug fixes, internal optimizations, documentation, non-functional changes | `1.26.0` → `1.26.1` |

**Example:** Feature "novedad-negocio-venta-efectuada" added new marking capability → `1.25.0` → `1.26.0` (MINOR).

## 3. When to Apply

**Apply this rule when:**
- Archiving an SDD feature (any `/sdd-archive` completion)
- Creating a release/tag for deployment
- Before merging feature branches to main/develop

**Do NOT apply:**
- For internal refactors without new user features
- For test-only changes
- For CI/infrastructure changes

## 4. Workflow (Orchestrator / Archiver)

1. Run `/sdd-archive {change-name}` via subagent
2. After archive completes, update `CHANGELOG.md` with feature details
3. Increment `package.json` version per semantic versioning rules
4. Document decision: create/update observation in persistent memory
5. Commit both files together in release PR

## Examples

### Example 1: New Feature (MINOR bump)
```json
// package.json
"version": "1.26.0"  // was 1.25.0
```

```markdown
# CHANGELOG.md
## [1.26.0] - 2026-07-31

### Agregado
- **Marcador de "Novedad" para negocios:** Gestores pueden marcar negocios en VENTA_EFECTUADA...
```

### Example 2: Bug Fix (PATCH bump)
```json
"version": "1.26.1"  // was 1.26.0
```

```markdown
## [1.26.1] - 2026-08-15

### Corregido
- **Heatmap celdas no cargaban en primer render:** Problema resuelto en la carga asíncrona de TRM...
```

## Related Files

- `CLAUDE.md` — Release Management section (project-level instructions)
- `package.json` — Current version number
- `CHANGELOG.md` — Release history and feature notes

## Enforcement

This rule is **mandatory** at archive time. The orchestrator/archiver is responsible for ensuring both files are updated before the change is considered complete.
