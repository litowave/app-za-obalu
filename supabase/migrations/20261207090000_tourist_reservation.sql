-- Rezervacija za turiste (T4, T5) u web aplikaciji.
-- Stranica objekta treba znati način dodjele mjesta (gost bira ili automatski) i id dijela dana,
-- da bi ih poslala u request_reservation. Sve ostalo (provjere, rok, ograničenje po broju)
-- već radi u request_reservation, reservation_availability i available_units.

create or replace function public.business_public(p_slug text) returns jsonb
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
        'assignment_mode', t.assignment_mode,
        'slots', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', s.id,
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

