import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Welcome } from "@/components/Welcome";
import { supabase } from "@/lib/supabase";

// Svako skeniranje se broji, pa se stranica ne sprema u predmemoriju.
export const dynamic = "force-dynamic";

/**
 * Ulaz preko QR koda (T1). Kod u smještaju otvara ponudu oko smještaja bez traženja lokacije.
 * Nepoznat ili ugašen kod vodi na običnu početnu, da gost nikad ne vidi grešku.
 */
export default async function QrEntry({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const { data } = await supabase().rpc("resolve_qr", { p_code: code });
  const qr = data?.[0];
  if (qr?.redirect_to && /^https:\/\//.test(qr.redirect_to)) redirect(qr.redirect_to);

  const center = qr?.lat != null && qr?.lng != null ? { lat: qr.lat, lng: qr.lng } : null;
  const placeName = qr ? [qr.name, qr.place].filter(Boolean).join(", ") : null;
  return <Welcome path={`/q/${code}`} placeName={placeName} center={center} />;
}
