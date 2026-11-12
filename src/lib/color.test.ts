import { describe, expect, it } from 'vitest'
import { BRAND_CREAM, BRAND_INK, accentVars, contrast } from './color.ts'

describe('contrast', () => {
  it('preto e branco dão 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })
  it('marinho sobre creme passa de 4,5:1', () => {
    expect(contrast(BRAND_INK, BRAND_CREAM)).toBeGreaterThan(4.5)
  })
})

describe('accentVars', () => {
  it('cor clara usa texto marinho', () => {
    expect(accentVars('#f5a524')).toEqual({ '--accent': '#f5a524', '--accent-ink': BRAND_INK })
  })
  it('cor escura usa texto creme', () => {
    expect(accentVars('#7a1f2b')?.['--accent-ink']).toBe(BRAND_CREAM)
  })
  it('aceita o formato curto', () => {
    expect(accentVars('#fc0')?.['--accent-ink']).toBe(BRAND_INK)
  })
  it('ignora cor vazia ou inválida', () => {
    expect(accentVars(null)).toBeUndefined()
    expect(accentVars('laranja')).toBeUndefined()
  })
})
