import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { CategoryTabs } from '../components/menu/CategoryTabs.tsx'
import { MenuItemCard } from '../components/menu/MenuItemCard.tsx'
import { LoadingScreen, StatusScreen } from '../components/StatusScreen.tsx'
import { rememberTable, track } from '../lib/analytics.ts'
import { useMenu } from '../lib/menu.ts'
import type { Menu } from '../lib/types.ts'

export function MenuPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const state = useMenu(slug)

  // QR da mesa: /casa-lume?m=token
  useEffect(() => {
    rememberTable(params.get('m'))
  }, [params])

  if (state.status === 'loading') return <LoadingScreen />
  if (state.status === 'not-found') {
    return <StatusScreen title="Cardápio não encontrado">Confira o endereço ou escaneie o QR code de novo.</StatusScreen>
  }
  if (state.status === 'error') {
    return (
      <StatusScreen title="Não foi possível carregar o cardápio">
        <p>Verifique sua conexão.</p>
        <button type="button" onClick={state.retry} className="mt-4 min-h-12 rounded-full bg-accent px-6 font-semibold text-accent-ink">
          Tentar de novo
        </button>
      </StatusScreen>
    )
  }
  return <MenuView menu={state.menu} />
}

function MenuView({ menu }: { menu: Menu }) {
  const [active, setActive] = useState<string | null>(null)
  const { restaurant, categories, items } = menu

  useEffect(() => {
    document.title = `${restaurant.name} · Cardápio`
    track(restaurant.id, 'menu_view')
  }, [restaurant.id, restaurant.name])

  // Só categorias com pratos viram aba (uma aba vazia frustra o cliente).
  const filled = useMemo(() => categories.filter((c) => items.some((i) => i.category_id === c.id)), [categories, items])

  const sections = useMemo(
    () =>
      filled
        .filter((c) => active === null || c.id === active)
        .map((c) => ({ category: c, items: items.filter((i) => i.category_id === c.id) })),
    [filled, items, active],
  )

  const withModel = items.filter((i) => i.model).length

  return (
    <div style={restaurant.theme_color ? ({ '--accent': restaurant.theme_color } as CSSProperties) : undefined}>
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <header className="pt-8 pb-4">
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt="" width={56} height={56} className="mb-3 size-14 rounded-xl object-cover" />
          )}
          <h1 className="text-3xl font-bold tracking-tight">{restaurant.name}</h1>
          {withModel > 0 && (
            <p className="mt-2 text-sm text-muted">
              Toque nos pratos com <span className="font-bold text-accent">3D</span> para ver no tamanho real, em cima da sua mesa.
            </p>
          )}
        </header>

        <CategoryTabs categories={filled} active={active} onChange={setActive} />

        {sections.map(({ category, items: sectionItems }) => (
          <section key={category.id} aria-labelledby={`cat-${category.id}`} className="mt-6">
            <h2 id={`cat-${category.id}`} className="mb-3 text-lg font-semibold">
              {category.name}
            </h2>
            <ul className="space-y-3">
              {sectionItems.map((item) => (
                <li key={item.id}>
                  <MenuItemCard item={item} restaurantSlug={restaurant.slug} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}
