import { useEffect, useState } from 'react'
import { DEMO_MENU } from './demo-data.ts'
import { isSupabaseConfigured } from './env.ts'
import { rpc } from './rpc.ts'
import type { Menu } from './types.ts'

// Um cardápio por visita: cache em memória para a navegação
// cardápio → prato → cardápio não buscar de novo.
const cache = new Map<string, Promise<Menu | null>>()

export function getMenu(slug: string): Promise<Menu | null> {
  const cached = cache.get(slug)
  if (cached) return cached

  const promise = isSupabaseConfigured
    ? rpc<Menu | null>('get_menu', { p_slug: slug })
    : Promise.resolve(slug === DEMO_MENU.restaurant.slug ? DEMO_MENU : null)

  // Não guarda falha de rede no cache: a próxima tentativa busca de novo.
  promise.catch(() => cache.delete(slug))
  cache.set(slug, promise)
  return promise
}

export type MenuState =
  | { status: 'loading' }
  | { status: 'ready'; menu: Menu }
  | { status: 'not-found' }
  | { status: 'error'; retry: () => void }

type Result = { key: string; menu: Menu | null; failed: boolean }

export function useMenu(slug: string | undefined): MenuState {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const key = `${slug ?? ''}#${attempt}`

  useEffect(() => {
    if (!slug) return
    let active = true
    getMenu(slug).then(
      (menu) => active && setResult({ key, menu, failed: false }),
      () => active && setResult({ key, menu: null, failed: true }),
    )
    return () => {
      active = false
    }
  }, [slug, key])

  // O estado é derivado: resultado de outro slug/tentativa conta como "carregando".
  if (!slug) return { status: 'not-found' }
  if (!result || result.key !== key) return { status: 'loading' }
  if (result.failed) return { status: 'error', retry: () => setAttempt((n) => n + 1) }
  return result.menu ? { status: 'ready', menu: result.menu } : { status: 'not-found' }
}
