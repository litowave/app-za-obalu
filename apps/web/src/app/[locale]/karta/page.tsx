import { setRequestLocale } from "next-intl/server";
import { MapView } from "@/components/MapView";
import { isOfferFilter } from "@/lib/offers";

function num(v: string | string[] | undefined): number | null {
  const n = typeof v === "string" ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const lat = num(sp.lat);
  const lng = num(sp.lng);
  const vrsta = typeof sp.vrsta === "string" && isOfferFilter(sp.vrsta) ? sp.vrsta : null;
  const center =
    lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  return <MapView center={center} initialOffer={vrsta} />;
}
