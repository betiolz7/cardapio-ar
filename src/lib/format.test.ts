import { describe, expect, it } from 'vitest'
import { formatDims, formatPrice, formatServes } from './format.ts'

// Intl usa espaço não separável entre "R$" e o valor.
const normalize = (s: string) => s.replace(/\s/g, ' ')

describe('formatPrice', () => {
  it('formata centavos em reais', () => {
    expect(normalize(formatPrice(3890))).toBe('R$ 38,90')
    expect(normalize(formatPrice(0))).toBe('R$ 0,00')
    expect(normalize(formatPrice(123456))).toBe('R$ 1.234,56')
  })
})

describe('formatDims', () => {
  it('prato redondo usa diâmetro', () => {
    expect(formatDims({ diameter: 40, h: 3.5 })).toBe('Ø 40 cm · 3,5 cm de altura')
  })

  it('prato retangular usa largura × profundidade', () => {
    expect(formatDims({ w: 12, d: 8.25, h: 9 })).toBe('12 × 8,3 cm · 9 cm de altura')
  })
})

describe('formatServes', () => {
  it('singular, plural e vazio', () => {
    expect(formatServes(1)).toBe('Serve 1 pessoa')
    expect(formatServes(3)).toBe('Serve 3 pessoas')
    expect(formatServes(null)).toBeNull()
  })
})
