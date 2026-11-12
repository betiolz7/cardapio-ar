import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { moveItem } from '../lib/list.ts'
import { useAdmin } from './admin-context.ts'
import { AdminHeader } from './AdminHeader.tsx'
import { createCategory, deleteCategory, listCategories, renameCategory, reorderCategories, type AdminCategory } from './data.ts'
import { Alert, Section, buttonDanger, buttonPrimary, buttonSecondary, inputClass } from './ui.tsx'

export function CategoriesPage() {
  const { membership } = useAdmin()
  const restaurantId = membership.restaurant.id
  const [data, setData] = useState<{ restaurantId: string; categories: AdminCategory[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = `Categorias · ${membership.restaurant.name}`
  }, [membership.restaurant.name])

  useEffect(() => {
    let active = true
    listCategories(restaurantId).then(
      (categories) => active && setData({ restaurantId, categories }),
      (e: unknown) => active && setError(e instanceof Error ? e.message : 'Erro ao carregar.'),
    )
    return () => {
      active = false
    }
  }, [restaurantId])

  const categories = data?.restaurantId === restaurantId ? data.categories : null
  const setCategories = (list: AdminCategory[]) => setData({ restaurantId, categories: list })

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setBusy(false)
    }
  }

  const onAdd = (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name || !categories) return
    void run(async () => {
      const created = await createCategory(restaurantId, name, categories.length + 1)
      setCategories([...categories, created])
      setNewName('')
    })
  }

  const onRename = (e: FormEvent) => {
    e.preventDefault()
    if (!editing || !categories) return
    const name = editing.name.trim()
    if (!name) return
    void run(async () => {
      await renameCategory(editing.id, name)
      setCategories(categories.map((c) => (c.id === editing.id ? { ...c, name } : c)))
      setEditing(null)
    })
  }

  const onMove = (from: number, to: number) => {
    if (!categories) return
    const reordered = moveItem(categories, from, to)
    if (reordered === categories) return
    void run(async () => {
      setCategories(reordered)
      try {
        await reorderCategories(restaurantId, reordered.map((c) => c.id))
      } catch (err) {
        setCategories(categories)
        throw err
      }
    })
  }

  const onDelete = (cat: AdminCategory) => {
    if (!categories || !window.confirm(`Excluir a categoria “${cat.name}”?`)) return
    void run(async () => {
      await deleteCategory(cat.id)
      setCategories(categories.filter((c) => c.id !== cat.id))
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      <AdminHeader />
      <nav className="py-2">
        <Link to="/admin" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">
          ← Voltar aos pratos
        </Link>
      </nav>

      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        <Section title="Categorias" description="A ordem aqui é a ordem das abas no cardápio.">
          {categories === null && !error && <p className="text-muted">Carregando…</p>}
          {categories?.length === 0 && <p className="text-muted">Nenhuma categoria ainda.</p>}
          <ul className="divide-y divide-line">
            {categories?.map((cat, idx) => (
              <li key={cat.id} className="flex flex-wrap items-center gap-2 py-3">
                {editing?.id === cat.id ? (
                  <form onSubmit={onRename} className="flex flex-1 gap-2">
                    <input
                      aria-label="Novo nome da categoria"
                      autoFocus
                      value={editing.name}
                      maxLength={60}
                      onChange={(e) => setEditing({ id: cat.id, name: e.target.value })}
                      className={inputClass}
                    />
                    <button type="submit" disabled={busy} className={buttonPrimary}>
                      Salvar
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className={buttonSecondary}>
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate font-semibold">{cat.name}</span>
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Subir ${cat.name}`} disabled={busy || idx === 0} onClick={() => onMove(idx, idx - 1)} className={`${buttonSecondary} w-12 px-0`}>
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Descer ${cat.name}`}
                        disabled={busy || idx === categories.length - 1}
                        onClick={() => onMove(idx, idx + 1)}
                        className={`${buttonSecondary} w-12 px-0`}
                      >
                        ↓
                      </button>
                      <button type="button" onClick={() => setEditing({ id: cat.id, name: cat.name })} className={buttonSecondary}>
                        Renomear
                      </button>
                      <button type="button" aria-label={`Excluir ${cat.name}`} disabled={busy} onClick={() => onDelete(cat)} className={`${buttonDanger} px-3`}>
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={onAdd} className="flex gap-2 border-t border-line pt-4">
            <input
              aria-label="Nome da nova categoria"
              placeholder="Nova categoria (ex.: Bebidas)"
              value={newName}
              maxLength={60}
              onChange={(e) => setNewName(e.target.value)}
              className={inputClass}
            />
            <button type="submit" disabled={busy || !newName.trim()} className={buttonPrimary}>
              Adicionar
            </button>
          </form>
        </Section>
      </div>
    </main>
  )
}
