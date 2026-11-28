# @obala/theme

Lito izgled za obje aplikacije: jedna nježna plavkasto-zelena boja, bijela pozadina, meki 3D gumbi.
Roza i narančasta postoje samo u logotipu (`assets/lito-logo.png`).

Prototip: https://claude.ai/artifact/TFu9EwXHUvNySni5dkRzN4

## Što je unutra

- `src/tokens.ts`: boje, gužva, grafovi, fontovi (Poppins za naslove, Inter za tekst), razmaci, radijusi.
- `src/native.ts`: gotovi stilovi za React Native (3D gumb, mjesta u mreži, kartica, način za sunce).
- `src/tokens.css`: iste vrijednosti kao CSS varijable, plus klase `.lito-btn`, `.lito-pressed`, `.lito-card`.
- `src/tokens.test.ts`: provjera da je svaki par tekst/pozadina čitljiv (kontrast ≥ 4,5).

## Pravila

- Mjesta imaju samo dvije vrste gumba: slobodno i rezervirano su podignut svijetli gumb
  (rezervirano ima mali sat), prodano je utisnuto i zasivljeno, s kvačicom.
- Boja nikad ne nosi značenje sama: uz gužvu ide tekst razine, uz grafove legenda i tablica.
- Gumbi i mjesta su visoki najmanje 48 i 56 px.
- Način za sunce dodaje obrube i malo pojača iste boje.

## Korištenje

```ts
import { color, unitStyle, unitTextStyle } from "@obala/theme";
```

```css
@import "@obala/theme/tokens.css";
```
