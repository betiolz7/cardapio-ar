import { Link } from 'react-router'
import { formatPrice } from '../../lib/format.ts'
import type { MenuItem } from '../../lib/types.ts'

interface Props {
  item: MenuItem
  restaurantSlug: string
}

export function MenuItemCard({ item, restaurantSlug }: Props) {
  const image = item.photo_url ?? item.model?.poster_url ?? null

  return (
    <Link
      to={`/${restaurantSlug}/p/${item.slug}`}
      className={`group flex gap-4 rounded-lg border-2 border-ink/15 bg-surface p-3 transition-[border-color,box-shadow,transform] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-px active:translate-0 active:shadow-none ${
        item.is_available ? '' : 'opacity-55'
      }`}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-surface-2">
        {image && (
          <img src={image} alt="" width={96} height={96} loading="lazy" decoding="async" className="size-full object-cover" />
        )}
        {item.model && (
          <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-ink px-1.5 font-pixel text-xs leading-5 text-bg">
            3D
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-base font-bold leading-snug text-ink">{item.name}</h3>
        {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-display font-bold text-ink">{formatPrice(item.price_cents)}</span>
          {!item.is_available && <span className="text-xs font-semibold uppercase text-muted">Esgotado</span>}
          {item.is_available && item.model && <span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink ring-2 ring-ink">Ver na mesa →</span>}
        </div>
      </div>
    </Link>
  )
}
