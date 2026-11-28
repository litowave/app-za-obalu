-- Karta za turiste i profil objekta koji iznajmljivač sam uređuje.
--
-- 1. businesses.lat / lng: koordinate kao obični brojevi, da ih aplikacije ne moraju
--    čitati iz PostGIS formata. Upisuje se i dalje u location (EWKT 'SRID=4326;POINT(lng lat)').
-- 2. Profil iz Google ili Apple prijave: ime iz full_name ili name.
-- 3. map_businesses: objekti u vidljivom dijelu karte, za cijelu obalu.
-- 4. business_public: sve što stranica objekta treba, jednim pozivom i bez brojki o zauzetosti.

-- ===========================================================================
-- 1. Koordinate
-- ===========================================================================

alter table public.businesses
  add column lat double precision
    generated always as (extensions.st_y(location::extensions.geometry)) stored,
  add column lng double precision
    generated always as (extensions.st_x(location::extensions.geometry)) stored;

-- Lokacija mora biti stvarna točka na Zemlji (zaštita od zamijenjenih lat i lng).
alter table public.businesses
  add constraint businesses_location_valid
    check (lat between -90 and 90 and lng between -180 and 180);

-- ===========================================================================
-- 2. Ime iz Google ili Apple prijave
-- ===========================================================================

-- Google šalje full_name i name, Apple ime šalje samo pri prvoj prijavi
-- (aplikacija ga tada sama upiše u profil).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), '')
  );
  return new;
end;
$$;

-- ===========================================================================
-- 3. Karta cijele obale
-- ===========================================================================

-- Objekti unutar pravokutnika koji je vidljiv na karti (jug, zapad, sjever, istok).
-- Kao i nearby_businesses: samo odobreni objekti i samo razina gužve, nikad brojke (3.2, 6.4).
create function public.map_businesses(
  p_south double precision,
  p_west double precision,
  p_north double precision,
  p_east double precision,
  p_categories public.business_category[] default null
)
returns table (
  id uuid,
  name text,
  slug text,
  category public.business_category,
  place text,
  lat double precision,
  lng double precision,
  reservations_enabled boolean,
  crowd public.crowd_level,
  offers text[],          -- nazivi vrsta, npr. {Komplet, Cabana}
  offer_keys text[],      -- predlošci (cabana, jet_ski...) za filtre po vrsti na karti
  price_from_cents integer
)
language sql stable security definer
set search_path = ''
as $$
  select
    b.id, b.name, b.slug, b.category, b.place, b.lat, b.lng,
    b.reservations_enabled and exists (
      select 1 from public.item_types t where t.business_id = b.id and t.reservable and t.archived_at is null
    ),
    public.business_crowd_level(b.id),
    coalesce((
      select array_agg(t.name order by t.sort_order, t.created_at)
      from public.item_types t
      where t.business_id = b.id and t.archived_at is null
    ), '{}'),
    coalesce((
      select array_agg(distinct t.template_key)
      from public.item_types t
      where t.business_id = b.id and t.archived_at is null and t.template_key is not null
    ), '{}'),
    (
      select min(p.cents) from (
        select t.price_cents as cents from public.item_types t
        where t.business_id = b.id and t.archived_at is null
        union all
        select s.price_cents from public.item_type_slots s
        join public.item_types t on t.id = s.item_type_id
        where s.business_id = b.id and s.archived_at is null and t.archived_at is null
      ) p
    )
  from public.businesses b
  where public.business_is_listed(b.is_published, b.approved_at, b.is_demo, b.subscription_until)
    and b.location operator(extensions.&&) extensions.st_makeenvelope(
      greatest(p_west, -180), greatest(p_south, -90), least(p_east, 180), least(p_north, 90), 4326
    )::extensions.geography
    and (p_categories is null or cardinality(p_categories) = 0 or b.category = any (p_categories))
  order by b.name
  limit 500;
$$;

revoke execute on function public.map_businesses(double precision, double precision, double precision, double precision, public.business_category[]) from public;
grant execute on function public.map_businesses(double precision, double precision, double precision, double precision, public.business_category[]) to anon, authenticated;

-- ===========================================================================
-- 4. Stranica objekta
-- ===========================================================================

-- Profil, cjenik po vrstama i dijelovima dana, fotografije i razina gužve.
-- Vraća null ako objekt nije na karti. Vlasnik i djelatnici vide i neobjavljeni objekt,
-- da u aplikaciji mogu pogledati kako ga vide turisti.
create function public.business_public(p_slug text) returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'slug', b.slug,
    'name', b.name,
    'category', b.category,
    'description', b.description,
    'phone', b.phone,
    'website', b.website,
    'address', b.address,
    'place', b.place,
    'lat', b.lat,
    'lng', b.lng,
    'opening_hours', b.opening_hours,
    'season_start', b.season_start,
    'season_end', b.season_end,
    'listed', public.business_is_listed(b.is_published, b.approved_at, b.is_demo, b.subscription_until),
    'reservations_enabled', b.reservations_enabled and exists (
      select 1 from public.item_types t where t.business_id = b.id and t.reservable and t.archived_at is null
    ),
    'reservation_note', b.reservation_note,
    'crowd', public.business_crowd_level(b.id),
    'offers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'template_key', t.template_key,
        'price_cents', t.price_cents,
        'price_unit', t.price_unit,
        'duration_min', t.default_duration_min,
        'reservable', b.reservations_enabled and t.reservable,
        'slots', coalesce((
          select jsonb_agg(jsonb_build_object(
            'name', s.name,
            'starts_at', to_char(s.starts_at, 'HH24:MI'),
            'ends_at', to_char(s.ends_at, 'HH24:MI'),
            'price_cents', coalesce(s.price_cents, t.price_cents),
            'reservable', b.reservations_enabled and t.reservable and s.reservable
          ) order by s.sort_order, s.starts_at)
          from public.item_type_slots s
          where s.item_type_id = t.id and s.archived_at is null
        ), '[]'::jsonb)
      ) order by t.sort_order, t.created_at)
      from public.item_types t
      where t.business_id = b.id and t.archived_at is null
    ), '[]'::jsonb),
    'photos', coalesce((
      select jsonb_agg(p.storage_path order by p.sort_order, p.created_at)
      from public.business_photos p where p.business_id = b.id
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.slug = lower(p_slug)
    and (
      public.business_is_listed(b.is_published, b.approved_at, b.is_demo, b.subscription_until)
      or public.is_business_member(b.id)
      or public.is_platform_admin()
    );
$$;

revoke execute on function public.business_public(text) from public;
grant execute on function public.business_public(text) to anon, authenticated;
