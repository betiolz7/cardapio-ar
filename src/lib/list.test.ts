import { describe, expect, it } from 'vitest'
import { moveItem } from './list.ts'

describe('moveItem', () => {
  it('sobe e desce', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('destino inválido devolve a mesma lista (sem salvar à toa)', () => {
    const list = ['a', 'b']
    expect(moveItem(list, 0, -1)).toBe(list)
    expect(moveItem(list, 1, 2)).toBe(list)
    expect(moveItem(list, 1, 1)).toBe(list)
  })
})
