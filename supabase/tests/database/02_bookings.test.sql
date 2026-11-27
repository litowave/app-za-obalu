begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values ('11111111-0000-0000-0000-000000000001', 'a@test.local');
insert into public.businesses (id, owner_id, name, slug, category, location, is_published, reservations_enabled, reservation_hold_until)
values ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Test plaža', 'test-plaza', 'beach',
        'SRID=4326;POINT(15.9 43.6)', true, true, '11:00');
insert into public.item_types (id, business_id, name, reservable, price_cents)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ležaljka', true, 1500);
select from public.add_units('d0000000-0000-0000-0000-000000000001', 2);

-- Rezervacija za sutra dobiva rok dolaska 11:00 po hrvatskom vremenu.
set local role anon;
select is(
  (select (hold_until at time zone 'Europe/Zagreb')::time
     from public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 1, 'Ana', '091123456')),
  '11:00'::time,
  'turistička rezervacija dobiva rok dolaska'
);
select lives_ok(
  $$ select public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 1, 'Marko', '091654321') $$,
  'druga rezervacija dobiva drugu ležaljku'
);
select throws_ok(
  $$ select public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 1, 'Ivo', '091000000') $$,
  'P0001', 'Nema slobodnih mjesta za taj dan',
  'kad je sve zauzeto, rezervacija se odbija'
);
select is_empty($$ select * from public.bookings $$, 'anonimni korisnik ne vidi podatke o gostima');
reset role;

-- Ista jedinica ne može se prodati dvaput za isti dan.
select throws_ok(
  $$ insert into public.bookings (unit_id, service_date, status)
     select id, current_date + 1, 'sold' from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and label = '1' $$,
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
