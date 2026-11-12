import { describe, expect, it } from 'vitest'
import { nextTableLabels, qrSvg, tableUrl } from './qr.ts'

describe('tableUrl', () => {
  it('monta o endereço da mesa', () => {
    expect(tableUrl('https://cardapio.app', 'casa-lume', 'a1b2c3d4e5f6')).toBe('https://cardapio.app/casa-lume?m=a1b2c3d4e5f6')
  })
})

describe('qrSvg', () => {
  it('gera um SVG', async () => {
    const svg = await qrSvg('https://cardapio.app/casa-lume?m=a1b2c3d4e5f6')
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('<path')
  })
})

describe('nextTableLabels', () => {
  it('continua a numeração', () => {
    expect(nextTableLabels([], 3)).toEqual(['Mesa 1', 'Mesa 2', 'Mesa 3'])
    expect(nextTableLabels(['Mesa 1', 'Mesa 7', 'Varanda', 'mesa 3'], 2)).toEqual(['Mesa 8', 'Mesa 9'])
  })
})
