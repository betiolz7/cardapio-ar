import { NavLink } from 'react-router'
import { KodaLogo } from '../components/brand/Koda.tsx'
import { useAdmin } from './admin-context.ts'
import { canEdit } from './data.ts'
import { buttonSecondary } from './ui.tsx'

/** Cabeçalho comum do painel: restaurante, abas e ações. Staff só vê "Pratos". */
export function AdminHeader() {
  const { membership, memberships, selectRestaurant, signOut } = useAdmin()
  const { restaurant, role } = membership

  const tabs = [
    { to: '/admin', label: 'Pratos', end: true },
    ...(canEdit(role)
      ? [
          { to: '/admin/mesas', label: 'Mesas e QR', end: false },
          { to: '/admin/metricas', label: 'Métricas', end: false },
        ]
      : []),
  ]

  return (
    <header className="print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="min-w-0">
          <KodaLogo className="text-sm" dogClass="size-5" />
          {memberships.length > 1 ? (
            <select
              aria-label="Restaurante"
              value={restaurant.id}
              onChange={(e) => selectRestaurant(e.target.value)}
              className="mt-1 max-w-full rounded-md border-2 border-ink/15 bg-surface px-2 py-1 font-display text-xl font-bold"
            >
              {memberships.map((m) => (
                <option key={m.restaurant.id} value={m.restaurant.id}>
                  {m.restaurant.name}
                </option>
              ))}
            </select>
          ) : (
            <h1 className="mt-1 truncate text-2xl font-bold">{restaurant.name}</h1>
          )}
        </div>
        <div className="flex gap-2">
          <a href={`/${restaurant.slug}`} target="_blank" rel="noreferrer" className={buttonSecondary}>
            Ver cardápio
          </a>
          <button type="button" onClick={signOut} className={buttonSecondary}>
            Sair
          </button>
        </div>
      </div>

      {tabs.length > 1 && (
        <nav aria-label="Seções do painel" className="-mx-4 mb-2 border-b-2 border-ink/10 px-4">
          <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {tabs.map((tab) => (
              <li key={tab.to} className="shrink-0">
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `-mb-0.5 inline-flex min-h-12 items-center border-b-4 px-3 font-bold ${
                      isActive ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
