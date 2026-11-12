import { supabaseKey, supabaseUrl } from './env.ts'

// O cardápio público só precisa chamar duas RPCs. Usar fetch direto evita
// carregar o supabase-js (~50 KB) no caminho mais sensível a performance.
// O painel /admin usa o supabase-js completo (login, sessão).

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    apikey: supabaseKey,
    'Content-Type': 'application/json',
  }
  // Chave legada (JWT) também vai no Authorization; a nova (sb_publishable_) não.
  if (supabaseKey.startsWith('eyJ')) h.Authorization = `Bearer ${supabaseKey}`
  return h
}

export async function rpc<T>(fn: string, args: Record<string, unknown>, init?: RequestInit): Promise<T> {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(args),
    ...init,
  })
  if (!res.ok) {
    throw new Error(`RPC ${fn} falhou (${res.status})`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}
