import type { DimsCm } from './types.ts'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** 3890 → "R$ 38,90". Preço sempre chega em centavos (inteiro). */
export function formatPrice(cents: number): string {
  return brl.format(cents / 100)
}

/** {diameter:40,h:3.5} → "Ø 40 cm · 3,5 cm de altura" */
export function formatDims(dims: DimsCm): string {
  const h = `${num.format(dims.h)} cm de altura`
  if ('diameter' in dims) {
    return `Ø ${num.format(dims.diameter)} cm · ${h}`
  }
  return `${num.format(dims.w)} × ${num.format(dims.d)} cm · ${h}`
}

/** 1 → "Serve 1 pessoa", 3 → "Serve 3 pessoas" */
export function formatServes(serves: number | null): string | null {
  if (!serves) return null
  return serves === 1 ? 'Serve 1 pessoa' : `Serve ${serves} pessoas`
}
