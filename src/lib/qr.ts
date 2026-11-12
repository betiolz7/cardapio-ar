// Endereço e QR code da mesa: /{slug}?m={token} (CONTEXT.md §7).

/** Origem pública do cardápio. Em produção, defina VITE_PUBLIC_URL se o painel rodar em outro domínio. */
export function publicOrigin(): string {
  const configured = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/$/, '')
  return configured || window.location.origin
}

export function tableUrl(origin: string, restaurantSlug: string, token: string): string {
  return `${origin}/${restaurantSlug}?m=${encodeURIComponent(token)}`
}

/** SVG do QR code (preto no branco, para imprimir). A biblioteca só carrega no painel. */
export async function qrSvg(text: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

/** Próximos rótulos "Mesa N", continuando do maior número já usado. */
export function nextTableLabels(existing: string[], count: number): string[] {
  const numbers = existing
    .map((l) => /^mesa\s+(\d+)$/i.exec(l.trim())?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number)
  const start = numbers.length ? Math.max(...numbers) + 1 : 1
  return Array.from({ length: count }, (_, i) => `Mesa ${start + i}`)
}
