import { createClient } from "@obala/db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = url !== "" && anonKey !== "";

export const supabase = createClient(url || "http://127.0.0.1:54321", anonKey || "missing", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Na webu poveznica za prijavu vraća token u adresi; na mobitelu ga čitamo sami (lib/auth.tsx).
    detectSessionInUrl: Platform.OS === "web",
  },
});

/** Poruka iz baze je već na hrvatskom; mrežne greške prevodimo. */
export function errorMessage(error: unknown): string {
  const e = error as { message?: string; code?: string } | null;
  const msg = e?.message ?? "";
  if (/Failed to fetch|Network request failed|NetworkError/i.test(msg)) {
    return "Nema veze s poslužiteljem. Pokušaj ponovno kad bude signala.";
  }
  if (/Invalid login credentials/i.test(msg)) return "Pogrešan e-mail ili lozinka.";
  if (/User already registered/i.test(msg)) return "Taj e-mail već ima račun. Prijavi se.";
  if (/Password should be at least/i.test(msg)) return "Lozinka mora imati barem 6 znakova.";
  if (/Email not confirmed/i.test(msg)) return "Potvrdi e-mail preko poveznice koju smo poslali.";
  if (e?.code === "23P01") return "To mjesto je u međuvremenu zauzeto.";
  if (e?.code === "42501") return "Za to nemaš ovlasti. Pitaj vlasnika objekta.";
  return msg || "Nešto nije u redu. Pokušaj ponovno.";
}

/** Je li greška zbog veze (pa promjenu treba pokušati kasnije), a ne zbog pravila u bazi. */
export function isNetworkError(error: unknown): boolean {
  const msg = (error as { message?: string } | null)?.message ?? "";
  return /Failed to fetch|Network request failed|NetworkError|timeout|fetch failed/i.test(msg);
}
