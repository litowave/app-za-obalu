# Specifikacija aplikacije

Radna verzija 0.2, 27. 11. 2026. Uneseni su tvoji odgovori na prvih deset pitanja (pregled u poglavlju 10). Sve što ne odgovara, ispravi izravno u tekstu ili u komentaru na PR.

## 1. Što gradimo

Dva proizvoda nad istom bazom:

1. **Turistički dio (web)**. Gost skenira QR kod u apartmanu, hotelu ili na naljepnici u mjestu i u pregledniku, bez instalacije i bez računa, vidi kartu ponude u blizini: ležaljke, komplete, cabane, jet ski, pedaline, kajake, SUP, trampoline, masaže na plaži, aquaparkove, škole ronjenja i automate za najam. Za svaki objekt vidi kolika je gužva sada i kada je obično najveća. Kod objekata koji to žele može rezervirati.
2. **Aplikacija za iznajmljivače (mobitel i tablet) i web panel za vlasnike**. Aplikacija je radna digitalna bilježnica: popis predmeta s oznakama, dodirom se označi što je prodano ili rezervirano i kako je plaćeno. Iz toga se sami slažu izvještaji po danu, mjesecu i za cijelu sezonu, koje vlasnik gleda u aplikaciji ili na računalu.

Plaćanja u aplikaciji nema. Gost plaća na licu mjesta, a aplikacija bilježi cijenu i način plaćanja (gotovina ili kartica) radi izvještaja.

### Što aplikacija nije

- **Nije fiskalna blagajna.** Iznajmljivač i dalje izdaje račune kroz svoju blagajnu. U aplikaciji to treba jasno pisati. Dugoročni cilj je integracija s POS uređajem, kad bi jedan dodir i fiskalizirao račun i označio jedinicu (vidi 9).
- **Nije sustav za online naplatu ni kapare.**
- **Nije booking za smještaj.** Apartman ili hotel samo je mjesto gdje stoji QR kod.

## 2. Uloge

| Uloga | Tko je to | Što radi |
|---|---|---|
| Turist | Gost na odmoru | Gleda kartu i objekte, rezervira gdje je moguće. Nema račun. |
| Vlasnik objekta | Iznajmljivač | Uređuje objekt i ponudu, bilježi prodaju, poziva djelatnike, uključuje rezervacije. **Jedini vidi prihode i financijske izvještaje.** |
| Djelatnik | Osoba na plaži ili na pultu | Bilježi prodaju, plaćanje i rezervacije. Vidi cjenik, ali ne vidi prihode, zbrojeve ni izvještaje. |
| Partner smještaj | Vlasnik apartmana ili hotel | Dobiva QR pločicu ili naljepnicu za svoj smještaj. U prvoj verziji nema svoj pristup aplikaciji. |
| Administrator | Ti (Lito) | Odobrava objekte prije objave na karti, izdaje i bilježi QR kodove, vodi pretplate, vidi ukupnu statistiku. |

Jedan korisnik može imati više objekata (npr. plaža u Primoštenu i najam pedalina u Vodicama) i prebacuje se između njih.

## 3. Turistički dio

Web aplikacija (Next.js), radi na svakom mobitelu. Jezici: hrvatski, engleski, njemački, talijanski. Jezik se bira prema postavkama mobitela, a gost ga može promijeniti.

### 3.1 Ekrani

**T1. Ulaz preko QR koda** (`/q/{kod}`)
- Svaki QR kod je jedinstven i zapisan u bazi. Kod u smještaju vezan je uz lokaciju smještaja, pa se karta otvara centrirana na njega, bez traženja dozvole za lokaciju. Na vrhu piše npr. "Ponuda u blizini: Apartmani Marija, Zaborić".
- Kod na javnom mjestu (riva, info ploča, kafić) ne mora imati lokaciju. Tada karta pita za lokaciju ili nudi odabir mjesta.
- Ako gost uključi lokaciju, karta prati njega.
- Bez QR koda gost dolazi na naslovnicu, gdje bira mjesto ili dopušta lokaciju.

**T2. Karta i popis**
- Interaktivna karta hrvatske obale s oznakama objekata. Boja oznake pokazuje razinu gužve sada (vidi 3.2).
- Prekidač karta / popis. Popis je poredan po udaljenosti i prikazuje naziv, vrstu, udaljenost, razinu gužve i oznaku "Rezervacija moguća".
- Filtri: vrsta ponude (vidi 3.3), "nije gužva", "može se rezervirati".
- Dodir na oznaku otvara karticu s osnovnim podacima, a dodir na karticu stranicu objekta.

**T3. Stranica objekta**
- Naziv, fotografije, kratak opis, adresa, radno vrijeme, telefon, gumb "Upute" (otvara Google ili Apple karte).
- Cjenik po vrstama predmeta (npr. komplet 30 €/dan, cabana 80 €/dan, jet ski 60 €/30 min).
- Razina gužve sada, bez brojki.
- **Kada je gužva:** stupčasti graf po satima za današnji dan u tjednu, kao "Popularno vrijeme" na Google kartama, s rečenicom tipa "Obično je najviše ljudi od 11 do 15 h".
- Gumb "Rezerviraj" samo ako objekt prima rezervacije.

**T4. Rezervacija**
1. Gost bira vrstu predmeta i datum.
2. Ovisno o postavci te vrste predmeta (vidi 6.2.7):
   - **gost bira sam:** vidi raspored jedinica s oznakama i dodirom odabire slobodne (npr. Cabana C). Zauzete su sive i ne mogu se odabrati.
   - **automatski:** upisuje samo količinu (npr. 2 kompleta), a sustav dodjeljuje slobodne.
3. Prikazuje se cijena za orijentaciju i napomena "Plaćanje na licu mjesta".
4. Upisuje ime i broj mobitela.
5. Mora označiti kućicu s napomenom objekta, npr. **"Razumijem da se rezervacija automatski poništava ako ne dođem do 11:00."** Rok je onaj koji vrijedi za odabranu vrstu predmeta. Bez kvačice nema slanja.
6. Potvrda: kod rezervacije, oznake mjesta (npr. C, ili K14 i K15), rok dolaska, adresa i telefon objekta, gumb "Dodaj u kalendar" i poveznica na rezervaciju.

**T5. Moja rezervacija** (poveznica iz potvrde)
- Status: potvrđeno, gost stigao, poništeno zbog isteka roka, otkazano.
- Gumb "Otkaži". Otkazivanje odmah oslobađa mjesta.

### 3.2 Gužva

Turist vidi pet razina, bez brojki:

| Razina | Zauzetost | Boja na karti |
|---|---|---|
| Prazno | do 20 % | tamnozelena |
| Malo ljudi | 20 do 50 % | zelena |
| Umjereno | 50 do 75 % | žuta |
| Gužva | 75 do 99 % | narančasta |
| Popunjeno | 100 % | crvena |

Zauzetost se računa iz bilježnice iznajmljivača: zauzete i rezervirane jedinice podijeljene s ukupnim brojem aktivnih jedinica. Postotak nikad ne izlazi iz baze prema turistu, samo razina.

Važno pravilo: ako iznajmljivač toga dana još ništa nije označio, karta **ne smije pokazati "Prazno"**. Prikazuje se siva oznaka "nema podataka uživo". Inače bi neažurni objekti izgledali kao prazne plaže i gost bi došao uzalud.

**Kada je gužva** (prosjek po satima) računa se iz podataka zadnja četiri tjedna za isti dan u tjednu. Zato bilježnica pamti kada je jedinica zauzeta i kada oslobođena, a ne samo da je prodana toga dana (vidi 7.2). Dok se ne skupe dva tjedna podataka, graf se ne prikazuje.

Aquaparkovi i automati za najam u prvoj verziji nemaju gužvu uživo, osim ako vode jedinice. Kasnije aquaparkovi dobivaju ručni odabir razine, a automati podatke izravno iz uređaja.

### 3.3 Vrste ponude

Kategorije objekata (filtar na karti):

| Kategorija | Primjeri |
|---|---|
| Plaža | ležaljka, komplet, cabana, trampolin na plaži |
| Vodeni sportovi | jet ski, SUP, kajak, pedalina |
| Aquapark | ulaznice, kapacitet |
| Masaža na plaži | kućica za masažu, termini |
| Škola ronjenja | tečajevi i zaroni u terminima |
| Automat za najam | samoposlužne jedinice (npr. kajaci, SUP) |

Izleti brodom i beach barovi za sada nisu u ponudi.

Pri dodavanju ponude iznajmljivač bira gotov predložak, koji popuni naziv, način najma i uobičajeno numeriranje. Sve se može promijeniti.

| Predložak | Način najma | Zadano numeriranje |
|---|---|---|
| Ležaljka | dan / pola dana | L1, L2... |
| Komplet (2 ležaljke + 1 suncobran) | dan / pola dana | K1, K2... |
| Cabana | dan | A, B, C... |
| Trampolin na plaži | sat / termin | T1, T2... |
| Pedalina | sat | P1, P2... |
| Jet ski | 15 / 30 / 60 min | J1, J2... |
| SUP | sat | SUP1, SUP2... |
| Kajak | sat | KJ1, KJ2... |
| Kućica za masažu | termin | M1, M2... |
| Tečaj ili zaron (škola ronjenja) | termin | po terminu |
| Aquapark ulaznica | dan | bez jedinica, broji se kapacitet |
| Vlastito | po izboru | po izboru |

**Komplet** se vodi kao zasebna vrsta s vlastitim oznakama, jer su na većini plaža kompleti postavljeni na stalno mjesto. Ako objekt uz komplete prodaje i pojedinačne ležaljke, to su dvije odvojene vrste i ne troše jedna drugoj zalihu. (Vidi pitanje 11.)

## 4. Aplikacija za iznajmljivače

Expo (React Native), Android i iOS, mobitel i tablet. Mnogi rade s tableta na pultu, pa raspored mora dobro izgledati i u vodoravnom položaju.

### 4.1 Ekrani

**I1. Prijava i registracija**
- E-mail i lozinka, ili prijava poveznicom na e-mail.
- Nakon registracije kratki čarobnjak u tri koraka: podaci o objektu (naziv, kategorija, mjesto), lokacija (pribadača na karti), prva ponuda iz predloška. Cilj je da iznajmljivač za pet minuta ima prvi ekran "Danas".
- **Demo način**: gumb "Isprobaj bez registracije" otvara objekt s izmišljenim podacima i izvještajima pune sezone. Služi za zimsko testiranje s prijateljima i za prodaju.

**I2. Danas** (glavni ekran, otvara se pri pokretanju)
- Na vrhu kartice po vrstama predmeta: Kompleti, Ležaljke, Cabane...
- Mreža jedinica s oznakama. Boje: **zeleno** slobodno, **žuto** rezervirano (s rokom dolaska), **crveno** zauzeto.
- Iznad mreže brojač: "Zauzeto 34 / 60 · Rezervirano 5". Vlasnik uz to vidi i "Prihod danas 610 € (gotovina 420 €, kartica 190 €)". Djelatnik ne vidi iznose.
- Dodir na zelenu jedinicu otvara dva velika gumba: **Gotovina** i **Kartica**. Drugi dodir označi jedinicu zauzetom s cijenom iz cjenika. Mali gumb "Poništi" vidi se nekoliko sekundi, za slučajni dodir.
- Dugi pritisak otvara izbornik jedinice: Zauzmi, Rezerviraj (ime, telefon, rok), Gost je stigao (pa odabir plaćanja), Oslobodi, Otkaži, Promijeni cijenu, Napomena.
- Višestruki odabir: obitelj uzima dva kompleta, sve se označi i naplati odjednom.
- Prekidač datuma: pogled na sutra i dalje, da se vide rezervacije unaprijed.
- **Satni najam i termini** (jet ski, pedaline, SUP, kajak, trampolin, masaža): umjesto mreže popis s mjeračem vremena. "Izdaj na 30 min" pokrene odbrojavanje, a jedinica pocrveni kad istekne vrijeme povratka. "Vraćeno" je oslobađa.

**I3. Rezervacije**
- Popis za danas i sljedeće dane, poredan po roku dolaska.
- Nove rezervacije iz turističke aplikacije označene su kao nove, a stiže i push obavijest.
- Uz svaku rezervaciju: ime, telefon (dodirom poziv), mjesta, rok, izvor (aplikacija, telefon, uživo).

**I4. Ponuda** (vrste predmeta i jedinice)
- Dodavanje vrste iz predloška ili vlastite: naziv po izboru, **ukupan broj komada**, način numeriranja, cijena i jedinica cijene (dan, pola dana, sat, termin).
- Rezervacije za tu vrstu: uključeno ili ne, **rok dolaska** i **razdoblje za rezervacije** (ako se razlikuju od zadanih za objekt), **način dodjele mjesta**: gost bira sam ili automatski.
- Način numeriranja: brojevi (1, 2, 3), slova (A, B, C ... Z, AA, AB) i neobavezni prefiks (L1, L2 ili K1, K2). Pregled oznaka vidi se prije spremanja.
- Sustav sam stvori i numerira jedinice. Svaku oznaku moguće je zatim preimenovati (npr. "VIP 1", "Uz more 3"). Oznake unutar iste vrste moraju biti jedinstvene.
- Promjena broja komada: dodavanje nastavlja numeraciju. Uklanjanje samo deaktivira jedinicu, da povijest i izvještaji ostanu točni.
- Promjena redoslijeda jedinica u mreži, da odgovara rasporedu na plaži. Taj raspored vidi i turist kad sam bira mjesto.
- Cijene uređuje samo vlasnik.

**I5. Izvještaji** (samo vlasnik, vidi poglavlje 5)

**I6. Postavke objekta** (samo vlasnik)
- Profil: opis, fotografije, adresa, telefon, web, radno vrijeme, datumi sezone.
- Rezervacije: uključi ili isključi, zadani rok dolaska, zadano razdoblje za rezervacije (kada se otvaraju i kada zatvaraju), napomena za gosta. Rok, razdoblje i dodjela mjesta mogu se zatim promijeniti po vrsti predmeta.
- Tim: pozivnica djelatniku na e-mail.
- Objava na karti: zahtjev za objavu. Objekt se pojavljuje turistima nakon odobrenja administratora.
- Pretplata: do kada vrijedi.

### 4.2 Rad bez signala

Na plaži signal zna biti loš, a bilježnica koja tada ne radi je beskorisna. Označavanje u ekranu "Danas" mora raditi i bez veze: promjena se odmah vidi lokalno i šalje se čim veza proradi. Na vrhu se tada vidi "Bez veze, promjene će se poslati".

Ako se za vrijeme prekida ista jedinica rezervira preko turističke aplikacije, nakon sinkronizacije aplikacija iznajmljivaču pokazuje sukob i nudi drugo slobodno mjesto za rezervaciju. Baza nikad ne dopušta da ista jedinica bude dvaput zauzeta u isto vrijeme.

## 5. Izvještaji

Cilj: jasno svakome, bez tablica i formula, a interaktivno kao Power BI. Sve se računa iz onoga što je zabilježeno u ekranu "Danas", iznajmljivač ništa ne upisuje dodatno. Izvještaje vidi samo vlasnik.

### 5.1 Struktura ekrana

1. **Odabir razdoblja** na vrhu: Danas, Ovaj tjedan, Ovaj mjesec, Sezona, ili raspon po izboru. Filtar po vrsti predmeta.
2. **Brojke na vrhu** (kartice): prihod, od toga gotovina i kartica, broj prodanih jedinica, prosječna popunjenost, rezervacije iz aplikacije, nedolasci. Uz svaku usporedba s prethodnim razdobljem (npr. "+12 % u odnosu na prošli tjedan").
3. **Prihod po danima** (stupci podijeljeni na gotovinu i karticu). Dodir na stupac otvara taj dan: koje su jedinice radile, kada je bila gužva, koje su rezervacije propale.
4. **Popunjenost po vrsti predmeta** (npr. cabane 92 %, kompleti 68 %, pedaline 41 %). Odmah se vidi čega ima previše, a čega premalo.
5. **Toplinska karta dan u tjednu × sat**: kada je stvarno najveća gužva. Pomaže kod rasporeda djelatnika.
6. **Najtraženije i najslabije jedinice**: koji kompleti se prvi prodaju (npr. prvi red uz more), a koji stoje prazni.
7. **Izvor prometa**: uživo, telefon, turistička aplikacija.

Gotovina po danu služi i za usporedbu s blagajnom na kraju smjene.

### 5.2 Sažetak sezone

Jedan ekran na kraju sezone (i u svakom trenutku tijekom nje): ukupni prihod, omjer gotovine i kartica, najbolji dan, najbolji tjedan, prosječna popunjenost po mjesecima, najtraženija vrsta predmeta, udio rezervacija iz aplikacije, postotak nedolazaka, usporedba s prošlom sezonom od druge godine nadalje.

Izvoz u PDF (za knjigovođu ili banku) i u Excel (za vlastitu obradu).

### 5.3 Gdje se gledaju

U aplikaciji (prilagođeno tabletu) i u **web panelu za vlasnike**, već u prvoj sezoni. Panel je dio iste web aplikacije kao turistički dio (`/panel`), s prijavom istim računom. Na računalu izvještaji imaju više mjesta: grafovi jedan uz drugi, filtri koji se primjenjuju na sve odjednom, tablice s detaljima ispod.

## 6. Pravila

### 6.1 Jedinice i prodaja
1. Svaka jedinica u jednom trenutku može imati najviše jednu aktivnu rezervaciju ili prodaju. Baza to provjerava, ne samo aplikacija.
2. Dnevni najam traje od otvaranja do kraja dana. Satni najam i termini imaju točno vrijeme početka i povratka.
3. Cijena se kod prodaje preuzima iz cjenika i može se promijeniti za tu prodaju (popust, stalni gost). Promjena cjenika ne mijenja prošle prodaje.
4. Svaka prodaja ima način plaćanja: gotovina ili kartica. Rezervacija ga dobiva kad gost stigne.
5. Najam na više dana (gost uzme komplet za cijeli tjedan) bilježi se jednim potezom, a sustav stvori zapis za svaki dan, povezane u jednu grupu. U izvještajima se prihod raspoređuje po danima.
6. Ništa se ne briše. Otkazane i istekle rezervacije ostaju u povijesti s pripadajućim statusom.

### 6.2 Rezervacije
1. Rezervacije su isključene dok ih vlasnik ne uključi, za cijeli objekt i posebno za svaku vrstu predmeta (npr. cabane da, kompleti ne).
2. Vlasnik postavlja **zadani rok dolaska** za objekt (npr. 11:00) i po potrebi **drugačiji rok za pojedinu vrstu** (npr. cabane 12:00). Svaki objekt ima svoja pravila. Turist vidi rok prije slanja i mora potvrditi da razumije napomenu.
3. Ako gost ne dođe do roka, rezervacija se **automatski poništava** i jedinica postaje slobodna. Provjera se izvodi svakih pet minuta.
4. Kad gost stigne, djelatnik označi "Gost je stigao" i način plaćanja, a rezervacija postaje prodaja. Rok tada više ne vrijedi.
5. **Razdoblje za rezervacije.** Vlasnik određuje kada se rezervacije za neki dan otvaraju i kada zatvaraju, za objekt i posebno po vrsti predmeta. Primjer, Primošten Cabana, cabane:
   - rezervacije za sutra otvaraju se **danas u 12:00**,
   - zatvaraju se **sutra u 8:00**,
   - od 8:00 do 12:00 rezervacija nema, a u 12:00 se otvaraju za sljedeći dan.

   Zadano za nove objekte: otvara se 7 dana unaprijed, zatvara se u trenutku roka dolaska. Izvan razdoblja turist vidi "Rezervacije za ovaj dan otvaraju se u četvrtak u 12:00" ili "Za danas dođite izravno". (Ispravak u odnosu na PR #1, vidi 8.)
6. Razdoblje za rezervacije i rok dolaska su dva odvojena pravila: prvo kaže do kada se smije rezervirati, drugo do kada gost mora doći. Zatvaranje ne smije biti nakon roka dolaska, inače bi rezervacija odmah istekla. Aplikacija to provjerava pri spremanju postavki.
7. **Dodjela mjesta** se postavlja po vrsti predmeta: **gost bira sam** (zadano za cabane) ili **automatski** (sustav dodjeljuje prvo slobodno po redoslijedu). Djelatnik uvijek može premjestiti gosta na drugo mjesto.
8. Zaštita od zloupotrebe: jedan broj mobitela može imati najviše jednu aktivnu rezervaciju po objektu za isti dan. Vlasnik može blokirati broj koji ne dolazi.
9. Turist može otkazati sam preko poveznice do roka dolaska. Iznajmljivač može otkazati uvijek.

### 6.3 Prava pristupa
1. Prihode, zbrojeve, izvještaje, cijene u cjeniku, postavke i tim vidi i mijenja samo vlasnik.
2. Djelatnik bilježi prodaju, plaćanje i rezervacije. Cijena iz cjenika upisuje se sama, a djelatnik je ne mijenja.
3. Ovo se provodi u bazi (pravila pristupa i izvještajni pogledi samo za vlasnika), ne samo skrivanjem u aplikaciji.

### 6.4 Objava i privatnost
1. Objekt se na karti pojavljuje tek kad ga administrator odobri. Tako sprječavamo lažne i duplicirane objekte.
2. Turisti vide samo razinu gužve, nikad brojke, imena ni brojeve drugih gostiju.
3. Ime i telefon gosta vide samo članovi tog objekta. Brišu se 30 dana nakon datuma rezervacije, a u izvještajima ostaju samo brojke.
4. Turistički dio ne koristi kolačiće za praćenje. Bilježi se samo da je QR kod skeniran, bez podataka o osobi.

### 6.5 Vrijeme i novac
- Sva vremena računaju se po hrvatskom vremenu (Europe/Zagreb), bez obzira na postavke mobitela.
- Valuta je euro. Iznosi se spremaju u centima, da nema grešaka u zaokruživanju.

### 6.6 QR kodovi
- QR kodove izrađuje i dijeli administrator: plastične pločice za smještaj i naljepnice za javna mjesta. Svaki kod je jedinstven, pa se zna koliko je skeniranja došlo s kojeg mjesta.
- Na kodu je trajno upisana adresa (npr. `ime.hr/q/ab12`), pa domena mora biti kupljena i stalna prije prvog tiskanja (vidi 10.2).
- Kod se u bazi može preusmjeriti ili ugasiti bez ponovnog tiskanja.

## 7. Model podataka

### 7.1 Što već postoji u PR #1

| Tablica | Sadržaj |
|---|---|
| `businesses` | Objekt: naziv, kategorija, lokacija, objavljen ili ne, postavke rezervacija (uključeno, rok dolaska, napomena). |
| `business_members` | Tko radi u objektu i s kojom ulogom (vlasnik, djelatnik). |
| `item_types` | Vrsta predmeta: naziv, način numeriranja, prefiks, cijena, jedinica cijene, može li se rezervirati. |
| `units` | Pojedinačna jedinica s pozicijom i oznakom koja se može preimenovati. |
| `bookings` | Rezervacija ili prodaja jedne jedinice za dan ili vremenski raspon, sa statusom (rezervirano, prodano, otkazano, isteklo) i izvorom. |
| `report_daily` | Dnevni zbroj po vrsti predmeta. |

Funkcije: `add_units` (automatsko numeriranje), `nearby_businesses` (karta), `request_reservation` (rezervacija turista), `release_expired_reservations` (poništavanje nakon roka).

Osnova je dobra i specifikacija je ne ruši. Potrebne su dopune iz 7.2.

### 7.2 Dopune

**`businesses`**
- kategorija prema 3.3: `beach`, `watersports`, `aquapark`, `massage`, `diving`, `self_service`, `other` (umjesto sadašnjih, `boat_rental` se spaja u `watersports`)
- `opening_hours` (radno vrijeme po danima), `season_start`, `season_end`
- zadano razdoblje za rezervacije: `booking_opens_days_before` (zadano 7), `booking_opens_at` (zadano 00:00), `booking_closes_at` (zadano = rok dolaska)
- `approved_at`, `approved_by`: objava ide preko administratora, ne samo preko `is_published`
- `is_demo`: demo objekti, nikad vidljivi na pravoj karti
- `subscription_until`: do kada je pretplata plaćena
- fotografije u Supabase Storageu, nova tablica `business_photos`

**`item_types`**
- `template_key`: iz kojeg je predloška nastala (za statistiku i ikone)
- `assignment_mode`: `guest_choice` ili `auto`
- `reservation_hold_until`: rok dolaska za ovu vrstu, ako se razlikuje od roka objekta (null = vrijedi rok objekta)
- `booking_opens_days_before`, `booking_opens_at`, `booking_closes_at`: razdoblje za rezervacije za ovu vrstu (null = vrijedi objekt). Za cabane u Primošten Cabani: 1, 12:00, 08:00.
- `description`, `default_duration_min` (za satni najam, npr. 30)

**`units`**
- bez većih promjena; `position` služi za redoslijed u mreži i za raspored koji vidi turist

**`bookings`**
- `payment_method`: `cash` ili `card`, obavezno za status prodano
- `checked_in_at`: kada je jedinica stvarno zauzeta. Bez ovoga nema grafa "kada je gužva".
- `released_at`: kada je oslobođena (gost otišao ranije, jet ski vraćen)
- `group_id`: veže više jedinica jedne rezervacije i najam na više dana
- `public_token`: tajni dio poveznice kojom turist vidi i otkazuje rezervaciju
- `cancelled_by`: turist ili iznajmljivač

**Nove tablice**
- `qr_codes`: kod, vrsta (smještaj ili javno mjesto), naziv, lokacija (neobavezna), kontakt, aktivan ili ne, serija tiska
- `qr_scans`: datum i kod, bez podataka o osobi
- `platform_admins`: tko je administrator
- `blocked_phones`: brojevi koje je objekt blokirao
- `push_tokens`: uređaji iznajmljivača za obavijesti

**Novi pogledi i funkcije**
- `crowd_level`: pet razina iz 3.2 i "nema podataka"; turistu se vraća samo razina
- `occupancy_hourly`: zauzetost po satu za svaki objekt, iz `checked_in_at` i `released_at`
- `popular_times`: prosjek zadnja četiri tjedna po danu u tjednu i satu (dnevno osvježavanje)
- `report_daily` i `report_season`: samo za vlasnika, s podjelom na gotovinu i karticu
- `request_reservation` prima ili konkretne jedinice (kad gost bira) ili vrstu i količinu (automatski) i vraća `public_token`
- `available_units(item_type, datum)`: slobodne jedinice za prikaz rasporeda turistu, bez ikakvih podataka o gostima
- `cancel_reservation(token)` za turista

## 8. Što se mijenja u PR #1

| Mjesto u PR #1 | Promjena | Zašto |
|---|---|---|
| `bookings_prepare` | Rok dolaska za današnji dan može biti već prošao (rezervacija u 12:00, rok 11:00), pa rezervacija odmah istječe. Dodati provjeru i u `request_reservation` odbiti današnje rezervacije nakon roka. | 6.2.5 |
| `bookings_prepare` | Rok se uzima s vrste predmeta, a tek ako ga nema s objekta. | 6.2.2 |
| `request_reservation` | Odabir konkretnih jedinica ili automatska dodjela, više jedinica odjednom, `group_id`, `public_token`, ograničenje po broju mobitela, provjera razdoblja za rezervacije. | 3.1 T4, 6.2 |
| `seed.sql` | Cabane u Primošten Cabani: rezervacije od 12:00 dan ranije do 8:00 na dan dolaska. | 6.2.5 |
| `bookings` | Dodati `payment_method`, `checked_in_at`, `released_at`, `group_id`, `public_token`, `cancelled_by`. | 6.1, 3.2 |
| `business_category` | Nove kategorije iz 3.3. | 3.3 |
| `nearby_businesses` | Vraća samo razinu gužve (pet razina ili "nema podataka"), bez `units_total` i `units_occupied`. | 3.2, 6.4.2 |
| `packages/core/crowd.ts` | Pet razina s pragovima iz 3.2 umjesto sadašnjih četiri. | 3.2 |
| `item_types_write`, `report_daily` | Cijene, izvještaji i zbrojevi samo za vlasnika. | 6.3 |
| `businesses.is_published` | Vlasnik šalje zahtjev, administrator odobrava. | 6.4.1 |
| Brisanje podataka gostiju | Zakazani posao koji nakon 30 dana briše ime i telefon. | 6.4.3 |
| `apps/renter` ekran "Danas" | Ostaje kao početak, dobiva stvarne podatke, gumbe za plaćanje, dugi pritisak, satni najam i rad bez signala. | 4.1 I2, 4.2 |

Predlažem da PR #1 ostane kostur kakav jest, a ove promjene idu u prvi sljedeći PR (faza 1), kad potvrdiš specifikaciju.

## 9. Faze i poslovni model

### 9.1 Plan

| Razdoblje | Što | Svrha |
|---|---|---|
| Prosinac 2026. | Faza 1: baza s dopunama iz 7 i 8, testovi pravila iz 6. | Temelj za sve ostalo. |
| Siječanj 2027. | Faza 2: bilježnica (prijava, čarobnjak, Danas, Ponuda, Postavke, rad bez signala) i demo način. | Iznajmljivač je može koristiti i bez turističkog dijela. |
| Veljača i ožujak 2027. | **Testiranje s prijateljima** na demo i stvarnim objektima. Ispravci prema njihovim primjedbama. | Provjeriti hoće li ljudi to stvarno koristiti i platiti. |
| Ožujak 2027. | Faza 3: rezervacije, push obavijesti, automatsko poništavanje. | |
| Travanj 2027. | Faza 4: turistički dio (QR ulaz, karta, stranica objekta, rezervacija). Tisak prvih QR pločica. | |
| Travanj i svibanj 2027. | Faza 5: izvještaji u aplikaciji i web panel, sažetak sezone, izvoz. | |
| Od lipnja 2027. | Pilot s Primošten Cabanom i prvim plaćenim korisnicima. Administracija (odobravanje, QR kodovi) za početak ide ručno kroz Supabase. | |

Datumi su okvirni i ovise o tome koliko vremena imaš za pregled i testiranje.

### 9.2 Poslovni model

- Zima 2026./2027.: besplatno testiranje kroz demo i s nekoliko poznatih iznajmljivača.
- Prva sezona: paket **100 € za sezonu** po objektu. Naplata izvan aplikacije (račun obrta Lito), a u bazi se samo bilježi do kada pretplata vrijedi. Kad istekne, iznajmljivač i dalje vidi svoje podatke, ali objekt nestaje s karte.
- Turistima je sve besplatno.
- Dugoročno: **integracija s POS uređajem**. Jedan dodir na terminalu bi izdao fiskalni račun i označio jedinicu, pa iznajmljivač ne radi dvaput isto. Tada se aplikacija prodaje kao paket uz uslugu pružatelja POS-a. Zato baza od početka ima jasno odvojene funkcije za bilježenje prodaje, koje kasnije može pozivati i POS, a ne samo naša aplikacija.

### 9.3 Kasnije
- Integracija s POS uređajima i fiskalizacijom
- Podaci uživo iz automata za najam
- Ručna razina gužve za aquaparkove
- Raspored jedinica kao tlocrt plaže (redovi, prvi red uz more) umjesto mreže
- Panel za partnere smještaja: koliko je gostiju skeniralo njihov QR kod
- Samostalna prijava smještaja i preuzimanje QR koda
- Podsjetnik turistu prije roka dolaska (SMS ili e-mail, uz trošak po poruci)
- Dodatni jezici (poljski, češki, slovenski, mađarski)
- Izleti brodom i beach barovi, ako se pokaže potreba

## 10. Odluke i otvorena pitanja

### 10.1 Odlučeno 27. 11. 2026.

| Pitanje | Odluka |
|---|---|
| Kategorije | Bez izleta brodom i beach barova. Obavezno: ležaljka, komplet (2 ležaljke + suncobran), cabana, pedalina, jet ski, aquapark, trampolin, kućica za masažu, SUP, kajak, automat za najam, škola ronjenja. |
| Odabir mjesta | Vlasnik po vrsti predmeta bira: gost bira sam ili automatski. Za cabane gost bira sam. |
| Rok dolaska | Svaki objekt ima svoja pravila: zadani rok za objekt, različit po vrsti ako treba. |
| Razdoblje za rezervacije | Podesivo po objektu i vrsti. Cabane u Primošten Cabani: otvara se u 12:00 za sutra, zatvara u 8:00 na dan dolaska. |
| Djelatnici | Financije i izvještaje vidi samo vlasnik. |
| Način plaćanja | Bilježi se gotovina ili kartica. |
| Brojke za turiste | Pet razina gužve, bez brojki. |
| Web panel | Da, već u prvoj sezoni. |
| QR kodovi | Za sada ih dijeli administrator (pločice i naljepnice). Samostalna prijava smještaja možda kasnije. |
| Poslovni model | Zimsko testiranje, zatim 100 € za sezonu, dugoročno integracija s POS-om. |

### 10.2 Ime i domena

**Prijedlozi imena.** Kriteriji: kratko, lako izgovoriti na njemačkom, engleskom i talijanskom, bez č, ć, ž, š, i da zvuči kao Dalmacija.

| Ime | Značenje | Za | Protiv |
|---|---|---|---|
| **Lito** | dalmatinski "ljeto" | Isto ime kao tvoj obrt, jedan brend za sve. Dva sloga, svi ga izgovore. | Vrlo kratko, pa je kratka domena vjerojatno zauzeta. Varijante: litoapp, lito.beach. |
| **Ombrela** | dalmatinski "suncobran" | Talijani i Englezi odmah prepoznaju (ombrello, umbrella). Točno opisuje ponudu. | Vezuje se uz plažu, manje uz jet ski i ronjenje. |
| **Bonaca** | mirno more | Lijepo zvuči, Talijanima poznato (bonaccia). | Strancima ne govori odmah što aplikacija radi. |
| **Mareta** | sitni valovi | Mekano, lako za izgovor, ženstveno i toplo. | Postoji kao žensko ime i u nazivima apartmana. |
| **Kala** | uvala | Dva sloga, jednostavno. | Postoji u drugim jezicima s drugim značenjima. |
| **Fjaka** | dalmatinski užitak u nerađenju | Poznat pojam, i stranci ga znaju. | Asocira na lijenost, a aplikacija je i za aktivnosti. Često korišteno ime. |
| **Zalo** | žalo, šljunčana plaža | Domaće, kratko. | Bez kvačice gubi značenje za domaće. |

Moja preporuka je **Lito**: već imaš obrt pod tim imenom, a "ljeto na moru" pokriva i plažu i vodene sportove. Druga opcija je **Ombrela**, ako želiš ime koje odmah kaže "plaža".

Prije odluke provjeri dvije stvari: je li ime zaštićeno kao žig (baza Državnog zavoda za intelektualno vlasništvo, DZIV) i je li domena slobodna. Iz mog okruženja nisam mogla provjeriti zauzetost domena.

**Domena: da, treba.** Razlozi:
- Turistički dio je web stranica, a QR kod na pločici trajno sadrži adresu. Kad se pločice jednom otisnu, domena se ne smije mijenjati ni isteći.
- Iznajmljivačima i partnerima vlastita domena i e-mail (npr. info@lito...) djeluju ozbiljnije od besplatnih adresa.

Preporuka:
- **.hr** kao glavna: obrt je može registrirati, domaći iznajmljivači joj vjeruju, a turistima nije važno jer adresu ne tipkaju nego skeniraju.
- **.com** istog imena, ako je slobodna, da je netko drugi ne uzme i za kasnije širenje izvan Hrvatske.
- Obje zakupiti na nekoliko godina unaprijed i uključiti automatsko produženje.

### 10.3 Otvoreno

11. **Komplet i pojedinačne ležaljke.** Ako objekt ima i komplete i slobodne ležaljke, jesu li to fizički različite ležaljke (kako je sada predviđeno), ili se komplet slaže od istih ležaljki i suncobrana pa prodaja kompleta treba smanjiti broj slobodnih ležaljki?
12. **Automati za najam.** Znaš li već koji proizvođač ili tvrtka postavlja te automate u Hrvatskoj? O tome ovisi možemo li kasnije dobiti podatke izravno iz uređaja.
13. **Pola dana.** Od kada počinje popodnevni najam (npr. od 13 h)? Isto za sve ili po objektu?
14. **POS.** Imaš li na umu određenog pružatelja POS uređaja za kasniju integraciju?
