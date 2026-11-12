import type { DimsCm } from './types.ts'

// Regras de validação de modelo 3D (CONTEXT.md §5 e §6).
// Usadas pelo painel (no navegador) e por scripts/check-model.mjs (no Node).
// Mantenha este arquivo sem dependências e só com sintaxe "apagável" de TS,
// para o Node conseguir importar direto.

export const MODEL_LIMITS = {
  minAxisM: 0.02,
  maxAxisM: 0.8,
  baseToleranceM: 0.002,
  maxBytes: 5 * 1024 * 1024,
  warnBytes: 3 * 1024 * 1024,
  maxTexturePx: 2048,
  dimsTolerance: 0.1,
}

export interface Size3 {
  x: number
  y: number
  z: number
}

/** O que foi medido no arquivo .glb. */
export interface ModelFacts {
  size: Size3 // metros
  minY: number // metros
  bytes: number
  textures: { name: string; width: number; height: number }[]
  hasUsdz: boolean
  /** Extensões glTF usadas pelo arquivo (ex.: EXT_meshopt_compression). */
  extensions?: string[]
}

export interface ModelReport {
  errors: string[]
  warnings: string[]
}

const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
// Abaixo de 0,05 mm vira 0 (evita "-0 cm" depois da quantização).
export const cm = (m: number) => `${num.format(Math.abs(m) < 0.0005 ? 0 : m * 100)} cm`
export const mb = (b: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(b / 1024 / 1024)} MB`

/** Tamanho esperado em metros a partir das medidas cadastradas (cm). x e z = diâmetro no prato redondo. */
export function expectedSizeM(dims: DimsCm): Size3 {
  if ('diameter' in dims) return { x: dims.diameter / 100, y: dims.h / 100, z: dims.diameter / 100 }
  return { x: dims.w / 100, y: dims.h / 100, z: dims.d / 100 }
}

const roundHalf = (n: number) => Math.round(n * 2) / 2

/** Sugere as medidas (cm, de 0,5 em 0,5) a partir do modelo. Redondo se largura e profundidade forem quase iguais. */
export function suggestDims(size: Size3): DimsCm {
  const x = size.x * 100
  const z = size.z * 100
  const h = Math.max(0.5, roundHalf(size.y * 100))
  const isRound = Math.abs(x - z) / Math.max(x, z) <= 0.08
  if (isRound) return { diameter: Math.max(0.5, roundHalf((x + z) / 2)), h }
  return { w: Math.max(0.5, roundHalf(x)), d: Math.max(0.5, roundHalf(z)), h }
}

export function checkModel(facts: ModelFacts, opts: { dims?: DimsCm | null; requireUsdz?: boolean } = {}): ModelReport {
  const errors: string[] = []
  const warnings: string[] = []
  const L = MODEL_LIMITS
  const axisName = { x: 'largura', y: 'altura', z: 'profundidade' } as const

  for (const axis of ['x', 'y', 'z'] as const) {
    const v = facts.size[axis]
    if (v < L.minAxisM || v > L.maxAxisM) {
      errors.push(
        `A ${axisName[axis]} do modelo é ${cm(v)}, fora do esperado (${cm(L.minAxisM)} a ${cm(L.maxAxisM)}). ` +
          'O arquivo provavelmente não está em metros.',
      )
    }
  }

  if (Math.abs(facts.minY) > L.baseToleranceM) {
    errors.push(`A base do modelo está em ${cm(facts.minY)} de altura; deveria estar em 0 (o prato vai flutuar ou afundar na mesa).`)
  }

  if (facts.bytes > L.maxBytes) errors.push(`O arquivo tem ${mb(facts.bytes)}; o máximo é ${mb(L.maxBytes)}.`)
  else if (facts.bytes > L.warnBytes) warnings.push(`O arquivo tem ${mb(facts.bytes)}; o ideal é até ${mb(L.warnBytes)} para carregar rápido no 4G.`)

  for (const t of facts.textures) {
    if (t.width > L.maxTexturePx || t.height > L.maxTexturePx) {
      errors.push(`A textura "${t.name}" tem ${t.width}x${t.height} px; o máximo é ${L.maxTexturePx} px.`)
    }
  }

  if (facts.extensions?.includes('EXT_meshopt_compression')) {
    warnings.push(
      'O arquivo usa compressão Meshopt: o celular do cliente baixa um decodificador extra de outro site. ' +
        'Prefira a versão gerada por scripts/optimize-model.mjs (quantização, sem decodificador).',
    )
  }

  if (!facts.hasUsdz) {
    const msg = 'Sem arquivo .usdz: no iPhone o 3D é convertido na hora (mais lento e com qualidade menor).'
    ;(opts.requireUsdz ? errors : warnings).push(msg)
  }

  if (opts.dims) {
    const exp = expectedSizeM(opts.dims)
    for (const axis of ['x', 'y', 'z'] as const) {
      if (!(exp[axis] > 0)) continue
      const diff = Math.abs(facts.size[axis] - exp[axis]) / exp[axis]
      if (diff > L.dimsTolerance) {
        errors.push(
          `A ${axisName[axis]} do modelo (${cm(facts.size[axis])}) não bate com a medida informada (${cm(exp[axis])}): ` +
            `${Math.round(diff * 100)}% de diferença.`,
        )
      }
    }
  }

  return { errors, warnings }
}
