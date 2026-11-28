/**
 * Web push obavijest za svaku novu rezervaciju iz turističke aplikacije (specifikacija 4.1 I3).
 *
 * Bilježnica je web aplikacija. Preglednik se pretplati na obavijesti (service worker u
 * public/sw.js) i pretplatu prijavi bazi za aktivni objekt. Baza na kraju svake nove
 * rezervacije pošalje obavijest svim prijavljenim preglednicima tog objekta.
 * Dodir na obavijest otvara karticu Rezervacije.
 *
 * Dozvolu preglednik traži samo nakon dodira na gumb (Postavke, Obavijesti).
 * Na iPhoneu obavijesti rade tek kad je aplikacija dodana na početni zaslon.
 */

import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "./auth";
import { useBusiness } from "./business";
import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState =
  /** Preglednik ne podržava obavijesti ili ključ nije postavljen. */
  | "unsupported"
  /** iPhone/iPad: prvo dodaj na početni zaslon. */
  | "install"
  /** Korisnik je u pregledniku zabranio obavijesti. */
  | "denied"
  | "off"
  | "on";

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function baseState(): PushState {
  if (Platform.OS !== "web" || typeof window === "undefined" || !VAPID_PUBLIC_KEY) {
    return "unsupported";
  }
  if (isIos() && !isStandalone()) return "install";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return "off";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

async function saveSubscription(sub: PushSubscription, businessId: string) {
  const json = sub.toJSON();
  const { error } = await supabase.rpc("register_web_push", {
    p_business_id: businessId,
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

/** Stanje i prekidač obavijesti za blok u Postavkama. */
export function usePushSettings() {
  const { isAnonymous } = useAuth();
  const { active } = useBusiness();
  const businessId = active?.business.id ?? null;
  const isDemo = active?.business.is_demo ?? false;
  const [state, setState] = useState<PushState>("unsupported");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const base = baseState();
    if (base !== "off") {
      setState(base);
      return;
    }
    const sub = await currentSubscription().catch(() => null);
    setState(sub && Notification.permission === "granted" ? "on" : "off");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!businessId) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
        }));
      await saveSubscription(sub, businessId);
      setState("on");
    } catch {
      setError("Obavijesti se nisu uključile. Provjeri vezu i pokušaj ponovno.");
    } finally {
      setBusy(false);
    }
  }, [businessId]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await supabase.rpc("unregister_web_push", { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Obavijesti se nisu isključile. Pokušaj ponovno.");
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    state,
    busy,
    error,
    enable,
    disable,
    /** Demo i račun bez registracije ne primaju obavijesti. */
    available: !isAnonymous && !isDemo,
  };
}

/**
 * Pokreće se jednom dok je korisnik prijavljen:
 * - ako su obavijesti već uključene, pretplatu veže uz aktivni objekt (promjena objekta);
 * - dodir na obavijest prebaci na pravi objekt i otvori Rezervacije.
 */
export function usePushNotifications() {
  const router = useRouter();
  const { isAnonymous } = useAuth();
  const { active, memberships, setActive } = useBusiness();
  const businessId = active?.business.id ?? null;
  const isDemo = active?.business.is_demo ?? false;

  useEffect(() => {
    if (!businessId || isAnonymous || isDemo || baseState() !== "off") return;
    if (Notification.permission !== "granted") return;
    void currentSubscription()
      .then((sub) => (sub ? saveSubscription(sub, businessId) : undefined))
      .catch(() => undefined);
  }, [businessId, isAnonymous, isDemo]);

  const ctx = useRef({ businessId, memberships, setActive, router });
  ctx.current = { businessId, memberships, setActive, router };
  // Adresa iz obavijesti čeka dok se ne učitaju objekti korisnika.
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!pending || memberships.length === 0) return;
    setPending(null);
    const c = ctx.current;
    const id = new URL(pending, window.location.origin).searchParams.get("objekt");
    if (id && id !== c.businessId && c.memberships.some((m) => m.business.id === id)) {
      c.setActive(id);
    }
    c.router.navigate("/rezervacije");
  }, [pending, memberships.length]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    // Aplikacija otvorena dodirom na obavijest: /rezervacije?objekt=...
    if (new URLSearchParams(window.location.search).has("objekt")) {
      setPending(window.location.href);
      window.history.replaceState(null, "", window.location.pathname);
    }

    // Aplikacija je već bila otvorena: service worker javi kamo.
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; url?: string } | null;
      if (d?.type === "open" && d.url) setPending(d.url);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
}
