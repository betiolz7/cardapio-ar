import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { StatusScreen } from '../components/StatusScreen.tsx'
import { AdminContext, useSession } from './admin-context.ts'
import { listMemberships, type Membership } from './data.ts'
import { supabase } from './supabase.ts'

const SELECTED_KEY = 'admin.restaurant'

function readSelected(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY)
  } catch {
    return null
  }
}

/** Exige login e um restaurante vinculado; entrega o contexto para as telas do painel. */
export function AdminGate({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()
  const [memberships, setMemberships] = useState<Membership[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(readSelected)
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return
    let active = true
    listMemberships().then(
      (list) => active && setMemberships(list),
      () => active && setLoadError(true),
    )
    return () => {
      active = false
    }
  }, [userId])

  if (session === undefined) return <StatusScreen title="Carregando…" />
  if (session === null) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (loadError) return <StatusScreen title="Não foi possível carregar o painel">Verifique sua conexão e recarregue a página.</StatusScreen>
  if (memberships === null) return <StatusScreen title="Carregando…" />

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (memberships.length === 0) {
    return (
      <StatusScreen title="Sua conta ainda não está ligada a um restaurante">
        <p>Fale com a gente para liberar o acesso.</p>
        <button type="button" onClick={signOut} className="mt-4 min-h-12 rounded-full bg-surface-2 px-6 font-semibold text-ink">
          Sair
        </button>
      </StatusScreen>
    )
  }

  const membership = memberships.find((m) => m.restaurant.id === selectedId) ?? memberships[0]
  const selectRestaurant = (id: string) => {
    setSelectedId(id)
    try {
      localStorage.setItem(SELECTED_KEY, id)
    } catch {
      // armazenamento bloqueado: vale só nesta aba
    }
  }

  return (
    <AdminContext.Provider value={{ session, membership, memberships, selectRestaurant, signOut }}>
      {children}
    </AdminContext.Provider>
  )
}
