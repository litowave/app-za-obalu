-- Radni dan i blagajna: djelatnik vidi današnji promet, vlasnik sve.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('11111111-0000-0000-0000-000000000001', 'vlasnik@test.local'),
  ('22222222-0000-0000-0000-000000000002', 'djelatnik@test.local'),
  ('33333333-0000-0000-0000-000000000003', 'drugi@test.local');
insert into public.businesses (id, owner_id, name, slug, category, location)
values ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Plaža', 'plaza',
        'beach', 'SRID=4326;POINT(15.9 43.7)');
insert into public.business_members (business_id, user_id, role)
values ('c0000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'staff');
insert into public.item_types (id, business_id, name, price_cents, label_prefix, sort_order) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Komplet', 3000, 'K', 1),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Ležaljka', 1500, 'L', 2);
select from public.add_units('d0000000-0000-0000-0000-000000000001', 5);
select from public.add_units('d0000000-0000-0000-0000-000000000002', 5);

-- Jučerašnja prodaja upisana naknadno: računa se na jučer.
insert into public.bookings (unit_id, service_date, status, payment_method)
select id, (now() at time zone 'Europe/Zagreb')::date - 1, 'sold', 'cash'
from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and position = 5;

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-0000-0000-0000-000000000002","role":"authenticated"}';

select is((public.open_workday('c0000000-0000-0000-0000-000000000001')).work_date,
  (now() at time zone 'Europe/Zagreb')::date, 'djelatnik otvara današnji radni dan');

-- Danas: dva kompleta gotovinom, ležaljka karticom, komplet za tri dana gotovinom.
select from public.record_sale(
  (select array_agg(id) from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and position in (1, 2)),
  'cash');
select from public.record_sale(
  (select array_agg(id) from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000002' and position = 1),
  'card');
select from public.record_sale(
  (select array_agg(id) from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and position = 3),
  'cash', null, null, 3);
-- Poništena prodaja se ne broji.
select from public.cancel_booking((
  select (public.record_sale(
    (select array_agg(id) from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000002' and position = 2),
    'cash')).booking_id));

select is(
  (select sum(amount_cents)::int from public.workday_totals('c0000000-0000-0000-0000-000000000001')
    where payment_method = 'cash'),
  15000, 'gotovina danas: 2 kompleta + komplet za 3 dana plaćen danas, bez poništene'
);
select is(
  (select sum(amount_cents)::int from public.workday_totals('c0000000-0000-0000-0000-000000000001')
    where payment_method = 'card'),
  1500, 'kartica danas'
);
select is(
  (select array_agg(item_type_name || ':' || payment_method || ':' || sales order by item_type_name, payment_method)
     from public.workday_totals('c0000000-0000-0000-0000-000000000001')),
  array['Komplet:cash:5', 'Ležaljka:card:1'], 'promet po predmetu i načinu plaćanja'
);
select throws_ok(
  $$ select * from public.workday_totals('c0000000-0000-0000-0000-000000000001',
       (now() at time zone 'Europe/Zagreb')::date - 1) $$,
  '42501', null, 'djelatnik ne vidi prošle dane'
);
select is((select count(*)::int from public.booking_amounts), 0,
  'iznosi pojedinih prodaja i izvještaji ostaju samo vlasniku');

-- Zatvaranje: izbrojeno 5 € manje.
select is(
  (select array[expected_cash_cents, expected_card_cents, counted_cash_cents]
     from public.close_workday('c0000000-0000-0000-0000-000000000001', 14500, 'manjka 5')),
  array[15000, 1500, 14500], 'zatvaranje sprema očekivano i izbrojeno'
);
select ok(
  (select closed_by = auth.uid() from public.workdays
    where business_id = 'c0000000-0000-0000-0000-000000000001'),
  'zna se tko je zatvorio dan'
);
select throws_ok(
  $$ update public.workdays set counted_cash_cents = 15000 $$,
  '42501', null, 'zatvoreni dan se ne mijenja izravno'
);

-- Vlasnik vidi i jučer.
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select is(
  (select sum(amount_cents)::int from public.workday_totals('c0000000-0000-0000-0000-000000000001',
     (now() at time zone 'Europe/Zagreb')::date - 1)),
  3000, 'vlasnik vidi promet prošlih dana, naknadni upis je na dan najma'
);

-- Tko nije član ne vidi ništa.
set local request.jwt.claims = '{"sub":"33333333-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok(
  $$ select * from public.workday_totals('c0000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'tuđi promet nije vidljiv'
);
select is((select count(*)::int from public.workdays), 0, 'tuđi radni dan nije vidljiv');

select * from finish();
rollback;
