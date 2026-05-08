# Exploration: Fix Select Scroll and Height

### Current State
The `SelectContent` component in `src/features/shared/ui/select.tsx` has a bug where the `Viewport` is constrained to the height of the trigger when `position="popper"` is used:
```tsx
position === 'popper' &&
    'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
```
This causes the scrollable area to be limited to the size of a single item (the trigger height), making it impossible to see or scroll through a long list of items.

### Affected Areas
- `src/features/shared/ui/select.tsx` (file:///Volumes/JohnAgudelo/Projects/financieramente-app/src/features/shared/ui/select.tsx) — The core component for all selects in the application.

### Approaches
1. **Fix Viewport Height & Set Fixed Max-Height**
   - **Action**: 
     - Remove `h-[var(--radix-select-trigger-height)]` from the `Viewport`.
     - Set a fixed `max-h-80` (20rem / 320px) or `max-h-96` (24rem / 384px) on `SelectContent`.
     - Keep `max-h-[--radix-select-content-available-height]` as a safety fallback.
   - Pros: Directly addresses both "fijar la altura" and "permitir scroll". Follows standard UI patterns.
   - Cons: None identified.
   - Effort: Low

### Recommendation
Use Approach 1. Removing the restricted height on the Viewport will allow Radix UI to handle the content height correctly up to the `max-h` of the container. Setting a fixed `max-h-80` will provide a consistent experience across the platform as requested.

### Risks
- Ensure `overflow-y-auto` is correctly applied (it is already present in `SelectContent`).

### Ready for Proposal
Yes.
