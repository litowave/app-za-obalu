import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { sessionFromUrl } from "./auth";
import { errorMessage, supabase } from "./supabase";

export type OAuthProvider = "google" | "apple";

// Na webu zatvara skočni prozor prijave kad se Supabase vrati na aplikaciju.
WebBrowser.maybeCompleteAuthSession();

/**
 * Prijava Googleom ili Appleom preko Supabase Autha. Vraća poruku greške ili null.
 * Odustajanje (korisnik zatvori prozor) nije greška.
 *
 * - iPhone + Apple: izvorni Apple prozor (Face ID), token ide izravno u Supabase.
 * - Ostalo na mobitelu: Googleova ili Appleova stranica u sigurnom pregledniku sustava,
 *   koja se vraća u aplikaciju na obala-partner://prijava.
 * - Web: obično preusmjeravanje.
 */
export async function signInWith(provider: OAuthProvider): Promise<string | null> {
  try {
    if (provider === "apple" && Platform.OS === "ios") return await appleNative();
    if (Platform.OS === "web") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      return error ? errorMessage(error) : null;
    }
    return await viaBrowser(provider);
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    return errorMessage(e);
  }
}

async function viaBrowser(provider: OAuthProvider): Promise<string | null> {
  const redirectTo = Linking.createURL("/prijava");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // Na zajedničkom tabletu na pultu svatko bira svoj Google račun.
      queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
    },
  });
  if (error || !data.url) return errorMessage(error);
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return null;
  const { error: sessionError } = await sessionFromUrl(result.url);
  return sessionError ? errorMessage({ message: sessionError }) : null;
}

async function appleNative(): Promise<string | null> {
  // Apple potpisuje sažetak, Supabase provjerava izvorni niz.
  const rawNonce = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!credential.identityToken) return "Apple nije vratio potvrdu prijave. Pokušaj ponovno.";

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) return errorMessage(error);

  // Apple ime šalje samo pri prvoj prijavi i nikad više, pa ga odmah spremamo.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(" ");
  if (fullName && data.user) {
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", data.user.id);
  }
  return null;
}

/** Izvorni Apple gumb postoji samo na iPhoneu i iPadu s iOS 13+. */
export async function hasNativeApple(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  return AppleAuthentication.isAvailableAsync();
}
