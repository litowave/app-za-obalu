-- Radni dan i blagajna (odluka 28. 11. 2026.).
--
-- Djelatnik vidi promet svog radnog dana, po načinu plaćanja i po predmetu, da na kraju dana
-- provjeri štima li blagajna. Svaki dan je novi radni dan. Mjesečne i sezonske izvještaje
-- i dalje vidi samo vlasnik (booking_amounts, report_daily, report_season).
--
-- Blagajna broji novac po trenutku naplate, ne po danu najma: obitelj koja danas plati
-- komplet za cijeli tjedan danas je u blagajni ostavila cijeli iznos.

-- ===========================================================================
-- 1. Trenutak naplate
-- ===========================================================================

alter table public.bookings add column paid_at timestamptz;

-- Postojeće prodaje: rezervacija naplaćena kad je gost stigao, ostalo kad je upisano.
-- Upisi za prošle dane (demo, naknadni unos) računaju se na dan najma.
update public.bookings
set paid_at = case
  when created_at::date > service_date then starts_at
  when source <> 'walk_in' and checked_in_at is not null then checked_in_at
  else created_at
end
where status = 'sold';

create index bookings_paid_at_idx on public.bookings (business_id, paid_at) where status = 'sold';

grant select (paid_at) on public.bookings to authenticated;

-- Ime je namjerno iza "bookings_prepare" (okidači idu abecedno), da starts_at već postoji.
create function public.bookings_set_paid_at() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Zagreb')::date;
begin
  if new.status = 'sold' and new.paid_at is null
     and (tg_op = 'INSERT' or old.status <> 'sold') then
    new.paid_at := case when new.service_date < v_today then new.starts_at else now() end;
  end if;
  return new;
end;
$$;

create trigger bookings_set_paid_at before insert or update on public.bookings
  for each row execute function public.bookings_set_paid_at();

-- ===========================================================================
-- 2. Radni dan
-- ===========================================================================

create table public.workdays (
  business_id uuid not null references public.businesses (id) on delete cascade,
  work_date date not null,
  opened_at timestamptz not null default now(),
  opened_by uuid references auth.users (id) on delete set null,
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  -- Pri zatvaranju: koliko je prema zapisima trebalo biti i koliko je izbrojeno.
  expected_cash_cents integer,
  expected_card_cents integer,
  counted_cash_cents integer check (counted_cash_cents >= 0),
  note text check (length(note) <= 500),
  primary key (business_id, work_date)
);

alter table public.workdays enable row level security;
revoke all on public.workdays from anon;
revoke insert, update, delete on public.workdays from authenticated;

-- Djelatnik vidi današnji radni dan, vlasnik sve.
create policy workdays_select on public.workdays
  for select to authenticated
  using (
    public.is_business_owner(business_id)
    or (public.is_business_member(business_id)
        and work_date = (now() at time zone 'Europe/Zagreb')::date)
  );

-- Smije li trenutni korisnik vidjeti promet tog dana.
create function public.can_see_workday(p_business_id uuid, p_date date) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_business_owner(p_business_id)
      or (public.is_business_member(p_business_id)
          and p_date = (now() at time zone 'Europe/Zagreb')::date);
$$;

-- Promet dana po predmetu i načinu plaćanja.
create function public.workday_totals(p_business_id uuid, p_date date default null)
returns table (
  item_type_id uuid,
  item_type_name text,
  payment_method public.payment_method,
  sales integer,
  amount_cents bigint
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_date date := coalesce(p_date, (now() at time zone 'Europe/Zagreb')::date);
begin
  if not public.can_see_workday(p_business_id, v_date) then
    raise exception 'Djelatnik vidi samo današnji promet' using errcode = '42501';
  end if;
  return query
  select t.id, t.name, b.payment_method, count(*)::integer, coalesce(sum(b.price_cents), 0)::bigint
  from public.bookings b
  join public.units u on u.id = b.unit_id
  join public.item_types t on t.id = u.item_type_id
  where b.business_id = p_business_id
    and b.status = 'sold'
    and b.paid_at >= public.local_midnight(v_date)
    and b.paid_at < public.local_midnight(v_date + 1)
  group by t.id, t.name, t.sort_order, b.payment_method
  order by t.sort_order, t.name, b.payment_method;
end;
$$;

revoke execute on function public.workday_totals(uuid, date) from public, anon;
grant execute on function public.workday_totals(uuid, date) to authenticated;

-- Otvara današnji radni dan ako još nije otvoren. Vraća ga.
create function public.open_workday(p_business_id uuid) returns public.workdays
language plpgsql security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Zagreb')::date;
  v public.workdays;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Nisi član ovog objekta' using errcode = '42501';
  end if;
  insert into public.workdays (business_id, work_date, opened_by)
  values (p_business_id, v_today, auth.uid())
  on conflict (business_id, work_date) do nothing;
  select * into v from public.workdays where business_id = p_business_id and work_date = v_today;
  return v;
end;
$$;

revoke execute on function public.open_workday(uuid) from public, anon;
grant execute on function public.open_workday(uuid) to authenticated;

-- Zatvara današnji radni dan: sprema očekivani promet i izbrojenu gotovinu.
-- Može se zatvoriti ponovno (npr. kasna prodaja nakon zatvaranja); vrijedi zadnje.
create function public.close_workday(
  p_business_id uuid,
  p_counted_cash_cents integer,
  p_note text default null
) returns public.workdays
language plpgsql security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Zagreb')::date;
  v_cash bigint;
  v_card bigint;
  v public.workdays;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Nisi član ovog objekta' using errcode = '42501';
  end if;
  if p_counted_cash_cents is null or p_counted_cash_cents < 0 then
    raise exception 'Upiši koliko je gotovine u blagajni';
  end if;
  perform public.open_workday(p_business_id);
  select
    coalesce(sum(amount_cents) filter (where payment_method = 'cash'), 0),
    coalesce(sum(amount_cents) filter (where payment_method = 'card'), 0)
  into v_cash, v_card
  from public.workday_totals(p_business_id, v_today);

  update public.workdays
  set closed_at = now(),
      closed_by = auth.uid(),
      expected_cash_cents = v_cash,
      expected_card_cents = v_card,
      counted_cash_cents = p_counted_cash_cents,
      note = nullif(trim(coalesce(p_note, '')), '')
  where business_id = p_business_id and work_date = v_today
  returning * into v;
  return v;
end;
$$;

revoke execute on function public.close_workday(uuid, integer, text) from public, anon;
grant execute on function public.close_workday(uuid, integer, text) to authenticated;
