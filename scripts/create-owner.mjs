#!/usr/bin/env node
// Cria (ou reaproveita) a conta de um usuário e o liga a um restaurante.
// Não existe cadastro público: somos nós que criamos o acesso de cada restaurante.
//
// Uso:
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<service_role> \
//     node scripts/create-owner.mjs <email> <senha> <slug-do-restaurante> [owner|admin|staff]
//
// A service key ignora o RLS: use só no seu computador, nunca no front-end.

const [email, password, slug, role = 'owner'] = process.argv.slice(2)
const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !password || !slug || !url || !key) {
  console.error('Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-owner.mjs <email> <senha> <slug> [owner|admin|staff]')
  process.exit(2)
}
if (!['owner', 'admin', 'staff'].includes(role)) {
  console.error('Papel inválido: use owner, admin ou staff.')
  process.exit(2)
}
if (password.length < 8) {
  console.error('A senha precisa ter pelo menos 8 caracteres.')
  process.exit(2)
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

async function call(path, init = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  return body
}

const [restaurant] = await call(`/rest/v1/restaurants?slug=eq.${encodeURIComponent(slug)}&select=id,name`)
if (!restaurant) {
  console.error(`Restaurante "${slug}" não encontrado.`)
  process.exit(1)
}

let userId
try {
  userId = (await call('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).id
  console.log(`Usuário criado: ${email}`)
} catch (err) {
  if (!/already|exists|registered/i.test(String(err))) throw err
  const { users } = await call(`/auth/v1/admin/users?per_page=1000`)
  userId = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id
  if (!userId) throw err
  console.log(`Usuário já existia: ${email} (senha não foi alterada)`)
}

await call('/rest/v1/memberships?on_conflict=user_id,restaurant_id', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({ user_id: userId, restaurant_id: restaurant.id, role }),
})
console.log(`Acesso liberado: ${email} é ${role} de "${restaurant.name}". Entre em /login.`)
