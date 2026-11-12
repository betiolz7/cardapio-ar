import { describe, expect, it } from 'vitest'
import { centsToInput, parseCm, parsePriceToCents, slugify } from './text.ts'

describe('slugify', () => {
  it('remove acentos, espaços e símbolos', () => {
    expect(slugify('Açaí na Cuia!')).toBe('acai-na-cuia')
    expect(slugify('  X-Bacon  Duplo ')).toBe('x-bacon-duplo')
    expect(slugify('Pão de Queijo (6 un.)')).toBe('pao-de-queijo-6-un')
  })
})

describe('parsePriceToCents', () => {
  it.each([
    ['32,90', 3290],
    ['R$ 32,90', 3290],
    ['32', 3200],
    ['32,9', 3290],
    ['1.234,56', 123456],
    ['32.90', 3290],
    ['1.234', 123400],
    ['0', 0],
  ])('%s → %i', (input, cents) => {
    expect(parsePriceToCents(input)).toBe(cents)
  })

  it.each(['', 'abc', '32,999', '-5', '12,34,56', '100000'])('"%s" é inválido', (input) => {
    expect(parsePriceToCents(input)).toBeNull()
  })
})

describe('centsToInput e parseCm', () => {
  it('formata e lê', () => {
    expect(centsToInput(3290)).toBe('32,90')
    expect(centsToInput(500)).toBe('5,00')
    expect(parseCm('12,5')).toBe(12.5)
    expect(parseCm('0')).toBeNull()
  })
})
