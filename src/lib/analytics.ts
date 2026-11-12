import { currentDevice } from './device.ts'
import { isSupabaseConfigured } from './env.ts'
import { rpc } from './rpc.ts'
import type { EventType } from './types.ts'

// Métricas anônimas (LGPD): um id aleatório por aba, sem cookie, sem dado pessoal.
// O banco valida tudo em track_event (tipo, prato, mesa, limite por sessão).

const SESSION_KEY = 'cardapio.session'
const TABLE_KEY = 'cardapio.mesa'
let memorySession: string | null = null
let memoryTable: string | null = null

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // aba anônima ou armazenamento bloqueado: fica só em memória
  }
}

function sessionId(): string {
  if (memorySession) return memorySession
  memorySession = readStorage(SESSION_KEY) ?? crypto.randomUUID()
  writeStorage(SESSION_KEY, memorySession)
  return memorySession
}

/** Guarda o token da mesa que veio no QR (?m=...) para atribuir os eventos da visita. */
export function rememberTable(token: string | null): void {
  if (!token || !/^[a-z0-9-]{4,32}$/i.test(token)) return
  memoryTable = token
  writeStorage(TABLE_KEY, token)
}

function tableToken(): string | null {
  return memoryTable ?? readStorage(TABLE_KEY)
}

export function track(restaurantId: string, type: EventType, itemId?: string): void {
  const payload = {
    p_restaurant_id: restaurantId,
    p_type: type,
    p_session_id: sessionId(),
    p_device: currentDevice().kind,
    p_item_id: itemId ?? null,
    p_table_token: tableToken(),
  }

  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV) console.debug('[track]', payload)
    return
  }

  // keepalive: o evento chega mesmo se a página for trocada pelo app de AR.
  rpc('track_event', payload, { keepalive: true }).catch((err: unknown) => {
    if (import.meta.env.DEV) console.warn('[track] falhou', err)
  })
}
