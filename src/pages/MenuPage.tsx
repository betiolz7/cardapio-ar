import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { MadeByKoda } from '../components/brand/Koda.tsx'
import { CategoryTabs } from '../components/menu/CategoryTabs.tsx'
import { MenuItemCard } from '../components/menu/MenuItemCard.tsx'
import { LoadingScreen, StatusScreen } from '../components/StatusScreen.tsx'
import { rememberTable, track } from '../lib/analytics.ts'
import { accentVars } from '../lib/color.ts'
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
        <button type="button" onClick={state.retry} className="btn-px mt-4 min-h-12 rounded-md bg-ink px-6 font-bold text-bg">
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
    <div style={accentVars(restaurant.theme_color) as CSSProperties | undefined}>
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <header className="pt-8 pb-5">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt=""
                width={56}
                height={56}
                className="size-14 rounded-md border-2 border-ink object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-14 place-items-center rounded-md border-2 border-ink bg-accent font-display text-2xl font-bold text-accent-ink"
              >
                {restaurant.name.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <h1 className="text-3xl font-bold leading-tight">{restaurant.name}</h1>
          </div>
          {withModel > 0 && (
            <p className="mt-4 flex items-start gap-2.5 rounded-md border-2 border-ink/10 bg-surface p-3 text-sm text-muted">
              <span className="shrink-0 rounded-sm bg-ink px-1.5 font-pixel text-xs leading-5 text-bg">3D</span>
              <span>Toque nos pratos marcados para girar em 3D e ver no tamanho real, em cima da sua mesa.</span>
            </p>
          )}
        </header>

        <CategoryTabs categories={filled} active={active} onChange={setActive} />

        {sections.map(({ category, items: sectionItems }) => (
          <section key={category.id} aria-labelledby={`cat-${category.id}`} className="mt-6">
            <h2 id={`cat-${category.id}`} className="mb-3 flex items-center gap-2 text-lg font-bold">
              <span aria-hidden="true" className="size-2.5 bg-accent ring-2 ring-ink" />
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

        <MadeByKoda />
      </main>
    </div>
  )
}
