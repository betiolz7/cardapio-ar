import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { StatusScreen } from '../components/StatusScreen.tsx'
import { isSupabaseConfigured } from '../lib/env.ts'
import { useSession } from './admin-context.ts'
import { supabase } from './supabase.ts'
import { Alert, Field, buttonPrimary, inputClass } from './ui.tsx'

export default function LoginPage() {
  if (!isSupabaseConfigured) {
    return <StatusScreen title="Painel indisponível no modo demonstração">Configure o Supabase no arquivo .env (veja o README).</StatusScreen>
  }
  return <LoginForm />
}

function LoginForm() {
  const session = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')?.startsWith('/admin') ? params.get('next')! : '/admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'Entrar · Cardápio AR'
  }, [])

  if (session) return <Navigate to={next} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) {
      setError(/invalid/i.test(err.message) ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente de novo.')
      return
    }
    navigate(next, { replace: true })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">Cardápio AR</p>
      <h1 className="mt-2 text-2xl font-bold">Entrar no painel</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="E-mail" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Senha" htmlFor="password">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <button type="submit" disabled={busy} className={`${buttonPrimary} w-full`}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
