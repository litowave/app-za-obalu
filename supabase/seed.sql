-- Demo podaci za lokalni razvoj (`pnpm db:reset`). Lozinka za sve korisnike: obala123.
-- cabana@demo.local vlasnik, djelatnik@demo.local djelatnik u Primošten Cabani, admin@demo.local administrator.
-- Svi objekti osim Primošten Cabane su izmišljeni primjeri.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'cabana@demo.local', crypt('obala123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Primošten Cabana"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'vodice@demo.local', crypt('obala123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Vodice"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'djelatnik@demo.local', crypt('obala123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Djelatnik na plaži"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated',
   'admin@demo.local', crypt('obala123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Lito administrator"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users where email like '%@demo.local';

insert into public.platform_admins (user_id) values ('99999999-9999-9999-9999-999999999999');

insert into public.businesses
  (id, owner_id, name, slug, category, place, address, location, is_published,
   approved_at, subscription_until, season_start, season_end,
   reservations_enabled, reservation_hold_until, reservation_note)
values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Primošten Cabana', 'primosten-cabana', 'beach', 'Primošten', 'Plaža Raduča',
   'SRID=4326;POINT(15.9236 43.5876)', true, now(), current_date + 365, '2027-05-15', '2027-09-30',
   true, '11:00', 'Plaćanje na licu mjesta.'),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'Jet Ski Vodice (demo)', 'jet-ski-vodice-demo', 'watersports', 'Vodice', 'Riva',
   'SRID=4326;POINT(15.7789 43.7584)', true, now(), current_date + 365, null, null,
   false, null, null),
  ('a0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222',
   'Ležaljke Zaborić (demo)', 'lezaljke-zaboric-demo', 'beach', 'Zaborić', 'Glavna plaža',
   'SRID=4326;POINT(15.9411 43.6457)', true, now(), current_date + 365, null, null,
   false, null, null);

insert into public.business_members (business_id, user_id, role)
values ('a0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'staff');

-- Cabane u Primošten Cabani: rezervacije za sutra otvaraju se danas u 12:00, zatvaraju sutra u 8:00 (6.2.5).
insert into public.item_types
  (id, business_id, name, template_key, label_style, label_prefix, price_cents, price_unit, reservable,
   assignment_mode, booking_opens_days_before, booking_opens_at, booking_closes_at, default_duration_min, sort_order)
values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Cabana',   'cabana',  'letter', '',   8000, 'day',     true,  'guest_choice', 1, '12:00', '08:00', null, 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Komplet',  'set',     'number', 'K',  3000, 'day',     false, 'auto',         null, null, null, null, 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Ležaljka', 'lounger', 'number', 'L',  1500, 'day',     false, 'auto',         null, null, null, null, 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Jet ski',  'jet_ski', 'number', 'J',  6000, 'session', false, 'auto',         null, null, null, 30,   1),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'Ležaljka', 'lounger', 'number', 'L',  1200, 'day',     false, 'auto',         null, null, null, null, 1),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Pedalina', 'pedalo',  'number', 'P',  2000, 'hour',    false, 'auto',         null, null, null, 60,   2);

-- Cabane imaju svoj rok dolaska (12:00), ostalo vrijedi kao za objekt (6.2.2).
update public.item_types set reservation_hold_until = '12:00'
where id = 'b0000000-0000-0000-0000-000000000001';

-- Dijelovi dana za cabane (6.1.3). Cijene polovica su primjer, vlasnik ih mijenja.
insert into public.item_type_slots (id, item_type_id, name, starts_at, ends_at, price_cents, reservable, sort_order) values
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Cijeli dan',  '09:00', null,    8000, true,  1),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '1. polovica', '09:00', '15:00', 5000, true,  2),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '2. polovica', '15:00', null,    4000, false, 3);

select public.add_units('b0000000-0000-0000-0000-000000000001', 8);
select public.add_units('b0000000-0000-0000-0000-000000000002', 30);
select public.add_units('b0000000-0000-0000-0000-000000000003', 20);
select public.add_units('b0000000-0000-0000-0000-000000000004', 4);
select public.add_units('b0000000-0000-0000-0000-000000000005', 60);
select public.add_units('b0000000-0000-0000-0000-000000000006', 6);

-- Primjer vlastitog naziva: cabana A preimenovana u "VIP".
update public.units set label = 'VIP'
where item_type_id = 'b0000000-0000-0000-0000-000000000001' and position = 1;

-- Današnje prodaje za demo zauzetost na karti.
insert into public.bookings (unit_id, service_date, status, source, payment_method, created_by)
select u.id, (now() at time zone 'Europe/Zagreb')::date, 'sold', 'walk_in',
       (case when u.position % 3 = 0 then 'card' else 'cash' end)::public.payment_method,
       b.owner_id
from public.units u
join public.item_types t on t.id = u.item_type_id
join public.businesses b on b.id = t.business_id
where (t.id = 'b0000000-0000-0000-0000-000000000002' and u.position <= 21)
   or (t.id = 'b0000000-0000-0000-0000-000000000005' and u.position <= 12);

-- Rezervacije za sutra u Primošten Cabani: jedna nova iz turističke aplikacije, jedna telefonom.
insert into public.bookings (unit_id, service_date, slot_id, status, source, customer_name, customer_phone,
                             group_id, public_token)
select u.id, (now() at time zone 'Europe/Zagreb')::date + 1, 'e0000000-0000-0000-0000-000000000001',
       'reserved', 'tourist_app', 'Anna Müller', '+49 151 2345678',
       '90000000-0000-0000-0000-000000000001', 'demo-token-anna'
from public.units u
where u.item_type_id = 'b0000000-0000-0000-0000-000000000001' and u.position = 3;

insert into public.bookings (unit_id, service_date, slot_id, status, source, customer_name, customer_phone, created_by)
select u.id, (now() at time zone 'Europe/Zagreb')::date + 1, 'e0000000-0000-0000-0000-000000000002',
       'reserved', 'phone', 'Marko Perić', '091 234 5678', b.owner_id
from public.units u
join public.businesses b on b.id = u.business_id
where u.item_type_id = 'b0000000-0000-0000-0000-000000000001' and u.position = 5;
