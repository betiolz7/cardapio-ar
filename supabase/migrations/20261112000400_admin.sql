-- Painel /admin: arquivos (fotos e modelos) e publicação de modelo 3D.

-- Slugs reservados para rotas do app: um restaurante não pode se chamar "admin".
alter table public.restaurants
  add constraint restaurants_slug_not_reserved
  check (slug not in ('admin', 'login', 'api', 'assets', 'demo', 'r'));

-- Bucket público "menu". No piloto os arquivos ficam no Storage do Supabase;
-- quando o tráfego crescer, migram para o Cloudflare R2 (CONTEXT.md §12.1).
-- Caminho: {restaurant_id}/{item-slug}.{carimbo}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu', 'menu', true,
  10485760,  -- 10 MB
  array['image/webp', 'image/jpeg', 'image/png', 'model/gltf-binary', 'model/vnd.usdz+zip']
);

-- Restaurante dono do arquivo = primeira pasta do caminho (null se não for um uuid).
create function public.storage_restaurant_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end;
$$;

-- Leitura pública é feita pela URL pública do bucket (não passa por estas políticas).
create policy menu_files_member_read on storage.objects
  for select to authenticated
  using (bucket_id = 'menu' and public.is_member(public.storage_restaurant_id(name)));

create policy menu_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu'
    and public.is_member(public.storage_restaurant_id(name), array['owner', 'admin']::public.member_role[])
  );

create policy menu_files_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'menu'
    and public.is_member(public.storage_restaurant_id(name), array['owner', 'admin']::public.member_role[])
  );

create policy menu_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu'
    and public.is_member(public.storage_restaurant_id(name), array['owner', 'admin']::public.member_role[])
  );

-- Publica um modelo novo: rebaixa o publicado atual para 'draft' e insere a
-- próxima versão como 'published', numa transação só.
-- SECURITY INVOKER: o RLS de items/item_models continua valendo para quem chama.
create function public.publish_item_model(
  p_item_id    uuid,
  p_glb_url    text,
  p_usdz_url   text,
  p_poster_url text,
  p_dims_cm    jsonb,
  p_bbox_m     jsonb,
  p_size_bytes int
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
  v_version       int;
begin
  select i.restaurant_id into v_restaurant_id from public.items i where i.id = p_item_id;

  if v_restaurant_id is null
     or not public.is_member(v_restaurant_id, array['owner', 'admin']::public.member_role[]) then
    raise exception 'Prato não encontrado' using errcode = 'P0002';
  end if;

  select coalesce(max(m.version), 0) + 1 into v_version
  from public.item_models m where m.item_id = p_item_id;

  update public.item_models set status = 'draft'
  where item_id = p_item_id and status = 'published';

  insert into public.item_models
    (restaurant_id, item_id, version, glb_url, usdz_url, poster_url, dims_cm, bbox_m, size_bytes, status)
  values
    (v_restaurant_id, p_item_id, v_version, p_glb_url, p_usdz_url, p_poster_url, p_dims_cm, p_bbox_m, p_size_bytes, 'published');

  return v_version;
end;
$$;

revoke execute on function public.publish_item_model(uuid, text, text, text, jsonb, jsonb, int) from public, anon;
grant execute on function public.publish_item_model(uuid, text, text, text, jsonb, jsonb, int) to authenticated;
