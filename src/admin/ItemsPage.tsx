import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { formatPrice } from '../lib/format.ts'
import { moveItem } from '../lib/list.ts'
import { useAdmin } from './admin-context.ts'
import { AdminHeader } from './AdminHeader.tsx'
import {
  canEdit,
  listCategories,
  listItems,
  reorderItems,
  setAvailability,
  type AdminCategory,
  type AdminItem,
} from './data.ts'
import { Alert, buttonPrimary, buttonSecondary } from './ui.tsx'

export function ItemsPage() {
  const { membership } = useAdmin()
  const { restaurant, role } = membership
  const location = useLocation()
  const navigate = useNavigate()
  // Dados marcados com o restaurante: ao trocar de restaurante, os antigos não aparecem.
  const [data, setData] = useState<{ restaurantId: string; items: AdminItem[]; categories: AdminCategory[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [organizing, setOrganizing] = useState(false)
  const flash = (location.state as { flash?: string } | null)?.flash ?? null

  useEffect(() => {
    document.title = `Pratos · ${restaurant.name}`
  }, [restaurant.name])

  useEffect(() => {
    let active = true
    Promise.all([listCategories(restaurant.id), listItems(restaurant.id)]).then(
      ([categories, items]) => active && setData({ restaurantId: restaurant.id, items, categories }),
      (e: unknown) => active && setError(e instanceof Error ? e.message : 'Erro ao carregar.'),
    )
    return () => {
      active = false
    }
  }, [restaurant.id])

  const current = data?.restaurantId === restaurant.id ? data : null
  const items = current?.items ?? null
  const categories = current?.categories ?? []
  const setItems = (update: (list: AdminItem[]) => AdminItem[]) =>
    setData((d) => (d ? { ...d, items: update(d.items) } : d))

  // A mensagem "Prato salvo" aparece uma vez só.
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => navigate(location.pathname, { replace: true, state: null }), 4000)
    return () => clearTimeout(t)
  }, [flash, navigate, location.pathname])

  async function toggle(item: AdminItem) {
    const next = !item.is_available
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, is_available: next } : i)))
    try {
      await setAvailability(item.id, next)
    } catch (e) {
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, is_available: !next } : i)))
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    }
  }

  async function move(categoryId: string, list: AdminItem[], from: number, to: number) {
    const reordered = moveItem(list, from, to)
    if (reordered === list) return
    const position = new Map(reordered.map((it, idx) => [it.id, idx + 1]))
    const previous = items
    setItems((all) =>
      all.map((it) => (position.has(it.id) ? { ...it, position: position.get(it.id)! } : it)).sort((a, b) => a.position - b.position),
    )
    try {
      await reorderItems(categoryId, reordered.map((it) => it.id))
    } catch (e) {
      if (previous) setItems(() => previous)
      setError(e instanceof Error ? e.message : 'Erro ao salvar a ordem.')
    }
  }

  const editable = canEdit(role)
  const uncategorized = items?.filter((i) => !categories.some((c) => c.id === i.category_id)) ?? []

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      <AdminHeader />

      {flash && <Alert tone="success">{flash}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {editable && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link to="/admin/pratos/novo" className={`${buttonPrimary} flex-1 text-lg`}>
            + Cadastrar prato
          </Link>
          {items && items.length > 1 && (
            <button type="button" aria-pressed={organizing} onClick={() => setOrganizing((v) => !v)} className={buttonSecondary}>
              {organizing ? 'Concluir' : 'Organizar ordem'}
            </button>
          )}
          <Link to="/admin/categorias" className={buttonSecondary}>
            Categorias
          </Link>
        </div>
      )}

      {items === null && !error && <p className="mt-8 text-center text-muted">Carregando pratos…</p>}

      {items?.length === 0 && (
        <p className="mt-8 rounded-lg border border-dashed border-line p-6 text-center text-muted">
          Nenhum prato cadastrado ainda. Toque em “Cadastrar prato” para começar.
        </p>
      )}

      {items &&
        [...categories, ...(uncategorized.length ? [{ id: '', name: 'Sem categoria', position: 9999 }] : [])].map((cat) => {
          const list = cat.id ? items.filter((i) => i.category_id === cat.id) : uncategorized
          if (list.length === 0) return null
          return (
            <section key={cat.id || 'none'} className="mt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{cat.name}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {list.map((item, idx) => (
                  <li key={item.id} className="flex items-center gap-3 p-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      {item.photo_url && <img src={item.photo_url} alt="" className="size-full object-cover" loading="lazy" />}
                      {item.model && (
                        <span className="absolute bottom-0.5 left-0.5 rounded-sm bg-ink px-1 font-pixel text-[10px] leading-4 text-bg">3D</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {editable && !organizing ? (
                        <Link to={`/admin/pratos/${item.id}`} className="block truncate font-semibold hover:underline">
                          {item.name}
                        </Link>
                      ) : (
                        <p className="truncate font-semibold">{item.name}</p>
                      )}
                      <p className="text-sm text-muted">{formatPrice(item.price_cents)}</p>
                    </div>

                    {organizing && cat.id ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label={`Subir ${item.name}`}
                          disabled={idx === 0}
                          onClick={() => move(cat.id, list, idx, idx - 1)}
                          className={`${buttonSecondary} w-12 px-0`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Descer ${item.name}`}
                          disabled={idx === list.length - 1}
                          onClick={() => move(cat.id, list, idx, idx + 1)}
                          className={`${buttonSecondary} w-12 px-0`}
                        >
                          ↓
                        </button>
                      </div>
                    ) : (
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                        <span className={item.is_available ? 'text-ink' : 'text-muted'}>
                          {item.is_available ? 'Disponível' : 'Esgotado'}
                        </span>
                        <input
                          type="checkbox"
                          role="switch"
                          aria-label={`${item.name} disponível`}
                          checked={item.is_available}
                          onChange={() => toggle(item)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden
                          className="relative h-7 w-12 rounded-md border-2 border-ink bg-surface-2 transition-colors peer-checked:bg-ink peer-focus-visible:outline-3 peer-focus-visible:outline-sky after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-sm after:bg-ink after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-bg"
                        />
                      </label>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
    </main>
  )
}
