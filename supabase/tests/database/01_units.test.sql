begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Iste vrijednosti kao packages/core/src/unit-labels.test.ts
select is(public.unit_label('letter', 1), 'A', '1 → A');
select is(public.unit_label('letter', 27), 'AA', '27 → AA');
select is(public.unit_label('letter', 703), 'AAA', '703 → AAA');
select is(public.unit_label('number', 7, 'L'), 'L7', 'prefiks + broj');

insert into auth.users (id, email) values ('11111111-0000-0000-0000-000000000001', 'a@test.local');
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}';

insert into public.businesses (id, name, slug, category, location)
values ('c0000000-0000-0000-0000-000000000001', 'Test plaža', 'test-plaza', 'beach', 'SRID=4326;POINT(15.9 43.6)');
insert into public.item_types (id, business_id, name, label_style)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ležaljka', 'letter');

select is(
  (select array_agg(label order by position) from public.add_units('d0000000-0000-0000-0000-000000000001', 3)),
  array['A', 'B', 'C'],
  'add_units numerira od početka'
);
select is(
  (select array_agg(label order by position) from public.add_units('d0000000-0000-0000-0000-000000000001', 2)),
  array['D', 'E'],
  'add_units nastavlja numeraciju'
);

update public.units set label = 'VIP' where item_type_id = 'd0000000-0000-0000-0000-000000000001' and position = 1;
select is(
  (select label from public.units where item_type_id = 'd0000000-0000-0000-0000-000000000001' and position = 1),
  'VIP',
  'oznaku je moguće preimenovati'
);

select * from finish();
rollback;
