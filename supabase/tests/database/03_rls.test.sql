begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('11111111-0000-0000-0000-000000000001', 'a@test.local'),
  ('22222222-0000-0000-0000-000000000002', 'b@test.local');

insert into public.businesses (id, owner_id, name, slug, category, location, is_published, approved_at, subscription_until) values
  ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Objekt A', 'objekt-a', 'beach', 'SRID=4326;POINT(17.0 42.0)', true, now(), current_date + 30),
  ('c0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Objekt B skriveni', 'objekt-b', 'beach', 'SRID=4326;POINT(17.01 42.01)', false, null, null),
  ('c0000000-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'Objekt C čeka odobrenje', 'objekt-c', 'beach', 'SRID=4326;POINT(17.02 42.0)', true, null, current_date + 30),
  ('c0000000-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000002', 'Objekt D istekla pretplata', 'objekt-d', 'beach', 'SRID=4326;POINT(17.0 42.02)', true, now(), current_date - 1);
insert into public.item_types (id, business_id, name)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ležaljka');
select from public.add_units('d0000000-0000-0000-0000-000000000001', 3);
insert into public.bookings (unit_id, service_date, customer_name, payment_method)
select id, current_date, 'Gost A', 'cash' from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and label = '1';

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-0000-0000-0000-000000000002","role":"authenticated"}';

select is_empty($$ select id from public.bookings $$, 'iznajmljivač B ne vidi bookings objekta A');
select is((select count(*)::int from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001'), 3, 'B vidi javnu ponudu objekta A');
select throws_ok(
  $$ insert into public.item_types (business_id, name) values ('c0000000-0000-0000-0000-000000000001', 'Uljez') $$,
  '42501', null,
  'B ne može dodavati predmete objektu A'
);
select throws_ok(
  $$ update public.businesses set approved_at = now() where id = 'c0000000-0000-0000-0000-000000000003' $$,
  '42501', null,
  'vlasnik ne može sam odobriti svoj objekt'
);

set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.bookings), 1, 'vlasnik A vidi svoje bookings');
select is_empty($$ select * from public.businesses where slug = 'objekt-b' $$, 'neobjavljeni objekt B je skriven');
select is_empty($$ select * from public.businesses where slug in ('objekt-c', 'objekt-d') $$,
  'neodobreni objekt i objekt s isteklom pretplatom nisu javni');

set local role anon;
select is(
  (select array_agg(name) from public.nearby_businesses(42.0, 17.0, 5000)),
  array['Objekt A'],
  'karta prikazuje samo odobrene objekte s važećom pretplatom'
);

select * from finish();
rollback;
