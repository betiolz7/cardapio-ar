import { useEffect, useState } from 'react'
import { qrSvg } from '../lib/qr.ts'

/** QR code em SVG (gerado no navegador a partir do endereço da mesa). */
export function QrCode({ value, label, className = '' }: { value: string; label: string; className?: string }) {
  const [svg, setSvg] = useState<{ value: string; svg: string } | null>(null)

  useEffect(() => {
    let active = true
    qrSvg(value).then((s) => active && setSvg({ value, svg: s }))
    return () => {
      active = false
    }
  }, [value])

  if (svg?.value !== value) return <div className={`animate-pulse rounded bg-surface-2 ${className}`} aria-hidden />
  return (
    <div
      role="img"
      aria-label={label}
      className={`[&>svg]:block [&>svg]:size-full ${className}`}
      // O SVG vem da biblioteca qrcode a partir da nossa própria URL: conteúdo confiável.
      dangerouslySetInnerHTML={{ __html: svg.svg }}
    />
  )
}
