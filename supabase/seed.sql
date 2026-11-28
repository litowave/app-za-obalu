-- Demo podaci za lokalni razvoj (`pnpm db:reset`). Lozinka za oba korisnika: obala123
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
   '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Vodice"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users where email like '%@demo.local';

insert into public.businesses
  (id, owner_id, name, slug, category, place, address, location, is_published,
   reservations_enabled, reservation_hold_until, reservation_note)
values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Primošten Cabana', 'primosten-cabana', 'beach', 'Primošten', 'Plaža Raduča',
   'SRID=4326;POINT(15.9236 43.5876)', true,
   true, '11:00', 'Ako ne dođete do 11:00, rezervacija se automatski poništava. Plaćanje na licu mjesta.'),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'Jet Ski Vodice (demo)', 'jet-ski-vodice-demo', 'watersports', 'Vodice', 'Riva',
   'SRID=4326;POINT(15.7789 43.7584)', true,
   false, null, null),
  ('a0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222',
   'Ležaljke Zaborić (demo)', 'lezaljke-zaboric-demo', 'beach', 'Zaborić', 'Glavna plaža',
   'SRID=4326;POINT(15.9411 43.6457)', true,
   false, null, null);

insert into public.item_types (id, business_id, name, label_style, label_prefix, price_cents, price_unit, reservable, sort_order) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Cabana',        'letter', '',  8000,  'day',  true,  1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Ležaljka',      'number', 'L', 1500,  'day',  true,  2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Suncobran',     'number', 'S', 1000,  'day',  false, 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Jet ski',       'number', 'JS', 9000, 'hour', false, 1),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'Ležaljka',      'number', '',  1200,  'day',  false, 1),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Pedalina',      'number', 'P', 2000,  'hour', false, 2);

select public.add_units('b0000000-0000-0000-0000-000000000001', 8);
select public.add_units('b0000000-0000-0000-0000-000000000002', 40);
select public.add_units('b0000000-0000-0000-0000-000000000003', 20);
select public.add_units('b0000000-0000-0000-0000-000000000004', 4);
select public.add_units('b0000000-0000-0000-0000-000000000005', 60);
select public.add_units('b0000000-0000-0000-0000-000000000006', 6);

-- Primjer vlastitog naziva: cabana A preimenovana u "VIP".
update public.units set label = 'VIP'
where item_type_id = 'b0000000-0000-0000-0000-000000000001' and position = 1;

-- Današnje prodaje za demo zauzetost na karti.
insert into public.bookings (unit_id, service_date, status, source, price_cents)
select u.id, (now() at time zone 'Europe/Zagreb')::date, 'sold', 'walk_in', t.price_cents
from public.units u join public.item_types t on t.id = u.item_type_id
where (t.id = 'b0000000-0000-0000-0000-000000000002' and u.position <= 28)
   or (t.id = 'b0000000-0000-0000-0000-000000000005' and u.position <= 12);
