# Specifikacija aplikacije

Radna verzija 0.1, 27. 11. 2026. Dokument je za pregled: sve što ne odgovara, ispravi izravno u tekstu ili u komentaru na PR. Pitanja na koja trebam tvoj odgovor skupljena su u poglavlju 10.

## 1. Što gradimo

Dva proizvoda nad istom bazom:

1. **Turistički dio (web)**. Gost skenira QR kod u apartmanu ili hotelu i u pregledniku, bez instalacije i bez računa, vidi kartu ponude u blizini: ležaljke, suncobrane, cabane, jet ski, pedaline, kajake, SUP, aquaparkove i ostalo uz more. Za svaki objekt vidi koliko je trenutačno puno i kada je obično najveća gužva. Kod objekata koji to žele može rezervirati.
2. **Aplikacija za iznajmljivače (mobitel i tablet)**. Radna digitalna bilježnica: popis predmeta s brojevima, dodirom se označi što je prodano ili rezervirano, a iz toga se sami slažu izvještaji po danu, mjesecu i za cijelu sezonu.

Plaćanja u aplikaciji nema. Gost plaća na licu mjesta, a aplikacija bilježi samo cijenu radi izvještaja.

### Što aplikacija nije

- **Nije fiskalna blagajna.** Iznajmljivač i dalje izdaje račune kroz svoju blagajnu. U aplikaciji to treba jasno pisati, da nitko ne pomisli da je bilježenje prodaje dovoljno za Poreznu.
- **Nije sustav za online naplatu ni kapare.**
- **Nije booking za smještaj.** Apartman ili hotel samo je mjesto gdje visi QR kod.

## 2. Uloge

| Uloga | Tko je to | Što radi |
|---|---|---|
| Turist | Gost na odmoru | Gleda kartu i objekte, rezervira gdje je moguće. Nema račun. |
| Vlasnik objekta | Iznajmljivač | Uređuje objekt i ponudu, bilježi prodaju, vidi izvještaje, poziva djelatnike, uključuje rezervacije. |
| Djelatnik | Osoba na plaži ili na pultu | Bilježi prodaju i rezervacije. Cijene, postavke i izvještaje vidi samo ako mu vlasnik to dopusti (vidi pitanje 4). |
| Partner smještaj | Vlasnik apartmana ili hotel | Dobiva QR kod za svoj smještaj. U prvoj verziji nema svoj pristup aplikaciji. |
| Administrator | Ti (Lito) | Odobrava objekte prije objave na karti, izdaje QR kodove, vidi ukupnu statistiku. |

Jedan korisnik može imati više objekata (npr. plaža u Primoštenu i najam pedalina u Vodicama) i prebacuje se između njih u aplikaciji.

## 3. Turistički dio

Web aplikacija (Next.js), radi na svakom mobitelu. Jezici: hrvatski, engleski, njemački, talijanski. Jezik se bira prema postavkama mobitela, a gost ga može promijeniti.

### 3.1 Ekrani

**T1. Ulaz preko QR koda** (`/q/{kod}`)
- Svaki QR kod vezan je uz jedan smještaj i njegovu lokaciju. Karta se otvara centrirana na taj smještaj, bez traženja dozvole za lokaciju.
- Ako gost uključi lokaciju, karta prati njega. Ako je ne uključi, ostaje na smještaju.
- Na vrhu piše npr. "Ponuda u blizini: Apartmani Marija, Zaborić". To je ujedno i usluga za vlasnika smještaja.
- Bez QR koda gost dolazi na naslovnicu, gdje bira mjesto ili dopušta lokaciju.

**T2. Karta i popis**
- Interaktivna karta hrvatske obale s oznakama objekata. Boja oznake pokazuje trenutačnu gužvu (vidi 3.2).
- Prekidač karta / popis. Popis je poredan po udaljenosti i prikazuje naziv, vrstu, udaljenost, gužvu sada i oznaku "Rezervacija moguća".
- Filtri: vrsta (plaža, vodeni sportovi, najam plovila, aquapark), "ima mjesta sada", "može se rezervirati".
- Dodir na oznaku otvara karticu s osnovnim podacima, a dodir na karticu stranicu objekta.

**T3. Stranica objekta**
- Naziv, fotografije, kratak opis, adresa, radno vrijeme, telefon, gumb "Upute" (otvara Google ili Apple karte).
- Cjenik po vrstama predmeta (npr. ležaljka 15 €/dan, cabana 80 €/dan, jet ski 60 €/30 min).
- Gužva sada: slobodno 23 od 60 ležaljki, ili samo razina ako objekt ne želi prikazivati brojke (vidi pitanje 6).
- **Kada je gužva:** stupčasti graf po satima za današnji dan u tjednu, kao "Popularno vrijeme" na Google kartama, s rečenicom tipa "Obično je najviše ljudi od 11 do 15 h".
- Gumb "Rezerviraj" samo ako objekt prima rezervacije.

**T4. Rezervacija**
1. Gost bira vrstu predmeta i količinu (npr. 2 ležaljke i 1 suncobran), zatim datum.
2. Prikazuje se cijena za orijentaciju i napomena "Plaćanje na licu mjesta".
3. Upisuje ime i broj mobitela.
4. Mora označiti kućicu s napomenom objekta, npr. **"Razumijem da se rezervacija automatski poništava ako ne dođem do 11:00."** Bez toga nema slanja.
5. Potvrda: kod rezervacije, oznake dodijeljenih mjesta (npr. L14, L15, S7), rok dolaska, adresa i telefon objekta, gumb "Dodaj u kalendar" i poveznica na rezervaciju.

**T5. Moja rezervacija** (poveznica iz potvrde)
- Status: potvrđeno, gost stigao, poništeno zbog isteka roka, otkazano.
- Gumb "Otkaži". Otkazivanje odmah oslobađa mjesta.

### 3.2 Gužva

**Gužva sada** računa se iz bilježnice iznajmljivača: zauzete jedinice podijeljene s ukupnim brojem jedinica. Razine: slobodno (ispod 40 %), srednje (40 do 75 %), gužva (75 % i više), popunjeno (100 %).

Važno pravilo: ako iznajmljivač toga dana još ništa nije označio, karta **ne smije pokazati "slobodno"**. Prikazuje se "nema podataka uživo". Inače bi neažurni objekti izgledali kao prazne plaže i gost bi došao uzalud.

**Kada je gužva** (prosjek po satima) računa se iz podataka zadnja četiri tjedna za isti dan u tjednu. Zato bilježnica mora pamtiti kada je jedinica zauzeta i kada oslobođena, a ne samo da je prodana toga dana (vidi 7.2). Dok se ne skupe dva tjedna podataka, graf se ne prikazuje.

Aquaparkovi i objekti koji ne vode jedinice: u prvoj verziji nemaju gužvu uživo. Kasnije im dodajemo ručni prekidač razine gužve.

## 4. Aplikacija za iznajmljivače

Expo (React Native), Android i iOS, mobitel i tablet. Mnogi rade s tableta na pultu, pa raspored mora dobro izgledati i u vodoravnom položaju.

### 4.1 Ekrani

**I1. Prijava i registracija**
- E-mail i lozinka, ili prijava poveznicom na e-mail.
- Nakon registracije kratki čarobnjak u tri koraka: podaci o objektu (naziv, vrsta, mjesto), lokacija (pribadača na karti), prvi predmet. Cilj je da iznajmljivač za pet minuta ima prvi ekran "Danas" s brojevima.

**I2. Danas** (glavni ekran, otvara se pri pokretanju)
- Na vrhu kartice po vrstama predmeta: Ležaljke, Suncobrani, Cabane...
- Mreža jedinica s oznakama. Boje: **zeleno** slobodno, **žuto** rezervirano (s rokom dolaska), **crveno** zauzeto.
- Iznad mreže brojač: "Zauzeto 34 / 60 · Rezervirano 5 · Prihod danas 610 €" (prihod vidi samo tko ima dopuštenje).
- Dodir na zelenu jedinicu označi je zauzetom jednim potezom, uz cijenu iz cjenika. Mali gumb "Poništi" vidi se nekoliko sekundi, za slučajni dodir.
- Dugi pritisak otvara izbornik jedinice: Zauzmi, Rezerviraj (ime, telefon, rok), Gost je stigao, Oslobodi, Otkaži, Promijeni cijenu, Napomena.
- Višestruki odabir: obitelj uzima dvije ležaljke i suncobran, sve se označi odjednom.
- Prekidač datuma: pogled na sutra i dalje, da se vide rezervacije unaprijed.
- **Satni najam** (jet ski, pedaline, SUP): umjesto mreže popis s mjeračem vremena. "Izdaj na 30 min" pokrene odbrojavanje, a jedinica pocrveni kad istekne vrijeme povratka. "Vraćeno" je oslobađa.

**I3. Rezervacije**
- Popis za danas i sljedeće dane, poredan po roku dolaska.
- Nove rezervacije iz turističke aplikacije označene su kao nove, a stiže i push obavijest.
- Uz svaku rezervaciju: ime, telefon (dodirom poziv), mjesta, rok, izvor (aplikacija, telefon, uživo).

**I4. Ponuda** (vrste predmeta i jedinice)
- Dodavanje vrste predmeta: naziv po izboru, **ukupan broj komada**, način numeriranja, cijena i jedinica cijene (dan, pola dana, sat, termin), može li se rezervirati.
- Način numeriranja: brojevi (1, 2, 3), slova (A, B, C ... Z, AA, AB) i neobavezni prefiks (L1, L2 ili S1, S2). Pregled oznaka vidi se prije spremanja.
- Sustav sam stvori i numerira jedinice. Svaku oznaku moguće je zatim preimenovati (npr. "VIP 1", "Uz more 3"). Oznake unutar iste vrste moraju biti jedinstvene.
- Promjena broja komada: dodavanje nastavlja numeraciju. Uklanjanje samo deaktivira jedinicu, da povijest i izvještaji ostanu točni.
- Promjena redoslijeda jedinica u mreži (da odgovara rasporedu na plaži).

**I5. Izvještaji** (vidi poglavlje 5)

**I6. Postavke objekta**
- Profil: opis, fotografije, adresa, telefon, web, radno vrijeme, datumi sezone.
- Rezervacije: uključi ili isključi, rok dolaska, koliko dana unaprijed se može rezervirati, napomena za gosta.
- Tim: pozivnica djelatniku na e-mail, uloga i dopuštenja.
- Objava na karti: zahtjev za objavu. Objekt se pojavljuje turistima nakon odobrenja administratora.

### 4.2 Rad bez signala

Na plaži signal zna biti loš, a bilježnica koja tada ne radi je beskorisna. Označavanje u ekranu "Danas" mora raditi i bez veze: promjena se odmah vidi lokalno i šalje se čim veza proradi. Na vrhu se tada vidi "Bez veze, promjene će se poslati".

Ako se za vrijeme prekida ista jedinica rezervira preko turističke aplikacije, nakon sinkronizacije aplikacija iznajmljivaču pokazuje sukob i nudi drugo slobodno mjesto za rezervaciju. Baza nikad ne dopušta da ista jedinica bude dvaput zauzeta u isto vrijeme.

## 5. Izvještaji

Cilj: jasno svakome, bez tablica i formula, a interaktivno kao Power BI. Sve se računa iz onoga što je zabilježeno u ekranu "Danas", iznajmljivač ništa ne upisuje dodatno.

### 5.1 Struktura ekrana

1. **Odabir razdoblja** na vrhu: Danas, Ovaj tjedan, Ovaj mjesec, Sezona, ili raspon po izboru. Filtar po vrsti predmeta.
2. **Pet brojki** (kartice): prihod, broj prodanih jedinica, prosječna popunjenost, rezervacije iz aplikacije, nedolasci. Uz svaku usporedba s prethodnim razdobljem (npr. "+12 % u odnosu na prošli tjedan").
3. **Prihod po danima** (stupci). Dodir na stupac otvara taj dan: koje su jedinice radile, kada je bila gužva, koje su rezervacije propale.
4. **Popunjenost po vrsti predmeta** (npr. cabane 92 %, ležaljke 68 %, suncobrani 41 %). Odmah se vidi čega ima previše, a čega premalo.
5. **Toplinska karta dan u tjednu × sat**: kada je stvarno najveća gužva. Pomaže kod rasporeda djelatnika.
6. **Najtraženije i najslabije jedinice**: koje ležaljke se prve prodaju (npr. prvi red uz more), a koje stoje prazne.
7. **Izvor prometa**: uživo, telefon, turistička aplikacija.

### 5.2 Sažetak sezone

Jedan ekran na kraju sezone (i u svakom trenutku tijekom nje): ukupni prihod, najbolji dan, najbolji tjedan, prosječna popunjenost po mjesecima, najtraženija vrsta predmeta, udio rezervacija iz aplikacije, postotak nedolazaka, usporedba s prošlom sezonom od druge godine nadalje.

Izvoz u PDF (za knjigovođu ili banku) i u Excel (za vlastitu obradu).

### 5.3 Gdje se gledaju

U prvoj verziji izvještaji su u aplikaciji, prilagođeni tabletu. Za veći ekran kasnije dodajemo web panel za iznajmljivače na istoj adresi kao turistički dio, s istim izvještajima (vidi pitanje 7).

## 6. Pravila

### 6.1 Jedinice i prodaja
1. Svaka jedinica u jednom trenutku može imati najviše jednu aktivnu rezervaciju ili prodaju. Baza to provjerava, ne samo aplikacija.
2. Dnevni najam traje od otvaranja do kraja dana. Satni najam ima točno vrijeme početka i povratka.
3. Cijena se kod prodaje preuzima iz cjenika i može se promijeniti za tu prodaju (popust, stalni gost). Promjena cjenika ne mijenja prošle prodaje.
4. Najam na više dana (gost uzme ležaljku za cijeli tjedan) bilježi se jednim potezom, a sustav stvori zapis za svaki dan, povezane u jednu grupu. U izvještajima se prihod raspoređuje po danima.
5. Ništa se ne briše. Otkazane i istekle rezervacije ostaju u povijesti s pripadajućim statusom.

### 6.2 Rezervacije
1. Rezervacije su isključene dok ih vlasnik ne uključi, za cijeli objekt i posebno za svaku vrstu predmeta (npr. cabane da, suncobrani ne).
2. Vlasnik postavlja **rok dolaska** (npr. 11:00). Turist vidi rok prije slanja i mora potvrditi da razumije napomenu.
3. Ako gost ne dođe do roka, rezervacija se **automatski poništava** i jedinica postaje slobodna. Provjera se izvodi svakih pet minuta.
4. Kad gost stigne, djelatnik označi "Gost je stigao" i rezervacija postaje prodaja. Rok tada više ne vrijedi.
5. Za današnji dan nakon roka dolaska turistička aplikacija ne prima nove rezervacije, već piše "Za danas dođite izravno". (Ovo je ispravak u odnosu na PR #1, vidi 8.)
6. Rezervirati se može najviše onoliko dana unaprijed koliko odredi vlasnik (zadano 7).
7. Turist ne bira točno mjesto, sustav mu dodjeljuje prvo slobodno. Djelatnik ga uvijek može premjestiti na drugo. (Vidi pitanje 2.)
8. Zaštita od zloupotrebe: jedan broj mobitela može imati najviše jednu aktivnu rezervaciju po objektu za isti dan. Vlasnik može blokirati broj koji ne dolazi.
9. Turist može otkazati sam preko poveznice do roka dolaska. Iznajmljivač može otkazati uvijek.

### 6.3 Objava i privatnost
1. Objekt se na karti pojavljuje tek kad ga administrator odobri. Tako sprječavamo lažne i duplicirane objekte.
2. Turisti vide samo zbrojeve zauzetosti, nikad imena ni brojeve drugih gostiju.
3. Ime i telefon gosta vide samo članovi tog objekta. Brišu se 30 dana nakon datuma rezervacije, a u izvještajima ostaju samo brojke.
4. Turistički dio ne koristi kolačiće za praćenje. Bilježi se samo da je QR kod skeniran, bez podataka o osobi.

### 6.4 Vrijeme i novac
- Sva vremena računaju se po hrvatskom vremenu (Europe/Zagreb), bez obzira na postavke mobitela.
- Valuta je euro. Iznosi se spremaju u centima, da nema grešaka u zaokruživanju.

## 7. Model podataka

### 7.1 Što već postoji u PR #1

| Tablica | Sadržaj |
|---|---|
| `businesses` | Objekt: naziv, vrsta, lokacija, objavljen ili ne, postavke rezervacija (uključeno, rok dolaska, napomena). |
| `business_members` | Tko radi u objektu i s kojom ulogom (vlasnik, djelatnik). |
| `item_types` | Vrsta predmeta: naziv, način numeriranja, prefiks, cijena, jedinica cijene, može li se rezervirati. |
| `units` | Pojedinačna jedinica s pozicijom i oznakom koja se može preimenovati. |
| `bookings` | Rezervacija ili prodaja jedne jedinice za dan ili vremenski raspon, sa statusom (rezervirano, prodano, otkazano, isteklo) i izvorom. |
| `report_daily` | Dnevni zbroj po vrsti predmeta. |

Funkcije: `add_units` (automatsko numeriranje), `nearby_businesses` (karta), `request_reservation` (rezervacija turista), `release_expired_reservations` (poništavanje nakon roka).

Osnova je dobra i specifikacija je ne ruši. Potrebne su dopune iz 7.2.

### 7.2 Dopune

**`businesses`**
- `opening_hours` (radno vrijeme po danima), `season_start`, `season_end`
- `reservation_days_ahead` (zadano 7)
- `approved_at`, `approved_by`: objava ide preko administratora, ne samo preko `is_published`
- fotografije u Supabase Storageu, nova tablica `business_photos`

**`item_types`**
- `description`, `default_duration_min` (za satni najam, npr. 30)
- `units_visible_to_tourists` ili postavka na razini objekta, ovisno o odgovoru na pitanje 6

**`units`**
- bez većih promjena; `position` služi i za ručni redoslijed u mreži

**`bookings`**
- `checked_in_at`: kada je jedinica stvarno zauzeta. Bez ovoga nema grafa "kada je gužva".
- `released_at`: kada je oslobođena (gost otišao ranije, jet ski vraćen)
- `group_id`: veže više jedinica jedne rezervacije i najam na više dana
- `public_token`: tajni dio poveznice kojom turist vidi i otkazuje rezervaciju
- `cancelled_by`: turist ili iznajmljivač
- `payment_method` (gotovina, kartica) ako odgovor na pitanje 5 bude da

**Nove tablice**
- `qr_points`: smještaj s QR kodom (naziv, lokacija, kontakt vlasnika, kod)
- `qr_scans`: datum i QR kod, bez podataka o osobi
- `platform_admins`: tko je administrator
- `blocked_phones`: brojevi koje je objekt blokirao
- `push_tokens`: uređaji iznajmljivača za obavijesti

**Novi pogledi i funkcije**
- `occupancy_hourly`: zauzetost po satu za svaki objekt, iz `checked_in_at` i `released_at`
- `popular_times`: prosjek zadnja četiri tjedna po danu u tjednu i satu (dnevno osvježavanje)
- `report_season`: sažetak sezone
- `request_reservation` prima više vrsta i količina odjednom i vraća `public_token`
- `cancel_reservation(token)` za turista
- `nearby_businesses` vraća i "nema podataka uživo" kad objekt danas ništa nije označio

## 8. Što se mijenja u PR #1

| Mjesto u PR #1 | Promjena | Zašto |
|---|---|---|
| `bookings_prepare` | Rok dolaska za današnji dan može biti već prošao (rezervacija u 12:00, rok 11:00), pa rezervacija odmah istječe. Dodati provjeru i u `request_reservation` odbiti današnje rezervacije nakon roka. | Pravilo 6.2.5 |
| `request_reservation` | Više jedinica i vrsta u jednoj rezervaciji, `group_id`, `public_token`, ograničenje po broju mobitela, ograničenje dana unaprijed. | 3.1 T4, 6.2.6 i 6.2.8 |
| `bookings` | Dodati `checked_in_at`, `released_at`, `group_id`, `public_token`, `cancelled_by`. | 3.2 i 6.1.4 |
| `nearby_businesses` | Razlikovati "slobodno" od "nema podataka". | 3.2 |
| `businesses.is_published` | Vlasnik šalje zahtjev, administrator odobrava. | 6.3.1 |
| `report_daily` | Dodati izvor prometa i popunjenost u postotku. | 5.1 |
| Brisanje podataka gostiju | Zakazani posao koji nakon 30 dana briše ime i telefon. | 6.3.3 |
| `apps/renter` ekran "Danas" | Ostaje kao početak, dobiva stvarne podatke, dugi pritisak, satni najam i rad bez signala. | 4.1 I2 i 4.2 |

Predlažem da PR #1 ostane kostur kakav jest, a ove promjene idu u prvi sljedeći PR (faza 1), kad potvrdiš specifikaciju.

## 9. Faze

**MVP, cilj: pilot s Primošten Cabanom od početka sezone 2027.**

| Faza | Sadržaj |
|---|---|
| 1. Baza | Dopune iz poglavlja 7 i 8, testovi pravila iz poglavlja 6. |
| 2. Bilježnica | Prijava, čarobnjak, Danas, Ponuda, Postavke, rad bez signala. Iznajmljivač je može koristiti i prije nego što postoji turistički dio. |
| 3. Rezervacije | Rezervacije u aplikaciji iznajmljivača, push obavijesti, automatsko poništavanje. |
| 4. Turistički dio | QR ulaz, karta, stranica objekta, rezervacija, moja rezervacija. |
| 5. Izvještaji | Ekran izvještaja, sažetak sezone, izvoz PDF i Excel. |
| 6. Administracija | Odobravanje objekata i izdavanje QR kodova. U MVP-u to radim ručno kroz Supabase. |

**Kasnije**
- Graf "kada je gužva" (traži barem dva tjedna podataka iz sezone, pa ga uključujemo sredinom prve sezone)
- Web panel s izvještajima za iznajmljivače
- Raspored jedinica kao tlocrt plaže (redovi, prvi red uz more) umjesto mreže
- Turist bira točno mjesto na tlocrtu
- Ručna razina gužve za aquaparkove
- Panel za partnere smještaja: koliko je gostiju skeniralo njihov QR kod
- Podsjetnik turistu prije roka dolaska (SMS ili e-mail, uz trošak po poruci)
- Dodatni jezici (poljski, češki, slovenski, mađarski)

## 10. Otvorena pitanja

1. **Kategorije.** Je li popis dovoljan: plaža (ležaljke, suncobrani, cabane), vodeni sportovi, najam plovila, aquapark, ostalo? Trebaju li izleti brodom, ronjenje, beach barovi?
2. **Odabir mjesta.** Treba li turist moći birati konkretnu cabanu ili ležaljku, ili je dovoljno da sustav dodijeli slobodnu? Za Primošten Cabanu, kako gosti danas biraju?
3. **Rok dolaska.** Vrijedi li jedan rok za cijeli objekt ili različit po vrsti (npr. cabane do 12:00, ležaljke do 10:30)?
4. **Djelatnici.** Smiju li djelatnici vidjeti prihod i izvještaje, ili samo bilježiti?
5. **Način plaćanja.** Želiš li u bilježnici razlikovati gotovinu i karticu? Korisno za izvještaje, ali je jedan dodir više kod svake prodaje.
6. **Brojke za turiste.** Smije li turist vidjeti točan broj slobodnih mjesta ("23 od 60") ili samo razinu gužve? Neki iznajmljivači ne vole otkrivati kapacitet.
7. **Izvještaji na velikom ekranu.** Je li ti web panel za izvještaje važan već u prvoj sezoni?
8. **QR kodovi.** Tko ih dijeli smještaju: ti osobno, ili se vlasnik apartmana sam prijavi i preuzme kod?
9. **Poslovni model.** Je li aplikacija za iznajmljivače besplatna u prvoj sezoni? O tome ovisi treba li već sada predvidjeti pretplate i ograničenja.
10. **Naziv i izgled.** Ima li aplikacija ime i boje, ili to radimo u fazi dizajna?
