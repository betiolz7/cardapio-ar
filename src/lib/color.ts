// Cor do texto em cima da cor de destaque do restaurante: marinho ou creme,
// o que tiver mais contraste (WCAG). Sem isso, um restaurante com cor clara
// (amarelo, laranja) ficaria com texto creme ilegível nos botões.

export const BRAND_INK = '#0f1d40'
export const BRAND_CREAM = '#f8f3ea'

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  if (la === null || lb === null) return 1
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Variáveis CSS do tema do restaurante, ou nada se a cor for inválida. */
export function accentVars(color: string | null | undefined): Record<string, string> | undefined {
  if (!color || luminance(color) === null) return undefined
  const ink = contrast(color, BRAND_INK) >= contrast(color, BRAND_CREAM) ? BRAND_INK : BRAND_CREAM
  return { '--accent': color, '--accent-ink': ink }
}
