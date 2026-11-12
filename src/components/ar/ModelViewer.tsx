import type { ModelViewerElement } from '@google/model-viewer'
import { useEffect, useRef, useState } from 'react'
import type { MenuModel } from '../../lib/types.ts'

// Carrega o model-viewer (e o three.js) só quando um prato com 3D é aberto.
// Nunca entra no bundle inicial do cardápio (CONTEXT.md §8).
let loader: Promise<unknown> | null = null
function loadModelViewer() {
  loader ??= import('@google/model-viewer')
  return loader
}

export type ArOutcome = 'opened' | 'unsupported' | 'failed'

interface Props {
  model: MenuModel
  alt: string
  /** Primeira vez que a pessoa gira ou dá zoom no 3D. */
  onFirstInteraction?: () => void
  /** Expõe a função que abre o AR (precisa ser chamada dentro de um toque). */
  onReady?: (activateAR: () => ArOutcome) => void
  onArFailed?: () => void
}

export function ModelViewer({ model, alt, onFirstInteraction, onReady, onArFailed }: Props) {
  const ref = useRef<ModelViewerElement>(null)
  const [loadError, setLoadError] = useState(false)

  // Guarda os callbacks atuais sem recriar os listeners a cada render.
  const callbacks = useRef({ onFirstInteraction, onReady, onArFailed })
  useEffect(() => {
    callbacks.current = { onFirstInteraction, onReady, onArFailed }
  })

  useEffect(() => {
    loadModelViewer().catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let interacted = false

    const onLoad = () => {
      callbacks.current.onReady?.(() => {
        if (!el.canActivateAR) return 'unsupported'
        void el.activateAR()
        return 'opened'
      })
    }
    const onCamera = (e: Event) => {
      const source = (e as CustomEvent<{ source: string }>).detail?.source
      if (!interacted && source === 'user-interaction') {
        interacted = true
        callbacks.current.onFirstInteraction?.()
      }
    }
    const onArStatus = (e: Event) => {
      if ((e as CustomEvent<{ status: string }>).detail?.status === 'failed') {
        callbacks.current.onArFailed?.()
      }
    }
    const onError = () => setLoadError(true)

    el.addEventListener('load', onLoad)
    el.addEventListener('camera-change', onCamera)
    el.addEventListener('ar-status', onArStatus)
    el.addEventListener('error', onError)
    return () => {
      el.removeEventListener('load', onLoad)
      el.removeEventListener('camera-change', onCamera)
      el.removeEventListener('ar-status', onArStatus)
      el.removeEventListener('error', onError)
    }
  }, [model.glb_url])

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-muted">
        Não foi possível carregar o 3D. Verifique sua conexão.
      </div>
    )
  }

  return (
    <model-viewer
      ref={ref}
      src={model.glb_url}
      ios-src={model.usdz_url ?? undefined}
      poster={model.poster_url ?? undefined}
      alt={alt}
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-scale="fixed"
      ar-placement="floor"
      camera-controls
      camera-orbit="30deg 68deg auto"
      touch-action="pan-y"
      shadow-intensity="1"
      environment-image="neutral"
      loading="eager"
    >
      {/* Escondemos o botão padrão: o nosso fica fora do 3D, grande e com métrica. */}
      <span slot="ar-button" hidden />
    </model-viewer>
  )
}
