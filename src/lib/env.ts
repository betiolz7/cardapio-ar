// Configuração do Supabase. Sem as variáveis, o app roda em modo demonstração
// (dados de src/lib/demo-data.ts), útil para mostrar a clientes sem backend.

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function isSecretKey(k: string): boolean {
  if (k.startsWith('sb_secret_')) return true
  // Chave legada (JWT): confere o papel no payload.
  const payload = k.split('.')[1]
  if (!payload) return false
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return json?.role === 'service_role'
  } catch {
    return false
  }
}

if (key && isSecretKey(key)) {
  // A chave secreta ignora o RLS. Nunca pode ir para o navegador.
  throw new Error('VITE_SUPABASE_ANON_KEY contém uma chave secreta (service_role). Use a chave pública (anon/publishable).')
}

export const supabaseUrl = url ?? ''
export const supabaseKey = key ?? ''
export const isSupabaseConfigured = Boolean(url && key)
