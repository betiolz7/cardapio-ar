import { describe, expect, it } from 'vitest'
import { checkModel, suggestDims, type ModelFacts } from './model-rules.ts'

const pizza: ModelFacts = {
  size: { x: 0.4, y: 0.035, z: 0.4 },
  minY: 0,
  bytes: 220_000,
  textures: [],
  hasUsdz: true,
}

describe('checkModel', () => {
  it('aceita um modelo correto', () => {
    expect(checkModel(pizza, { dims: { diameter: 40, h: 3.5 } })).toEqual({ errors: [], warnings: [] })
  })

  it('detecta modelo em centímetros (100x maior)', () => {
    const r = checkModel({ ...pizza, size: { x: 40, y: 3.5, z: 40 } })
    expect(r.errors.some((e) => e.includes('não está em metros'))).toBe(true)
  })

  it('detecta base fora de y = 0', () => {
    const r = checkModel({ ...pizza, minY: -0.02 })
    expect(r.errors.some((e) => e.includes('flutuar ou afundar'))).toBe(true)
  })

  it('arquivo grande e textura grande', () => {
    const r = checkModel({ ...pizza, bytes: 6 * 1024 * 1024, textures: [{ name: 'base', width: 4096, height: 4096 }] })
    expect(r.errors).toHaveLength(2)
  })

  it('USDZ ausente é aviso, ou erro quando exigido', () => {
    expect(checkModel({ ...pizza, hasUsdz: false }).warnings).toHaveLength(1)
    expect(checkModel({ ...pizza, hasUsdz: false }, { requireUsdz: true }).errors).toHaveLength(1)
  })

  it('compressão Meshopt gera aviso (decodificador vem de CDN)', () => {
    const r = checkModel({ ...pizza, extensions: ['EXT_meshopt_compression'] })
    expect(r.errors).toHaveLength(0)
    expect(r.warnings.some((w) => w.includes('Meshopt'))).toBe(true)
  })

  it('medidas informadas diferentes do modelo', () => {
    const r = checkModel(pizza, { dims: { diameter: 35, h: 3.5 } })
    expect(r.errors).toHaveLength(2) // largura e profundidade
  })
})

describe('suggestDims', () => {
  it('prato redondo vira diâmetro, arredondado de 0,5 em 0,5', () => {
    expect(suggestDims({ x: 0.126, y: 0.106, z: 0.124 })).toEqual({ diameter: 12.5, h: 10.5 })
  })

  it('prato retangular vira largura × profundidade', () => {
    expect(suggestDims({ x: 0.3, y: 0.05, z: 0.18 })).toEqual({ w: 30, d: 18, h: 5 })
  })
})
