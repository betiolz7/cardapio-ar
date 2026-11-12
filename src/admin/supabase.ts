import { createClient } from '@supabase/supabase-js'
import { supabaseKey, supabaseUrl } from '../lib/env.ts'

// Só o painel importa este módulo (carregado sob demanda): o cardápio público
// não paga o peso do supabase-js.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export const BUCKET = 'menu'
