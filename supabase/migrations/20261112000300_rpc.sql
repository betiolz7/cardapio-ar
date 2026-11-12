-- RPCs públicas. Toda função define search_path = '' e qualifica os nomes.

-- Cardápio inteiro numa ida só (o público faz 1 requisição por visita).
-- SECURITY INVOKER: as políticas de RLS continuam valendo para quem chama.
create function public.get_menu(p_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'restaurant', jsonb_build_object(
      'id', r.id, 'slug', r.slug, 'name', r.name, 'logo_url', r.logo_url,
      'theme_color', r.theme_color, 'whatsapp', r.whatsapp
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name)
                       order by c.position, c.name)
      from public.categories c
      where c.restaurant_id = r.id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'slug', i.slug, 'category_id', i.category_id,
        'name', i.name, 'description', i.description,
        'price_cents', i.price_cents, 'serves', i.serves,
        'photo_url', i.photo_url, 'is_available', i.is_available,
        'model', (
          select jsonb_build_object(
            'glb_url', m.glb_url, 'usdz_url', m.usdz_url,
            'poster_url', m.poster_url, 'dims_cm', m.dims_cm
          )
          from public.item_models m
          where m.item_id = i.id and m.status = 'published'
        )
      ) order by i.position, i.name)
      from public.items i
      where i.restaurant_id = r.id
    ), '[]'::jsonb)
  )
  from public.restaurants r
  where r.slug = p_slug and r.status <> 'suspended';
$$;

grant execute on function public.get_menu(text) to anon, authenticated;

-- Registro de métrica. Valida tudo no banco: tipo por lista branca (enum),
-- prato e mesa precisam ser do restaurante, e limita a 60 eventos/min por sessão.
create function public.track_event(
  p_restaurant_id uuid,
  p_type          text,
  p_session_id    text,
  p_device        text default 'other',
  p_item_id       uuid default null,
  p_table_token   text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type     public.event_type;
  v_device   public.device_kind;
  v_item_id  uuid;
  v_table_id uuid;
  v_session  text := left(coalesce(p_session_id, ''), 64);
begin
  if length(v_session) < 8 then
    return;
  end if;

  if p_type is null or p_type not in (select unnest(enum_range(null::public.event_type))::text) then
    return;
  end if;
  v_type := p_type::public.event_type;

  v_device := case
    when p_device in (select unnest(enum_range(null::public.device_kind))::text)
      then p_device::public.device_kind
    else 'other'
  end;

  if not public.restaurant_is_public(p_restaurant_id) then
    return;
  end if;

  if (select count(*) from public.events e
      where e.session_id = v_session
        and e.created_at > now() - interval '1 minute') >= 60 then
    return;
  end if;

  if p_item_id is not null then
    select i.id into v_item_id
    from public.items i
    where i.id = p_item_id and i.restaurant_id = p_restaurant_id;
  end if;

  if p_table_token is not null then
    select t.id into v_table_id
    from public.tables t
    where t.token = left(p_table_token, 32) and t.restaurant_id = p_restaurant_id;
  end if;

  insert into public.events (restaurant_id, item_id, table_id, type, session_id, device)
  values (p_restaurant_id, v_item_id, v_table_id, v_type, v_session, v_device);
end;
$$;

revoke execute on function public.track_event(uuid, text, text, text, uuid, text) from public;
grant execute on function public.track_event(uuid, text, text, text, uuid, text) to anon, authenticated;

-- "Acabou o prato": qualquer membro (inclusive staff) pode mudar só a disponibilidade.
create function public.set_item_availability(p_item_id uuid, p_available boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
begin
  select i.restaurant_id into v_restaurant_id from public.items i where i.id = p_item_id;

  if v_restaurant_id is null or not public.is_member(v_restaurant_id) then
    raise exception 'Prato não encontrado' using errcode = 'P0002';
  end if;

  update public.items set is_available = p_available where id = p_item_id;
end;
$$;

-- O Supabase concede EXECUTE a anon por padrão (default privileges); revogar
-- de "public" não basta, é preciso revogar de anon explicitamente.
revoke execute on function public.set_item_availability(uuid, boolean) from public, anon;
grant execute on function public.set_item_availability(uuid, boolean) to authenticated;
