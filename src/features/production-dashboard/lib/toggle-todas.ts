/**
 * Toggles an item in an array using "Todas/Todos" semantics:
 * - [] means all selected (Todas/Todos)
 * - Adding an item deselects the implicit "all" state
 * - Removing the last item resets to [] (all again)
 *
 * Generic — works for number[] and string[] alike.
 */
export function toggleItem<T>(current: T[], item: T): T[] {
  const index = current.indexOf(item)
  if (index === -1) return [...current, item]
  return current.filter((_, i) => i !== index)
}
