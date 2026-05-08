# Tasks: Fix Select Scroll and Height

## Phase 1: Component Refactor

- [x] 1.1 Modify `SelectPrimitive.Viewport` in `src/features/shared/ui/select.tsx` to remove the fixed height class `h-[var(--radix-select-trigger-height)]`.
- [x] 1.2 Modify `SelectContent` in `src/features/shared/ui/select.tsx` to add `max-h-80` to the container classes for consistent maximum height.

## Phase 2: Manual Verification

- [x] 2.1 Verify Select scroll functionality: Open a dropdown with > 15 items and confirm the scrollbar works and reaches the bottom.
- [x] 2.2 Verify Select height for short lists: Confirm that a dropdown with 1-3 items is only as tall as its content (not forced to 320px).
- [x] 2.3 Verify responsive behavior: Open the select near the bottom of a small viewport and confirm it respects `available-height`.

## Phase 3: Regression Testing

- [x] 3.1 Verify selection behavior: Confirm that selecting an item still works correctly.
- [x] 3.2 Verify keyboard navigation: Confirm that arrow keys and "Enter" still work to navigate and select items in the scrollable list.
