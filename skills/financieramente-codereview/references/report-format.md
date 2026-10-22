# Report format

## Header (2–4 lines)

PR URL, repo, `head → base`, whether the diff covers/exceeds/contradicts the PR description, and whether base-branch code around the change was actually read.

## Verdict line (1–3 lines)

Merge verdict ("Se puede mezclar" / "Requiere cambios antes de mezclar"), impact on existing functionality, and a count per severity (e.g. `Crítico: 0 · Alto: 1 · Medio: 2 · Bajo: 1`).

## Finding block (most severe first)

```markdown
### [SEVERIDAD] Título corto
- **Archivo:** ruta:línea
- **Qué:** defecto concreto, visto en el diff y en la base.
- **Por qué importa:** qué funcionalidad existente se rompe, o qué regla de CLAUDE.md/AGENTS.md se incumple.
- **Escenario de fallo:** flujo de la base → resultado incorrecto (omitir si no aplica).
- **Sugerencia:** corrección mínima alineada con la arquitectura del repo. Propón; no la apliques.
```

No findings in a severity → say so, don't invent one. "Sin hallazgos críticos" is a valid, complete result.

## PR comment body (only after explicit acceptance)

```markdown
**[SEVERIDAD]** Título corto

**Qué:** …
**Por qué importa:** …
**Escenario de fallo:** … (omit if not applicable)
**Sugerencia:** …
```
