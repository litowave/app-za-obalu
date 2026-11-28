-- Rok dolaska, razdoblje za rezervacije i dijelovi dana (6.1.3, 6.2).
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values ('11111111-0000-0000-0000-000000000001', 'a@test.local');
insert into public.businesses (id, owner_id, name, slug, category, location, is_published, approved_at, subscription_until,
                               reservations_enabled, reservation_hold_until)
values ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Cabane', 'cabane', 'beach',
        'SRID=4326;POINT(15.9236 43.5876)', true, now(), current_date + 30, true, '11:00');

-- Cabane kao u Primošten Cabani: gost bira, otvara se dan ranije u 12:00, zatvara u 8:00, rok 12:00.
insert into public.item_types (id, business_id, name, reservable, price_cents, assignment_mode,
                               reservation_hold_until, booking_opens_days_before, booking_opens_at, booking_closes_at)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Cabana', true, 8000, 'guest_choice',
        '12:00', 1, '12:00', '08:00');
-- Kompleti: vrijede postavke objekta (7 dana unaprijed, zatvara se u roku dolaska 11:00).
insert into public.item_types (id, business_id, name, reservable, price_cents)
values ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Komplet', true, 3000);
select from public.add_units('d0000000-0000-0000-0000-000000000001', 3);
select from public.add_units('d0000000-0000-0000-0000-000000000002', 2);

insert into public.item_type_slots (id, item_type_id, name, starts_at, ends_at, price_cents, reservable, sort_order) values
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Cijeli dan', '09:00', null, 8000, true, 1),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', '1. polovica', '09:00', '15:00', 5000, true, 2),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', '2. polovica', '15:00', null, 4000, false, 3);

select is(
  (select array[to_char(opens_at at time zone 'Europe/Zagreb', 'YYYY-MM-DD HH24:MI'),
                to_char(closes_at at time zone 'Europe/Zagreb', 'YYYY-MM-DD HH24:MI')]
     from public.booking_window('d0000000-0000-0000-0000-000000000001', '2027-07-15')),
  array['2027-07-14 12:00', '2027-07-15 08:00'],
  'cabane: otvara se dan ranije u 12:00, zatvara u 8:00'
);
select is(
  (select array[to_char(opens_at at time zone 'Europe/Zagreb', 'YYYY-MM-DD HH24:MI'),
                to_char(closes_at at time zone 'Europe/Zagreb', 'YYYY-MM-DD HH24:MI')]
     from public.booking_window('d0000000-0000-0000-0000-000000000002', '2027-07-15')),
  array['2027-07-08 00:00', '2027-07-15 11:00'],
  'kompleti: zadano 7 dana unaprijed, zatvara se u roku dolaska'
);
select is(
  (select hold_until from public.effective_booking_rules('d0000000-0000-0000-0000-000000000001')),
  '12:00'::time,
  'rok vrste ima prednost pred rokom objekta'
);
select throws_ok(
  $$ update public.item_types set booking_closes_at = '13:00' where id = 'd0000000-0000-0000-0000-000000000001';
     set constraints all immediate $$,
  '23514', null,
  'zatvaranje nakon roka dolaska nije dopušteno'
);

set local role anon;
select is(
  (select state from public.reservation_availability('d0000000-0000-0000-0000-000000000001', current_date + 3)),
  'not_yet_open',
  'za prekosutra cabane još nisu otvorene'
);
select throws_like(
  $$ select public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 3, 'Ana', '091123456', true,
       array(select unit_id from public.available_units('d0000000-0000-0000-0000-000000000001', current_date + 3) limit 1),
       1, 'f0000000-0000-0000-0000-000000000001') $$,
  'Rezervacije za ovaj dan otvaraju se %',
  'rezervacija prije otvaranja se odbija i kaže kada se otvara'
);
select throws_ok(
  $$ select public.request_reservation('d0000000-0000-0000-0000-000000000002', current_date + 2, 'Ana', '091123456', true,
       null, 1, 'f0000000-0000-0000-0000-000000000003') $$,
  'P0001', 'Taj dio dana ne može se rezervirati',
  'tuđi ili nerezervabilni dio dana se odbija'
);
reset role;

-- Dijelovi dana: ista cabana ujutro jednom gostu, popodne drugom; cijeli dan zauzima obje polovice.
create temp table cab as select id from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' order by position limit 1;
insert into public.bookings (unit_id, service_date, slot_id, status, payment_method)
select id, current_date + 5, 'f0000000-0000-0000-0000-000000000002', 'sold', 'cash' from cab;
select lives_ok(
  $$ insert into public.bookings (unit_id, service_date, slot_id, status, payment_method)
     select id, current_date + 5, 'f0000000-0000-0000-0000-000000000003', 'sold', 'card' from cab $$,
  '1. i 2. polovica iste cabane mogu se prodati različitim gostima'
);
select throws_ok(
  $$ insert into public.bookings (unit_id, service_date, slot_id, status, payment_method)
     select id, current_date + 5, 'f0000000-0000-0000-0000-000000000001', 'sold', 'cash' from cab $$,
  '23P01', null,
  'cijeli dan se ne može prodati kad je polovica zauzeta'
);
select is(
  (select array_agg(price_cents order by starts_at) from public.bookings where unit_id = (select id from cab)),
  array[5000, 4000],
  'cijena se uzima iz dijela dana'
);
select is(
  (select to_char(upper(public.slot_range('f0000000-0000-0000-0000-000000000003', '2027-07-15')) at time zone 'Europe/Zagreb', 'HH24:MI')),
  '20:35',
  '2. polovica traje do zalaska sunca za lokaciju objekta'
);
select is(
  (select is_free from public.available_units('d0000000-0000-0000-0000-000000000001', current_date + 5, 'f0000000-0000-0000-0000-000000000001')
    where unit_id = (select id from cab)),
  false,
  'turist vidi da je cabana zauzeta, bez podataka o gostu'
);

-- Rok dolaska za danas je već prošao: rezervacija bi odmah istekla, pa se odbija.
update public.businesses set reservation_hold_until = '00:00', booking_closes_at = null where id = 'c0000000-0000-0000-0000-000000000001';
set local role anon;
select is(
  (select state from public.reservation_availability('d0000000-0000-0000-0000-000000000002', current_date)),
  'closed',
  'nakon roka dolaska za danas nema rezervacija'
);
select throws_ok(
  $$ select public.request_reservation('d0000000-0000-0000-0000-000000000002', current_date, 'Ana', '091123456', true) $$,
  'P0001', 'Za ovaj dan rezervacije su zatvorene, dođite izravno',
  'današnja rezervacija nakon roka se odbija'
);
reset role;

-- Blokirani broj.
insert into public.blocked_phones (business_id, phone) values ('c0000000-0000-0000-0000-000000000001', '+385 91 999 9999');
select is((select phone from public.blocked_phones), '385919999999', 'broj se sprema normaliziran');

select * from finish();
rollback;
