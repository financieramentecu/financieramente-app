# Proposal: Fix Select Scroll and Height

## Intent

The Select component (based on Radix UI) currently has a bug where the scrollable viewport is constrained to the height of the trigger when using `position="popper"`. This makes it impossible to scroll through long lists of items. The goal is to fix this height restriction and establish a consistent maximum height for all selects across the platform.

## Scope

### In Scope
- Correct the height constraint in the `SelectPrimitive.Viewport` component.
- Apply a consistent `max-height` to the `SelectContent` component.
- Ensure scrolling is functional for lists exceeding the max height.

### Out of Scope
- Changing the visual style (colors, borders, etc.) of the select.
- Modifying other form components like Combobox or Popover unless they share the same bug.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `ui-system`: Updating the standard behavior and height constraints of core Select components.

## Approach

- **Remove restricted height**: Remove the `h-[var(--radix-select-trigger-height)]` class from `SelectPrimitive.Viewport` in `src/features/shared/ui/select.tsx`. This class is the root cause of the scroll blockage.
- **Fijar altura**: Add `max-h-80` (320px) to the `SelectPrimitive.Content` component classes. This provides a consistent "fixed height" as requested while allowing the content to be smaller if there are few items.
- **Maintain responsiveness**: Keep `max-h-[--radix-select-content-available-height]` as a fallback to ensure the dropdown never exceeds the available screen space.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/shared/ui/select.tsx` | Modified | Core implementation of the Select component. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Small layout shift in dropdowns | Low | The change only affects selects with many items, making them scrollable instead of cut off. |

## Rollback Plan

Revert the changes in `src/features/shared/ui/select.tsx` to the previous version using `git checkout`.

## Dependencies

- None

## Success Criteria

- [ ] Selects with 10+ items allow scrolling to the last item.
- [ ] Selects do not exceed 320px in height (`max-h-80`).
- [ ] Standard select functionality (keyboard navigation, selection) remains intact.
