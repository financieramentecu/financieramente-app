import { describe, it, expect } from 'vitest'
import { toggleItem } from '../../lib/toggle-todas'

describe('toggleItem', () => {
  it('adds an item to empty array', () => {
    expect(toggleItem([], 1)).toEqual([1])
  })

  it('removes an item already in the array', () => {
    expect(toggleItem([1], 1)).toEqual([])
  })

  it('adds an item to an array that has other items', () => {
    expect(toggleItem([2], 1)).toEqual([2, 1])
  })

  it('removes only the matching item, leaving others', () => {
    expect(toggleItem([1, 2, 3], 2)).toEqual([1, 3])
  })

  it('works with string arrays', () => {
    expect(toggleItem(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleItem(['b'], 'a')).toEqual(['b', 'a'])
  })
})

describe('toggleItem — Todas semantics', () => {
  it('selecting item from [] results in [item] — deselects Todas', () => {
    const result = toggleItem([], 5)
    expect(result).toEqual([5])
  })

  it('deselecting last item from [item] results in [] — back to Todas', () => {
    const result = toggleItem([5], 5)
    expect(result).toEqual([])
  })
})
