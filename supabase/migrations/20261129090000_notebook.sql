-- Faza 2: funkcije koje treba aplikacija za iznajmljivače (bilježnica).
--   * slug objekta nastaje sam iz naziva
--   * promjena broja komada: dodavanje nastavlja numeraciju, smanjenje samo deaktivira (4.1 I4)
--   * pozivnice djelatnicima po e-mailu (4.1 I6)
--   * demo objekt s podacima pune sezone za "Isprobaj bez registracije" (4.1 I1)

-- ===========================================================================
-- Slug iz naziva
-- ===========================================================================

create function public.slugify(p_text text) returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(
    translate(lower(coalesce(p_text, '')), 'čćžšđàáâäèéêëìíîïòóôöùúûüñ', 'cczsdaaaaeeeeiiiioooouuuun'),
    '[^a-z0-9]+', '-', 'g')), ''), 'objekt');
$$;

alter table public.businesses alter column slug drop not null;

create function public.businesses_default_slug() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base text;
begin
  if new.slug is null or new.slug = '' then
    base := left(public.slugify(new.name), 50);
    new.slug := base;
    while exists (select 1 from public.businesses where slug = new.slug) loop
      new.slug := base || '-' || substr(md5(random()::text), 1, 4);
    end loop;
  end if;
  return new;
end;
$$;

create trigger businesses_default_slug before insert on public.businesses
  for each row execute function public.businesses_default_slug();

alter table public.businesses alter column slug set not null;

-- ===========================================================================
-- Broj komada
-- ===========================================================================

-- Postavlja broj aktivnih jedinica. Više: aktivira ranije deaktivirane, zatim dodaje nove na kraj.
-- Manje: deaktivira zadnje po redoslijedu, da povijest i izvještaji ostanu točni.
-- security invoker: RLS dopušta samo vlasniku.
create function public.set_unit_count(p_item_type_id uuid, p_count integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  active_now integer;
  diff integer;
  reactivated integer;
begin
  if p_count is null or p_count < 0 or p_count > 1000 then
    raise exception 'Broj komada mora biti između 0 i 1000';
  end if;
  if not exists (select 1 from public.item_types where id = p_item_type_id) then
    raise exception 'Vrsta predmeta ne postoji ili joj nemate pristup';
  end if;

  select count(*) into active_now from public.units where item_type_id = p_item_type_id and is_active;
  diff := p_count - active_now;

  if diff > 0 then
    with r as (
      update public.units set is_active = true
      where id in (
        select id from public.units
        where item_type_id = p_item_type_id and not is_active
        order by position limit diff
      )
      returning 1
    )
    select count(*) into reactivated from r;
    if diff - reactivated > 0 then
      perform public.add_units(p_item_type_id, diff - reactivated);
    end if;
  elsif diff < 0 then
    update public.units set is_active = false
    where id in (
      select id from public.units
      where item_type_id = p_item_type_id and is_active
      order by position desc limit -diff
    );
  end if;

  return p_count;
end;
$$;

-- ===========================================================================
-- Pozivnice djelatnicima
-- ===========================================================================

create table public.business_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role not null default 'staff',
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index business_invites_open_idx on public.business_invites (business_id, lower(email))
  where accepted_at is null;

alter table public.business_invites enable row level security;
create policy business_invites_owner on public.business_invites
  for all to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id) and role = 'staff');

-- Poziva se nakon prijave: korisnik postaje član svakog objekta koji ga je pozvao na taj e-mail.
create function public.accept_invites() returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text;
  n integer;
begin
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return 0;
  end if;

  insert into public.business_members (business_id, user_id, role)
  select i.business_id, auth.uid(), i.role
  from public.business_invites i
  where i.accepted_at is null and lower(i.email) = v_email
  on conflict (business_id, user_id) do nothing;

  update public.business_invites set accepted_at = now()
  where accepted_at is null and lower(email) = v_email;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.accept_invites() from public, anon;

-- ===========================================================================
-- Demo objekt
-- ===========================================================================

-- Stvara demo objekt za prijavljenog korisnika (i anonimnog, za "Isprobaj bez registracije"),
-- s podacima cijele prošle sezone i današnjim stanjem. Demo objekt nikad nije na karti.
create function public.create_demo_business() returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_biz uuid := gen_random_uuid();
  v_today date := (now() at time zone 'Europe/Zagreb')::date;
  v_year integer := extract(year from v_today)::int - case when extract(month from v_today) >= 10 then 0 else 1 end;
  v_from date := make_date(v_year, 5, 15);
  v_to date := make_date(v_year, 9, 30);
  t_lez uuid := gen_random_uuid();
  t_kom uuid := gen_random_uuid();
  t_cab uuid := gen_random_uuid();
  t_ped uuid := gen_random_uuid();
  t_jet uuid := gen_random_uuid();
  s_day uuid := gen_random_uuid();
  s_am uuid := gen_random_uuid();
  s_pm uuid := gen_random_uuid();
begin
  if v_user is null then
    raise exception 'Prijavite se ili pokrenite demo' using errcode = '42501';
  end if;

  -- Jedan demo po korisniku.
  select b.id into v_biz from public.businesses b where b.owner_id = v_user and b.is_demo limit 1;
  if found then
    return v_biz;
  end if;
  v_biz := gen_random_uuid();

  perform setseed(0.42);

  insert into public.businesses (id, owner_id, name, category, place, address, location, is_demo,
                                 reservations_enabled, reservation_hold_until, reservation_note,
                                 season_start, season_end, phone)
  values (v_biz, v_user, 'Plaža Lito (demo)', 'beach', 'Zaborić', 'Glavna plaža',
          'SRID=4326;POINT(15.9411 43.6457)', true,
          true, '11:00', 'Plaćanje na licu mjesta.',
          make_date(v_year + 1, 5, 15), make_date(v_year + 1, 9, 30), '+385 91 000 0000');

  insert into public.item_types (id, business_id, name, template_key, label_style, label_prefix, price_cents,
                                 price_unit, reservable, assignment_mode, default_duration_min, sort_order,
                                 booking_opens_days_before, booking_opens_at, booking_closes_at)
  values
    (t_lez, v_biz, 'Ležaljke', 'lounger', 'number', 'L', 1500, 'day', false, 'auto', null, 1, null, null, null),
    (t_kom, v_biz, 'Kompleti', 'set', 'number', 'K', 3500, 'day', true, 'auto', null, 2, null, null, null),
    (t_cab, v_biz, 'Cabane', 'cabana', 'letter', '', 9000, 'day', true, 'guest_choice', null, 3, 1, '12:00', '08:00'),
    (t_ped, v_biz, 'Pedaline', 'pedalo', 'number', 'P', 1500, 'hour', false, 'auto', 60, 4, null, null, null),
    (t_jet, v_biz, 'Jet ski', 'jet_ski', 'number', 'J', 6000, 'session', false, 'auto', 30, 5, null, null, null);

  insert into public.item_type_slots (id, item_type_id, name, starts_at, ends_at, price_cents, reservable, sort_order) values
    (s_day, t_cab, 'Cijeli dan', '09:00', null, 9000, true, 1),
    (s_am, t_cab, '1. polovica', '09:00', '15:00', 5500, true, 2),
    (s_pm, t_cab, '2. polovica', '15:00', null, 4500, false, 3);

  perform public.add_units(t_lez, 30);
  perform public.add_units(t_kom, 12);
  perform public.add_units(t_cab, 6);
  perform public.add_units(t_ped, 4);
  perform public.add_units(t_jet, 2);

  -- Prošla sezona: dnevni najam. Popunjenost raste prema kolovozu i vikendom,
  -- prvi red (manji redni broj) prodaje se prvi.
  insert into public.bookings (unit_id, service_date, slot_id, status, source, payment_method, price_cents,
                               checked_in_at, released_at, created_by)
  select u.id, d.day,
    case when u.item_type_id = t_cab then s_day end,
    'sold',
    case when r.x < 0.12 and u.item_type_id in (t_kom, t_cab) then 'tourist_app'
         when r.x < 0.18 then 'phone' else 'walk_in' end::public.booking_source,
    case when r.y < 0.55 then 'card' else 'cash' end::public.payment_method,
    case when u.item_type_id = t_cab and r.z < 0.1 then 8000 else null end,
    (d.day + time '08:30' + make_interval(mins => (r.z * 210)::int)) at time zone 'Europe/Zagreb',
    case when u.item_type_id <> t_cab
         then (d.day + time '15:00' + make_interval(mins => (r.y * 240)::int)) at time zone 'Europe/Zagreb' end,
    v_user
  from generate_series(v_from, v_to, interval '1 day') g(day_ts)
  cross join lateral (select g.day_ts::date as day) d
  cross join lateral (
    select
      (case extract(month from d.day)::int when 5 then 0.35 when 6 then 0.65 when 7 then 0.9 when 8 then 0.97 else 0.5 end)
      * (case when extract(isodow from d.day) >= 6 then 1.1 else 1 end) as f
  ) season
  join public.units u on u.item_type_id in (t_lez, t_kom, t_cab)
  -- u.position i d.day u izrazu tjeraju novi slučajni broj za svaki redak
  cross join lateral (select random() + 0 * u.position + 0 * extract(day from d.day) as x,
                             random() + 0 * u.position as y, random() + 0 * u.position as z) r
  where random() < season.f * (1.15 - u.position::numeric / 80);

  -- Nedolasci: rezervacije koje su istekle.
  insert into public.bookings (unit_id, service_date, status, source, customer_name, created_by, hold_until)
  select u.id, d::date, 'expired', 'tourist_app', null, null,
         (d::date + time '11:00') at time zone 'Europe/Zagreb'
  from generate_series(v_from, v_to, interval '3 day') d
  join public.units u on u.item_type_id = t_kom
  where random() < 0.15
    and not exists (select 1 from public.bookings b where b.unit_id = u.id and b.service_date = d::date);

  -- Satni najam: nekoliko izdavanja dnevno po jedinici.
  insert into public.bookings (unit_id, service_date, starts_at, ends_at, status, source, payment_method,
                               checked_in_at, created_by)
  select u.id, d::date,
    (d::date + make_time(9 + h, 0, 0)) at time zone 'Europe/Zagreb',
    (d::date + make_time(9 + h, case when u.item_type_id = t_jet then 30 else 59 end, 0)) at time zone 'Europe/Zagreb',
    'sold', 'walk_in',
    case when random() < 0.5 then 'card' else 'cash' end::public.payment_method,
    (d::date + make_time(9 + h, 0, 0)) at time zone 'Europe/Zagreb',
    v_user
  from generate_series(v_from, v_to, interval '1 day') d
  cross join generate_series(0, 9) h
  join public.units u on u.item_type_id in (t_ped, t_jet)
  where random() < (case extract(month from d)::int when 7 then 0.55 when 8 then 0.6 else 0.3 end)
                   * (case when h between 2 and 6 then 1.2 else 0.6 end);

  -- Danas: dio mjesta prodan, nekoliko rezervacija s rokom.
  insert into public.bookings (unit_id, service_date, slot_id, status, source, payment_method, created_by)
  select u.id, v_today, case when u.item_type_id = t_cab then s_day end, 'sold', 'walk_in',
         case when u.position % 3 = 0 then 'card' else 'cash' end::public.payment_method, v_user
  from public.units u
  where (u.item_type_id = t_lez and u.position <= 17)
     or (u.item_type_id = t_kom and u.position <= 6)
     or (u.item_type_id = t_cab and u.position in (1, 2, 4));

  insert into public.bookings (unit_id, service_date, slot_id, status, source, customer_name, customer_phone, created_by, hold_until)
  select u.id, v_today, case when u.item_type_id = t_cab then s_day end, 'reserved', 'tourist_app',
         case u.position when 3 then 'Ana K.' when 5 then 'Marco B.' else 'Lena S.' end,
         '+385 91 111 2222', null,
         now() + interval '2 hours'
  from public.units u
  where (u.item_type_id = t_cab and u.position in (3, 5))
     or (u.item_type_id = t_kom and u.position = 9);

  return v_biz;
end;
$$;

revoke execute on function public.create_demo_business() from public, anon;
grant execute on function public.create_demo_business() to authenticated;
