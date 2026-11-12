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
      className={`flex gap-4 rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2 ${
        item.is_available ? '' : 'opacity-55'
      }`}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface-2">
        {image && (
          <img src={image} alt="" width={96} height={96} loading="lazy" decoding="async" className="size-full object-cover" />
        )}
        {item.model && (
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-bg/85 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-accent">
            3D
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-base font-semibold leading-snug text-ink">{item.name}</h3>
        {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-ink">{formatPrice(item.price_cents)}</span>
          {!item.is_available && <span className="text-xs font-semibold uppercase text-muted">Esgotado</span>}
          {item.is_available && item.model && <span className="text-xs font-semibold text-accent">Ver na mesa →</span>}
        </div>
      </div>
    </Link>
  )
}
