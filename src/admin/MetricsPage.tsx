import { useEffect, useState } from 'react'
import { useAdmin } from './admin-context.ts'
import { AdminHeader } from './AdminHeader.tsx'
import { getMetrics, type Metrics } from './data.ts'
import { Alert, Section } from './ui.tsx'

const PERIODS = [7, 30, 90] as const

const DEVICE_LABEL: Record<Metrics['devices'][number]['device'], string> = {
  ios: 'iPhone / iPad',
  android: 'Android',
  desktop: 'Computador',
  in_app: 'Dentro do Instagram/Facebook',
  other: 'Outros',
}

const int = new Intl.NumberFormat('pt-BR')
const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : '—')
/** "2026-11-12" → "12/11" */
const shortDate = (day: string) => {
  const [, m, d] = day.slice(0, 10).split('-')
  return `${d}/${m}`
}

export function MetricsPage() {
  const { membership } = useAdmin()
  const { restaurant } = membership
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30)
  const [data, setData] = useState<{ key: string; metrics: Metrics } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = `${restaurant.id}:${days}`

  useEffect(() => {
    document.title = `Métricas · ${restaurant.name}`
  }, [restaurant.name])

  useEffect(() => {
    let active = true
    getMetrics(restaurant.id, days).then(
      (metrics) => active && setData({ key, metrics }),
      (e: unknown) => active && setError(e instanceof Error ? e.message : 'Erro ao carregar.'),
    )
    return () => {
      active = false
    }
  }, [restaurant.id, days, key])

  const metrics = data?.key === key ? data.metrics : null
  const t = metrics?.totals
  const inApp = metrics?.devices.find((d) => d.device === 'in_app')?.sessions ?? 0

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      <AdminHeader />

      <div className="mt-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Resumo</h2>
        <div role="radiogroup" aria-label="Período" className="flex gap-1 rounded-md bg-surface-2 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={days === p}
              onClick={() => setDays(p)}
              className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${days === p ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
      {!metrics && !error && <p className="mt-8 text-center text-muted">Carregando métricas…</p>}

      {metrics && t && (
        <div className="mt-4 space-y-5">
          {t.sessions === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-6 text-center text-muted">
              Ainda não há visitas neste período. Coloque os QR codes nas mesas para começar a medir.
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Visitas ao cardápio" value={int.format(t.sessions)} />
                <Stat label="Pratos abertos" value={int.format(t.item_view)} />
                <Stat label="Giraram o 3D" value={int.format(t.open_3d)} />
                <Stat label="Viram na mesa (AR)" value={int.format(t.open_ar)} hint={`${pct(t.ar_sessions, t.sessions)} das visitas`} />
              </dl>

              <Section title="Visitas por dia">
                <DailyBars data={metrics.by_day} />
              </Section>

              <Section title="Pratos mais vistos" description="AR = vezes que o cliente abriu o prato na mesa pela câmera.">
                {metrics.by_item.length === 0 ? (
                  <p className="text-muted">Nenhum prato aberto neste período.</p>
                ) : (
                  <div className="-mx-4 overflow-x-auto px-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-left text-muted">
                          <th scope="col" className="py-2 pr-2 font-semibold">Prato</th>
                          <th scope="col" className="px-2 py-2 text-right font-semibold">Aberto</th>
                          <th scope="col" className="px-2 py-2 text-right font-semibold">3D</th>
                          <th scope="col" className="py-2 pl-2 text-right font-semibold">AR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.by_item.map((row) => (
                          <tr key={row.item_id} className="border-b border-line/60 last:border-0">
                            <th scope="row" className="py-2.5 pr-2 text-left font-medium">{row.name}</th>
                            <td className="px-2 py-2.5 text-right tabular-nums">{int.format(row.item_view)}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums">{int.format(row.open_3d)}</td>
                            <td className="py-2.5 pl-2 text-right tabular-nums">{int.format(row.open_ar)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              <Section title="Por mesa" description="Visitas que chegaram pelo QR code de cada mesa.">
                {metrics.by_table.length === 0 ? (
                  <p className="text-muted">Nenhuma visita veio pelo QR das mesas neste período.</p>
                ) : (
                  <ul className="divide-y divide-line/60 text-sm">
                    {metrics.by_table.map((row) => (
                      <li key={row.table_id} className="flex justify-between py-2.5">
                        <span className="font-medium">{row.label}</span>
                        <span className="tabular-nums text-muted">
                          {int.format(row.sessions)} {row.sessions === 1 ? 'visita' : 'visitas'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Aparelhos">
                <ul className="divide-y divide-line/60 text-sm">
                  {metrics.devices.map((row) => (
                    <li key={row.device} className="flex justify-between py-2.5">
                      <span className="font-medium">{DEVICE_LABEL[row.device]}</span>
                      <span className="tabular-nums text-muted">{pct(row.sessions, t.sessions)}</span>
                    </li>
                  ))}
                </ul>
                {inApp > 0 && (
                  <Alert tone="warning">
                    {pct(inApp, t.sessions)} das visitas abriram o cardápio dentro do Instagram/Facebook, onde a realidade aumentada não
                    funciona. Nas divulgações, peça para abrir o link no navegador.
                  </Alert>
                )}
                {t.ar_unsupported > 0 && (
                  <p className="text-sm text-muted">
                    {int.format(t.ar_unsupported)} {t.ar_unsupported === 1 ? 'tentativa' : 'tentativas'} de AR em aparelho sem suporte (o
                    cliente viu o 3D na tela).
                  </p>
                )}
              </Section>
            </>
          )}
        </div>
      )}
    </main>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  )
}

/** Barras de visitas por dia: uma série, toque/hover mostra o valor; tabela equivalente abaixo. */
function DailyBars({ data }: { data: Metrics['by_day'] }) {
  const [active, setActive] = useState(data.length - 1)
  const max = Math.max(1, ...data.map((d) => d.sessions))
  const current = data[Math.min(active, data.length - 1)]

  return (
    <div>
      <p className="mb-2 h-5 text-sm" aria-live="polite">
        {current && (
          <>
            <span className="font-semibold">{shortDate(current.day)}</span>
            <span className="text-muted">
              {' '}
              · {int.format(current.sessions)} {current.sessions === 1 ? 'visita' : 'visitas'}
              {current.open_ar > 0 && ` · ${int.format(current.open_ar)} AR`}
            </span>
          </>
        )}
      </p>
      <div className="relative pt-5">
        <span className="absolute top-0 right-0 text-[11px] text-muted tabular-nums">máx. {int.format(max)}</span>
        <div className="flex h-36 items-end gap-[2px] border-b border-line" role="group" aria-label="Visitas por dia">
          {data.map((d, i) => (
            <button
              key={d.day}
              type="button"
              aria-label={`${shortDate(d.day)}: ${d.sessions} ${d.sessions === 1 ? 'visita' : 'visitas'}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className="group flex h-full flex-1 items-end justify-center focus-visible:outline-2"
            >
              <span
                className={`block w-full max-w-6 rounded-t-[4px] transition-opacity ${i === active ? 'bg-accent' : 'bg-chart group-hover:opacity-80'}`}
                style={{ height: d.sessions > 0 ? `max(2px, ${(d.sessions / max) * 100}%)` : 0 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{data[0] && shortDate(data[0].day)}</span>
        <span>{data.at(-1) && shortDate(data.at(-1)!.day)}</span>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">Ver em tabela</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="py-1 font-semibold">Dia</th>
              <th scope="col" className="py-1 text-right font-semibold">Visitas</th>
              <th scope="col" className="py-1 text-right font-semibold">AR</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td className="py-0.5">{shortDate(d.day)}</td>
                <td className="py-0.5 text-right tabular-nums">{d.sessions}</td>
                <td className="py-0.5 text-right tabular-nums">{d.open_ar}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
