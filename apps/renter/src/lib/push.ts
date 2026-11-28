/**
 * Push obavijest za svaku novu rezervaciju iz turističke aplikacije (specifikacija 4.1 I3).
 *
 * Mobitel se prijavi bazi sa svojim Expo tokenom za aktivni objekt. Baza na kraju svake
 * nove rezervacije pošalje obavijest svim prijavljenim mobitelima tog objekta.
 * Dodir na obavijest otvara karticu Rezervacije.
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuth } from "./auth";
import { useBusiness } from "./business";
import { supabase } from "./supabase";

const supported = Platform.OS === "ios" || Platform.OS === "android";

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Traži dozvolu i vraća token, ili null ako obavijesti ovdje ne rade. */
async function getToken(): Promise<string | null> {
  if (!supported || !Device.isDevice) return null;
  const id = projectId();
  // Bez EAS projekta (lokalni razvoj) Expo ne izdaje token.
  if (!id) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("rezervacije", {
      name: "Rezervacije",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return null;
  const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
  return token.data;
}

export function usePushNotifications() {
  const router = useRouter();
  const { isAnonymous } = useAuth();
  const { active, memberships, setActive } = useBusiness();
  const businessId = active?.business.id ?? null;
  const isDemo = active?.business.is_demo ?? false;
  const handled = useRef<string | null>(null);

  // Prijava mobitela za aktivni objekt. Demo ne prima obavijesti.
  useEffect(() => {
    if (!supported || !businessId || isAnonymous || isDemo) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        await supabase.rpc("register_push_token", {
          p_token: token,
          p_business_id: businessId,
          p_platform: Platform.OS,
        });
      } catch {
        // Obavijesti su dodatak: bez njih bilježnica i popis rezervacija rade normalno.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, isAnonymous, isDemo]);

  // Dodir na obavijest: prebaci na pravi objekt i otvori Rezervacije.
  // Isto i kad je aplikacija bila zatvorena pa ju je otvorila obavijest.
  const ctx = useRef({ businessId, memberships, setActive, router });
  ctx.current = { businessId, memberships, setActive, router };
  useEffect(() => {
    if (!supported) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      const c = ctx.current;
      const data = response.notification.request.content.data as
        | { business_id?: string }
        | undefined;
      const target = data?.business_id;
      if (
        target &&
        target !== c.businessId &&
        c.memberships.some((m) => m.business.id === target)
      ) {
        c.setActive(target);
      }
      c.router.navigate("/rezervacije");
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
