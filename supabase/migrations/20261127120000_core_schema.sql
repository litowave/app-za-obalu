-- Osnovna shema: objekti (iznajmljivači), vrste predmeta, numerirane jedinice i bookings
-- (rezervacije i prodaje po jedinici). Vrijeme se uvijek računa u Europe/Zagreb.

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumi
-- ---------------------------------------------------------------------------

create type public.business_category as enum (
  'beach',        -- ležaljke, suncobrani, cabane
  'watersports',  -- jet ski, parasailing, wakeboard
  'boat_rental',  -- pedaline, kajaci, SUP, gliseri
  'aquapark',
  'other'
);

create type public.member_role as enum ('owner', 'staff');

create type public.label_style as enum ('number', 'letter');

create type public.price_unit as enum ('day', 'half_day', 'hour', 'session');

-- reserved: rezervirano, gost još nije došao
-- sold:     prodano / u upotrebi (gost je na plaži ili je platio na licu mjesta)
-- cancelled: otkazano
-- expired:  gost nije došao do roka, rezervacija je oslobođena
create type public.booking_status as enum ('reserved', 'sold', 'cancelled', 'expired');

create type public.booking_source as enum ('walk_in', 'tourist_app', 'phone');

-- ---------------------------------------------------------------------------
-- Pomoćne funkcije
-- ---------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Ponoć zadanog dana po hrvatskom vremenu.
create function public.local_midnight(d date) returns timestamptz
language sql immutable parallel safe
set search_path = ''
as $$
  select (d::timestamp at time zone 'Europe/Zagreb');
$$;

-- ---------------------------------------------------------------------------
-- Profili
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  locale text not null default 'hr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Objekti
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category public.business_category not null,
  description text,
  phone text,
  website text,
  address text,
  place text,                                   -- mjesto, npr. "Primošten"
  location extensions.geography (point, 4326) not null,
  is_published boolean not null default false,  -- vidljivo turistima na karti

  -- Rezervacije uključuje samo iznajmljivač koji ih želi.
  reservations_enabled boolean not null default false,
  -- Do kada (lokalno vrijeme, na dan rezervacije) gost mora doći, inače se rezervacija oslobađa.
  -- null = rezervacija vrijedi cijeli dan.
  reservation_hold_until time default '11:00',
  -- Napomena koju turist vidi pri rezervaciji (npr. "Plaćanje na licu mjesta").
  reservation_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_location_idx on public.businesses using gist (location);
create index businesses_published_idx on public.businesses (is_published) where is_published;

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_members_user_idx on public.business_members (user_id);

-- Vlasnik automatski postaje član s ulogom owner.
create function public.add_owner_membership() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.business_members (business_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

create trigger businesses_add_owner after insert on public.businesses
  for each row execute function public.add_owner_membership();

-- security definer da RLS politike ne bi rekurzivno provjeravale same sebe.
create function public.is_business_member(p_business_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = auth.uid()
  );
$$;

create function public.is_business_owner(p_business_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- Vrste predmeta i jedinice
-- ---------------------------------------------------------------------------

create table public.item_types (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),   -- "Ležaljka", "Cabana", "Jet ski"
  label_style public.label_style not null default 'number',
  label_prefix text not null default '' check (length(label_prefix) <= 10),
  price_cents integer check (price_cents >= 0),
  price_unit public.price_unit not null default 'day',
  reservable boolean not null default false,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index item_types_business_idx on public.item_types (business_id);

create trigger item_types_updated_at before update on public.item_types
  for each row execute function public.set_updated_at();

create table public.units (
  id uuid primary key default gen_random_uuid(),
  item_type_id uuid not null references public.item_types (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  position integer not null check (position > 0),
  label text not null check (length(trim(label)) between 1 and 20),  -- korisnik ga smije preimenovati
  is_active boolean not null default true,  -- neispravna/maknuta jedinica ostaje u povijesti
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_type_id, position),
  unique (item_type_id, label)
);

create index units_business_idx on public.units (business_id);

create trigger units_updated_at before update on public.units
  for each row execute function public.set_updated_at();

-- business_id na jedinici uvijek prati vrstu predmeta (treba RLS-u i izvještajima).
create function public.units_sync_business() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select business_id into new.business_id from public.item_types where id = new.item_type_id;
  return new;
end;
$$;

create trigger units_sync_business before insert or update of item_type_id on public.units
  for each row execute function public.units_sync_business();

-- Ista pravila kao `unitLabel()` u packages/core: 1 → A, 27 → AA.
create function public.unit_label(p_style public.label_style, p_position integer, p_prefix text default '')
returns text
language plpgsql immutable parallel safe
set search_path = ''
as $$
declare
  n integer := p_position;
  out text := '';
begin
  if p_position is null or p_position < 1 then
    raise exception 'Pozicija mora biti veća od 0';
  end if;
  if p_style = 'number' then
    return coalesce(p_prefix, '') || p_position::text;
  end if;
  while n > 0 loop
    out := chr(65 + (n - 1) % 26) || out;
    n := (n - 1) / 26;
  end loop;
  return coalesce(p_prefix, '') || out;
end;
$$;

-- Dodaje p_count novih jedinica na kraj, s automatskim oznakama.
-- security invoker: RLS odlučuje smije li korisnik dodavati jedinice tom objektu.
create function public.add_units(p_item_type_id uuid, p_count integer)
returns setof public.units
language plpgsql
set search_path = ''
as $$
declare
  t public.item_types;
  start_pos integer;
begin
  if p_count is null or p_count < 1 or p_count > 1000 then
    raise exception 'Broj jedinica mora biti između 1 i 1000';
  end if;

  select * into t from public.item_types where id = p_item_type_id;
  if not found then
    raise exception 'Vrsta predmeta ne postoji ili joj nemate pristup';
  end if;

  select coalesce(max(position), 0) + 1 into start_pos
  from public.units where item_type_id = p_item_type_id;

  return query
  insert into public.units (item_type_id, business_id, position, label)
  select t.id, t.business_id, pos, public.unit_label(t.label_style, pos, t.label_prefix)
  from generate_series(start_pos, start_pos + p_count - 1) as pos
  returning *;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bookings: rezervacije i prodaje po jedinici
-- ---------------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete restrict,
  service_date date not null,
  -- Za dnevni najam ostaje null pa se popuni cijeli dan; za satni najam upisuje se točno vrijeme.
  starts_at timestamptz,
  ends_at timestamptz,
  period tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status public.booking_status not null default 'sold',
  source public.booking_source not null default 'walk_in',
  -- Rok dolaska za rezervaciju; nakon njega rezervacija prelazi u expired.
  hold_until timestamptz,
  price_cents integer check (price_cents >= 0),
  customer_name text,
  customer_phone text,
  note text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_period_valid check (ends_at > starts_at),
  -- Ista jedinica ne može biti dvaput zauzeta u isto vrijeme.
  constraint bookings_no_overlap exclude using gist (
    unit_id with =,
    period with &&
  ) where (status in ('reserved', 'sold'))
);

create index bookings_business_date_idx on public.bookings (business_id, service_date);
create index bookings_hold_idx on public.bookings (hold_until) where status = 'reserved';

create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create function public.bookings_prepare() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  hold time;
begin
  select business_id into new.business_id from public.units where id = new.unit_id;

  if new.starts_at is null then
    new.starts_at := public.local_midnight(new.service_date);
  end if;
  if new.ends_at is null then
    new.ends_at := public.local_midnight(new.service_date + 1);
  end if;

  if tg_op = 'INSERT' and new.status = 'reserved' and new.hold_until is null then
    select reservation_hold_until into hold from public.businesses where id = new.business_id;
    if hold is not null then
      new.hold_until := (new.service_date + hold) at time zone 'Europe/Zagreb';
    end if;
  end if;

  -- Gost je došao: rok više ne vrijedi.
  if new.status = 'sold' then
    new.hold_until := null;
  end if;

  return new;
end;
$$;

create trigger bookings_prepare before insert or update on public.bookings
  for each row execute function public.bookings_prepare();

-- Oslobađa rezervacije kojima je istekao rok dolaska. Pokreće se svakih 5 minuta (pg_cron).
create function public.release_expired_reservations() returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  released integer;
begin
  update public.bookings
  set status = 'expired'
  where status = 'reserved' and hold_until is not null and hold_until <= now();
  get diagnostics released = row_count;
  return released;
end;
$$;

revoke execute on function public.release_expired_reservations() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'release-expired-reservations',
      '*/5 * * * *',
      'select public.release_expired_reservations()'
    );
  else
    raise notice 'pg_cron nije dostupan, rezervacije se oslobađaju samo pri novoj rezervaciji';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Funkcije za turističku aplikaciju (anonimni pristup)
-- ---------------------------------------------------------------------------

-- Je li jedinica trenutačno zauzeta (prodana ili rezervirana s rokom koji još traje).
create function public.is_active_booking(b public.bookings, at_time timestamptz default now())
returns boolean
language sql stable
set search_path = ''
as $$
  select b.status = 'sold'
      or (b.status = 'reserved' and (b.hold_until is null or b.hold_until > at_time));
$$;

-- Objavljeni objekti u krugu oko turista, s trenutačnom zauzetosti.
-- Vraća samo zbrojeve, nikad podatke o gostima.
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
  units_total integer,
  units_occupied integer
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
    b.reservations_enabled,
    (select count(*)::int from public.units u
       join public.item_types t on t.id = u.item_type_id
      where u.business_id = b.id and u.is_active and t.archived_at is null),
    (select count(distinct bk.unit_id)::int from public.bookings bk
      where bk.business_id = b.id
        and bk.period @> now()
        and public.is_active_booking(bk))
  from public.businesses b, here
  where b.is_published
    and extensions.st_dwithin(b.location, here.g, least(greatest(p_radius_m, 100), 50000))
  order by 8
  limit 200;
$$;

-- Rezervacija iz turističke aplikacije: sustav sam bira slobodnu jedinicu.
create function public.request_reservation(
  p_item_type_id uuid,
  p_date date,
  p_customer_name text,
  p_customer_phone text
)
returns table (booking_id uuid, unit_label text, hold_until timestamptz, note text)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  t public.item_types;
  biz public.businesses;
  u public.units;
  new_booking public.bookings;
begin
  if p_date < (now() at time zone 'Europe/Zagreb')::date then
    raise exception 'Datum je u prošlosti';
  end if;
  if length(trim(coalesce(p_customer_name, ''))) < 2 or length(trim(coalesce(p_customer_phone, ''))) < 6 then
    raise exception 'Upišite ime i broj telefona';
  end if;

  select * into t from public.item_types where id = p_item_type_id and archived_at is null;
  select * into biz from public.businesses where id = t.business_id;

  if t.id is null or not biz.is_published or not biz.reservations_enabled or not t.reservable then
    raise exception 'Ovaj objekt ne prima rezervacije';
  end if;

  perform public.release_expired_reservations();

  select un.* into u
  from public.units un
  where un.item_type_id = t.id
    and un.is_active
    and not exists (
      select 1 from public.bookings bk
      where bk.unit_id = un.id
        and bk.period && tstzrange(public.local_midnight(p_date), public.local_midnight(p_date + 1), '[)')
        and bk.status in ('reserved', 'sold')
    )
  order by un.position
  limit 1
  for update skip locked;

  if u.id is null then
    raise exception 'Nema slobodnih mjesta za taj dan';
  end if;

  insert into public.bookings (unit_id, service_date, status, source, price_cents, customer_name, customer_phone, created_by)
  values (u.id, p_date, 'reserved', 'tourist_app', t.price_cents, trim(p_customer_name), trim(p_customer_phone), null)
  returning * into new_booking;

  return query select new_booking.id, u.label, new_booking.hold_until, biz.reservation_note;
end;
$$;

revoke execute on function public.request_reservation(uuid, date, text, text) from public;
grant execute on function public.request_reservation(uuid, date, text, text) to anon, authenticated;
grant execute on function public.nearby_businesses(double precision, double precision, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Izvještaji
-- ---------------------------------------------------------------------------

-- Dnevni zbroj po vrsti predmeta. security_invoker: iznajmljivač vidi samo svoje.
-- Kasnije prelazi u materialized view kad podataka bude dovoljno da se isplati.
create view public.report_daily
with (security_invoker = true)
as
select
  bk.business_id,
  u.item_type_id,
  bk.service_date as day,
  count(*) filter (where bk.status = 'sold')::int as sold_count,
  count(*) filter (where bk.source = 'tourist_app')::int as app_reservations,
  count(*) filter (where bk.status = 'expired')::int as expired_count,
  count(*) filter (where bk.status = 'cancelled')::int as cancelled_count,
  coalesce(sum(bk.price_cents) filter (where bk.status = 'sold'), 0)::bigint as revenue_cents
from public.bookings bk
join public.units u on u.id = bk.unit_id
group by bk.business_id, u.item_type_id, bk.service_date;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.item_types enable row level security;
alter table public.units enable row level security;
alter table public.bookings enable row level security;

-- Profili: svatko vidi i mijenja samo svoj.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Objekti: objavljene vide svi, neobjavljene samo članovi.
create policy businesses_select on public.businesses
  for select to anon, authenticated
  using (is_published or public.is_business_member(id));
create policy businesses_insert on public.businesses
  for insert to authenticated
  with check (owner_id = auth.uid());
create policy businesses_update on public.businesses
  for update to authenticated
  using (public.is_business_owner(id))
  with check (public.is_business_owner(id));
create policy businesses_delete on public.businesses
  for delete to authenticated
  using (public.is_business_owner(id));

-- Članstva: član vidi tim svog objekta, samo vlasnik dodaje i miče.
create policy members_select on public.business_members
  for select to authenticated
  using (public.is_business_member(business_id));
create policy members_insert on public.business_members
  for insert to authenticated
  with check (public.is_business_owner(business_id));
create policy members_update on public.business_members
  for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));
create policy members_delete on public.business_members
  for delete to authenticated
  using (public.is_business_owner(business_id) and user_id <> auth.uid());

-- Ponuda (vrste i jedinice): javna za objavljene objekte, uređuju članovi.
create policy item_types_select on public.item_types
  for select to anon, authenticated
  using (
    public.is_business_member(business_id)
    or exists (select 1 from public.businesses b where b.id = business_id and b.is_published)
  );
create policy item_types_write on public.item_types
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy units_select on public.units
  for select to anon, authenticated
  using (
    public.is_business_member(business_id)
    or exists (select 1 from public.businesses b where b.id = business_id and b.is_published)
  );
create policy units_write on public.units
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- Bookings sadrže podatke o gostima: samo članovi objekta. Turisti rezerviraju preko RPC-a.
create policy bookings_member on public.bookings
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- Realtime za zauzetost uživo u aplikaciji iznajmljivača.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bookings, public.units;
  end if;
end;
$$;
