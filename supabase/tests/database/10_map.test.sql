begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-0000-0000-0000-000000000001', 'a@test.local', '{}'),
  ('22222222-0000-0000-0000-000000000002', 'b@test.local', '{"name":"Ana Google"}');

select is((select full_name from public.profiles where id = '22222222-0000-0000-0000-000000000002'),
  'Ana Google', 'ime iz Google prijave (name) ide u profil');

insert into public.businesses (id, owner_id, name, slug, category, place, location, is_published, approved_at, subscription_until) values
  ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Plaža Zaborić', 'plaza-zaboric', 'beach', 'Zaborić', 'SRID=4326;POINT(15.94 43.65)', true, now(), current_date + 30),
  ('c0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Jet ski Vodice', 'jet-vodice', 'watersports', 'Vodice', 'SRID=4326;POINT(15.78 43.76)', true, now(), current_date + 30),
  ('c0000000-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'Neodobreni Rab', 'rab', 'beach', 'Rab', 'SRID=4326;POINT(14.76 44.76)', true, null, null),
  ('c0000000-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000002', 'Dubrovnik SUP', 'dubrovnik-sup', 'watersports', 'Dubrovnik', 'SRID=4326;POINT(18.09 42.64)', true, now(), current_date + 30);

select is((select array[lat, lng] from public.businesses where slug = 'plaza-zaboric'),
  array[43.65, 15.94]::double precision[], 'lat i lng se računaju iz lokacije');

update public.businesses set location = 'SRID=4326;POINT(15.95 43.66)' where slug = 'plaza-zaboric';
select is((select lat from public.businesses where slug = 'plaza-zaboric'), 43.66::double precision,
  'nova lokacija odmah mijenja lat');

insert into public.item_types (id, business_id, name, price_cents, price_unit, reservable, sort_order) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Komplet', 3000, 'day', false, 1),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Cabana', 8000, 'day', true, 2);
insert into public.item_type_slots (item_type_id, name, starts_at, ends_at, price_cents, reservable, sort_order) values
  ('d0000000-0000-0000-0000-000000000002', 'Cijeli dan', '09:00', null, null, true, 1),
  ('d0000000-0000-0000-0000-000000000002', '1. polovica', '09:00', '15:00', 5000, true, 2);
select from public.add_units('d0000000-0000-0000-0000-000000000001', 10);

set local role anon;
set local request.jwt.claims = '{}';

-- Šibensko područje
select is(
  (select array_agg(name order by name) from public.map_businesses(43.5, 15.6, 43.9, 16.1) where id::text like 'c0000000%'),
  array['Jet ski Vodice', 'Plaža Zaborić'],
  'karta vraća odobrene objekte u vidljivom dijelu'
);
select is(
  (select array_agg(name) from public.map_businesses(42.3, 13.4, 46.6, 19.5, array['watersports']::public.business_category[]) where id::text like 'c0000000%'),
  array['Dubrovnik SUP', 'Jet ski Vodice'],
  'filtar po kategoriji, cijela obala'
);
select is(
  (select count(*)::int from public.map_businesses(42.3, 13.4, 46.6, 19.5) where slug = 'rab'),
  0, 'neodobreni objekt nije na karti'
);
select is(
  (select offers from public.map_businesses(43.5, 15.6, 43.9, 16.1) where slug = 'plaza-zaboric'),
  array['Komplet', 'Cabana'], 'popis ponude za karticu na karti'
);
select is(
  (select price_from_cents from public.map_businesses(43.5, 15.6, 43.9, 16.1) where slug = 'plaza-zaboric'),
  3000, 'najniža cijena za "od ... €"'
);
select is(
  (select crowd from public.map_businesses(43.5, 15.6, 43.9, 16.1) where slug = 'plaza-zaboric'),
  'no_data'::public.crowd_level, 'bez današnjih oznaka nema podataka uživo'
);

select is(public.business_public('rab'), null, 'stranica neodobrenog objekta nije javna');
select is(
  (select jsonb_path_query_array(public.business_public('plaza-zaboric'), '$.offers[*].name')),
  '["Komplet", "Cabana"]'::jsonb, 'stranica objekta ima cjenik po vrstama'
);
select is(
  (select public.business_public('plaza-zaboric') -> 'offers' -> 1 -> 'slots' -> 1 ->> 'price_cents'),
  '5000', 'dio dana ima svoju cijenu'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-0000-0000-0000-000000000002","role":"authenticated"}';
select is((public.business_public('rab') ->> 'listed')::boolean, false,
  'vlasnik vidi svoj neodobreni objekt kako će ga vidjeti turisti');

select * from finish();
rollback;
