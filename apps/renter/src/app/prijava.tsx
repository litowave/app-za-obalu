import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Body, Button, ErrorText, Field, Screen, Subtitle, space } from "@/components/ui";
import { magicLinkRedirect } from "@/lib/auth";
import { useBusiness } from "@/lib/business";
import { errorMessage, isConfigured, supabase } from "@/lib/supabase";

const logo = require("@obala/theme/assets/lito-logo.png");

type Mode = "login" | "register";

export default function Prijava() {
  const { refresh } = useBusiness();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<{ error: unknown }>) {
    setBusy(key);
    setError(null);
    setInfo(null);
    try {
      const { error: e } = await fn();
      if (e) setError(errorMessage(e));
      return !e;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  const submit = () =>
    run(mode, async () => {
      if (mode === "login")
        return supabase.auth.signInWithPassword({ email: email.trim(), password });
      const r = await supabase.auth.signUp({ email: email.trim(), password });
      if (!r.error && !r.data.session)
        setInfo("Poslali smo ti e-mail. Potvrdi adresu pa se prijavi.");
      return r;
    });

  const magic = async () => {
    if (!email.includes("@")) {
      setError("Upiši e-mail na koji ćemo poslati poveznicu.");
      return;
    }
    const ok = await run("magic", () =>
      supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: magicLinkRedirect() },
      }),
    );
    if (ok) setInfo("Poveznica za prijavu je na tvom e-mailu.");
  };

  const demo = () =>
    run("demo", async () => {
      const r = await supabase.auth.signInAnonymously();
      if (r.error) return r;
      const d = await supabase.rpc("create_demo_business");
      if (!d.error) await refresh();
      return d;
    });

  return (
    <Screen>
      <View style={s.head}>
        <Image source={logo} style={s.logo} resizeMode="contain" accessibilityLabel="Lito" />
        <Subtitle>Bilježnica za plažu</Subtitle>
        <Body muted>Što je slobodno, rezervirano i prodano, i koliko je ušlo u kasu.</Body>
      </View>
      {!isConfigured ? (
        <ErrorText>
          Aplikacija nije spojena na bazu (EXPO_PUBLIC_SUPABASE_URL i _ANON_KEY).
        </ErrorText>
      ) : null}
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="ime@primjer.hr"
      />
      <Field
        label="Lozinka"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        hint={mode === "register" ? "Barem 6 znakova." : undefined}
        onSubmitEditing={submit}
      />
      <ErrorText>{error}</ErrorText>
      {info ? <Body>{info}</Body> : null}
      <Button
        title={mode === "login" ? "Prijava" : "Napravi račun"}
        onPress={submit}
        loading={busy === mode}
        block
      />
      <Button
        title={mode === "login" ? "Nemaš račun? Registracija" : "Imaš račun? Prijava"}
        kind="text"
        onPress={() => setMode(mode === "login" ? "register" : "login")}
      />
      {mode === "login" ? (
        <Button
          title="Pošalji mi poveznicu za prijavu"
          kind="glass"
          onPress={magic}
          loading={busy === "magic"}
          block
        />
      ) : null}
      <View style={s.demo}>
        <Body muted>Samo gledaš? Otvori izmišljenu plažu s podacima cijele sezone.</Body>
        <Button
          title="Isprobaj bez registracije"
          kind="glass"
          onPress={demo}
          loading={busy === "demo"}
          block
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { alignItems: "flex-start", gap: space.s, marginTop: space.xl },
  logo: { width: 120, height: 60 },
  demo: { gap: space.s, marginTop: space.xl },
});
