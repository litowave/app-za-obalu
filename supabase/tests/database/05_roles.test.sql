-- Vlasnik i djelatnik (6.3): prihode, cijene i izvještaje vidi i mijenja samo vlasnik.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('11111111-0000-0000-0000-000000000001', 'vlasnik@test.local'),
  ('33333333-0000-0000-0000-000000000003', 'djelatnik@test.local');
insert into public.businesses (id, owner_id, name, slug, category, location)
values ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Plaža', 'plaza', 'beach', 'SRID=4326;POINT(15.9 43.6)');
insert into public.business_members (business_id, user_id, role)
values ('c0000000-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 'staff');
insert into public.item_types (id, business_id, name, price_cents, label_prefix)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Komplet', 3000, 'K'),
       ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Jet ski', 6000, 'J');
select from public.add_units('d0000000-0000-0000-0000-000000000001', 4);
select from public.add_units('d0000000-0000-0000-0000-000000000002', 1);

create temp table k as select id, label from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001';
create temp table j as select id from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000002';
grant select on k, j to authenticated;

-- Djelatnik
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-0000-0000-0000-000000000003","role":"authenticated"}';

select is(
  (select count(*)::int from public.record_sale(array(select id from k where label in ('K1', 'K2')), 'cash')),
  2,
  'djelatnik prodaje dva kompleta odjednom'
);
select is(
  (select count(*)::int from public.record_sale(array(select id from k where label = 'K3'), 'card', p_days => 3, p_price_cents => 1)),
  3,
  'najam na tri dana stvara tri zapisa'
);
select throws_ok($$ select price_cents from public.bookings $$, '42501', null, 'djelatnik ne čita cijene prodaja');
select is_empty($$ select * from public.report_daily $$, 'djelatnik ne vidi izvještaje');
select is_empty($$ select * from public.booking_amounts $$, 'djelatnik ne vidi iznose');
-- RLS kod izmjene tuđih redaka ne baca grešku nego ih ne vidi, pa provjeravamo da cijena ostaje ista.
update public.item_types set price_cents = 1 where id = 'd0000000-0000-0000-0000-000000000001';
select is(
  (select price_cents from public.item_types where id = 'd0000000-0000-0000-0000-000000000001'),
  3000,
  'djelatnik ne mijenja cjenik'
);
select throws_ok(
  $$ select public.set_booking_price((select id from public.bookings limit 1), 1) $$,
  '42501', null,
  'djelatnik ne mijenja cijenu prodaje'
);
select lives_ok(
  $$ select public.record_reservation(array(select id from k where label = 'K4'), current_date + 1, 'Gost', '091 222 333') $$,
  'djelatnik upisuje rezervaciju telefonom'
);
select lives_ok(
  $$ select public.check_in((select id from public.bookings where customer_name = 'Gost'), 'card') $$,
  'gost je stigao: rezervacija postaje prodaja'
);
select is(
  (select array[status::text, payment_method::text, (checked_in_at is not null)::text, (hold_until is null)::text]
     from public.bookings where customer_name = 'Gost'),
  array['sold', 'card', 'true', 'true'],
  'nakon dolaska: prodano, kartica, zabilježen dolazak, rok više ne vrijedi'
);

-- Satni najam: jet ski na 30 minuta, vraćen ranije, pa odmah ponovno izdan.
select from public.record_sale(array(select id from j), 'cash', p_duration_min => 30);
select is(
  (select round(extract(epoch from ends_at - starts_at) / 60)::int from public.bookings where unit_id = (select id from j)),
  30,
  'jet ski izdan na 30 minuta'
);
select throws_ok(
  $$ select public.record_sale(array(select id from j), 'cash', p_duration_min => 30) $$,
  '23P01', null,
  'izdani jet ski ne može se ponovno izdati'
);
select lives_ok(
  $$ select public.release_booking((select id from public.bookings where unit_id = (select id from j))) $$,
  'jet ski je vraćen'
);
select lives_ok(
  $$ select public.record_sale(array(select id from j), 'cash', p_duration_min => 15) $$,
  'vraćeni jet ski odmah se može ponovno izdati'
);
select throws_ok($$ delete from public.bookings $$, '42501', null, 'zapisi se ne brišu');

-- Vlasnik
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select is(
  (select array[sum(revenue_cents), sum(cash_cents), sum(card_cents)]::bigint[] from public.report_daily
    where item_type_id = 'd0000000-0000-0000-0000-000000000001'),
  array[6000 + 9000 + 3000, 6000, 9000 + 3000]::bigint[],
  'vlasnik vidi prihod s podjelom na gotovinu i karticu; djelatnik nije mogao promijeniti cijenu'
);

select * from finish();
rollback;
