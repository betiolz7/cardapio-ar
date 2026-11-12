-- Row Level Security: a fronteira real entre restaurantes.
-- O front só esconde botões (usabilidade). Quem decide é o banco.

-- Helpers SECURITY DEFINER: evitam RLS recursiva ao consultar memberships.
create function public.is_member(p_restaurant_id uuid, p_roles public.member_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.restaurant_id = p_restaurant_id
      and m.user_id = (select auth.uid())
      and (p_roles is null or m.role = any (p_roles))
  );
$$;

create function public.restaurant_is_public(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.restaurants r
    where r.id = p_restaurant_id and r.status <> 'suspended'
  );
$$;

revoke execute on function public.is_member(uuid, public.member_role[]) from public;
revoke execute on function public.restaurant_is_public(uuid) from public;
grant execute on function public.is_member(uuid, public.member_role[]) to anon, authenticated;
grant execute on function public.restaurant_is_public(uuid) to anon, authenticated;

alter table public.restaurants  enable row level security;
alter table public.memberships  enable row level security;
alter table public.categories   enable row level security;
alter table public.items        enable row level security;
alter table public.item_models  enable row level security;
alter table public.tables       enable row level security;
alter table public.events       enable row level security;

-- restaurants ---------------------------------------------------------------
-- Criação de restaurante é feita por nós (SQL / painel do Supabase) no MVP.
create policy restaurants_read on public.restaurants
  for select to anon, authenticated
  using (status <> 'suspended' or public.is_member(id));

create policy restaurants_update on public.restaurants
  for update to authenticated
  using      (public.is_member(id, array['owner', 'admin']::public.member_role[]))
  with check (public.is_member(id, array['owner', 'admin']::public.member_role[]));

-- memberships: cada um vê só os próprios vínculos. Escrita só via service role.
create policy memberships_read_own on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

-- categories ----------------------------------------------------------------
create policy categories_read on public.categories
  for select to anon, authenticated
  using (public.restaurant_is_public(restaurant_id) or public.is_member(restaurant_id));

create policy categories_insert on public.categories
  for insert to authenticated
  with check (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

create policy categories_update on public.categories
  for update to authenticated
  using      (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]))
  with check (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

create policy categories_delete on public.categories
  for delete to authenticated
  using (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

-- items ---------------------------------------------------------------------
-- staff não edita prato direto: usa a RPC set_item_availability.
create policy items_read on public.items
  for select to anon, authenticated
  using (public.restaurant_is_public(restaurant_id) or public.is_member(restaurant_id));

create policy items_insert on public.items
  for insert to authenticated
  with check (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

create policy items_update on public.items
  for update to authenticated
  using      (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]))
  with check (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

create policy items_delete on public.items
  for delete to authenticated
  using (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

-- item_models: o público só vê o publicado ----------------------------------
create policy item_models_read on public.item_models
  for select to anon, authenticated
  using (
    (status = 'published' and public.restaurant_is_public(restaurant_id))
    or public.is_member(restaurant_id)
  );

create policy item_models_insert on public.item_models
  for insert to authenticated
  with check (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

create policy item_models_update on public.item_models
  for update to authenticated
  using      (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]))
  with check (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

create policy item_models_delete on public.item_models
  for delete to authenticated
  using (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

-- tables: só membros. O público resolve o token dentro de track_event. ------
create policy tables_read on public.tables
  for select to authenticated
  using (public.is_member(restaurant_id));

create policy tables_insert on public.tables
  for insert to authenticated
  with check (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

create policy tables_update on public.tables
  for update to authenticated
  using      (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]))
  with check (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

create policy tables_delete on public.tables
  for delete to authenticated
  using (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

-- events: escrita só pela RPC track_event; leitura para owner/admin ---------
create policy events_read on public.events
  for select to authenticated
  using (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));
