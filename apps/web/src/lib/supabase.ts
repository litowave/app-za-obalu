import { createClient, type ObalaClient } from "@obala/db";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = url !== "" && anonKey !== "";

let client: ObalaClient | null = null;

/**
 * Turist nema račun: isti anonimni klijent radi na poslužitelju i u pregledniku.
 * Sesija se ne sprema, da turistički dio ne ostavlja kolačiće ni zapise u pregledniku (6.4.4).
 */
export function supabase(): ObalaClient {
  client ??= createClient(url || "http://127.0.0.1:54321", anonKey || "missing", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
