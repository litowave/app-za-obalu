# App za obalu

Aplikacija za iznajmljivače na plaži (ležaljke, suncobrani, cabane, jet ski, pedaline, aquaparkovi) i turiste koji ih traže.

- **Turistička web-app** (`apps/web`): gost skenira QR kod u apartmanu ili hotelu i vidi što se nudi u blizini, koliko je gužve i, gdje iznajmljivač to dopušta, može rezervirati.
- **Aplikacija za iznajmljivače** (`apps/renter`): digitalna bilježnica. Vrste predmeta, automatski numerirane jedinice, označavanje prodanog i rezerviranog, izvještaji.

## Struktura

```
apps/
  web/       Next.js 16 + next-intl (hr, en, de, it)
  renter/    Expo (iOS, Android, web), Expo Router
packages/
  core/      zajednička logika bez ovisnosti (numeriranje jedinica, razina gužve) + Vitest
  db/        Supabase klijent i tipovi baze
supabase/
  migrations/  shema, RLS politike, funkcije
  tests/       pgTAP testovi baze
  seed.sql     demo podaci (Primošten Cabana + izmišljeni primjeri)
```

## Pokretanje

Treba: Node 22, pnpm 10, Docker (za lokalni Supabase).

```bash
pnpm install
pnpm db:start          # lokalni Supabase, ispiše URL i anon ključ
cp .env.example .env   # upiši vrijednosti iz prethodnog koraka
pnpm dev               # web na :3000, Expo dev server
```

Ostale naredbe: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:reset` (migracije + seed ispočetka), `pnpm db:test` (pgTAP), `pnpm db:types` (regenerira `packages/db/src/database.types.ts`).

## Model podataka

Pravila su opisana u `docs/specifikacija.md`. Ovdje je kratki pregled gdje što živi.

| Tablica | Što je |
|---|---|
| `businesses` | Objekt s lokacijom, radnim vremenom, sezonom, pravilima rezervacija. Na karti je tek kad ga odobri administrator i dok vrijedi pretplata |
| `business_members` | Tko radi u objektu (`owner`, `staff`). Vlasnik se dodaje automatski |
| `item_types` | Vrsta predmeta: naziv, predložak, oznake, cijena, način dodjele mjesta, rok i razdoblje rezervacija (null = vrijedi objekt) |
| `item_type_slots` | Dijelovi dana po vrsti, npr. cabana cijeli dan, 1. i 2. polovica. Kraj može biti "do zalaska sunca" |
| `units` | Pojedinačna jedinica. Oznaka se generira (`L1`, `K1`, `A`... `AA`), a vlasnik je može preimenovati |
| `bookings` | Rezervacija ili prodaja jedne jedinice: dio dana, način plaćanja, stvarni dolazak i odlazak, grupa, poveznica za turista |
| `qr_codes`, `qr_scans` | QR kodovi koje dijeli administrator i broj skeniranja, bez podataka o osobi |
| `blocked_phones`, `push_tokens`, `business_photos`, `platform_admins`, `popular_times` | Pomoćne tablice |

**Bilježnica (aplikacija iznajmljivača).** `record_sale` (jedna ili više jedinica, više dana, satni najam), `record_reservation`, `check_in` (gost stigao), `release_booking` (vraćeno ranije), `cancel_booking`. Iste funkcije kasnije može zvati i POS.

**Dvostruka prodaja nije moguća.** Exclusion constraint ne dopušta da se ista jedinica preklapa u vremenu. Vraćena jedinica (`released_at`) odmah je slobodna, a polovice dana se ne preklapaju.

**Rezervacije turista.** `reservation_availability` kaže je li rezervacija otvorena, `available_units` daje raspored bez podataka o gostima, `request_reservation` provjerava razdoblje, rok dolaska, broj mobitela i blokirane brojeve i vraća token za poveznicu. `reservation_by_token` i `cancel_reservation` služe za "Moja rezervacija". Nakon roka `release_expired_reservations()` (pg_cron, svakih 5 minuta) oslobađa jedinicu.

**Prava pristupa.** Ponudu, cijene i postavke mijenja samo vlasnik. Djelatnik bilježi prodaju i rezervacije, ali ne može čitati stupac s cijenom ni izvještaje. Vlasnik iznose vidi kroz `booking_amounts`, `report_daily` i `report_season`.

**Gužva.** `nearby_businesses` turistu vraća samo razinu (`no_data`, `empty`, `few`, `moderate`, `busy`, `full`). `business_popular_times` daje razinu po satu iz zadnja četiri tjedna (osvježava se noću), tek kad postoje dva tjedna podataka.

**Privatnost.** Ime i telefon gosta brišu se 30 dana nakon datuma rezervacije (`purge_guest_data`, noću).

Demo prijave (lozinka `obala123`): `cabana@demo.local` vlasnik, `djelatnik@demo.local` djelatnik, `admin@demo.local` administrator.

## Aplikacija za iznajmljivače (`apps/renter`)

| Ekran | Što radi |
|---|---|
| Prijava | E-mail i lozinka, poveznica na e-mail, "Isprobaj bez registracije" (anonimna prijava + `create_demo_business`, plaža s cijelom prošlom sezonom) |
| Čarobnjak | Tri koraka nakon registracije: objekt, lokacija (trenutna pozicija), prva ponuda |
| Danas | Mreža mjesta po vrsti i dijelu dana. Dodir otvara list: prodano gotovina ili kartica (i na više dana), rezerviraj, gost je stigao, oslobodi, poništi. "Poništi" u obavijesti nekoliko sekundi. Dugi pritisak ili "Odaberi više mjesta" za obitelj. Satni najam (jet ski, pedaline) kao popis s odbrojavanjem i "Vraćeno". Vlasnik vidi prihod danas, djelatnik ne. Gumb sa suncem za jako sunce |
| Predmeti | Padajući izbornik po skupinama s "Vlastiti naziv…", broj komada, oznaka, numeriranje, cijena, pregled oznaka s preimenovanjem prije spremanja. Uređivanje: cijena, broj komada (smanjenje samo deaktivira), preimenovanje, uklanjanje |
| Postavke | Profil objekta, lokacija, zahtjev za objavu na karti, tim (pozivnica po e-mailu), odjava |

**Rad bez signala.** Svaka promjena ide u red čekanja spremljen na uređaju (`packages/core/src/outbox.ts`) i odmah se vidi. Red se šalje redom kad se veza vrati; prodaja napravljena bez veze dobiva privremeni id, pa "Oslobodi" ili "Poništi" na njoj rade i prije slanja. Ako baza odbije promjenu (mjesto je u međuvremenu rezervirano preko aplikacije), aplikacija to javi i promjena se makne.

Pokretanje: `pnpm --filter @obala/renter dev` (Expo Go ili web), uz `EXPO_PUBLIC_SUPABASE_URL` i `EXPO_PUBLIC_SUPABASE_ANON_KEY` u `.env`.

## Što slijedi

1. Aplikacija iznajmljivača: prijava, dodavanje vrsta i jedinica, označavanje prodaje na Supabase uz offline rad.
2. Turistička app: karta (MapLibre) s objektima i gužvom, stranica objekta, rezervacija.
3. Izvještaji s filtrima po danu, mjesecu i sezoni.
4. Zaštita rezervacija od zloupotrebe (rate limit, potvrda SMS-om).
