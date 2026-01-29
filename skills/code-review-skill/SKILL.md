---
name: code-review-skill
description: >
  Performs comprehensive code reviews focusing on security, performance, and
  maintainability. Use when reviewing Rust code, pull requests, or when the
  user requests deep security/performance analysis.
metadata:
  version: '1.0.0'
  author: VTCode Team
  license: MIT
---

# Code Review Skill

## Tools and Constraints

- **Use only**: `Read` for context and `Grep` for pattern searches.
- **Do not**: Write files, edit code, or execute commands.
- Output is analysis and recommendations only.

## Instructions

When performing a code review:

1. **Gather context** with Read (files, modules, call sites) and Grep (patterns,
   usages, similar code).
2. **Analyze** the provided code for:
   - Security vulnerabilities
   - Performance bottlenecks
   - Code clarity and readability
   - Test coverage gaps
   - Architecture compliance
   - Error handling completeness
3. **Provide** specific, actionable feedback with:
   - Line-by-line analysis of critical issues
   - Suggestions for improvement
   - Best-practice recommendations
   - Performance optimization opportunities

### Rust-Specific Focus

- Rust patterns and idioms
- Memory safety and lifetime management
- Concurrency and thread safety
- Error handling (`Result`/`Option`, `?`, custom error types)
- Code organization and modularity

## Output Format

Structure the review as:

```markdown
## Summary

High-level overview of findings.

## Critical Issues

Security vulnerabilities or major bugs (with file:line or snippets).

## Improvements

Performance and readability suggestions.

## Best Practices

Compliance with Rust conventions and style.

## Next Steps

Actionable recommendations (ordered by priority).
```

## Example Triggers

- "Review this function for security vulnerabilities"
- "Analyze this module for performance improvements"
- "Check this code for Rust best practices"

## Related Generic Skills

- `typescript` - Const types, flat interfaces
- `react-19` - No useMemo/useCallback, compiler
- `nextjs-15` - App Router, Server Actions
- `screaming-architecture` - project architecture
