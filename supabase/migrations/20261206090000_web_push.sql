-- Web push obavijesti (odluka 28. 11. 2026.: aplikacija za iznajmljivače je web aplikacija,
-- ne ide u App Store ni Google Play).
--
-- Preglednik daje pretplatu (adresa push servisa + dva ključa). Baza na kraju svake nove
-- rezervacije zapiše obavijest u push_messages i preko pg_net pozove Supabase funkciju
-- send-push, koja je šifrira i pošalje (Web Push s VAPID ključem). Adresa funkcije i tajna
-- stoje u Vaultu (push_function_url, push_function_secret); dok ih nema, obavijest se
-- samo zapisuje.

-- ===========================================================================
-- 1. Pretplate preglednika
-- ===========================================================================

-- Expo tokeni više ne postoje; zapis za web nosi i ključeve za šifriranje.
delete from public.push_tokens where platform <> 'web';
alter table public.push_tokens drop constraint if exists push_tokens_platform_check;
alter table public.push_tokens
  add column p256dh text,
  add column auth text,
  add column user_agent text,
  add constraint push_tokens_platform_check check (platform = 'web'),
  add constraint push_tokens_web_keys check (p256dh is not null and auth is not null);
alter table public.push_tokens alter column platform set default 'web';

drop function public.register_push_token(text, uuid, text);

-- Preglednik prijavljuje svoju pretplatu za objekt. Isti preglednik može prijeći na drugi
-- objekt ili račun, pa se postojeći zapis preuzima.
create function public.register_web_push(
  p_business_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
) returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_business_member(p_business_id) then
    raise exception 'Nisi član ovog objekta' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then
    raise exception 'Neispravna pretplata';
  end if;
  if coalesce(length(p_p256dh), 0) < 20 or coalesce(length(p_auth), 0) < 10 then
    raise exception 'Neispravna pretplata';
  end if;
  insert into public.push_tokens (token, user_id, business_id, platform, p256dh, auth, user_agent)
  values (p_endpoint, auth.uid(), p_business_id, 'web', p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (token) do update
    set user_id = excluded.user_id,
        business_id = excluded.business_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        last_seen_at = now();
  return true;
end;
$$;

revoke execute on function public.register_web_push(uuid, text, text, text, text) from public, anon;
grant execute on function public.register_web_push(uuid, text, text, text, text) to authenticated;

-- Isključivanje obavijesti na ovom pregledniku.
create function public.unregister_web_push(p_endpoint text) returns boolean
language sql security definer
set search_path = ''
as $$
  with d as (
    delete from public.push_tokens where token = p_endpoint and user_id = auth.uid() returning 1
  )
  select exists (select 1 from d);
$$;

revoke execute on function public.unregister_web_push(text) from public, anon;
grant execute on function public.unregister_web_push(text) to authenticated;

-- ===========================================================================
-- 2. Slanje
-- ===========================================================================

alter table public.push_messages
  add column sent_count integer,
  add column failed_count integer,
  add column sent_at timestamptz;

-- Tajna iz Vaulta, ili null ako Vault ili tajna ne postoje (lokalno, testovi).
create function public.vault_secret(p_name text) returns text
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    return null;
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into v using p_name;
  return v;
end;
$$;

revoke execute on function public.vault_secret(text) from public, anon, authenticated;

create or replace function public.queue_reservation_push(p_group_id uuid) returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
  v record;
  v_tokens text[];
  v_title text := 'Nova rezervacija';
  v_body text;
  v_data jsonb;
  v_id bigint;
  v_request bigint;
  v_url text := public.vault_secret('push_function_url');
  v_secret text := public.vault_secret('push_function_secret');
begin
  select
    b.business_id,
    min(b.service_date) as service_date,
    min(b.hold_until) as hold_until,
    min(t.name) as type_name,
    min(s.name) as slot_name,
    string_agg(u.label, ', ' order by u.position) as labels
  into v
  from public.bookings b
  join public.units u on u.id = b.unit_id
  join public.item_types t on t.id = u.item_type_id
  left join public.item_type_slots s on s.id = b.slot_id
  where b.group_id = p_group_id and b.source = 'tourist_app' and b.status = 'reserved'
  group by b.business_id;
  if not found then
    return null;
  end if;

  select array_agg(token order by token) into v_tokens
  from public.push_tokens
  where business_id = v.business_id and platform = 'web';
  if v_tokens is null then
    return null;
  end if;

  v_body := v.type_name || ' ' || v.labels || ', ' || public.day_label(v.service_date)
    || coalesce(' (' || lower(v.slot_name) || ')', '')
    || coalesce('. Rok dolaska ' || to_char(v.hold_until at time zone 'Europe/Zagreb', 'HH24:MI'), '')
    || '.';
  v_data := jsonb_build_object(
    'url', '/rezervacije',
    'business_id', v.business_id,
    'date', v.service_date,
    'group_id', p_group_id
  );

  insert into public.push_messages (business_id, group_id, title, body, data, tokens)
  values (v.business_id, p_group_id, v_title, v_body, v_data, v_tokens)
  on conflict (group_id) do nothing
  returning id into v_id;
  if v_id is null then
    return null;
  end if;

  if v_url is not null and v_secret is not null
     and to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null then
    execute $q$
      select net.http_post(
        url := $1,
        body := jsonb_build_object('message_id', $2),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', $3)
      )
    $q$
    into v_request
    using v_url, v_id, v_secret;
    update public.push_messages set request_id = v_request where id = v_id;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.queue_reservation_push(uuid) from public, anon, authenticated;
