import { currentDevice } from '../../lib/device.ts'

/** Aviso para quem abriu o link dentro do Instagram/Facebook/TikTok (o AR não funciona ali). */
export function InAppBrowserNotice() {
  const { kind } = currentDevice()
  const isAndroid = /Android/.test(navigator.userAgent)

  return (
    <div role="note" className="rounded-md border-2 border-ink bg-surface p-4 text-sm leading-relaxed shadow-px">
      <p className="font-semibold text-ink">Para ver o prato na sua mesa, abra no navegador.</p>
      <p className="mt-1 text-muted">
        {kind === 'in_app' && isAndroid
          ? 'Toque nos três pontinhos (⋮) no canto da tela e escolha “Abrir no Chrome”.'
          : 'Toque nos três pontinhos (···) no canto da tela e escolha “Abrir no navegador” ou “Abrir no Safari”.'}
      </p>
    </div>
  )
}
