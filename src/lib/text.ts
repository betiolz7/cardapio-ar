/** "Açaí na Cuia!" → "acai-na-cuia" (mesmo formato do domínio public.slug). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

/**
 * Converte o que a pessoa digita em centavos. Aceita "32,90", "R$ 32,90", "32",
 * "1.234,56" e "32.90". Devolve null se não for um preço válido.
 */
export function parsePriceToCents(input: string): number | null {
  let s = input.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '')
  if (!/^[\d.,]+$/.test(s)) return null

  if (s.includes(',')) {
    // formato brasileiro: ponto é milhar, vírgula é decimal
    if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s)) return null
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    // "32.90": ponto como decimal
  } else if (/^\d{1,3}(\.\d{3})+$|^\d+$/.test(s)) {
    s = s.replace(/\./g, '')
  } else {
    return null
  }

  const value = Number(s)
  if (!Number.isFinite(value) || value < 0 || value >= 100_000) return null
  return Math.round(value * 100)
}

/** 3290 → "32,90" (valor para o campo de preço). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** "12,5" ou "12.5" → 12.5; null se inválido ou não positivo. */
export function parseCm(input: string): number | null {
  const n = Number(input.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 1000 ? n : null
}
