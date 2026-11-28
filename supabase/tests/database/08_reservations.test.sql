-- Rezervacije u aplikaciji za iznajmljivače: nove, premještanje, push, blokiranje (faza 3).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('11111111-0000-0000-0000-000000000001', 'vlasnik@test.local'),
  ('22222222-0000-0000-0000-000000000002', 'djelatnik@test.local'),
  ('33333333-0000-0000-0000-000000000003', 'drugi@test.local');
insert into public.businesses (id, owner_id, name, slug, category, location, is_published, approved_at,
                               subscription_until, reservations_enabled, reservation_hold_until)
values ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Kompleti', 'kompleti',
        'beach', 'SRID=4326;POINT(15.9236 43.5876)', true, now(), current_date + 30, true, '11:00');
insert into public.business_members (business_id, user_id, role)
values ('c0000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'staff');
insert into public.item_types (id, business_id, name, reservable, price_cents, label_prefix) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Komplet', true, 3000, 'K'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Ležaljka', false, 2000, 'L');
select from public.add_units('d0000000-0000-0000-0000-000000000001', 4);
select from public.add_units('d0000000-0000-0000-0000-000000000002', 2);

insert into public.push_tokens (token, user_id, business_id, p256dh, auth) values
  ('https://push.example/vlasnik', '11111111-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'BKlj0000000000000000000000000000', 'auth000000000000'),
  ('https://push.example/djelatnik', '22222222-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'BKlj0000000000000000000000000000', 'auth000000000000');

-- Turist rezervira dva kompleta za sutra.
set local role anon;
select from public.request_reservation('d0000000-0000-0000-0000-000000000001', current_date + 1,
  'Obitelj Horvat', '098 111 222', true, null, 2);
reset role;
set constraints all immediate;

select is(
  (select count(*)::int from public.push_messages where business_id = 'c0000000-0000-0000-0000-000000000001'),
  1, 'jedna obavijest za cijelu grupu, ne po jedinici'
);
select is(
  (select body from public.push_messages where business_id = 'c0000000-0000-0000-0000-000000000001'),
  'Komplet K1, K2, sutra. Rok dolaska 11:00.', 'obavijest kaže što, kada i rok dolaska'
);
select ok(
  (select body !~ 'Horvat' and body !~ '098' from public.push_messages
    where business_id = 'c0000000-0000-0000-0000-000000000001'),
  'obavijest na zaključanom ekranu ne otkriva ime ni broj gosta'
);
select is(
  (select tokens from public.push_messages where business_id = 'c0000000-0000-0000-0000-000000000001'),
  array['https://push.example/djelatnik', 'https://push.example/vlasnik'], 'stiže vlasniku i djelatniku'
);

-- Rezervacija preko telefona ne šalje obavijest i nije "nova".
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-0000-0000-0000-000000000002","role":"authenticated"}';
select from public.record_reservation(
  (select array_agg(id) from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and position = 3),
  current_date + 1, 'Ivo', '091 555 666', 'phone');
set constraints all immediate;
select is(
  (select count(*)::int from public.bookings where business_id = 'c0000000-0000-0000-0000-000000000001'
     and status = 'reserved' and source = 'tourist_app' and seen_at is null),
  2, 'rezervacije iz turističke aplikacije su nove'
);
select is(public.mark_reservations_seen('c0000000-0000-0000-0000-000000000001'), 2,
  'djelatnik ih označava kao viđene');
select is(
  (select count(*)::int from public.bookings where business_id = 'c0000000-0000-0000-0000-000000000001' and seen_at is null
     and source = 'tourist_app'),
  0, 'više nema novih'
);

-- Premještanje gosta.
select lives_ok(
  $$ select public.move_booking(
       (select b.id from public.bookings b join public.units u on u.id = b.unit_id
         where u.item_type_id = 'd0000000-0000-0000-0000-000000000001' and u.label = 'K1' and b.status = 'reserved'),
       (select id from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and label = 'K4')) $$,
  'djelatnik premješta gosta na slobodno mjesto'
);
select throws_like(
  $$ select public.move_booking(
       (select b.id from public.bookings b join public.units u on u.id = b.unit_id
         where u.item_type_id = 'd0000000-0000-0000-0000-000000000001' and u.label = 'K4' and b.status = 'reserved'),
       (select id from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and label = 'K2')) $$,
  '%zauzeto%', 'ne može na mjesto koje je u isto vrijeme zauzeto'
);
select throws_like(
  $$ select public.move_booking(
       (select b.id from public.bookings b join public.units u on u.id = b.unit_id
         where u.item_type_id = 'd0000000-0000-0000-0000-000000000001' and u.label = 'K4' and b.status = 'reserved'),
       (select id from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000002' and label = 'L1')) $$,
  '%iste vrste%', 'ne može na mjesto druge vrste'
);

-- Blokiranje broja: samo vlasnik.
select throws_ok(
  $$ select public.block_booking_phone((select id from public.bookings where customer_name = 'Ivo')) $$,
  '42501', null, 'djelatnik ne blokira brojeve'
);
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';
select is(public.block_booking_phone((select id from public.bookings where customer_name = 'Obitelj Horvat' limit 1), 'nije došao'),
  '38598111222', 'vlasnik blokira broj gosta');

-- Prijava uređaja.
select ok(public.register_web_push('c0000000-0000-0000-0000-000000000001', 'https://push.example/novi',
    'BKlj0000000000000000000000000000', 'auth000000000000', 'test'),
  'član prijavljuje preglednik za obavijesti');
select throws_ok(
  $$ select public.register_web_push('c0000000-0000-0000-0000-000000000001', 'http://push.example/x',
       'BKlj0000000000000000000000000000', 'auth000000000000') $$,
  'P0001', 'Neispravna pretplata', 'pretplata mora biti na https adresu'
);
select ok(public.unregister_web_push('https://push.example/novi'), 'član isključuje obavijesti na pregledniku');
set local request.jwt.claims = '{"sub":"33333333-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok(
  $$ select public.register_web_push('c0000000-0000-0000-0000-000000000001', 'https://push.example/tudji',
       'BKlj0000000000000000000000000000', 'auth000000000000') $$,
  '42501', null, 'tko nije član ne prima obavijesti objekta'
);

select * from finish();
rollback;
