-- Faza 1: usklađivanje baze sa specifikacijom (docs/specifikacija.md, poglavlja 6, 7 i 8).
--
-- Ukratko:
--   * nove kategorije objekata (3.3) i objava preko administratora (6.4.1)
--   * rok dolaska i razdoblje za rezervacije po objektu i po vrsti predmeta (6.2)
--   * dijelovi dana, npr. cabana 1. i 2. polovica, s krajem "do zalaska sunca" (6.1.3)
--   * bookings: način plaćanja, stvarni dolazak i odlazak, grupe, poveznica za turista (7.2)
--   * cijene, zbrojevi i izvještaji samo za vlasnika, provedeno u bazi (6.3)
--   * gužva u pet razina bez brojki i "Kada je gužva" iz zadnja četiri tjedna (3.2)
--   * QR kodovi, blokirani brojevi, push tokeni, fotografije, administratori
--   * brisanje imena i telefona gostiju nakon 30 dana (6.4.3)

-- ===========================================================================
-- 1. Enumi
-- ===========================================================================

-- Kategorije prema 3.3. boat_rental se spaja u watersports.
drop function public.nearby_businesses(double precision, double precision, integer);

alter type public.business_category rename to business_category_old;
create type public.business_category as enum (
  'beach',         -- ležaljke, kompleti, cabane, trampolin na plaži
  'watersports',   -- jet ski, SUP, kajak, pedalina
  'aquapark',
  'massage',       -- kućice za masažu na plaži
  'diving',        -- škole ronjenja
  'self_service',  -- automati za najam
  'other'
);
alter table public.businesses
  alter column category type public.business_category
  using (case category::text when 'boat_rental' then 'watersports' else category::text end)::public.business_category;
drop type public.business_category_old;

create type public.payment_method as enum ('cash', 'card');
create type public.assignment_mode as enum ('guest_choice', 'auto');
create type public.cancelled_by as enum ('guest', 'business');
create type public.qr_kind as enum ('accommodation', 'public_place');

-- Razina gužve koju vidi turist. no_data: iznajmljivač danas još ništa nije označio.
create type public.crowd_level as enum ('no_data', 'empty', 'few', 'moderate', 'busy', 'full');

-- ===========================================================================
-- 2. Administratori
-- ===========================================================================

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.is_platform_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

alter table public.platform_admins enable row level security;
create policy platform_admins_self on public.platform_admins
  for select to authenticated using (user_id = auth.uid());

-- ===========================================================================
-- 3. Objekti
-- ===========================================================================

alter table public.businesses
  add column opening_hours jsonb,             -- {"mon":[["09:00","19:00"]], ...}; null = nije upisano
  add column season_start date,
  add column season_end date,
  -- Zadano razdoblje za rezervacije (6.2.5): otvara se X dana ranije u zadano vrijeme,
  -- zatvara se na dan dolaska u zadano vrijeme (null = u trenutku roka dolaska).
  add column booking_opens_days_before smallint not null default 7
    check (booking_opens_days_before between 0 and 60),
  add column booking_opens_at time not null default '00:00',
  add column booking_closes_at time,
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users (id) on delete set null,
  add column is_demo boolean not null default false,
  add column subscription_until date,
  add constraint businesses_season_valid check (season_end is null or season_start is null or season_end >= season_start);

comment on column public.businesses.is_published is
  'Vlasnik želi da objekt bude na karti. Na karti je tek kad ga administrator odobri (approved_at).';

-- Objekt je na karti ako ga vlasnik želi objaviti, administrator ga je odobrio,
-- nije demo i pretplata vrijedi.
create function public.business_is_listed(
  p_is_published boolean, p_approved_at timestamptz, p_is_demo boolean, p_subscription_until date
) returns boolean
language sql stable parallel safe
set search_path = ''
as $$
  select p_is_published
     and p_approved_at is not null
     and not p_is_demo
     and p_subscription_until is not null
     and p_subscription_until >= (now() at time zone 'Europe/Zagreb')::date;
$$;

create function public.is_business_listed(p_business_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and public.business_is_listed(b.is_published, b.approved_at, b.is_demo, b.subscription_until)
  );
$$;

-- Polja koja smije mijenjati samo administrator (odobrenje, pretplata, demo).
-- current_user je 'authenticated' ili 'anon' samo kod izravnih poziva iz aplikacije;
-- funkcije sa security definer i migracije/seed rade kao vlasnik baze.
create function public.businesses_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_platform_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.approved_at is not null or new.approved_by is not null
       or new.subscription_until is not null or new.is_demo then
      raise exception 'Odobrenje, pretplatu i demo postavlja samo administrator' using errcode = '42501';
    end if;
  elsif new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.subscription_until is distinct from old.subscription_until
     or new.is_demo is distinct from old.is_demo then
    raise exception 'Odobrenje, pretplatu i demo postavlja samo administrator' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger businesses_guard before insert or update on public.businesses
  for each row execute function public.businesses_guard();

create function public.approve_business(p_business_id uuid, p_subscription_until date default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Samo administrator' using errcode = '42501';
  end if;
  update public.businesses
  set approved_at = now(),
      approved_by = auth.uid(),
      subscription_until = coalesce(p_subscription_until, subscription_until)
  where id = p_business_id;
end;
$$;

create function public.set_subscription(p_business_id uuid, p_until date) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Samo administrator' using errcode = '42501';
  end if;
  update public.businesses set subscription_until = p_until where id = p_business_id;
end;
$$;

revoke execute on function public.approve_business(uuid, date) from public, anon;
revoke execute on function public.set_subscription(uuid, date) from public, anon;

create table public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  storage_path text not null,   -- putanja u Supabase Storageu (bucket business-photos)
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index business_photos_business_idx on public.business_photos (business_id, sort_order);

-- ===========================================================================
-- 4. Vrste predmeta i dijelovi dana
-- ===========================================================================

alter table public.item_types
  add column template_key text,   -- lounger, set, cabana, pedalo, jet_ski, sup, kayak, ... ili custom
  add column description text,
  add column assignment_mode public.assignment_mode not null default 'auto',
  add column default_duration_min smallint check (default_duration_min between 5 and 1440),
  -- null = vrijedi postavka objekta
  add column reservation_hold_until time,
  add column booking_opens_days_before smallint check (booking_opens_days_before between 0 and 60),
  add column booking_opens_at time,
  add column booking_closes_at time;

-- Dijelovi dana po vrsti predmeta (6.1.3). Bez redaka = samo cijeli dan (ponoć do ponoći).
create table public.item_type_slots (
  id uuid primary key default gen_random_uuid(),
  item_type_id uuid not null references public.item_types (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),   -- "Cijeli dan", "1. polovica"
  starts_at time not null,
  ends_at time,                       -- null znači do zalaska sunca
  ends_at_sunset boolean generated always as (ends_at is null) stored,
  price_cents integer check (price_cents >= 0),   -- null = cijena vrste predmeta
  reservable boolean not null default false,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint item_type_slots_time_valid check (ends_at is null or ends_at > starts_at)
);

create index item_type_slots_type_idx on public.item_type_slots (item_type_id, sort_order);

create trigger item_type_slots_updated_at before update on public.item_type_slots
  for each row execute function public.set_updated_at();

create function public.item_type_slots_sync_business() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select business_id into new.business_id from public.item_types where id = new.item_type_id;
  return new;
end;
$$;

create trigger item_type_slots_sync_business before insert or update of item_type_id on public.item_type_slots
  for each row execute function public.item_type_slots_sync_business();

-- Zalazak sunca (lokalno vrijeme) za zadanu točku i datum. NOAA algoritam, točnost oko minute.
create function public.sunset_at(p_lat double precision, p_lng double precision, p_date date)
returns timestamptz
language plpgsql immutable parallel safe
set search_path = ''
as $$
declare
  n integer := extract(doy from p_date);
  lng_hour double precision := p_lng / 15;
  t double precision := n + ((18 - lng_hour) / 24);
  m double precision := 0.9856 * t - 3.289;
  l double precision;
  ra double precision;
  sin_dec double precision;
  cos_dec double precision;
  cos_h double precision;
  ut double precision;
begin
  l := m + 1.916 * sind(m) + 0.020 * sind(2 * m) + 282.634;
  l := l - 360 * floor(l / 360);
  ra := atand(0.91764 * tand(l));
  ra := ra - 360 * floor(ra / 360);
  ra := (ra + floor(l / 90) * 90 - floor(ra / 90) * 90) / 15;
  sin_dec := 0.39782 * sind(l);
  cos_dec := cosd(asind(sin_dec));
  cos_h := (cosd(90.833) - sin_dec * sind(p_lat)) / (cos_dec * cosd(p_lat));
  if cos_h < -1 or cos_h > 1 then
    return null;  -- polarni dan/noć, na Jadranu se ne događa
  end if;
  ut := acosd(cos_h) / 15 + ra - 0.06571 * t - 6.622 - lng_hour;
  ut := ut - 24 * floor(ut / 24);
  return (p_date::timestamp at time zone 'UTC') + make_interval(secs => ut * 3600);
end;
$$;

-- Vremenski raspon jednog dijela dana za zadani datum.
create function public.slot_range(p_slot_id uuid, p_date date) returns tstzrange
language sql stable
set search_path = ''
as $$
  select tstzrange(
    (p_date + s.starts_at) at time zone 'Europe/Zagreb',
    coalesce(
      (p_date + s.ends_at) at time zone 'Europe/Zagreb',
      public.sunset_at(extensions.st_y(b.location::extensions.geometry), extensions.st_x(b.location::extensions.geometry), p_date),
      public.local_midnight(p_date + 1)
    ),
    '[)'
  )
  from public.item_type_slots s
  join public.businesses b on b.id = s.business_id
  where s.id = p_slot_id;
$$;

-- Pravila rezervacija za vrstu predmeta: vrijednost vrste, a ako je nema, vrijednost objekta.
create function public.effective_booking_rules(p_item_type_id uuid)
returns table (hold_until time, opens_days_before smallint, opens_at time, closes_at time)
language sql stable security definer
set search_path = ''
as $$
  select
    coalesce(t.reservation_hold_until, b.reservation_hold_until),
    coalesce(t.booking_opens_days_before, b.booking_opens_days_before),
    coalesce(t.booking_opens_at, b.booking_opens_at),
    coalesce(t.booking_closes_at, b.booking_closes_at,
             coalesce(t.reservation_hold_until, b.reservation_hold_until))
  from public.item_types t
  join public.businesses b on b.id = t.business_id
  where t.id = p_item_type_id;
$$;

-- Kada se rezervacije za zadani dan otvaraju i zatvaraju (6.2.5).
create function public.booking_window(p_item_type_id uuid, p_date date)
returns table (opens_at timestamptz, closes_at timestamptz)
language sql stable
set search_path = ''
as $$
  select
    ((p_date - r.opens_days_before) + r.opens_at) at time zone 'Europe/Zagreb',
    coalesce((p_date + r.closes_at) at time zone 'Europe/Zagreb', public.local_midnight(p_date + 1))
  from public.effective_booking_rules(p_item_type_id) r;
$$;

-- Provjera pri spremanju postavki (6.2.6): zatvaranje ne smije biti nakon roka dolaska,
-- a otvaranje mora biti prije zatvaranja.
create function public.validate_booking_rules(p_item_type_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  r record;
begin
  select * into r from public.effective_booking_rules(p_item_type_id);
  if r.hold_until is not null and r.closes_at > r.hold_until then
    raise exception 'Rezervacije se moraju zatvoriti najkasnije u trenutku roka dolaska (%)', to_char(r.hold_until, 'HH24:MI')
      using errcode = '23514';
  end if;
  if r.opens_days_before = 0 and r.closes_at is not null and r.opens_at >= r.closes_at then
    raise exception 'Rezervacije se moraju otvoriti prije nego što se zatvore' using errcode = '23514';
  end if;
end;
$$;

create function public.item_types_validate_rules() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.validate_booking_rules(new.id);
  return new;
end;
$$;

create constraint trigger item_types_validate_rules after insert or update on public.item_types
  deferrable initially deferred
  for each row execute function public.item_types_validate_rules();

create function public.businesses_validate_rules() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  t_id uuid;
begin
  for t_id in select id from public.item_types where business_id = new.id loop
    perform public.validate_booking_rules(t_id);
  end loop;
  return new;
end;
$$;

create constraint trigger businesses_validate_rules after update on public.businesses
  deferrable initially deferred
  for each row execute function public.businesses_validate_rules();

-- ===========================================================================
-- 5. Bookings
-- ===========================================================================

alter table public.bookings
  add column slot_id uuid references public.item_type_slots (id) on delete restrict,
  add column payment_method public.payment_method,
  add column checked_in_at timestamptz,   -- kada je jedinica stvarno zauzeta (za "Kada je gužva")
  add column released_at timestamptz,     -- kada je oslobođena prije kraja (gost otišao, jet ski vraćen)
  add column group_id uuid not null default gen_random_uuid(),   -- više jedinica ili više dana jednim potezom
  add column public_token text,           -- tajni dio poveznice za turista; isti za cijelu grupu
  add column cancelled_by public.cancelled_by,
  add constraint bookings_sold_has_payment check (status <> 'sold' or payment_method is not null),
  add constraint bookings_released_valid check (released_at is null or status = 'sold');

create index bookings_group_idx on public.bookings (group_id);
create index bookings_token_idx on public.bookings (public_token) where public_token is not null;
create index bookings_unit_period_idx on public.bookings (unit_id, service_date);

-- Jedinica je zauzeta do povratka (released_at), a ne do planiranog kraja,
-- pa se vraćeni jet ski ili napuštena ležaljka mogu odmah ponovno izdati.
alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings drop column period;
alter table public.bookings add column period tstzrange generated always as (
  tstzrange(starts_at, greatest(starts_at, least(ends_at, coalesce(released_at, ends_at))), '[)')
) stored;
alter table public.bookings add constraint bookings_no_overlap exclude using gist (
  unit_id with =,
  period with &&
) where (status in ('reserved', 'sold'));

-- Cijena iz cjenika: dio dana ima prednost pred vrstom predmeta.
create function public.catalog_price(p_unit_id uuid, p_slot_id uuid) returns integer
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select price_cents from public.item_type_slots where id = p_slot_id),
    (select t.price_cents from public.units u join public.item_types t on t.id = u.item_type_id where u.id = p_unit_id)
  );
$$;

create or replace function public.bookings_prepare() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_item_type_id uuid;
  v_hold time;
  v_range tstzrange;
begin
  select business_id, item_type_id into new.business_id, v_item_type_id
  from public.units where id = new.unit_id;

  if new.slot_id is not null then
    if not exists (
      select 1 from public.item_type_slots
      where id = new.slot_id and item_type_id = v_item_type_id
    ) then
      raise exception 'Dio dana ne pripada ovoj vrsti predmeta';
    end if;
    v_range := public.slot_range(new.slot_id, new.service_date);
    new.starts_at := coalesce(new.starts_at, lower(v_range));
    new.ends_at := coalesce(new.ends_at, upper(v_range));
  else
    new.starts_at := coalesce(new.starts_at, public.local_midnight(new.service_date));
    new.ends_at := coalesce(new.ends_at, public.local_midnight(new.service_date + 1));
  end if;

  if tg_op = 'INSERT' then
    -- Cijenu iz cjenika mijenja samo vlasnik (6.1.4, 6.3.2).
    if new.price_cents is null or not public.is_business_owner(new.business_id) then
      new.price_cents := public.catalog_price(new.unit_id, new.slot_id);
    end if;

    -- Rok dolaska: vrsta predmeta, a ako ga nema, objekt (6.2.2).
    if new.status = 'reserved' and new.hold_until is null then
      select hold_until into v_hold from public.effective_booking_rules(v_item_type_id);
      if v_hold is not null then
        new.hold_until := (new.service_date + v_hold) at time zone 'Europe/Zagreb';
      end if;
    end if;

    if new.status = 'sold' then
      new.checked_in_at := coalesce(new.checked_in_at, greatest(now(), new.starts_at));
    end if;
  else
    if new.price_cents is distinct from old.price_cents and not public.is_business_owner(new.business_id)
       and current_user in ('authenticated', 'anon') then
      raise exception 'Cijenu može promijeniti samo vlasnik' using errcode = '42501';
    end if;
    -- Gost je stigao.
    if new.status = 'sold' and old.status = 'reserved' then
      new.checked_in_at := coalesce(new.checked_in_at, now());
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' and new.cancelled_by is null then
      new.cancelled_by := 'business';
    end if;
  end if;

  if new.status = 'sold' then
    new.hold_until := null;
  end if;

  return new;
end;
$$;

-- ===========================================================================
-- 6. Bilježnica: funkcije za aplikaciju iznajmljivača
--    (security invoker: RLS odlučuje tko smije; iste funkcije kasnije može zvati i POS)
-- ===========================================================================

-- Prodaja jedne ili više jedinica, za jedan ili više dana (6.1.6).
-- Za danas jedinica je zauzeta od sada; satni najam traje p_duration_min od sada.
create function public.record_sale(
  p_unit_ids uuid[],
  p_payment_method public.payment_method,
  p_date date default null,
  p_slot_id uuid default null,
  p_days integer default 1,
  p_duration_min integer default null,
  p_price_cents integer default null,
  p_note text default null
)
returns table (booking_id uuid, unit_id uuid, service_date date, group_id uuid)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today date := (now() at time zone 'Europe/Zagreb')::date;
  v_date date := coalesce(p_date, v_today);
  v_group uuid := gen_random_uuid();
  v_unit uuid;
  v_day date;
  v_start timestamptz;
  v_end timestamptz;
  v_range tstzrange;
  b public.bookings;
begin
  if p_unit_ids is null or cardinality(p_unit_ids) = 0 then
    raise exception 'Odaberite barem jednu jedinicu';
  end if;
  if p_days is null or p_days < 1 or p_days > 120 then
    raise exception 'Broj dana mora biti između 1 i 120';
  end if;
  if p_duration_min is not null and (p_duration_min < 5 or p_duration_min > 1440) then
    raise exception 'Trajanje mora biti između 5 i 1440 minuta';
  end if;
  if p_duration_min is not null and (v_date <> v_today or p_days <> 1) then
    raise exception 'Satni najam bilježi se samo za danas';
  end if;

  foreach v_unit in array p_unit_ids loop
    for i in 0 .. p_days - 1 loop
      v_day := v_date + i;
      v_start := null;
      v_end := null;
      if p_duration_min is not null then
        v_start := now();
        v_end := now() + make_interval(mins => p_duration_min);
      elsif v_day = v_today then
        v_range := case
          when p_slot_id is not null then public.slot_range(p_slot_id, v_day)
          else tstzrange(public.local_midnight(v_day), public.local_midnight(v_day + 1), '[)')
        end;
        if now() >= upper(v_range) then
          raise exception 'Taj dio dana je već završio';
        end if;
        v_start := greatest(lower(v_range), now());
        v_end := upper(v_range);
      end if;

      insert into public.bookings (unit_id, service_date, slot_id, starts_at, ends_at, status, source,
                                   payment_method, price_cents, note, group_id)
      values (v_unit, v_day, p_slot_id, v_start, v_end, 'sold', 'walk_in',
              p_payment_method, p_price_cents, p_note, v_group)
      returning id, unit_id, service_date, group_id into b.id, b.unit_id, b.service_date, b.group_id;

      return query select b.id, b.unit_id, b.service_date, b.group_id;
    end loop;
  end loop;
end;
$$;

-- Rezervacija koju upisuje djelatnik (telefonom ili uživo).
create function public.record_reservation(
  p_unit_ids uuid[],
  p_date date,
  p_customer_name text,
  p_customer_phone text default null,
  p_source public.booking_source default 'phone',
  p_slot_id uuid default null,
  p_hold_until timestamptz default null,
  p_note text default null
)
returns table (booking_id uuid, unit_id uuid, group_id uuid, hold_until timestamptz)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_group uuid := gen_random_uuid();
  v_unit uuid;
  b public.bookings;
begin
  if p_unit_ids is null or cardinality(p_unit_ids) = 0 then
    raise exception 'Odaberite barem jednu jedinicu';
  end if;
  if p_date < (now() at time zone 'Europe/Zagreb')::date then
    raise exception 'Datum je u prošlosti';
  end if;
  if length(trim(coalesce(p_customer_name, ''))) < 1 then
    raise exception 'Upišite ime gosta';
  end if;

  foreach v_unit in array p_unit_ids loop
    insert into public.bookings (unit_id, service_date, slot_id, status, source, hold_until,
                                 customer_name, customer_phone, note, group_id)
    values (v_unit, p_date, p_slot_id, 'reserved', p_source, p_hold_until,
            trim(p_customer_name), nullif(trim(coalesce(p_customer_phone, '')), ''), p_note, v_group)
    returning id, unit_id, group_id, hold_until into b.id, b.unit_id, b.group_id, b.hold_until;
    return query select b.id, b.unit_id, b.group_id, b.hold_until;
  end loop;
end;
$$;

-- Gost je stigao: rezervacija postaje prodaja (6.2.4).
create function public.check_in(p_booking_id uuid, p_payment_method public.payment_method)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.bookings
  set status = 'sold', payment_method = p_payment_method
  where id = p_booking_id and status = 'reserved';
  if not found then
    raise exception 'Rezervacija ne postoji ili više nije aktivna';
  end if;
end;
$$;

-- Jedinica je slobodna prije planiranog kraja (gost otišao, jet ski vraćen).
create function public.release_booking(p_booking_id uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.bookings
  set released_at = now()
  where id = p_booking_id and status = 'sold' and released_at is null;
  if not found then
    raise exception 'Prodaja ne postoji ili je jedinica već slobodna';
  end if;
end;
$$;

-- Otkazivanje od strane objekta. Ništa se ne briše (6.1.7).
create function public.cancel_booking(p_booking_id uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.bookings
  set status = 'cancelled', cancelled_by = 'business'
  where id = p_booking_id and status in ('reserved', 'sold');
  if not found then
    raise exception 'Zapis ne postoji ili je već otkazan';
  end if;
end;
$$;

-- Promjena cijene pojedine prodaje (popust, stalni gost). Samo vlasnik.
create function public.set_booking_price(p_booking_id uuid, p_price_cents integer) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_business uuid;
begin
  select business_id into v_business from public.bookings where id = p_booking_id;
  if v_business is null or not public.is_business_owner(v_business) then
    raise exception 'Cijenu može promijeniti samo vlasnik' using errcode = '42501';
  end if;
  if p_price_cents is null or p_price_cents < 0 then
    raise exception 'Neispravna cijena';
  end if;
  update public.bookings set price_cents = p_price_cents where id = p_booking_id;
end;
$$;

revoke execute on function public.set_booking_price(uuid, integer) from public, anon;

-- ===========================================================================
-- 7. Rezervacije turista
-- ===========================================================================

-- 091 123 456, +385 91 123 456 i 00385911234567 daju isti broj: 38591123456.
create function public.normalize_phone(p_phone text) returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select case
    when d like '00%' then substr(d, 3)
    when d like '0%' then '385' || substr(d, 2)
    else d
  end
  from (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d) x;
$$;

create table public.blocked_phones (
  business_id uuid not null references public.businesses (id) on delete cascade,
  phone text not null,   -- normalize_phone()
  note text,
  created_at timestamptz not null default now(),
  primary key (business_id, phone)
);

create function public.blocked_phones_normalize() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  return new;
end;
$$;

create trigger blocked_phones_normalize before insert or update on public.blocked_phones
  for each row execute function public.blocked_phones_normalize();

-- Stanje rezervacija za vrstu predmeta i dan, za prikaz turistu prije odabira.
-- state: open, not_yet_open (opens_at kaže kada), closed (za danas dođite izravno), unavailable.
create function public.reservation_availability(p_item_type_id uuid, p_date date)
returns table (state text, opens_at timestamptz, closes_at timestamptz, hold_until timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  t public.item_types;
  biz public.businesses;
  w record;
  r record;
begin
  select * into t from public.item_types where id = p_item_type_id and archived_at is null;
  select * into biz from public.businesses where id = t.business_id;
  if t.id is null or not t.reservable or not biz.reservations_enabled
     or not public.business_is_listed(biz.is_published, biz.approved_at, biz.is_demo, biz.subscription_until)
     or p_date < (now() at time zone 'Europe/Zagreb')::date then
    return query select 'unavailable'::text, null::timestamptz, null::timestamptz, null::timestamptz;
    return;
  end if;

  select * into w from public.booking_window(t.id, p_date);
  select * into r from public.effective_booking_rules(t.id);

  return query select
    case when now() < w.opens_at then 'not_yet_open' when now() >= w.closes_at then 'closed' else 'open' end,
    w.opens_at,
    w.closes_at,
    case when r.hold_until is null then null else (p_date + r.hold_until) at time zone 'Europe/Zagreb' end;
end;
$$;

-- Slobodne jedinice za raspored koji turist vidi kad sam bira mjesto. Bez ikakvih podataka o gostima.
create function public.available_units(p_item_type_id uuid, p_date date, p_slot_id uuid default null)
returns table (unit_id uuid, label text, unit_position integer, is_free boolean)
language sql stable security definer
set search_path = ''
as $$
  with t as (
    select it.id
    from public.item_types it
    where it.id = p_item_type_id and it.archived_at is null and it.reservable
      and public.is_business_listed(it.business_id)
  ), rng as (
    select coalesce(
      public.slot_range(p_slot_id, p_date),
      tstzrange(public.local_midnight(p_date), public.local_midnight(p_date + 1), '[)')
    ) as r
  )
  select u.id, u.label, u.position,
         not exists (
           select 1 from public.bookings bk
           where bk.unit_id = u.id and bk.status in ('reserved', 'sold') and bk.period && rng.r
         )
  from public.units u, t, rng
  where u.item_type_id = t.id and u.is_active
  order by u.position;
$$;

drop function public.request_reservation(uuid, date, text, text);

-- Rezervacija iz turističke aplikacije (3.1 T4, 6.2).
--   * gost bira sam: p_unit_ids; automatski: p_quantity
--   * provjerava razdoblje za rezervacije i rok dolaska
--   * jedan broj mobitela, jedna aktivna rezervacija po objektu za isti dan; blokirani brojevi odbijeni
--   * vraća public_token za poveznicu "Moja rezervacija"
create function public.request_reservation(
  p_item_type_id uuid,
  p_date date,
  p_customer_name text,
  p_customer_phone text,
  p_accepted_terms boolean,
  p_unit_ids uuid[] default null,
  p_quantity integer default 1,
  p_slot_id uuid default null
)
returns table (group_id uuid, public_token text, unit_labels text[], hold_until timestamptz, note text)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  t public.item_types;
  biz public.businesses;
  v_slot public.item_type_slots;
  v_avail record;
  v_phone text := public.normalize_phone(p_customer_phone);
  v_group uuid := gen_random_uuid();
  v_token text := encode(extensions.gen_random_bytes(18), 'hex');
  v_range tstzrange;
  v_units uuid[];
  v_labels text[];
  v_hold timestamptz;
  v_unit uuid;
begin
  if not coalesce(p_accepted_terms, false) then
    raise exception 'Potvrdite da razumijete uvjete rezervacije';
  end if;
  if length(trim(coalesce(p_customer_name, ''))) < 2 or length(v_phone) < 8 then
    raise exception 'Upišite ime i broj mobitela';
  end if;

  select * into t from public.item_types where id = p_item_type_id and archived_at is null;
  select * into biz from public.businesses where id = t.business_id;

  if t.id is null or not t.reservable or not biz.reservations_enabled
     or not public.business_is_listed(biz.is_published, biz.approved_at, biz.is_demo, biz.subscription_until) then
    raise exception 'Ovaj objekt ne prima rezervacije';
  end if;

  if p_slot_id is not null then
    select * into v_slot from public.item_type_slots
    where id = p_slot_id and item_type_id = t.id and archived_at is null;
    if v_slot.id is null or not v_slot.reservable then
      raise exception 'Taj dio dana ne može se rezervirati';
    end if;
  elsif exists (select 1 from public.item_type_slots where item_type_id = t.id and archived_at is null) then
    raise exception 'Odaberite dio dana';
  end if;

  select * into v_avail from public.reservation_availability(t.id, p_date);
  if v_avail.state = 'not_yet_open' then
    raise exception 'Rezervacije za ovaj dan otvaraju se %',
      to_char(v_avail.opens_at at time zone 'Europe/Zagreb', 'DD.MM. "u" HH24:MI');
  elsif v_avail.state <> 'open' then
    raise exception 'Za ovaj dan rezervacije su zatvorene, dođite izravno';
  end if;
  -- Rok dolaska je već prošao (rezervacija bi odmah istekla).
  if v_avail.hold_until is not null and v_avail.hold_until <= now() then
    raise exception 'Za ovaj dan rezervacije su zatvorene, dođite izravno';
  end if;

  if exists (select 1 from public.blocked_phones where business_id = biz.id and phone = v_phone) then
    raise exception 'Rezervacija s ovim brojem nije moguća. Javite se objektu telefonom.';
  end if;

  perform public.release_expired_reservations();

  if exists (
    select 1 from public.bookings
    where business_id = biz.id and service_date = p_date and status = 'reserved'
      and source = 'tourist_app' and public.normalize_phone(customer_phone) = v_phone
  ) then
    raise exception 'S ovim brojem već imate rezervaciju za taj dan';
  end if;

  v_range := coalesce(
    public.slot_range(p_slot_id, p_date),
    tstzrange(public.local_midnight(p_date), public.local_midnight(p_date + 1), '[)')
  );

  if t.assignment_mode = 'guest_choice' then
    if p_unit_ids is null or cardinality(p_unit_ids) = 0 then
      raise exception 'Odaberite mjesto';
    end if;
    if cardinality(p_unit_ids) > 10 then
      raise exception 'Najviše 10 mjesta po rezervaciji';
    end if;
    select array_agg(u.id order by u.position) into v_units
    from public.units u
    where u.id = any (p_unit_ids) and u.item_type_id = t.id and u.is_active;
    if coalesce(cardinality(v_units), 0) <> cardinality(p_unit_ids) then
      raise exception 'Odabrano mjesto ne postoji';
    end if;
  else
    if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
      raise exception 'Količina mora biti između 1 i 10';
    end if;
    select array_agg(id order by position) into v_units
    from (
      select u.id, u.position
      from public.units u
      where u.item_type_id = t.id and u.is_active
        and not exists (
          select 1 from public.bookings bk
          where bk.unit_id = u.id and bk.status in ('reserved', 'sold') and bk.period && v_range
        )
      order by u.position
      limit p_quantity
      for update skip locked
    ) free;
    if coalesce(cardinality(v_units), 0) < p_quantity then
      raise exception 'Nema dovoljno slobodnih mjesta za taj dan';
    end if;
  end if;

  begin
    foreach v_unit in array v_units loop
      insert into public.bookings (unit_id, service_date, slot_id, status, source,
                                   customer_name, customer_phone, group_id, public_token, created_by)
      values (v_unit, p_date, p_slot_id, 'reserved', 'tourist_app',
              trim(p_customer_name), trim(p_customer_phone), v_group, v_token, null)
      returning hold_until into v_hold;
    end loop;
  exception when exclusion_violation then
    raise exception 'Odabrano mjesto je upravo zauzeto, odaberite drugo';
  end;

  select array_agg(u.label order by u.position) into v_labels
  from public.units u where u.id = any (v_units);

  return query select v_group, v_token, v_labels, v_hold, biz.reservation_note;
end;
$$;

-- Moja rezervacija (3.1 T5). Status: reserved, sold (gost stigao), expired, cancelled.
create function public.reservation_by_token(p_token text)
returns table (
  status public.booking_status,
  service_date date,
  unit_labels text[],
  item_type_name text,
  slot_name text,
  hold_until timestamptz,
  business_name text,
  business_address text,
  business_place text,
  business_phone text,
  lat double precision,
  lng double precision,
  can_cancel boolean
)
language sql stable security definer
set search_path = ''
as $$
  select
    -- Ako je barem jedno mjesto još aktivno, grupa je aktivna.
    (array_agg(bk.status order by case bk.status when 'sold' then 0 when 'reserved' then 1 when 'expired' then 2 else 3 end))[1],
    min(bk.service_date),
    array_agg(u.label order by u.position),
    min(t.name),
    min(s.name),
    max(bk.hold_until),
    min(b.name), min(b.address), min(b.place), min(b.phone),
    extensions.st_y(min(b.location::extensions.geometry)),
    extensions.st_x(min(b.location::extensions.geometry)),
    bool_or(bk.status = 'reserved' and (bk.hold_until is null or bk.hold_until > now()))
  from public.bookings bk
  join public.units u on u.id = bk.unit_id
  join public.item_types t on t.id = u.item_type_id
  join public.businesses b on b.id = bk.business_id
  left join public.item_type_slots s on s.id = bk.slot_id
  where p_token is not null and length(p_token) >= 32 and bk.public_token = p_token
  having count(*) > 0;
$$;

-- Turist otkazuje sam, do roka dolaska (6.2.9).
create function public.cancel_reservation(p_token text) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'Rezervacija ne postoji';
  end if;
  update public.bookings
  set status = 'cancelled', cancelled_by = 'guest'
  where public_token = p_token and status = 'reserved'
    and (hold_until is null or hold_until > now());
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Rezervaciju više nije moguće otkazati';
  end if;
  return n;
end;
$$;

revoke execute on function public.request_reservation(uuid, date, text, text, boolean, uuid[], integer, uuid) from public;
revoke execute on function public.reservation_by_token(text) from public;
revoke execute on function public.cancel_reservation(text) from public;
revoke execute on function public.reservation_availability(uuid, date) from public;
revoke execute on function public.available_units(uuid, date, uuid) from public;
grant execute on function public.request_reservation(uuid, date, text, text, boolean, uuid[], integer, uuid) to anon, authenticated;
grant execute on function public.reservation_by_token(text) to anon, authenticated;
grant execute on function public.cancel_reservation(text) to anon, authenticated;
grant execute on function public.reservation_availability(uuid, date) to anon, authenticated;
grant execute on function public.available_units(uuid, date, uuid) to anon, authenticated;

-- ===========================================================================
-- 8. Gužva
-- ===========================================================================

-- Pragovi iz 3.2. Isti su u packages/core/src/crowd.ts.
create function public.crowd_level_for(p_occupied integer, p_total integer) returns public.crowd_level
language sql immutable parallel safe
set search_path = ''
as $$
  select case
    when p_total is null or p_total <= 0 then 'no_data'
    when p_occupied >= p_total then 'full'
    when p_occupied::numeric / p_total >= 0.75 then 'busy'
    when p_occupied::numeric / p_total >= 0.5 then 'moderate'
    when p_occupied::numeric / p_total >= 0.2 then 'few'
    else 'empty'
  end::public.crowd_level;
$$;

-- Trenutna razina gužve objekta. Ako danas još ništa nije označeno, vraća no_data,
-- da neažurni objekt ne izgleda kao prazna plaža (3.2).
create function public.business_crowd_level(p_business_id uuid) returns public.crowd_level
language sql stable security definer
set search_path = ''
as $$
  with today as (select (now() at time zone 'Europe/Zagreb')::date as d),
  marked as (
    select exists (
      select 1 from public.bookings bk, today
      where bk.business_id = p_business_id and bk.service_date = today.d
        and (bk.created_by is not null or bk.checked_in_at is not null)
    ) as yes
  ),
  totals as (
    select
      (select count(*)::int from public.units u
         join public.item_types t on t.id = u.item_type_id
        where u.business_id = p_business_id and u.is_active and t.archived_at is null) as total,
      (select count(distinct bk.unit_id)::int from public.bookings bk
        where bk.business_id = p_business_id
          and bk.period @> now()
          and public.is_active_booking(bk)) as occupied
  )
  select case when not marked.yes then 'no_data'::public.crowd_level
              else public.crowd_level_for(totals.occupied, totals.total) end
  from marked, totals;
$$;

-- Zauzetost po satu: koliko je jedinica bilo zauzeto u pola tog sata.
-- Iz checked_in_at i released_at, pa računa stvarnu prisutnost, a ne samo prodaju (3.2, 7.2).
create function public.occupancy_by_hour(p_business_id uuid, p_from date, p_to date)
returns table (day date, hour smallint, occupied integer, total integer)
language sql stable
set search_path = ''
as $$
  with total as (
    select count(*)::int as n
    from public.units u join public.item_types t on t.id = u.item_type_id
    where u.business_id = p_business_id and u.is_active and t.archived_at is null
  ),
  slots as (
    select d::date as day, h::smallint as hour,
           (d::date + make_time(h, 30, 0)) at time zone 'Europe/Zagreb' as at
    from generate_series(p_from, p_to, interval '1 day') d, generate_series(0, 23) h
  )
  select s.day, s.hour,
    (select count(distinct bk.unit_id)::int
       from public.bookings bk
      where bk.business_id = p_business_id
        and bk.service_date between s.day - 1 and s.day
        and bk.status = 'sold'
        and bk.checked_in_at <= s.at
        and coalesce(bk.released_at, bk.ends_at) > s.at),
    total.n
  from slots s, total
  order by 1, 2;
$$;

-- "Kada je gužva": prosjek zadnja četiri tjedna po danu u tjednu i satu. Osvježava se jednom dnevno.
create table public.popular_times (
  business_id uuid not null references public.businesses (id) on delete cascade,
  dow smallint not null check (dow between 0 and 6),   -- 0 = nedjelja (extract(dow))
  hour smallint not null check (hour between 0 and 23),
  avg_occupancy real not null,
  sample_days smallint not null,
  weeks_with_data smallint not null,
  refreshed_at timestamptz not null default now(),
  primary key (business_id, dow, hour)
);

create function public.refresh_popular_times() returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Zagreb')::date;
  v_business uuid;
  n integer := 0;
begin
  delete from public.popular_times;
  for v_business in
    select distinct business_id from public.bookings
    where service_date between v_today - 28 and v_today - 1 and status = 'sold'
  loop
    insert into public.popular_times (business_id, dow, hour, avg_occupancy, sample_days, weeks_with_data)
    select v_business, extract(dow from o.day)::smallint, o.hour,
           avg(o.occupied::real / nullif(o.total, 0)),
           count(*)::smallint,
           count(distinct date_trunc('week', o.day))::smallint
    from public.occupancy_by_hour(v_business, v_today - 28, v_today - 1) o
    -- Samo dani kad je objekt radio i bilježio.
    where exists (
      select 1 from public.bookings bk
      where bk.business_id = v_business and bk.service_date = o.day and bk.status = 'sold'
    )
    group by 2, 3;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.refresh_popular_times() from public, anon, authenticated;

-- Za graf na stranici objekta: razina po satu za zadani dan u tjednu, bez postotaka.
-- Dok se ne skupe dva tjedna podataka, ne vraća ništa.
create function public.business_popular_times(p_business_id uuid, p_dow smallint default null)
returns table (hour smallint, level public.crowd_level)
language sql stable security definer
set search_path = ''
as $$
  select p.hour, public.crowd_level_for(round(p.avg_occupancy * 100)::int, 100)
  from public.popular_times p
  where p.business_id = p_business_id
    and p.dow = coalesce(p_dow, extract(dow from now() at time zone 'Europe/Zagreb')::smallint)
    and p.weeks_with_data >= 2
    and public.is_business_listed(p_business_id)
  order by p.hour;
$$;

revoke execute on function public.business_popular_times(uuid, smallint) from public;
grant execute on function public.business_popular_times(uuid, smallint) to anon, authenticated;

-- Karta: samo razina gužve, nikad brojke (3.2, 6.4.2).
create function public.nearby_businesses(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 10000
)
returns table (
  id uuid,
  name text,
  slug text,
  category public.business_category,
  place text,
  lat double precision,
  lng double precision,
  distance_m double precision,
  reservations_enabled boolean,
  crowd public.crowd_level
)
language sql stable security definer
set search_path = ''
as $$
  with here as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  )
  select
    b.id, b.name, b.slug, b.category, b.place,
    extensions.st_y(b.location::extensions.geometry),
    extensions.st_x(b.location::extensions.geometry),
    extensions.st_distance(b.location, here.g),
    b.reservations_enabled and exists (
      select 1 from public.item_types t where t.business_id = b.id and t.reservable and t.archived_at is null
    ),
    public.business_crowd_level(b.id)
  from public.businesses b, here
  where public.business_is_listed(b.is_published, b.approved_at, b.is_demo, b.subscription_until)
    and extensions.st_dwithin(b.location, here.g, least(greatest(p_radius_m, 100), 50000))
  order by 8
  limit 200;
$$;

revoke execute on function public.nearby_businesses(double precision, double precision, integer) from public;
grant execute on function public.nearby_businesses(double precision, double precision, integer) to anon, authenticated;

-- ===========================================================================
-- 9. QR kodovi
-- ===========================================================================

create table public.qr_codes (
  code text primary key check (code ~ '^[a-z0-9]{4,16}$'),   -- litowave.hr/q/{code}, nikad se ne mijenja
  kind public.qr_kind not null,
  name text not null,                     -- "Apartmani Marija"
  place text,                             -- "Zaborić"
  location extensions.geography (point, 4326),   -- za smještaj obavezno, za javno mjesto neobavezno
  contact text,
  redirect_to text,                       -- preusmjeravanje bez ponovnog tiska
  is_active boolean not null default true,
  print_batch text,
  created_at timestamptz not null default now(),
  constraint qr_codes_accommodation_location check (kind <> 'accommodation' or location is not null)
);

create table public.qr_scans (
  id bigint generated always as identity primary key,
  code text not null references public.qr_codes (code) on delete cascade,
  scanned_on date not null default (now() at time zone 'Europe/Zagreb')::date
);
create index qr_scans_code_idx on public.qr_scans (code, scanned_on);

-- Ulaz preko QR koda (3.1 T1). Bilježi samo da je kod skeniran, bez podataka o osobi.
create function public.resolve_qr(p_code text)
returns table (kind public.qr_kind, name text, place text, lat double precision, lng double precision, redirect_to text)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  q public.qr_codes;
begin
  select * into q from public.qr_codes where code = lower(p_code) and is_active;
  if q.code is null then
    return;
  end if;
  insert into public.qr_scans (code) values (q.code);
  return query select q.kind, q.name, q.place,
    extensions.st_y(q.location::extensions.geometry),
    extensions.st_x(q.location::extensions.geometry),
    q.redirect_to;
end;
$$;

revoke execute on function public.resolve_qr(text) from public;
grant execute on function public.resolve_qr(text) to anon, authenticated;

-- ===========================================================================
-- 10. Push obavijesti
-- ===========================================================================

create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_tokens_business_idx on public.push_tokens (business_id);

-- ===========================================================================
-- 11. Izvještaji: samo vlasnik (6.3)
-- ===========================================================================

-- Pogledi rade s pravima vlasnika baze, pa sami filtriraju po vlasništvu.
-- Djelatnik iz njih ne dobiva nijedan redak.
drop view public.report_daily;

create view public.report_daily as
select
  bk.business_id,
  u.item_type_id,
  bk.service_date as day,
  count(*) filter (where bk.status = 'sold')::int as sold_count,
  count(*) filter (where bk.source = 'tourist_app')::int as app_reservations,
  count(*) filter (where bk.source = 'phone')::int as phone_reservations,
  count(*) filter (where bk.source = 'walk_in' and bk.status = 'sold')::int as walk_in_sales,
  count(*) filter (where bk.status = 'expired')::int as expired_count,
  count(*) filter (where bk.status = 'cancelled')::int as cancelled_count,
  coalesce(sum(bk.price_cents) filter (where bk.status = 'sold'), 0)::bigint as revenue_cents,
  coalesce(sum(bk.price_cents) filter (where bk.status = 'sold' and bk.payment_method = 'cash'), 0)::bigint as cash_cents,
  coalesce(sum(bk.price_cents) filter (where bk.status = 'sold' and bk.payment_method = 'card'), 0)::bigint as card_cents
from public.bookings bk
join public.units u on u.id = bk.unit_id
where public.is_business_owner(bk.business_id)
group by bk.business_id, u.item_type_id, bk.service_date;

create view public.report_season as
select
  bk.business_id,
  extract(year from bk.service_date)::int as season,
  coalesce(sum(bk.price_cents) filter (where bk.status = 'sold'), 0)::bigint as revenue_cents,
  coalesce(sum(bk.price_cents) filter (where bk.status = 'sold' and bk.payment_method = 'cash'), 0)::bigint as cash_cents,
  coalesce(sum(bk.price_cents) filter (where bk.status = 'sold' and bk.payment_method = 'card'), 0)::bigint as card_cents,
  count(*) filter (where bk.status = 'sold')::int as sold_count,
  count(*) filter (where bk.source = 'tourist_app')::int as app_reservations,
  count(*) filter (where bk.status = 'expired')::int as no_shows,
  count(*) filter (where bk.status in ('reserved', 'sold', 'expired') and bk.source <> 'walk_in')::int as reservations_total,
  min(bk.service_date) filter (where bk.status = 'sold') as first_day,
  max(bk.service_date) filter (where bk.status = 'sold') as last_day
from public.bookings bk
where public.is_business_owner(bk.business_id)
group by bk.business_id, extract(year from bk.service_date);

-- Cijene pojedinih zapisa, za vlasnika (stupac price_cents u bookings djelatnik ne može čitati).
create view public.booking_amounts as
select bk.id, bk.business_id, bk.group_id, bk.service_date, bk.status, bk.payment_method, bk.price_cents
from public.bookings bk
where public.is_business_owner(bk.business_id);

revoke all on public.report_daily, public.report_season, public.booking_amounts from anon;
grant select on public.report_daily, public.report_season, public.booking_amounts to authenticated;

-- ===========================================================================
-- 12. Privatnost: brisanje podataka gostiju nakon 30 dana (6.4.3)
-- ===========================================================================

create function public.purge_guest_data() returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.bookings
  set customer_name = null, customer_phone = null
  where service_date < (now() at time zone 'Europe/Zagreb')::date - 30
    and (customer_name is not null or customer_phone is not null);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.purge_guest_data() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-guest-data', '15 3 * * *', 'select public.purge_guest_data()');
    perform cron.schedule('refresh-popular-times', '30 3 * * *', 'select public.refresh_popular_times()');
  end if;
end;
$$;

-- ===========================================================================
-- 13. Prava pristupa (RLS i stupci)
-- ===========================================================================

-- Objekti: na karti su samo odobreni; članovi i administrator vide svoje.
drop policy businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select to anon, authenticated
  using (
    public.business_is_listed(is_published, approved_at, is_demo, subscription_until)
    or public.is_business_member(id)
    or public.is_platform_admin()
  );

-- Ponudu, cijene i raspored uređuje samo vlasnik (6.3.1). Djelatnik ih vidi.
drop policy item_types_select on public.item_types;
drop policy item_types_write on public.item_types;
create policy item_types_select on public.item_types
  for select to anon, authenticated
  using (public.is_business_member(business_id) or public.is_business_listed(business_id));
create policy item_types_insert on public.item_types
  for insert to authenticated with check (public.is_business_owner(business_id));
create policy item_types_update on public.item_types
  for update to authenticated
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy item_types_delete on public.item_types
  for delete to authenticated using (public.is_business_owner(business_id));

drop policy units_select on public.units;
drop policy units_write on public.units;
create policy units_select on public.units
  for select to anon, authenticated
  using (public.is_business_member(business_id) or public.is_business_listed(business_id));
create policy units_insert on public.units
  for insert to authenticated with check (public.is_business_owner(business_id));
create policy units_update on public.units
  for update to authenticated
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

alter table public.item_type_slots enable row level security;
create policy item_type_slots_select on public.item_type_slots
  for select to anon, authenticated
  using (public.is_business_member(business_id) or public.is_business_listed(business_id));
create policy item_type_slots_insert on public.item_type_slots
  for insert to authenticated with check (public.is_business_owner(business_id));
create policy item_type_slots_update on public.item_type_slots
  for update to authenticated
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy item_type_slots_delete on public.item_type_slots
  for delete to authenticated using (public.is_business_owner(business_id));

-- Bookings: članovi bilježe i čitaju, ali ne brišu (6.1.7).
-- price_cents nije čitljiv iz aplikacije; vlasnik ga vidi kroz booking_amounts i izvještaje.
drop policy bookings_member on public.bookings;
create policy bookings_select on public.bookings
  for select to authenticated using (public.is_business_member(business_id));
create policy bookings_insert on public.bookings
  for insert to authenticated with check (public.is_business_member(business_id));
create policy bookings_update on public.bookings
  for update to authenticated
  using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

revoke all on public.bookings from anon;
revoke select, update, delete on public.bookings from authenticated;
grant select (
  id, business_id, unit_id, service_date, starts_at, ends_at, period, status, source, hold_until,
  customer_name, customer_phone, note, created_by, created_at, updated_at,
  slot_id, payment_method, checked_in_at, released_at, group_id, cancelled_by
) on public.bookings to authenticated;
grant update (
  unit_id, status, hold_until, customer_name, customer_phone, note,
  payment_method, released_at, cancelled_by
) on public.bookings to authenticated;

alter table public.business_photos enable row level security;
create policy business_photos_select on public.business_photos
  for select to anon, authenticated
  using (public.is_business_member(business_id) or public.is_business_listed(business_id));
create policy business_photos_write on public.business_photos
  for all to authenticated
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

alter table public.blocked_phones enable row level security;
create policy blocked_phones_owner on public.blocked_phones
  for all to authenticated
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

alter table public.push_tokens enable row level security;
create policy push_tokens_own on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_business_member(business_id));

-- QR kodove, skeniranja i "Kada je gužva" čitaju samo funkcije i administrator.
alter table public.qr_codes enable row level security;
alter table public.qr_scans enable row level security;
alter table public.popular_times enable row level security;
create policy qr_codes_admin on public.qr_codes
  for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy qr_scans_admin on public.qr_scans
  for select to authenticated using (public.is_platform_admin());

-- Realtime: novi stupci se šalju sami; item_type_slots za promjene u ponudi.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.item_type_slots;
  end if;
end;
$$;
