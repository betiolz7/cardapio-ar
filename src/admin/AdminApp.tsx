import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { StatusScreen } from '../components/StatusScreen.tsx'
import { isSupabaseConfigured } from '../lib/env.ts'
import { useAdmin } from './admin-context.ts'
import { CategoriesPage } from './CategoriesPage.tsx'
import { canEdit } from './data.ts'
import { ItemFormPage } from './ItemFormPage.tsx'
import { ItemsPage } from './ItemsPage.tsx'
import { MetricsPage } from './MetricsPage.tsx'
import { PrintTablesPage } from './PrintTablesPage.tsx'
import { AdminGate } from './session.tsx'
import { TablesPage } from './TablesPage.tsx'

/** Telas só para owner/admin (o banco também barra; aqui é usabilidade). */
function EditorOnly({ children }: { children: ReactNode }) {
  const { membership } = useAdmin()
  if (!canEdit(membership.role)) return <StatusScreen title="Você não tem permissão para acessar esta página" />
  return children
}

/** Rotas /admin/*. Carregado sob demanda (React.lazy em App.tsx). */
export default function AdminApp() {
  if (!isSupabaseConfigured) {
    return <StatusScreen title="Painel indisponível no modo demonstração">Configure o Supabase no arquivo .env (veja o README).</StatusScreen>
  }
  return (
    <AdminGate>
      <Routes>
        <Route index element={<ItemsPage />} />
        <Route path="pratos/novo" element={<ItemFormPage />} />
        <Route path="pratos/:id" element={<ItemFormPage />} />
        <Route path="categorias" element={<EditorOnly><CategoriesPage /></EditorOnly>} />
        <Route path="mesas" element={<EditorOnly><TablesPage /></EditorOnly>} />
        <Route path="mesas/imprimir" element={<EditorOnly><PrintTablesPage /></EditorOnly>} />
        <Route path="metricas" element={<EditorOnly><MetricsPage /></EditorOnly>} />
        <Route path="*" element={<StatusScreen title="Página não encontrada" />} />
      </Routes>
    </AdminGate>
  )
}
