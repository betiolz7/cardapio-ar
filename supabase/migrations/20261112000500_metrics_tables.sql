-- Métricas do painel, retenção de eventos e reordenação de categorias/pratos.

-- Métricas -------------------------------------------------------------------
-- Agrega os eventos brutos dos últimos N dias (1 a 90). SECURITY INVOKER: o RLS
-- de events (só owner/admin leem) continua valendo; a checagem explícita só
-- troca "zeros silenciosos" por um erro claro.
-- Dias contados no fuso de São Paulo.
create function public.restaurant_metrics(p_restaurant_id uuid, p_days int default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_days  int := least(greatest(coalesce(p_days, 30), 1), 90);
  v_since timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
                         - make_interval(days => v_days - 1);
  v_result jsonb;
begin
  if not public.is_member(p_restaurant_id, array['owner', 'admin']::public.member_role[]) then
    raise exception 'Sem acesso às métricas deste restaurante' using errcode = '42501';
  end if;

  with ev as (
    select e.* from public.events e
    where e.restaurant_id = p_restaurant_id and e.created_at >= v_since
  )
  select jsonb_build_object(
    'days', v_days,
    'since', v_since,
    'totals', (
      select jsonb_build_object(
        'sessions',       count(distinct session_id),
        'menu_view',      count(*) filter (where type = 'menu_view'),
        'item_view',      count(*) filter (where type = 'item_view'),
        'open_3d',        count(*) filter (where type = 'open_3d'),
        'open_ar',        count(*) filter (where type = 'open_ar'),
        'ar_unsupported', count(*) filter (where type = 'ar_unsupported'),
        'ar_sessions',    count(distinct session_id) filter (where type = 'open_ar')
      ) from ev
    ),
    'by_item', coalesce((
      select jsonb_agg(row_to_json(x) order by x.item_view desc, x.name)
      from (
        select i.id as item_id, i.name,
               count(*) filter (where ev.type = 'item_view')      as item_view,
               count(*) filter (where ev.type = 'open_3d')        as open_3d,
               count(*) filter (where ev.type = 'open_ar')        as open_ar,
               count(*) filter (where ev.type = 'ar_unsupported') as ar_unsupported
        from ev join public.items i on i.id = ev.item_id
        group by i.id, i.name
      ) x
    ), '[]'::jsonb),
    'by_table', coalesce((
      select jsonb_agg(row_to_json(x) order by x.sessions desc, x.label)
      from (
        select t.id as table_id, t.label,
               count(distinct ev.session_id) as sessions,
               count(*) filter (where ev.type = 'open_ar') as open_ar
        from ev join public.tables t on t.id = ev.table_id
        group by t.id, t.label
      ) x
    ), '[]'::jsonb),
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day::date, 'sessions', coalesce(x.sessions, 0), 'open_ar', coalesce(x.open_ar, 0)) order by d.day)
      from generate_series(
        (v_since at time zone 'America/Sao_Paulo')::date,
        (now() at time zone 'America/Sao_Paulo')::date,
        interval '1 day'
      ) as d(day)
      left join (
        select (ev.created_at at time zone 'America/Sao_Paulo')::date as day,
               count(distinct ev.session_id) as sessions,
               count(*) filter (where ev.type = 'open_ar') as open_ar
        from ev group by 1
      ) x on x.day = d.day::date
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(row_to_json(x) order by x.sessions desc)
      from (
        select ev.device, count(distinct ev.session_id) as sessions
        from ev group by ev.device
      ) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.restaurant_metrics(uuid, int) from public, anon;
grant execute on function public.restaurant_metrics(uuid, int) to authenticated;

-- Retenção (LGPD + limite de 500 MB do plano grátis) ------------------------
-- Eventos com mais de 90 dias viram contagens diárias e são apagados.
create table public.events_daily (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  day           date not null,
  item_id       uuid references public.items (id) on delete cascade,
  table_id      uuid references public.tables (id) on delete cascade,
  type          public.event_type not null,
  device        public.device_kind not null,
  count         int not null check (count > 0),
  unique nulls not distinct (restaurant_id, day, item_id, table_id, type, device)
);

alter table public.events_daily enable row level security;
create policy events_daily_read on public.events_daily
  for select to authenticated
  using (public.is_member(restaurant_id, array['owner', 'admin']::public.member_role[]));

create function public.rollup_old_events(p_keep_days int default 90)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => greatest(p_keep_days, 1));
  v_deleted int;
begin
  insert into public.events_daily (restaurant_id, day, item_id, table_id, type, device, count)
  select e.restaurant_id, (e.created_at at time zone 'America/Sao_Paulo')::date,
         e.item_id, e.table_id, e.type, e.device, count(*)
  from public.events e
  where e.created_at < v_cutoff
  group by 1, 2, 3, 4, 5, 6
  on conflict (restaurant_id, day, item_id, table_id, type, device)
  do update set count = public.events_daily.count + excluded.count;

  delete from public.events where created_at < v_cutoff;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Só o agendador (postgres) roda isso.
revoke execute on function public.rollup_old_events(int) from public, anon, authenticated;

-- Agendamento diário (pg_cron vem no Supabase, inclusive no plano grátis).
create extension if not exists pg_cron;
select cron.schedule('rollup-old-events', '15 6 * * *', $$select public.rollup_old_events(90)$$);  -- 03:15 em São Paulo

-- Reordenação ----------------------------------------------------------------
-- Recebe a lista de ids na nova ordem e grava position = 1, 2, 3...
-- SECURITY INVOKER: o RLS de update (owner/admin) decide; linhas de outro
-- restaurante simplesmente não são atualizadas.
create function public.reorder_categories(p_restaurant_id uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.categories c
  set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where c.id = o.id and c.restaurant_id = p_restaurant_id;
$$;

create function public.reorder_items(p_category_id uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.items i
  set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where i.id = o.id and i.category_id = p_category_id;
$$;

revoke execute on function public.reorder_categories(uuid, uuid[]) from public, anon;
revoke execute on function public.reorder_items(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_categories(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_items(uuid, uuid[]) to authenticated;

-- Posição padrão: prato novo entra no fim da categoria; categoria nova, no fim da lista.
create function public.set_default_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.position is null or new.position = 0 then
    if tg_table_name = 'items' then
      select coalesce(max(i.position), 0) + 1 into new.position
      from public.items i where i.category_id = new.category_id;
    else
      select coalesce(max(c.position), 0) + 1 into new.position
      from public.categories c where c.restaurant_id = new.restaurant_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger items_default_position
  before insert on public.items
  for each row execute function public.set_default_position();

create trigger categories_default_position
  before insert on public.categories
  for each row execute function public.set_default_position();
