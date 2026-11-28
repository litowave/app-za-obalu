-- Bilježnica: slug, broj komada, pozivnice, demo (faza 2).
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('11111111-0000-0000-0000-000000000001', 'vlasnik@test.local'),
  ('33333333-0000-0000-0000-000000000003', 'Djelatnica@Test.local'),
  ('44444444-0000-0000-0000-000000000004', null);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';

insert into public.businesses (id, name, category, location)
values ('c0000000-0000-0000-0000-000000000001', 'Plaža Žalo Šibenik', 'beach', 'SRID=4326;POINT(15.9 43.7)');
select is((select slug from public.businesses where id = 'c0000000-0000-0000-0000-000000000001'),
  'plaza-zalo-sibenik', 'slug nastaje iz naziva, bez dijakritika');
insert into public.businesses (id, name, category, location)
values ('c0000000-0000-0000-0000-000000000002', 'Plaža Žalo Šibenik', 'beach', 'SRID=4326;POINT(15.9 43.7)');
select isnt((select slug from public.businesses where id = 'c0000000-0000-0000-0000-000000000002'),
  'plaza-zalo-sibenik', 'isti naziv dobiva drugačiji slug');

insert into public.item_types (id, business_id, name, label_prefix)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ležaljke', 'L');
select from (select public.set_unit_count('d0000000-0000-0000-0000-000000000001', 5)) x;
select is((select count(*)::int from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and is_active), 5,
  'postavljeno 5 komada');
select from (select public.set_unit_count('d0000000-0000-0000-0000-000000000001', 3)) x;
select is((select array_agg(label order by position) from public.units
            where item_type_id = 'd0000000-0000-0000-0000-000000000001' and is_active),
  array['L1', 'L2', 'L3'], 'smanjenje deaktivira zadnje');
select is((select count(*)::int from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001'), 5,
  'deaktivirane jedinice ostaju u povijesti');
select from (select public.set_unit_count('d0000000-0000-0000-0000-000000000001', 7)) x;
select is((select array_agg(label order by position) from public.units
            where item_type_id = 'd0000000-0000-0000-0000-000000000001' and is_active),
  array['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'], 'povećanje vraća stare i nastavlja numeraciju');

insert into public.business_invites (business_id, email)
values ('c0000000-0000-0000-0000-000000000001', 'djelatnica@test.local');

set local request.jwt.claims = '{"sub":"33333333-0000-0000-0000-000000000003","role":"authenticated"}';
select is(public.accept_invites(), 1, 'pozvana djelatnica prihvaća pozivnicu nakon prijave (e-mail bez obzira na velika slova)');
select is((select role::text from public.business_members
            where business_id = 'c0000000-0000-0000-0000-000000000001' and user_id = auth.uid()),
  'staff', 'djelatnica je član s ulogom djelatnika');
select throws_ok(
  $$ insert into public.business_invites (business_id, email) values ('c0000000-0000-0000-0000-000000000001', 'drugi@test.local') $$,
  '42501', null, 'djelatnik ne poziva druge');

-- Anonimni demo korisnik.
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-000000000004","role":"authenticated","is_anonymous":true}';
select is(public.create_demo_business(), public.create_demo_business(), 'jedan demo objekt po korisniku');
reset role;
select ok(
  (select count(*) > 1000 from public.bookings b join public.businesses z on z.id = b.business_id
    where z.owner_id = '44444444-0000-0000-0000-000000000004' and z.is_demo),
  'demo ima podatke cijele sezone'
);

select * from finish();
rollback;
