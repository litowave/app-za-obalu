-- Gužva (3.2), QR kodovi (6.6) i brisanje podataka gostiju (6.4.3).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select is(public.crowd_level_for(0, 0), 'no_data'::public.crowd_level, 'bez jedinica nema podataka');
select is(public.crowd_level_for(19, 100), 'empty'::public.crowd_level, 'do 20 % prazno');
select is(public.crowd_level_for(20, 100), 'few'::public.crowd_level, 'od 20 % malo ljudi');
select is(public.crowd_level_for(50, 100), 'moderate'::public.crowd_level, 'od 50 % umjereno');
select is(public.crowd_level_for(75, 100), 'busy'::public.crowd_level, 'od 75 % gužva');
select is(public.crowd_level_for(100, 100), 'full'::public.crowd_level, '100 % popunjeno');

insert into auth.users (id, email) values ('11111111-0000-0000-0000-000000000001', 'a@test.local');
insert into public.businesses (id, owner_id, name, slug, category, location, is_published, approved_at, subscription_until)
values ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Plaža', 'plaza', 'beach',
        'SRID=4326;POINT(15.9 43.6)', true, now(), current_date + 30);
insert into public.item_types (id, business_id, name)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ležaljka');
select from public.add_units('d0000000-0000-0000-0000-000000000001', 10);

select is(
  public.business_crowd_level('c0000000-0000-0000-0000-000000000001'),
  'no_data'::public.crowd_level,
  'dok iznajmljivač danas ništa ne označi, nije "prazno" nego "nema podataka"'
);

insert into public.bookings (unit_id, service_date, status, payment_method, created_by)
select id, (now() at time zone 'Europe/Zagreb')::date, 'sold', 'cash', '11111111-0000-0000-0000-000000000001'
from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and position <= 8;
select is(
  public.business_crowd_level('c0000000-0000-0000-0000-000000000001'),
  'busy'::public.crowd_level,
  '8 od 10 zauzeto je gužva'
);

-- QR
insert into public.qr_codes (code, kind, name, place, location)
values ('ab12', 'accommodation', 'Apartmani Marija', 'Zaborić', 'SRID=4326;POINT(15.94 43.64)');
set local role anon;
select is((select name from public.resolve_qr('AB12')), 'Apartmani Marija', 'QR kod vodi na smještaj, neovisno o velikim slovima');
select is_empty($$ select * from public.resolve_qr('nema') $$, 'nepoznat kod ne vraća ništa');
select is_empty($$ select * from public.qr_scans $$, 'turist ne čita skeniranja');
reset role;
select is((select count(*)::int from public.qr_scans where code = 'ab12'), 1, 'skeniranje je zabilježeno bez podataka o osobi');

-- Brisanje imena i telefona nakon 30 dana.
insert into public.bookings (unit_id, service_date, status, customer_name, customer_phone)
select id, current_date - 31, 'expired', 'Stari gost', '091000000'
from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and position = 10;
select from (select public.purge_guest_data()) x;
select is(
  (select array[customer_name, customer_phone] from public.bookings where service_date = current_date - 31),
  array[null, null]::text[],
  'nakon 30 dana ime i telefon su obrisani, zapis ostaje'
);

select * from finish();
rollback;
