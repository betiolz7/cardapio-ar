// Formato devolvido pela RPC get_menu (supabase/migrations/*_rpc.sql).

/** Medidas do prato em centímetros. Redondo usa `diameter`; os outros, `w` e `d`. */
export type DimsCm = { diameter: number; h: number } | { w: number; d: number; h: number }

export interface MenuModel {
  glb_url: string
  usdz_url: string | null
  poster_url: string | null
  dims_cm: DimsCm
}

export interface MenuItem {
  id: string
  slug: string
  category_id: string
  name: string
  description: string
  price_cents: number
  serves: number | null
  photo_url: string | null
  is_available: boolean
  model: MenuModel | null
}

export interface MenuCategory {
  id: string
  name: string
}

export interface MenuRestaurant {
  id: string
  slug: string
  name: string
  logo_url: string | null
  theme_color: string | null
  whatsapp: string | null
}

export interface Menu {
  restaurant: MenuRestaurant
  categories: MenuCategory[]
  items: MenuItem[]
}

export type EventType = 'menu_view' | 'item_view' | 'open_3d' | 'open_ar' | 'ar_unsupported'
export type DeviceKind = 'ios' | 'android' | 'desktop' | 'in_app' | 'other'
