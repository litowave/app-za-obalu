# Prijava Googleom i Appleom

Kod je spreman. Da gumbi prorade, trebaju ključevi s tvojih računa kod Googlea i Applea, upisani u Supabase. Bez toga gumbi javljaju grešku, a prijava e-mailom radi kao i prije.

Oznake u nastavku:

- `<projekt>` je adresa tvog Supabase projekta, npr. `abcd1234.supabase.co`. Vidi se u Supabaseu pod Project Settings > Data API.
- Povratna adresa za oba servisa je `https://<projekt>/auth/v1/callback`.

## 1. Google (oko 15 minuta, besplatno)

1. Otvori [console.cloud.google.com](https://console.cloud.google.com) i napravi projekt **Lito**.
2. **APIs & Services > OAuth consent screen** (Google Auth Platform):
   - User type: **External**
   - App name: Lito, support e-mail: info@litowave.hr, logo Lita
   - Authorized domains: `litowave.hr` i `supabase.co`
   - Scopes: samo `email`, `profile`, `openid` (zadano)
   - Dok je aplikacija u "Testing", prijaviti se mogu samo adrese koje upišeš pod Test users. Prije sezone klikni **Publish app**. Za ova tri osnovna scopea Google ne traži dodatnu provjeru.
3. **Credentials > Create credentials > OAuth client ID**:
   - Application type: **Web application** (i za mobitel, jer prijava ide preko Supabasea)
   - Name: Lito Supabase
   - Authorized JavaScript origins: `https://app.litowave.hr`
   - Authorized redirect URIs: `https://<projekt>/auth/v1/callback`
4. Kopiraj **Client ID** i **Client secret**.
5. U Supabaseu: **Authentication > Sign In / Providers > Google**: uključi, zalijepi Client ID i Client secret, spremi.

## 2. Apple (oko 30 minuta, treba Apple Developer račun, 99 USD godišnje)

Apple Developer račun ionako treba za objavu aplikacije u App Storeu. Apple traži da aplikacija koja nudi prijavu Googleom ponudi i prijavu Appleom, pa se ovo ne može preskočiti za iPhone.

Na [developer.apple.com/account](https://developer.apple.com/account), **Certificates, Identifiers & Profiles**:

1. **Identifiers > App IDs**: otvori ili napravi `hr.lito.obala.partner` i uključi **Sign in with Apple**. (Ako app ID još ne postoji, napravit će ga i prva EAS izrada aplikacije.)
2. **Identifiers > Services IDs > +**:
   - Description: Lito prijava, Identifier: `hr.lito.obala.partner.signin`
   - Uključi **Sign in with Apple > Configure**: Primary App ID `hr.lito.obala.partner`, Domains `<projekt>` i `app.litowave.hr`, Return URLs `https://<projekt>/auth/v1/callback`
3. **Keys > +**: ime "Lito Sign in with Apple", uključi **Sign in with Apple**, Configure > App ID `hr.lito.obala.partner`. Preuzmi `.p8` datoteku (može se preuzeti **samo jednom**, spremi je na sigurno) i zapiši **Key ID**.
4. Zapiši **Team ID** (gore desno, ili Membership details).
5. U Supabaseu: **Authentication > Sign In / Providers > Apple**: uključi.
   - **Client IDs**: `hr.lito.obala.partner.signin,hr.lito.obala.partner,host.exp.Exponent` (zadnji je za probu u Expo Go, kasnije se može maknuti)
   - **Secret Key (for OAuth)**: Supabase na istoj stranici ima alat koji iz `.p8` datoteke, Key ID-a, Team ID-a i Services ID-a složi tajni ključ. Taj ključ vrijedi **6 mjeseci**; stavi podsjetnik da ga obnoviš (npr. 1. 5. i 1. 11.).

## 3. Supabase: dopuštene povratne adrese

**Authentication > URL Configuration > Redirect URLs** dodaj:

- `obala-partner://**` (aplikacija za iznajmljivače na mobitelu)
- `exp://**` (Expo Go tijekom probe)
- `https://app.litowave.hr/**` (aplikacija za iznajmljivače na webu)

## Kako radi u aplikaciji

- **iPhone, Apple:** izvorni Appleov prozor s Face ID-om, bez preglednika.
- **Android i iPhone, Google; Android, Apple:** otvori se sigurni preglednik sustava, korisnik odabere račun i vrati se u aplikaciju.
- Prvi put se račun napravi sam i otvara se čarobnjak za objekt. Isti e-mail preko Googlea i preko e-mail prijave Supabase spaja u jedan račun ako je adresa potvrđena.
- Apple korisniku nudi da sakrije e-mail (adresa oblika `...@privaterelay.appleid.com`). Prijava radi normalno; samo pozivnice djelatnicima moraju ići na adresu kojom se djelatnik stvarno prijavljuje.
