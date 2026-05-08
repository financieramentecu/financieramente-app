# Design: Fix Select Scroll and Height

## Technical Approach

The implementation will focus on removing the restrictive height mapping between the Select trigger and its viewport when using Radix UI's `popper` position. We will shift the responsibility of height management from the viewport to the content container, using standard Tailwind CSS classes to enforce a fixed maximum height and enable automatic scrolling.

## Architecture Decisions

### Decision: Height Management Responsiblity

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Viewport Fixed Height | Matches trigger perfectly but breaks scrolling for many items. | **Rejected** |
| Content Max-Height | Standard UI pattern, allows flexible growth up to a limit, enables native scrolling. | **Chosen** |

**Rationale**: The current implementation forces the viewport to match the trigger's height, which is useful only if the select is intended to look like a simple replacement for the trigger. For a functional dropdown with many items, the viewport must be allowed to grow.

### Decision: Selection of Max Height Value

**Choice**: `max-h-80` (320px)
**Alternatives considered**: `max-h-60` (240px), `max-h-96` (384px)
**Rationale**: `max-h-80` is a "Goldilocks" value for our platform. It shows approximately 8-10 items comfortably without taking up too much vertical real estate on laptops or tablets.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/shared/ui/select.tsx` | Modify | Remove `h-[var(--radix-select-trigger-height)]` from `Viewport` and add `max-h-80` to `SelectContent`. |

## Interfaces / Contracts

No changes to public interfaces. The internal CSS classes of the `SelectContent` and `SelectPrimitive.Viewport` components will be updated.

```tsx
// Target change in src/features/shared/ui/select.tsx
// SelectContent:
// - Add: 'max-h-80'
// SelectPrimitive.Viewport:
// - Remove: 'h-[var(--radix-select-trigger-height)]'
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Scroll visibility | Open a Select with > 15 items and verify the scrollbar appears and reaches the end. |
| Manual | Visual stability | Verify that Selects with few items (1-3) still look correct and don't take up 320px. |
| Manual | Responsiveness | Verify that the dropdown doesn't go off-screen on small viewports (uses `max-h-[--radix-select-content-available-height]`). |

## Migration / Rollout

No migration required. This is a purely visual/functional UI fix.

## Open Questions

None. The technical cause and fix are well-understood.
