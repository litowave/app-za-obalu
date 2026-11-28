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

Demo prijava u aplikaciju iznajmljivača: `cabana@demo.local` / `obala123`.

## Model podataka

| Tablica | Što je |
|---|---|
| `businesses` | Objekt iznajmljivača s lokacijom (PostGIS), objavom na karti i postavkama rezervacija |
| `business_members` | Tko radi u objektu (`owner`, `staff`). Vlasnik se dodaje automatski |
| `item_types` | Vrsta predmeta: naziv, stil oznaka (`number` ili `letter`), prefiks, cijena, može li se rezervirati |
| `units` | Pojedinačna ležaljka, cabana, jet ski. Oznaka se generira (`L1`, `L2` ili `A`, `B`... `AA`), a korisnik je može preimenovati |
| `bookings` | Rezervacija ili prodaja jedne jedinice za dan ili vremenski raspon |

**Numeriranje.** Iznajmljivač upiše koliko jedinica ima, `add_units(item_type_id, broj)` ih stvori s oznakama. Dodavanje novih nastavlja numeraciju. Pravila su ista u SQL-u (`unit_label`) i u `packages/core` (za pregled u sučelju), a testovi s obje strane provjeravaju iste primjere.

**Dvostruka prodaja nije moguća.** Exclusion constraint u bazi ne dopušta da se ista jedinica preklapa u vremenu, čak ni kad dvoje osoblja klikne istovremeno.

**Rezervacije.** Uključuje ih samo iznajmljivač koji želi (`reservations_enabled`). On postavlja do kada gost mora doći (`reservation_hold_until`, npr. 11:00) i napomenu koju gost vidi. Turist rezervira preko `request_reservation()`, sustav sam bira slobodnu jedinicu. Kad rok prođe, `release_expired_reservations()` (pg_cron, svakih 5 minuta) prebaci rezervaciju u `expired` i jedinica je opet slobodna. Plaćanja u aplikaciji nema, iznajmljivač naplaćuje na licu mjesta i samo bilježi cijenu za izvještaje.

**Sigurnost (RLS).** Turist vidi samo objavljene objekte i njihovu ponudu. Podatke o gostima (`bookings`) vide samo članovi objekta. Karta dobiva samo zbrojeve zauzetosti preko `nearby_businesses()`.

**Izvještaji.** `report_daily` daje dnevni zbroj po vrsti predmeta (prodano, rezervacije iz aplikacije, istekle, otkazane, prihod). Mjesečni i sezonski pregled grade se iz njega.

## Što slijedi

1. Aplikacija iznajmljivača: prijava, dodavanje vrsta i jedinica, označavanje prodaje na Supabase uz offline rad.
2. Turistička app: karta (MapLibre) s objektima i gužvom, stranica objekta, rezervacija.
3. Izvještaji s filtrima po danu, mjesecu i sezoni.
4. Zaštita rezervacija od zloupotrebe (rate limit, potvrda SMS-om).
