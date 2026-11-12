import type { DeviceKind } from './types.ts'

// Navegadores embutidos em apps (Instagram, Facebook, TikTok, Line...) não abrem o AR
// direito. É o único caso em que detectar pelo user agent se justifica (CONTEXT.md §5).
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|musical_ly|TikTok|BytedanceWebview|Line\//i

export function isInAppBrowser(ua: string): boolean {
  return IN_APP.test(ua)
}

/** Categoria do aparelho, só para métricas. Para saber se tem AR, use canActivateAR do model-viewer. */
export function deviceKind(ua: string, maxTouchPoints = 0): DeviceKind {
  if (isInAppBrowser(ua)) return 'in_app'
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  // iPadOS se apresenta como Mac; a diferença é a tela de toque.
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return 'desktop'
  return 'other'
}

export function currentDevice(): { kind: DeviceKind; inApp: boolean } {
  if (typeof navigator === 'undefined') return { kind: 'other', inApp: false }
  const ua = navigator.userAgent
  return { kind: deviceKind(ua, navigator.maxTouchPoints), inApp: isInAppBrowser(ua) }
}
