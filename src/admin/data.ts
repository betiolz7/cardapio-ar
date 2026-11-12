import type { DimsCm } from '../lib/types.ts'
import { BUCKET, supabase } from './supabase.ts'

export type Role = 'owner' | 'admin' | 'staff'

export interface AdminRestaurant {
  id: string
  slug: string
  name: string
  theme_color: string | null
}

export interface Membership {
  role: Role
  restaurant: AdminRestaurant
}

export interface AdminCategory {
  id: string
  name: string
  position: number
}

export interface AdminModel {
  id: string
  version: number
  glb_url: string
  usdz_url: string | null
  poster_url: string | null
  dims_cm: DimsCm
  status: 'draft' | 'published'
}

export interface AdminItem {
  id: string
  slug: string
  category_id: string
  name: string
  description: string
  price_cents: number
  serves: number | null
  photo_url: string | null
  is_available: boolean
  position: number
  model: AdminModel | null // só o publicado
}

/** Erro com mensagem pronta para mostrar na tela. */
export class AdminError extends Error {}

function fail(error: { code?: string; message: string } | null, fallback: string): never {
  if (error?.code === '23505') throw new AdminError('Já existe um prato com esse nome neste restaurante.')
  if (error?.code === '42501') throw new AdminError('Você não tem permissão para fazer isso.')
  if (error?.code === 'check_violation' || error?.code === '23514') throw new AdminError(error.message)
  throw new AdminError(fallback)
}

export function canEdit(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export async function listMemberships(): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('role, restaurant:restaurants(id, slug, name, theme_color)')
  if (error) fail(error, 'Não foi possível carregar seus restaurantes.')
  return (data ?? []) as unknown as Membership[]
}

export async function listCategories(restaurantId: string): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, position')
    .eq('restaurant_id', restaurantId)
    .order('position')
    .order('name')
  if (error) fail(error, 'Não foi possível carregar as categorias.')
  return data ?? []
}

export async function createCategory(restaurantId: string, name: string, position: number): Promise<AdminCategory> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ restaurant_id: restaurantId, name, position })
    .select('id, name, position')
    .single()
  if (error || !data) fail(error, 'Não foi possível criar a categoria.')
  return data
}

const ITEM_COLUMNS =
  'id, slug, category_id, name, description, price_cents, serves, photo_url, is_available, position, ' +
  'item_models(id, version, glb_url, usdz_url, poster_url, dims_cm, status)'

type ItemRow = Omit<AdminItem, 'model'> & { item_models: AdminModel[] }

function toItem(row: ItemRow): AdminItem {
  const { item_models, ...rest } = row
  return { ...rest, model: item_models.find((m) => m.status === 'published') ?? null }
}

export async function listItems(restaurantId: string): Promise<AdminItem[]> {
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_COLUMNS)
    .eq('restaurant_id', restaurantId)
    .order('position')
    .order('name')
  if (error) fail(error, 'Não foi possível carregar os pratos.')
  return ((data ?? []) as unknown as ItemRow[]).map(toItem)
}

export async function getItem(id: string): Promise<AdminItem | null> {
  const { data, error } = await supabase.from('items').select(ITEM_COLUMNS).eq('id', id).maybeSingle()
  if (error) fail(error, 'Não foi possível carregar o prato.')
  return data ? toItem(data as unknown as ItemRow) : null
}

export interface ItemInput {
  category_id: string
  name: string
  description: string
  price_cents: number
  serves: number | null
  is_available: boolean
  photo_url: string | null
}

export async function createItem(restaurantId: string, slug: string, input: ItemInput): Promise<string> {
  const { data, error } = await supabase
    .from('items')
    .insert({ restaurant_id: restaurantId, slug, ...input })
    .select('id')
    .single()
  if (error || !data) fail(error, 'Não foi possível salvar o prato.')
  return data.id
}

export async function updateItem(id: string, input: ItemInput): Promise<void> {
  const { error } = await supabase.from('items').update(input).eq('id', id)
  if (error) fail(error, 'Não foi possível salvar o prato.')
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) fail(error, 'Não foi possível excluir o prato.')
}

export async function setAvailability(itemId: string, available: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_item_availability', { p_item_id: itemId, p_available: available })
  if (error) fail(error, 'Não foi possível mudar a disponibilidade.')
}

export async function publishModel(args: {
  itemId: string
  glbUrl: string
  usdzUrl: string | null
  dims: DimsCm
  bbox: unknown
  sizeBytes: number
}): Promise<void> {
  const { error } = await supabase.rpc('publish_item_model', {
    p_item_id: args.itemId,
    p_glb_url: args.glbUrl,
    p_usdz_url: args.usdzUrl,
    p_poster_url: null,
    p_dims_cm: args.dims,
    p_bbox_m: args.bbox,
    p_size_bytes: args.sizeBytes,
  })
  if (error) fail(error, 'Não foi possível publicar o modelo 3D.')
}

export async function updateModelDims(modelId: string, dims: DimsCm): Promise<void> {
  const { error } = await supabase.from('item_models').update({ dims_cm: dims }).eq('id', modelId)
  if (error) fail(error, 'Não foi possível salvar as medidas.')
}

export async function unpublishModel(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('item_models')
    .update({ status: 'draft' })
    .eq('item_id', itemId)
    .eq('status', 'published')
  if (error) fail(error, 'Não foi possível remover o 3D.')
}

/**
 * Sobe um arquivo para {restaurantId}/{nome} e devolve a URL pública.
 * Nome único (carimbo de tempo): nunca sobrescreve, o cache pode ser eterno.
 */
export async function uploadFile(
  restaurantId: string,
  baseName: string,
  ext: string,
  body: Blob,
  contentType: string,
): Promise<string> {
  const path = `${restaurantId}/${baseName}.${Date.now().toString(36)}.${ext}`
  // O supabase-js envia File/Blob como formulário e o servidor usa o tipo do
  // próprio Blob (não a opção contentType). Um .glb vindo do seletor de arquivos
  // chega com tipo vazio e seria recusado pelo bucket: forçamos o tipo aqui.
  const typed = body.type === contentType ? body : new Blob([body], { type: contentType })
  const { error } = await supabase.storage.from(BUCKET).upload(path, typed, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) {
    if (import.meta.env.DEV) console.error('[upload]', error)
    const msg = /maximum allowed size|too large/i.test(error.message)
      ? 'Arquivo grande demais (máximo de 10 MB).'
      : /mime|content type/i.test(error.message)
        ? 'Tipo de arquivo não aceito.'
        : 'Não foi possível enviar o arquivo. Verifique sua conexão.'
    throw new AdminError(msg)
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Categorias -----------------------------------------------------------------

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ name }).eq('id', id)
  if (error) fail(error, 'Não foi possível renomear a categoria.')
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error?.code === '23503') throw new AdminError('Esta categoria ainda tem pratos. Mova ou exclua os pratos antes.')
  if (error) fail(error, 'Não foi possível excluir a categoria.')
}

export async function reorderCategories(restaurantId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_categories', { p_restaurant_id: restaurantId, p_ids: ids })
  if (error) fail(error, 'Não foi possível salvar a ordem.')
}

export async function reorderItems(categoryId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_items', { p_category_id: categoryId, p_ids: ids })
  if (error) fail(error, 'Não foi possível salvar a ordem.')
}

// Mesas ----------------------------------------------------------------------

export interface AdminTable {
  id: string
  label: string
  token: string
}

/** Código do QR: 12 caracteres hexadecimais aleatórios (o banco garante que é único). */
export function newTableToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const byLabel = (a: AdminTable, b: AdminTable) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true })

export async function listTables(restaurantId: string): Promise<AdminTable[]> {
  const { data, error } = await supabase.from('tables').select('id, label, token').eq('restaurant_id', restaurantId)
  if (error) fail(error, 'Não foi possível carregar as mesas.')
  return (data ?? []).sort(byLabel)
}

export async function createTables(restaurantId: string, labels: string[]): Promise<void> {
  const rows = labels.map((label) => ({ restaurant_id: restaurantId, label, token: newTableToken() }))
  const { error } = await supabase.from('tables').insert(rows)
  if (error?.code === '23505') throw new AdminError('Já existe uma mesa com esse nome.')
  if (error) fail(error, 'Não foi possível criar as mesas.')
}

export async function renameTable(id: string, label: string): Promise<void> {
  const { error } = await supabase.from('tables').update({ label }).eq('id', id)
  if (error?.code === '23505') throw new AdminError('Já existe uma mesa com esse nome.')
  if (error) fail(error, 'Não foi possível renomear a mesa.')
}

export async function regenerateTableToken(id: string): Promise<void> {
  const { error } = await supabase.from('tables').update({ token: newTableToken() }).eq('id', id)
  if (error) fail(error, 'Não foi possível gerar um novo código.')
}

export async function deleteTable(id: string): Promise<void> {
  const { error } = await supabase.from('tables').delete().eq('id', id)
  if (error) fail(error, 'Não foi possível excluir a mesa.')
}

// Métricas -------------------------------------------------------------------

export interface Metrics {
  days: number
  since: string
  totals: {
    sessions: number
    menu_view: number
    item_view: number
    open_3d: number
    open_ar: number
    ar_unsupported: number
    ar_sessions: number
  }
  by_item: { item_id: string; name: string; item_view: number; open_3d: number; open_ar: number; ar_unsupported: number }[]
  by_table: { table_id: string; label: string; sessions: number; open_ar: number }[]
  by_day: { day: string; sessions: number; open_ar: number }[]
  devices: { device: 'ios' | 'android' | 'desktop' | 'in_app' | 'other'; sessions: number }[]
}

export async function getMetrics(restaurantId: string, days: number): Promise<Metrics> {
  const { data, error } = await supabase.rpc('restaurant_metrics', { p_restaurant_id: restaurantId, p_days: days })
  if (error || !data) fail(error, 'Não foi possível carregar as métricas.')
  return data as Metrics
}
