/** Hrvatska obala u cijelosti: od Savudrije do Prevlake. */
export const COAST_BOUNDS: [[number, number], [number, number]] = [
  [13.3, 42.3],
  [19.5, 45.7],
];

export const COAST_CENTER = { lat: 43.9, lng: 15.8 };

/** Udaljenost u metrima (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number, locale: string): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  const km = m / 1000;
  return `${km.toLocaleString(locale, { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

/** Upute do objekta: na iPhoneu Apple karte, drugdje Google karte (preglednik sam otvori aplikaciju). */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Mjesta na obali za brzo traženje na karti. Bez vanjske tražilice adresa:
 * gost ne šalje upit nikome, a popis pokriva mjesta u kojima ljudi ljetuju.
 */
export const COASTAL_PLACES: { name: string; lat: number; lng: number }[] = [
  { name: "Umag", lat: 45.4339, lng: 13.5199 },
  { name: "Novigrad", lat: 45.3165, lng: 13.5617 },
  { name: "Poreč", lat: 45.2271, lng: 13.5947 },
  { name: "Vrsar", lat: 45.1497, lng: 13.6044 },
  { name: "Rovinj", lat: 45.0812, lng: 13.6387 },
  { name: "Fažana", lat: 44.9283, lng: 13.8031 },
  { name: "Pula", lat: 44.8666, lng: 13.8496 },
  { name: "Medulin", lat: 44.8214, lng: 13.9336 },
  { name: "Rabac", lat: 45.0786, lng: 14.1458 },
  { name: "Opatija", lat: 45.3376, lng: 14.3052 },
  { name: "Rijeka", lat: 45.3271, lng: 14.4422 },
  { name: "Crikvenica", lat: 45.1772, lng: 14.6925 },
  { name: "Novi Vinodolski", lat: 45.1278, lng: 14.7886 },
  { name: "Krk", lat: 45.0258, lng: 14.5753 },
  { name: "Baška", lat: 44.9697, lng: 14.7539 },
  { name: "Malinska", lat: 45.1244, lng: 14.5289 },
  { name: "Cres", lat: 44.9606, lng: 14.4086 },
  { name: "Mali Lošinj", lat: 44.5306, lng: 14.4686 },
  { name: "Rab", lat: 44.7569, lng: 14.76 },
  { name: "Lopar", lat: 44.8306, lng: 14.7272 },
  { name: "Senj", lat: 44.9894, lng: 14.9058 },
  { name: "Novalja", lat: 44.5578, lng: 14.8856 },
  { name: "Pag", lat: 44.4447, lng: 15.0569 },
  { name: "Nin", lat: 44.2414, lng: 15.1844 },
  { name: "Zadar", lat: 44.1194, lng: 15.2314 },
  { name: "Biograd na Moru", lat: 43.9431, lng: 15.4519 },
  { name: "Pakoštane", lat: 43.9097, lng: 15.51 },
  { name: "Murter", lat: 43.8222, lng: 15.5928 },
  { name: "Tisno", lat: 43.8019, lng: 15.6439 },
  { name: "Pirovac", lat: 43.8178, lng: 15.6722 },
  { name: "Vodice", lat: 43.7597, lng: 15.7778 },
  { name: "Srima", lat: 43.7517, lng: 15.79 },
  { name: "Šibenik", lat: 43.735, lng: 15.8952 },
  { name: "Brodarica", lat: 43.6797, lng: 15.9244 },
  { name: "Zaborić", lat: 43.6553, lng: 15.9433 },
  { name: "Primošten", lat: 43.5864, lng: 15.9247 },
  { name: "Rogoznica", lat: 43.5297, lng: 15.9686 },
  { name: "Marina", lat: 43.5133, lng: 16.1161 },
  { name: "Trogir", lat: 43.5167, lng: 16.2511 },
  { name: "Kaštela", lat: 43.5503, lng: 16.3472 },
  { name: "Split", lat: 43.5081, lng: 16.4402 },
  { name: "Podstrana", lat: 43.4878, lng: 16.5486 },
  { name: "Omiš", lat: 43.4447, lng: 16.6886 },
  { name: "Brela", lat: 43.3686, lng: 16.9306 },
  { name: "Baška Voda", lat: 43.3567, lng: 16.9497 },
  { name: "Makarska", lat: 43.2969, lng: 17.0178 },
  { name: "Tučepi", lat: 43.2697, lng: 17.0567 },
  { name: "Podgora", lat: 43.2461, lng: 17.075 },
  { name: "Gradac", lat: 43.1031, lng: 17.3417 },
  { name: "Supetar", lat: 43.3847, lng: 16.5531 },
  { name: "Bol", lat: 43.2617, lng: 16.655 },
  { name: "Hvar", lat: 43.1725, lng: 16.4428 },
  { name: "Jelsa", lat: 43.1614, lng: 16.6939 },
  { name: "Vis", lat: 43.0617, lng: 16.1833 },
  { name: "Korčula", lat: 42.96, lng: 17.1356 },
  { name: "Orebić", lat: 42.9772, lng: 17.1781 },
  { name: "Ston", lat: 42.8378, lng: 17.6969 },
  { name: "Mljet", lat: 42.7889, lng: 17.3664 },
  { name: "Dubrovnik", lat: 42.6507, lng: 18.0944 },
  { name: "Lapad", lat: 42.6589, lng: 18.0656 },
  { name: "Cavtat", lat: 42.5811, lng: 18.2178 },
];

/** Usporedba bez kvačica: "sibenik" nađe "Šibenik". */
export function fold(s: string): string {
  return s.toLocaleLowerCase("hr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}
