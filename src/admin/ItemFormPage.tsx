import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ModelViewer } from '../components/ar/ModelViewer.tsx'
import { StatusScreen } from '../components/StatusScreen.tsx'
import { formatDims } from '../lib/format.ts'
import { compressImage, type CompressedImage } from '../lib/image.ts'
import { checkModel, cm, suggestDims } from '../lib/model-rules.ts'
import { centsToInput, parseCm, parsePriceToCents, slugify } from '../lib/text.ts'
import type { DimsCm } from '../lib/types.ts'
import {
  canEdit,
  createCategory,
  createItem,
  deleteItem,
  getItem,
  listCategories,
  publishModel,
  unpublishModel,
  updateItem,
  updateModelDims,
  uploadFile,
  type AdminCategory,
  type AdminItem,
  type AdminModel,
} from './data.ts'
import { inspectGlb, type InspectedModel } from './model-inspect.ts'
import { useAdmin } from './admin-context.ts'
import { Alert, Field, Section, buttonDanger, buttonPrimary, buttonSecondary, inputClass } from './ui.tsx'

const NEW_CATEGORY = '__new'

export function ItemFormPage() {
  const { id } = useParams()
  const { membership } = useAdmin()
  const [data, setData] = useState<{ item: AdminItem | null; categories: AdminCategory[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listCategories(membership.restaurant.id), id ? getItem(id) : Promise.resolve(null)]).then(
      ([categories, item]) => active && setData({ categories, item }),
      (e: unknown) => active && setError(e instanceof Error ? e.message : 'Erro ao carregar.'),
    )
    return () => {
      active = false
    }
  }, [id, membership.restaurant.id])

  if (!canEdit(membership.role)) return <StatusScreen title="Você não tem permissão para editar pratos" />
  if (error) return <StatusScreen title={error} />
  if (!data) return <StatusScreen title="Carregando…" />
  if (id && !data.item) return <StatusScreen title="Prato não encontrado" />
  return <ItemForm key={id ?? 'novo'} initial={data.item} categories={data.categories} />
}

// ---------------------------------------------------------------------------

type ModelDraft = { kind: 'none' } | { kind: 'existing'; model: AdminModel } | { kind: 'new'; file: File; url: string }

type Inspect =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; result: InspectedModel }
  | { status: 'error'; message: string }

interface DimsForm {
  shape: 'round' | 'rect'
  diameter: string
  w: string
  d: string
  h: string
}

const fmt = (n: number) => String(n).replace('.', ',')

function dimsToForm(dims: DimsCm): DimsForm {
  return 'diameter' in dims
    ? { shape: 'round', diameter: fmt(dims.diameter), w: '', d: '', h: fmt(dims.h) }
    : { shape: 'rect', diameter: '', w: fmt(dims.w), d: fmt(dims.d), h: fmt(dims.h) }
}

function formToDims(f: DimsForm): DimsCm | null {
  const h = parseCm(f.h)
  if (!h) return null
  if (f.shape === 'round') {
    const diameter = parseCm(f.diameter)
    return diameter ? { diameter, h } : null
  }
  const w = parseCm(f.w)
  const d = parseCm(f.d)
  return w && d ? { w, d, h } : null
}

function ItemForm({ initial, categories: initialCategories }: { initial: AdminItem | null; categories: AdminCategory[] }) {
  const { membership } = useAdmin()
  const restaurantId = membership.restaurant.id
  const navigate = useNavigate()

  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [price, setPrice] = useState(initial ? centsToInput(initial.price_cents) : '')
  const [serves, setServes] = useState(initial?.serves ? String(initial.serves) : '')
  const [available, setAvailable] = useState(initial?.is_available ?? true)
  const [categories] = useState(initialCategories)
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? initialCategories[0]?.id ?? NEW_CATEGORY)
  const [newCategory, setNewCategory] = useState('')

  // Foto
  const [photoUrl] = useState(initial?.photo_url ?? null)
  const [photo, setPhoto] = useState<{ image: CompressedImage; preview: string } | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Modelo 3D
  const [model, setModel] = useState<ModelDraft>(initial?.model ? { kind: 'existing', model: initial.model } : { kind: 'none' })
  const [usdz, setUsdz] = useState<File | null>(null)
  const [inspect, setInspect] = useState<Inspect>({ status: 'idle' })
  const [dimsForm, setDimsForm] = useState<DimsForm>(
    initial?.model ? dimsToForm(initial.model.dims_cm) : { shape: 'round', diameter: '', w: '', d: '', h: '' },
  )

  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<string | null>(null)
  const createdId = useRef<string | null>(initial?.id ?? null)

  useEffect(() => {
    document.title = initial ? `Editar ${initial.name}` : 'Cadastrar prato'
  }, [initial])

  // Libera as URLs temporárias de pré-visualização.
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.preview)
  }, [photo])
  useEffect(() => () => {
    if (model.kind === 'new') URL.revokeObjectURL(model.url)
  }, [model])

  // Lê o modelo (novo ou o já publicado) para medir e validar.
  const modelSource = model.kind === 'new' ? model.url : model.kind === 'existing' ? model.model.glb_url : null
  useEffect(() => {
    if (!modelSource) {
      setInspect({ status: 'idle' })
      return
    }
    let active = true
    setInspect({ status: 'loading' })
    fetch(modelSource)
      .then((r) => {
        if (!r.ok) throw new Error('Não consegui baixar o modelo.')
        return r.arrayBuffer()
      })
      .then((buf) => inspectGlb(buf, false))
      .then(
        (result) => {
          if (!active) return
          setInspect({ status: 'ready', result })
          // Modelo novo: sugere as medidas lidas do arquivo.
          if (model.kind === 'new') setDimsForm(dimsToForm(suggestDims(result.facts.size)))
        },
        (e: unknown) => active && setInspect({ status: 'error', message: e instanceof Error ? e.message : 'Erro ao ler o modelo.' }),
      )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando o arquivo muda
  }, [modelSource])

  const dims = formToDims(dimsForm)
  const hasUsdz = model.kind === 'new' ? usdz !== null : model.kind === 'existing' ? model.model.usdz_url !== null : false
  // Valida o arquivo sempre (escala, base, tamanho), mesmo sem medidas válidas:
  // um modelo em centímetros gera medidas absurdas e o erro precisa aparecer.
  const report = inspect.status === 'ready' ? checkModel({ ...inspect.result.facts, hasUsdz }, { dims }) : null

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      const image = await compressImage(file)
      setPhoto({ image, preview: URL.createObjectURL(image.blob) })
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Não consegui usar essa foto.')
    } finally {
      setPhotoBusy(false)
    }
  }

  function onModel(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/\.glb$/i.test(file.name)) {
      setInspect({ status: 'error', message: 'Escolha um arquivo .glb (exportado do app de escaneamento).' })
      return
    }
    setUsdz(null)
    setModel({ kind: 'new', file, url: URL.createObjectURL(file) })
  }

  function onUsdz(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file && /\.usdz$/i.test(file.name)) setUsdz(file)
  }

  function validate(): string | null {
    if (!name.trim()) return 'Informe o nome do prato.'
    if (!slugify(name)) return 'O nome precisa ter letras ou números.'
    if (parsePriceToCents(price) === null) return 'Preço inválido. Exemplo: 32,90'
    if (serves && !/^\d+$/.test(serves)) return 'Em “serve quantas pessoas”, use um número inteiro.'
    if (serves && (Number(serves) < 1 || Number(serves) > 20)) return '“Serve quantas pessoas” deve ser de 1 a 20.'
    if (categoryId === NEW_CATEGORY && !newCategory.trim()) return 'Informe o nome da nova categoria.'
    if (model.kind !== 'none') {
      if (!photo && !photoUrl) return 'Adicione uma foto do prato. Ela aparece enquanto o 3D carrega e para quem não pode ver o 3D.'
      if (inspect.status === 'loading') return 'Aguarde a leitura do modelo 3D.'
      if (model.kind === 'new' && inspect.status === 'error') return inspect.message
      if (!dims) return 'Informe as medidas do prato em centímetros.'
      if (report?.errors.length) return 'Corrija os problemas do modelo 3D antes de salvar.'
    }
    return null
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    const slug = initial?.slug ?? slugify(name)

    try {
      let category = categoryId
      if (category === NEW_CATEGORY) {
        setStep('Criando categoria…')
        category = (await createCategory(restaurantId, newCategory.trim(), categories.length + 1)).id
      }

      let finalPhotoUrl = photoUrl
      if (photo) {
        setStep('Enviando foto…')
        finalPhotoUrl = await uploadFile(restaurantId, slug, photo.image.ext, photo.image.blob, photo.image.contentType)
      }

      setStep('Salvando prato…')
      const input = {
        category_id: category,
        name: name.trim(),
        description: description.trim(),
        price_cents: parsePriceToCents(price)!,
        serves: serves ? Number(serves) : null,
        is_available: available,
        photo_url: finalPhotoUrl,
      }
      if (createdId.current) await updateItem(createdId.current, input)
      else createdId.current = await createItem(restaurantId, slug, input)
      const itemId = createdId.current

      if (model.kind === 'new' && inspect.status === 'ready' && dims) {
        setStep('Enviando modelo 3D…')
        const glbUrl = await uploadFile(restaurantId, slug, 'glb', model.file, 'model/gltf-binary')
        const usdzUrl = usdz ? await uploadFile(restaurantId, slug, 'usdz', usdz, 'model/vnd.usdz+zip') : null
        setStep('Publicando 3D…')
        await publishModel({ itemId, glbUrl, usdzUrl, dims, bbox: inspect.result.bbox, sizeBytes: model.file.size })
      } else if (model.kind === 'existing' && dims && JSON.stringify(dims) !== JSON.stringify(model.model.dims_cm)) {
        await updateModelDims(model.model.id, dims)
      } else if (model.kind === 'none' && initial?.model) {
        await unpublishModel(itemId)
      }

      navigate('/admin', { state: { flash: `“${input.name}” foi salvo.` } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setStep(null)
    }
  }

  async function onDelete() {
    if (!initial || !window.confirm(`Excluir “${initial.name}”? Isso não pode ser desfeito.`)) return
    try {
      setStep('Excluindo…')
      await deleteItem(initial.id)
      navigate('/admin', { state: { flash: `“${initial.name}” foi excluído.` } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.')
      setStep(null)
    }
  }

  const saving = step !== null
  const shownPhoto = photo?.preview ?? photoUrl
  const facts = inspect.status === 'ready' ? inspect.result.facts : null
  // A prévia só precisa do arquivo; as medidas aqui não mudam a escala do 3D.
  const previewModel = modelSource
    ? { glb_url: modelSource, usdz_url: null, poster_url: null, dims_cm: dims ?? { diameter: 1, h: 1 } }
    : null

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32">
      <nav className="py-4">
        <Link to="/admin" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">
          ← Voltar aos pratos
        </Link>
      </nav>
      <h1 className="mb-5 text-2xl font-bold">{initial ? `Editar ${initial.name}` : 'Cadastrar prato'}</h1>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {/* 1. Foto ------------------------------------------------------- */}
        <Section title="Foto do prato" description="Prato inteiro, com boa luz e fundo neutro. A foto é comprimida antes de enviar.">
          <div className="flex items-center gap-4">
            <div className="size-28 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              {shownPhoto ? (
                <img src={shownPhoto} alt="Foto do prato" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">Sem foto</div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className={`${buttonPrimary} cursor-pointer`}>
                {photoBusy ? 'Processando…' : 'Tirar foto'}
                <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="sr-only" disabled={photoBusy} />
              </label>
              <label className={`${buttonSecondary} cursor-pointer`}>
                Escolher da galeria
                <input type="file" accept="image/*" onChange={onPhoto} className="sr-only" disabled={photoBusy} data-testid="photo-input" />
              </label>
            </div>
          </div>
          {photo && (
            <p className="text-sm text-muted">
              Foto pronta: {photo.image.width}×{photo.image.height} px, {Math.round(photo.image.blob.size / 1024)} KB.
            </p>
          )}
          {photoError && <Alert tone="error">{photoError}</Alert>}
        </Section>

        {/* 2. Informações ------------------------------------------------- */}
        <Section title="Informações">
          <Field label="Nome do prato" htmlFor="name" hint={initial ? `Endereço: /${membership.restaurant.slug}/p/${initial.slug}` : undefined}>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputClass} placeholder="Ex.: X-Bacon" />
          </Field>

          <Field label="Categoria" htmlFor="category">
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={NEW_CATEGORY}>+ Nova categoria</option>
            </select>
          </Field>
          {categoryId === NEW_CATEGORY && (
            <Field label="Nome da nova categoria" htmlFor="new-category">
              <input
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                maxLength={60}
                className={inputClass}
                placeholder="Ex.: Lanches"
              />
            </Field>
          )}

          <Field label="Descrição" htmlFor="description" hint={`${description.length}/600`}>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={600}
              rows={3}
              className={`${inputClass} py-3`}
              placeholder="Ingredientes, tamanho, acompanhamentos…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)" htmlFor="price">
              <input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="32,90" />
            </Field>
            <Field label="Serve quantas pessoas" htmlFor="serves">
              <input id="serves" inputMode="numeric" value={serves} onChange={(e) => setServes(e.target.value)} className={inputClass} placeholder="1" />
            </Field>
          </div>

          <label className="flex min-h-12 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
            <span>Disponível no cardápio</span>
          </label>
        </Section>

        {/* 3. Modelo 3D ----------------------------------------------------- */}
        <Section
          title="Modelo 3D (opcional)"
          description="Escaneie o prato num app de escaneamento (RealityScan, Polycam…) e exporte em .glb. As medidas são lidas do arquivo; confira com uma régua no prato real."
        >
          {model.kind === 'none' ? (
            <label className={`${buttonSecondary} w-full cursor-pointer`}>
              Escolher arquivo .glb
              <input type="file" accept=".glb,model/gltf-binary" onChange={onModel} className="sr-only" data-testid="model-input" />
            </label>
          ) : (
            <>
              {previewModel && (
                <div className="aspect-square max-h-80 w-full overflow-hidden rounded-xl border border-line bg-gradient-to-b from-surface-2 to-surface">
                  <ModelViewer key={previewModel.glb_url} model={previewModel} alt={`Prévia 3D de ${name || 'prato'}`} />
                </div>
              )}

              {inspect.status === 'loading' && <p className="text-sm text-muted">Lendo o modelo…</p>}
              {inspect.status === 'error' && <Alert tone="error">{inspect.message}</Alert>}

              {facts && (
                <p className="text-sm text-muted" data-testid="model-measures">
                  Medidas lidas do arquivo: {cm(facts.size.x)} × {cm(facts.size.z)}, {cm(facts.size.y)} de altura ·{' '}
                  {Math.round(facts.bytes / 1024)} KB
                </p>
              )}

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold">Medidas do prato real (cm)</legend>
                <div className="flex gap-2" role="radiogroup" aria-label="Formato do prato">
                  {(['round', 'rect'] as const).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      role="radio"
                      aria-checked={dimsForm.shape === shape}
                      onClick={() => setDimsForm((f) => ({ ...f, shape }))}
                      className={`min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold ${
                        dimsForm.shape === shape ? 'border-accent bg-accent/15 text-ink' : 'border-line bg-surface-2 text-muted'
                      }`}
                    >
                      {shape === 'round' ? 'Redondo' : 'Retangular'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {dimsForm.shape === 'round' ? (
                    <Field label="Diâmetro" htmlFor="dim-diameter">
                      <input id="dim-diameter" inputMode="decimal" value={dimsForm.diameter} onChange={(e) => setDimsForm((f) => ({ ...f, diameter: e.target.value }))} className={inputClass} />
                    </Field>
                  ) : (
                    <>
                      <Field label="Largura" htmlFor="dim-w">
                        <input id="dim-w" inputMode="decimal" value={dimsForm.w} onChange={(e) => setDimsForm((f) => ({ ...f, w: e.target.value }))} className={inputClass} />
                      </Field>
                      <Field label="Profund." htmlFor="dim-d">
                        <input id="dim-d" inputMode="decimal" value={dimsForm.d} onChange={(e) => setDimsForm((f) => ({ ...f, d: e.target.value }))} className={inputClass} />
                      </Field>
                    </>
                  )}
                  <Field label="Altura" htmlFor="dim-h">
                    <input id="dim-h" inputMode="decimal" value={dimsForm.h} onChange={(e) => setDimsForm((f) => ({ ...f, h: e.target.value }))} className={inputClass} />
                  </Field>
                </div>
                {dims && <p className="text-sm text-muted">No cardápio: {formatDims(dims)}</p>}
              </fieldset>

              {model.kind === 'new' && (
                <label className={`${buttonSecondary} w-full cursor-pointer text-sm`}>
                  {usdz ? `iPhone: ${usdz.name} ✓` : 'Adicionar arquivo para iPhone (.usdz), opcional'}
                  <input type="file" accept=".usdz,model/vnd.usdz+zip" onChange={onUsdz} className="sr-only" />
                </label>
              )}

              {report && report.errors.length > 0 && (
                <Alert tone="error">
                  <ul className="list-disc space-y-1 pl-4">
                    {report.errors.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              {report && report.warnings.length > 0 && (
                <Alert tone="warning">
                  <ul className="list-disc space-y-1 pl-4">
                    {report.warnings.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              {report && report.errors.length === 0 && <Alert tone="success">Modelo 3D aprovado: escala em metros e base apoiada na mesa.</Alert>}

              <div className="flex gap-2">
                <label className={`${buttonSecondary} flex-1 cursor-pointer`}>
                  Trocar modelo
                  <input type="file" accept=".glb,model/gltf-binary" onChange={onModel} className="sr-only" />
                </label>
                <button type="button" onClick={() => setModel({ kind: 'none' })} className={`${buttonDanger} flex-1`}>
                  Remover 3D
                </button>
              </div>
            </>
          )}
        </Section>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-2">
            {initial && (
              <button type="button" onClick={onDelete} disabled={saving} className={buttonDanger}>
                Excluir
              </button>
            )}
            <button type="submit" disabled={saving || photoBusy} className={`${buttonPrimary} flex-1 text-lg`}>
              {step ?? 'Salvar prato'}
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
