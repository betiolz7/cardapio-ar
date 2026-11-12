import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Membership } from './data.ts'
import { supabase } from './supabase.ts'

export interface AdminContextValue {
  session: Session
  membership: Membership
  memberships: Membership[]
  selectRestaurant: (restaurantId: string) => void
  signOut: () => Promise<void>
}

export const AdminContext = createContext<AdminContextValue | null>(null)

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin fora do AdminGate')
  return ctx
}

/** undefined = carregando; null = sem login. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}
