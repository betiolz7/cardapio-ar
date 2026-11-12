import type { MenuCategory } from '../../lib/types.ts'

interface Props {
  categories: MenuCategory[]
  active: string | null
  onChange: (categoryId: string | null) => void
}

export function CategoryTabs({ categories, active, onChange }: Props) {
  const tabs = [{ id: null, name: 'Todos' }, ...categories]

  return (
    <nav aria-label="Categorias" className="sticky top-0 z-10 -mx-4 border-b-2 border-ink/10 bg-bg/95 px-4 py-3 backdrop-blur">
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((tab) => {
          const selected = tab.id === active
          return (
            <li key={tab.id ?? 'all'} className="shrink-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(tab.id)}
                className={`min-h-11 rounded-md border-2 px-4 text-sm font-bold transition-colors ${
                  selected ? 'border-ink bg-ink text-bg' : 'border-ink/15 bg-surface text-ink hover:border-ink'
                }`}
              >
                {tab.name}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
