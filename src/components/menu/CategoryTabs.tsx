import type { MenuCategory } from '../../lib/types.ts'

interface Props {
  categories: MenuCategory[]
  active: string | null
  onChange: (categoryId: string | null) => void
}

export function CategoryTabs({ categories, active, onChange }: Props) {
  const tabs = [{ id: null, name: 'Todos' }, ...categories]

  return (
    <nav aria-label="Categorias" className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((tab) => {
          const selected = tab.id === active
          return (
            <li key={tab.id ?? 'all'} className="shrink-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(tab.id)}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${
                  selected ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink hover:bg-line'
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
