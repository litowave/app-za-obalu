-- Faza 3: rezervacije u aplikaciji za iznajmljivače.
--   * nove rezervacije iz turističke aplikacije (oznaka "nova" dok ih netko u objektu ne pogleda)
--   * premještanje gosta na drugo mjesto (6.2.7)
--   * push obavijest članovima objekta za svaku novu rezervaciju (4.1, I3)

-- ===========================================================================
-- 1. Oznaka "nova"
-- ===========================================================================

alter table public.bookings add column seen_at timestamptz;

-- Postojeće rezervacije nisu nove.
update public.bookings set seen_at = created_at where source = 'tourist_app';

create index bookings_unseen_idx on public.bookings (business_id)
  where source = 'tourist_app' and seen_at is null;

grant select (seen_at) on public.bookings to authenticated;

-- Član objekta označava sve nove rezervacije kao viđene. Vraća koliko ih je bilo.
create function public.mark_reservations_seen(p_business_id uuid) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Nisi član ovog objekta' using errcode = '42501';
  end if;
  update public.bookings
  set seen_at = now()
  where business_id = p_business_id and source = 'tourist_app' and seen_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.mark_reservations_seen(uuid) from public, anon;
grant execute on function public.mark_reservations_seen(uuid) to authenticated;

-- ===========================================================================
-- 2. Premještanje gosta (6.2.7)
-- ===========================================================================

-- Rezervaciju ili prodaju premješta na drugu jedinicu iste vrste. Baza odbija ako je ta
-- jedinica u isto vrijeme zauzeta. security invoker: pravila pristupa odlučuju tko smije.
create function public.move_booking(p_booking_id uuid, p_unit_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_old record;
  v_new record;
begin
  select b.status, u.item_type_id, b.unit_id into v_old
  from public.bookings b join public.units u on u.id = b.unit_id
  where b.id = p_booking_id;
  if not found then
    raise exception 'Zapis ne postoji';
  end if;
  if v_old.status not in ('reserved', 'sold') then
    raise exception 'Otkazani ili istekli zapis ne može se premjestiti';
  end if;
  if v_old.unit_id = p_unit_id then
    return;
  end if;

  select item_type_id, is_active into v_new from public.units where id = p_unit_id;
  if not found or not v_new.is_active then
    raise exception 'Odabrano mjesto ne postoji';
  end if;
  if v_new.item_type_id <> v_old.item_type_id then
    raise exception 'Gost se može premjestiti samo na mjesto iste vrste';
  end if;

  begin
    update public.bookings set unit_id = p_unit_id where id = p_booking_id;
  exception when exclusion_violation then
    raise exception 'To mjesto je u isto vrijeme zauzeto' using errcode = '23P01';
  end;
  if not found then
    raise exception 'Nemaš pravo mijenjati ovaj zapis' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.move_booking(uuid, uuid) from public, anon;
grant execute on function public.move_booking(uuid, uuid) to authenticated;

-- ===========================================================================
-- 3. Push obavijesti
-- ===========================================================================

-- Svaka poslana obavijest ostaje zapisana (bez imena i broja gosta), da se zna je li
-- i kome otišla. Čitaju je samo funkcije i administrator.
create table public.push_messages (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  group_id uuid not null unique,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  tokens text[] not null,
  request_id bigint,          -- net.http_post, ako je pg_net uključen
  created_at timestamptz not null default now()
);

alter table public.push_messages enable row level security;
revoke all on public.push_messages from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  else
    raise notice 'pg_net nije dostupan, push obavijesti se samo zapisuju';
  end if;
end;
$$;

-- "danas", "sutra" ili "pet 4. 7."
create function public.day_label(p_date date) returns text
language sql stable
set search_path = ''
as $$
  select case p_date - (now() at time zone 'Europe/Zagreb')::date
    when 0 then 'danas'
    when 1 then 'sutra'
    else (array['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub'])[extract(dow from p_date)::int + 1]
         || ' ' || extract(day from p_date)::int || '. ' || extract(month from p_date)::int || '.'
  end;
$$;

-- Šalje obavijest za jednu grupu rezervacija preko Expo push servisa.
-- Zove se jednom po grupi, na kraju transakcije u kojoj je turist rezervirao.
create function public.queue_reservation_push(p_group_id uuid) returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
  v record;
  v_tokens text[];
  v_title text := 'Nova rezervacija';
  v_body text;
  v_data jsonb;
  v_id bigint;
  v_request bigint;
begin
  select
    b.business_id,
    min(b.service_date) as service_date,
    min(b.hold_until) as hold_until,
    min(t.name) as type_name,
    min(s.name) as slot_name,
    string_agg(u.label, ', ' order by u.position) as labels
  into v
  from public.bookings b
  join public.units u on u.id = b.unit_id
  join public.item_types t on t.id = u.item_type_id
  left join public.item_type_slots s on s.id = b.slot_id
  where b.group_id = p_group_id and b.source = 'tourist_app' and b.status = 'reserved'
  group by b.business_id;
  if not found then
    return null;
  end if;

  select array_agg(token order by token) into v_tokens
  from public.push_tokens
  where business_id = v.business_id and platform in ('ios', 'android');
  if v_tokens is null then
    return null;
  end if;

  v_body := v.type_name || ' ' || v.labels || ', ' || public.day_label(v.service_date)
    || coalesce(' (' || lower(v.slot_name) || ')', '')
    || coalesce('. Rok dolaska ' || to_char(v.hold_until at time zone 'Europe/Zagreb', 'HH24:MI'), '')
    || '.';
  v_data := jsonb_build_object(
    'screen', 'rezervacije',
    'business_id', v.business_id,
    'date', v.service_date,
    'group_id', p_group_id
  );

  insert into public.push_messages (business_id, group_id, title, body, data, tokens)
  values (v.business_id, p_group_id, v_title, v_body, v_data, v_tokens)
  on conflict (group_id) do nothing
  returning id into v_id;
  if v_id is null then
    return null;
  end if;

  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null then
    execute $q$
      select net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := $1,
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
      )
    $q$
    into v_request
    using (
      select jsonb_agg(jsonb_build_object(
        'to', tok, 'title', v_title, 'body', v_body, 'data', v_data,
        'sound', 'default', 'channelId', 'rezervacije', 'priority', 'high'
      ))
      from unnest(v_tokens) tok
    );
    update public.push_messages set request_id = v_request where id = v_id;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.queue_reservation_push(uuid) from public, anon, authenticated;

-- Okida se na kraju transakcije, kad su sve jedinice iz grupe već upisane.
create function public.bookings_notify_new() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.group_id is not null then
    perform public.queue_reservation_push(new.group_id);
  end if;
  return null;
end;
$$;

create constraint trigger bookings_notify_new after insert on public.bookings
  deferrable initially deferred
  for each row
  when (new.source = 'tourist_app' and new.status = 'reserved')
  execute function public.bookings_notify_new();

-- Uređaj prijavljuje svoj token. Isti mobitel može prijeći na drugi objekt ili račun,
-- pa se postojeći zapis preuzima. Vraća true ako je token spremljen.
create function public.register_push_token(p_token text, p_business_id uuid, p_platform text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_business_member(p_business_id) then
    raise exception 'Nisi član ovog objekta' using errcode = '42501';
  end if;
  if p_token is null or length(p_token) < 10 then
    raise exception 'Neispravan token';
  end if;
  insert into public.push_tokens (token, user_id, business_id, platform)
  values (p_token, auth.uid(), p_business_id, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        business_id = excluded.business_id,
        platform = excluded.platform,
        last_seen_at = now();
  return true;
end;
$$;

revoke execute on function public.register_push_token(text, uuid, text) from public, anon;
grant execute on function public.register_push_token(text, uuid, text) to authenticated;

-- ===========================================================================
-- 4. Blokiranje broja koji ne dolazi (6.2.8). Popis vidi i mijenja samo vlasnik,
--    kroz postojeća pravila na blocked_phones.
-- ===========================================================================

-- Blokira broj gosta iz zapisa. Samo vlasnik.
create function public.block_booking_phone(p_booking_id uuid, p_note text default null)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_phone text;
begin
  select business_id, public.normalize_phone(customer_phone) into v_business, v_phone
  from public.bookings where id = p_booking_id;
  if v_business is null or not public.is_business_owner(v_business) then
    raise exception 'Broj može blokirati samo vlasnik' using errcode = '42501';
  end if;
  if coalesce(length(v_phone), 0) < 8 then
    raise exception 'Uz ovaj zapis nema broja mobitela';
  end if;
  insert into public.blocked_phones (business_id, phone, note)
  values (v_business, v_phone, p_note)
  on conflict (business_id, phone) do update set note = coalesce(excluded.note, public.blocked_phones.note);
  return v_phone;
end;
$$;

revoke execute on function public.block_booking_phone(uuid, text) from public, anon;
grant execute on function public.block_booking_phone(uuid, text) to authenticated;
