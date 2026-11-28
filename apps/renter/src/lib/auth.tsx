import type { Session } from "@obala/db";
import * as Linking from "expo-linking";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { supabase } from "./supabase";

interface AuthValue {
  session: Session | null;
  loading: boolean;
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthValue>({ session: null, loading: true, isAnonymous: false });

/** Poveznica za prijavu na mobitelu dolazi kao obala-partner://#access_token=...&refresh_token=... */
async function sessionFromUrl(url: string | null) {
  if (!url) return;
  const fragment = url.split("#")[1] ?? url.split("?")[1];
  if (!fragment) return;
  const params = new URLSearchParams(fragment);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Pozvani djelatnik postaje član čim se prijavi.
      if (s && !s.user.is_anonymous) void supabase.rpc("accept_invites");
    });
    if (Platform.OS !== "web") {
      void Linking.getInitialURL().then(sessionFromUrl);
    }
    const sub =
      Platform.OS !== "web" ? Linking.addEventListener("url", (e) => sessionFromUrl(e.url)) : null;
    return () => {
      data.subscription.unsubscribe();
      sub?.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, loading, isAnonymous: Boolean(session?.user.is_anonymous) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function magicLinkRedirect() {
  return Linking.createURL("/");
}
