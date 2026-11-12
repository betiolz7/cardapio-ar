import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { StatusScreen } from './components/StatusScreen.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { ItemPage } from './pages/ItemPage.tsx'
import { MenuPage } from './pages/MenuPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

// Painel e login são carregados sob demanda: quem abre o cardápio pelo QR
// não baixa o supabase-js nem o código do painel.
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'))
const LoginPage = lazy(() => import('./admin/LoginPage.tsx'))

const loading = <StatusScreen title="Carregando…" />

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={
          <Suspense fallback={loading}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={loading}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route path="/:slug" element={<MenuPage />} />
      <Route path="/:slug/p/:itemSlug" element={<ItemPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
