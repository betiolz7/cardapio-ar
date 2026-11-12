-- Dados de demonstração (Casa Lume). Mesmos dados de src/lib/demo-data.ts.
-- Os modelos são os estilizados do protótipo, servidos pelo próprio site em /demo/models/.

insert into public.restaurants (id, slug, name, theme_color, whatsapp, status) values
  ('00000000-0000-4000-8000-000000000001', 'casa-lume', 'Casa Lume', '#f5a524', '5511999999999', 'active');

insert into public.categories (id, restaurant_id, name, position) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Lanches', 1),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Pizzas', 2),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'Sobremesas', 3);

insert into public.items (id, restaurant_id, category_id, slug, name, description, price_cents, serves, photo_url, position) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101',
   'lume-burger', 'Lume Burger', 'Blend de 160 g, cheddar, cebola caramelizada e pão brioche.', 3890, 1, '/demo/photos/lume-burger.svg', 1),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102',
   'margherita', 'Margherita', 'Molho de tomate, muçarela de búfala e manjericão fresco. 8 fatias.', 6990, 3, '/demo/photos/margherita.svg', 1),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103',
   'acai-na-cuia', 'Açaí na Cuia', 'Açaí 500 ml com granola, banana e leite em pó.', 2750, 1, '/demo/photos/acai-na-cuia.svg', 1);

insert into public.item_models (restaurant_id, item_id, version, glb_url, dims_cm, status) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 1, '/demo/models/burger.glb', '{"diameter": 12.5, "h": 10.5}', 'published'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000202', 1, '/demo/models/pizza.glb',  '{"diameter": 40, "h": 3.5}',  'published'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000203', 1, '/demo/models/acai.glb',   '{"diameter": 14, "h": 6.7}', 'published');

insert into public.tables (restaurant_id, label, token) values
  ('00000000-0000-4000-8000-000000000001', 'Mesa 1', 'demo-mesa-01'),
  ('00000000-0000-4000-8000-000000000001', 'Mesa 2', 'demo-mesa-02'),
  ('00000000-0000-4000-8000-000000000001', 'Mesa 3', 'demo-mesa-03');
