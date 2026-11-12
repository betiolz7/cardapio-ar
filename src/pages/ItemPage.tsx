import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router'
import { InAppBrowserNotice } from '../components/ar/InAppBrowserNotice.tsx'
import { ModelViewer, type ArOutcome } from '../components/ar/ModelViewer.tsx'
import { MadeByKoda } from '../components/brand/Koda.tsx'
import { LoadingScreen, StatusScreen } from '../components/StatusScreen.tsx'
import { track } from '../lib/analytics.ts'
import { accentVars } from '../lib/color.ts'
import { currentDevice } from '../lib/device.ts'
import { formatDims, formatPrice, formatServes } from '../lib/format.ts'
import { useMenu } from '../lib/menu.ts'
import type { Menu, MenuItem } from '../lib/types.ts'

export function ItemPage() {
  const { slug, itemSlug } = useParams()
  const state = useMenu(slug)

  if (state.status === 'loading') return <LoadingScreen />
  if (state.status === 'error') {
    return (
      <StatusScreen title="Não foi possível carregar o prato">
        <button type="button" onClick={state.retry} className="btn-px mt-4 min-h-12 rounded-md bg-ink px-6 font-bold text-bg">
          Tentar de novo
        </button>
      </StatusScreen>
    )
  }
  const item = state.status === 'ready' ? state.menu.items.find((i) => i.slug === itemSlug) : undefined
  if (state.status === 'not-found' || !item) {
    return (
      <StatusScreen title="Prato não encontrado">
        {slug && (
          <Link to={`/${slug}`} className="font-semibold text-ink underline underline-offset-4">
            Voltar ao cardápio
          </Link>
        )}
      </StatusScreen>
    )
  }
  return <ItemView menu={state.menu} item={item} />
}

type ArMessage = null | 'unsupported' | 'failed'

function ItemView({ menu, item }: { menu: Menu; item: MenuItem }) {
  const { restaurant } = menu
  const { inApp } = currentDevice()
  const activateAR = useRef<(() => ArOutcome) | null>(null)
  const [modelReady, setModelReady] = useState(false)
  const [arMessage, setArMessage] = useState<ArMessage>(null)

  useEffect(() => {
    document.title = `${item.name} · ${restaurant.name}`
    track(restaurant.id, 'item_view', item.id)
  }, [restaurant.id, restaurant.name, item.id, item.name])

  const onReady = useCallback((fn: () => ArOutcome) => {
    activateAR.current = fn
    setModelReady(true)
  }, [])

  const onFirstInteraction = useCallback(() => track(restaurant.id, 'open_3d', item.id), [restaurant.id, item.id])
  // Ex.: Android sem os Serviços de RA do Google — o Scene Viewer volta para a página.
  const onArFailed = useCallback(() => {
    track(restaurant.id, 'ar_unsupported', item.id)
    setArMessage('failed')
  }, [restaurant.id, item.id])

  function openAR() {
    setArMessage(null)
    const outcome = activateAR.current?.() ?? 'unsupported'
    if (outcome === 'opened') {
      track(restaurant.id, 'open_ar', item.id)
    } else {
      track(restaurant.id, 'ar_unsupported', item.id)
      setArMessage('unsupported')
    }
  }

  const model = item.model
  const dims = model ? formatDims(model.dims_cm) : null
  const serves = formatServes(item.serves)

  return (
    <div style={accentVars(restaurant.theme_color) as CSSProperties | undefined}>
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <nav className="py-4">
          <Link to={`/${restaurant.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-muted hover:text-ink">
            ← {restaurant.name}
          </Link>
        </nav>

        <div className="relative aspect-square w-full overflow-hidden rounded-lg border-2 border-ink bg-surface bg-pixel-grid shadow-px-lg">
          {model ? (
            <ModelViewer
              model={model}
              alt={`${item.name} em 3D${dims ? `, ${dims}` : ''}`}
              onReady={onReady}
              onFirstInteraction={onFirstInteraction}
              onArFailed={onArFailed}
            />
          ) : item.photo_url ? (
            <img src={item.photo_url} alt={item.name} className="size-full object-cover" />
          ) : null}
        </div>

        {model && <p className="mt-3 text-center text-xs text-muted">Arraste para girar · pinça para aproximar</p>}

        <header className="mt-5">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold leading-tight">{item.name}</h1>
            <span className="shrink-0 rounded-md bg-ink px-2.5 py-1 font-display text-lg font-bold text-bg">{formatPrice(item.price_cents)}</span>
          </div>
          {(dims || serves) && <p className="mt-1 text-sm text-muted">{[dims, serves].filter(Boolean).join(' · ')}</p>}
          {!item.is_available && <p className="mt-2 text-sm font-semibold uppercase text-muted">Esgotado no momento</p>}
        </header>

        {item.description && <p className="mt-4 leading-relaxed text-ink/90">{item.description}</p>}

        {model && (
          <section className="mt-6 space-y-3" aria-label="Realidade aumentada">
            {inApp ? (
              <InAppBrowserNotice />
            ) : (
              <>
                <button
                  type="button"
                  onClick={openAR}
                  disabled={!modelReady}
                  className="btn-px flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-accent px-6 text-lg font-bold text-accent-ink disabled:opacity-50"
                >
                  {modelReady ? 'Ver na minha mesa' : 'Preparando o 3D…'}
                </button>
                <p className="text-center text-sm text-muted">
                  Aponte a câmera para a mesa e mova o celular devagar. Mesa de madeira funciona melhor que vidro ou toalha branca.
                </p>
              </>
            )}

            {arMessage === 'unsupported' && (
              <p role="status" className="rounded-md border-2 border-ink/10 bg-surface-2 p-4 text-sm text-muted">
                Este aparelho não abre a realidade aumentada. Você ainda pode girar o prato em 3D acima e ver as medidas reais.
              </p>
            )}
            {arMessage === 'failed' && (
              <p role="status" className="rounded-md border-2 border-ink/10 bg-surface-2 p-4 text-sm text-muted">
                Não foi possível abrir a realidade aumentada neste aparelho. Se apareceu um pedido de permissão da câmera, libere e
                tente de novo. Você ainda pode girar o prato em 3D acima.
              </p>
            )}
          </section>
        )}

        <MadeByKoda />
      </main>
    </div>
  )
}
