/**
 * Šalje web push obavijest za novu rezervaciju.
 *
 * Poziva je baza (queue_reservation_push preko pg_net) s brojem zapisa iz push_messages.
 * Funkcija provjeri tajnu, šifrira obavijest za svaku pretplatu preglednika (Web Push,
 * VAPID) i pošalje je. Pretplate koje push servis više ne prepoznaje (404, 410) briše.
 *
 * Tajne funkcije (supabase secrets set):
 *   PUSH_FUNCTION_SECRET  ista vrijednost kao push_function_secret u Vaultu
 *   VAPID_PUBLIC_KEY      javni ključ, isti kao EXPO_PUBLIC_VAPID_PUBLIC_KEY u aplikaciji
 *   VAPID_PRIVATE_KEY     privatni ključ
 *   VAPID_SUBJECT         npr. mailto:info@litowave.hr
 * SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY Supabase daje sam.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const secret = Deno.env.get("PUSH_FUNCTION_SECRET") ?? "";
const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@litowave.hr",
  Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
  Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST" });
  if (!secret || req.headers.get("x-push-secret") !== secret) {
    return json(401, { error: "Neovlašteno" });
  }

  let messageId: number;
  try {
    messageId = Number((await req.json()).message_id);
  } catch {
    return json(400, { error: "Neispravan zahtjev" });
  }
  if (!Number.isInteger(messageId)) return json(400, { error: "Nema message_id" });

  const { data: msg, error } = await db
    .from("push_messages")
    .select("id, business_id, title, body, data, tokens, sent_at")
    .eq("id", messageId)
    .maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!msg) return json(404, { error: "Nema obavijesti" });
  if (msg.sent_at) return json(200, { already: true });

  const { data: subs, error: subsError } = await db
    .from("push_tokens")
    .select("token, p256dh, auth")
    .in("token", msg.tokens ?? [])
    .eq("platform", "web");
  if (subsError) return json(500, { error: subsError.message });

  const payload = JSON.stringify({ title: msg.title, body: msg.body, data: msg.data });
  const gone: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.token, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          // Rezervacija s rokom dolaska: nakon šest sati obavijest više ne znači ništa.
          { TTL: 6 * 3600, urgency: "high" },
        );
        sent++;
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.token);
      }
    }),
  );

  if (gone.length > 0) await db.from("push_tokens").delete().in("token", gone);
  await db
    .from("push_messages")
    .update({ sent_count: sent, failed_count: failed, sent_at: new Date().toISOString() })
    .eq("id", messageId);

  return json(200, { sent, failed, removed: gone.length });
});
