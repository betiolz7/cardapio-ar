import type { Menu } from './types.ts'

// Modo demonstração: mesmos dados de supabase/seed.sql. Usado quando o
// Supabase não está configurado, para mostrar o produto sem backend.
// Os modelos são os estilizados do protótipo (prototype/), não fotogrametria.

export const DEMO_MENU: Menu = {
  restaurant: {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'casa-lume',
    name: 'Casa Lume',
    logo_url: null,
    theme_color: '#f5a524',
    whatsapp: '5511999999999',
  },
  categories: [
    { id: '00000000-0000-4000-8000-000000000101', name: 'Lanches' },
    { id: '00000000-0000-4000-8000-000000000102', name: 'Pizzas' },
    { id: '00000000-0000-4000-8000-000000000103', name: 'Sobremesas' },
  ],
  items: [
    {
      id: '00000000-0000-4000-8000-000000000201',
      slug: 'lume-burger',
      category_id: '00000000-0000-4000-8000-000000000101',
      name: 'Lume Burger',
      description: 'Blend de 160 g, cheddar, cebola caramelizada e pão brioche.',
      price_cents: 3890,
      serves: 1,
      photo_url: '/demo/photos/lume-burger.svg',
      is_available: true,
      model: { glb_url: '/demo/models/burger.glb', usdz_url: null, poster_url: null, dims_cm: { diameter: 12.5, h: 10.5 } },
    },
    {
      id: '00000000-0000-4000-8000-000000000202',
      slug: 'margherita',
      category_id: '00000000-0000-4000-8000-000000000102',
      name: 'Margherita',
      description: 'Molho de tomate, muçarela de búfala e manjericão fresco. 8 fatias.',
      price_cents: 6990,
      serves: 3,
      photo_url: '/demo/photos/margherita.svg',
      is_available: true,
      model: { glb_url: '/demo/models/pizza.glb', usdz_url: null, poster_url: null, dims_cm: { diameter: 40, h: 3.5 } },
    },
    {
      id: '00000000-0000-4000-8000-000000000203',
      slug: 'acai-na-cuia',
      category_id: '00000000-0000-4000-8000-000000000103',
      name: 'Açaí na Cuia',
      description: 'Açaí 500 ml com granola, banana e leite em pó.',
      price_cents: 2750,
      serves: 1,
      photo_url: '/demo/photos/acai-na-cuia.svg',
      is_available: true,
      model: { glb_url: '/demo/models/acai.glb', usdz_url: null, poster_url: null, dims_cm: { diameter: 14, h: 6.7 } },
    },
  ],
}
