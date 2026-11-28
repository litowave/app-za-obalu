begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values ('11111111-0000-0000-0000-000000000001', 'a@test.local');
insert into public.businesses (id, owner_id, name, slug, category, location, is_published, approved_at, subscription_until,
                               reservations_enabled, reservation_hold_until)
values ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Test plaža', 'test-plaza', 'beach',
        'SRID=4326;POINT(15.9 43.6)', true, now(), current_date + 30, true, '11:00');
insert into public.item_types (id, business_id, name, reservable, price_cents)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ležaljka', true, 1500);
select from public.add_units('d0000000-0000-0000-0000-000000000001', 3);

-- Automatska dodjela: rok dolaska 11:00 po hrvatskom vremenu, poveznica s tokenom.
set local role anon;
select is(
  (select (hold_until at time zone 'Europe/Zagreb')::time
     from public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 1, 'Ana', '091 123 456', true)),
  '11:00'::time,
  'turistička rezervacija dobiva rok dolaska'
);
select throws_ok(
  $$ select public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 1, 'Ivo', '091000000', false) $$,
  'P0001', 'Potvrdite da razumijete uvjete rezervacije',
  'bez kvačice nema rezervacije'
);
select throws_ok(
  $$ select public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 1, 'Ana opet', '+385 91 123 456', true) $$,
  'P0001', 'S ovim brojem već imate rezervaciju za taj dan',
  'jedan broj, jedna rezervacija po objektu za isti dan'
);
select is(
  (select cardinality(unit_labels)
     from public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 1, 'Obitelj Horvat', '098 111 222', true, null, 2)),
  2,
  'više jedinica jednom rezervacijom'
);
select throws_ok(
  $$ select public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 1, 'Ivo', '091000000', true) $$,
  'P0001', 'Nema dovoljno slobodnih mjesta za taj dan',
  'kad je sve zauzeto, rezervacija se odbija'
);
select throws_ok($$ select * from public.bookings $$, '42501', null, 'anonimni korisnik ne čita bookings');
reset role;

select is(
  (select count(distinct group_id)::int from public.bookings where customer_name = 'Obitelj Horvat'),
  1,
  'jedinice iste rezervacije dijele grupu'
);

-- Moja rezervacija i otkazivanje preko poveznice.
create temp table tok as select public_token from public.bookings where customer_name = 'Obitelj Horvat' limit 1;
grant select on tok to anon;
set local role anon;
select is(
  (select cardinality(unit_labels) from public.reservation_by_token((select public_token from tok))),
  2,
  'poveznica prikazuje obje jedinice'
);
select is(public.cancel_reservation((select public_token from tok)), 2, 'turist otkazuje cijelu rezervaciju');
select is_empty($$ select * from public.reservation_by_token('nepostojeci') $$, 'kratki ili krivi token ne vraća ništa');
reset role;
select is(
  (select array_agg(distinct cancelled_by::text) from public.bookings where customer_name = 'Obitelj Horvat'),
  array['guest'],
  'otkazao je gost'
);

-- Ista jedinica ne može se prodati dvaput za isti dan.
select throws_ok(
  $$ insert into public.bookings (unit_id, service_date, status, payment_method)
     select unit_id, service_date, 'sold', 'cash' from public.bookings where customer_name = 'Ana' $$,
  '23P01', null,
  'dvostruka prodaja iste jedinice nije moguća'
);

-- Istekli rok oslobađa jedinicu.
update public.bookings set hold_until = now() - interval '1 minute' where customer_name = 'Ana';
select is(public.release_expired_reservations(), 1, 'istekla rezervacija se oslobađa');
select is(
  (select status::text from public.bookings where customer_name = 'Ana'),
  'expired',
  'status prelazi u expired'
);

select * from finish();
rollback;
