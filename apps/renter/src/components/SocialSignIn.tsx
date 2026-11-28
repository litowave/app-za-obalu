import { radius, touch } from "@obala/theme";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { hasNativeApple, type OAuthProvider, signInWith } from "@/lib/oauth";
import { color, fonts, space } from "./ui";

/** Googleov "G" u izvornim bojama (Googleova pravila za gumb prijave). */
function GoogleG() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"
      />
      <Path
        fill="#FBBC05"
        d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"
      />
    </Svg>
  );
}

function AppleLogo() {
  return (
    <Svg width={18} height={20} viewBox="0 0 384 470" accessibilityElementsHidden>
      <Path
        fill="#FFFFFF"
        d="M318 250c-.6-56 45.7-83 47.8-84.3-26-38-66.5-43.2-81-43.8-34.5-3.5-67.3 20.3-84.8 20.3-17.5 0-44.5-19.8-73.2-19.3-37.6.6-72.3 21.9-91.7 55.6-39.1 67.8-10 168.2 28.1 223.2 18.6 26.9 40.8 57.1 69.9 56 28.1-1.1 38.7-18.2 72.6-18.2s43.5 18.2 73.2 17.6c30.2-.5 49.4-27.4 67.9-54.4 21.4-31.2 30.2-61.4 30.7-63-.7-.3-58.9-22.6-59.5-89.7zM262.2 85.4C277.7 66.6 288.2 40.6 285.3 14.6c-22.3.9-49.3 14.9-65.3 33.6-14.3 16.6-26.9 43.2-23.5 68.6 24.9 1.9 50.3-12.7 65.7-31.4z"
      />
    </Svg>
  );
}

/**
 * Prijava Appleom traži plaćeni Apple Developer račun. Aplikacija je zasad web aplikacija,
 * pa je gumb skriven dok se ne postavi EXPO_PUBLIC_APPLE_SIGNIN=1 (docs/prijava-google-apple.md).
 */
const APPLE_ENABLED = process.env.EXPO_PUBLIC_APPLE_SIGNIN === "1";

/**
 * Gumbi "Nastavi s Googleom" i "Nastavi s Appleom". Isti račun služi za prijavu i registraciju:
 * prvi put se račun napravi sam, a čarobnjak zatim vodi kroz upis objekta.
 */
export function SocialSignIn({ onError }: { onError: (message: string | null) => void }) {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [nativeApple, setNativeApple] = useState(false);

  useEffect(() => {
    if (APPLE_ENABLED) void hasNativeApple().then(setNativeApple);
  }, []);

  async function go(provider: OAuthProvider) {
    setBusy(provider);
    onError(null);
    const message = await signInWith(provider);
    setBusy(null);
    if (message) onError(message);
  }

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => void go("google")}
        disabled={busy !== null}
        accessibilityRole="button"
        accessibilityLabel="Nastavi s Googleom"
        style={({ pressed }) => [s.btn, s.google, pressed && s.pressed]}
      >
        {busy === "google" ? <ActivityIndicator color={color.text} /> : <GoogleG />}
        <Text style={[s.text, { color: "#1F1F1F" }]}>Nastavi s Googleom</Text>
      </Pressable>

      {!APPLE_ENABLED ? null : nativeApple ? (
        // Na iPhoneu Apple traži svoj izvorni gumb.
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.pill}
          style={s.appleNative}
          onPress={() => void go("apple")}
        />
      ) : (
        <Pressable
          onPress={() => void go("apple")}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Nastavi s Appleom"
          style={({ pressed }) => [s.btn, s.apple, pressed && s.pressed]}
        >
          {busy === "apple" ? <ActivityIndicator color="#FFFFFF" /> : <AppleLogo />}
          <Text style={[s.text, { color: "#FFFFFF" }]}>Nastavi s Appleom</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.s },
  btn: {
    minHeight: touch.button,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  google: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DADCE0" },
  apple: { backgroundColor: "#000000" },
  appleNative: { height: touch.button, width: "100%" },
  pressed: { opacity: 0.85 },
  text: { fontFamily: fonts.bodyStrong, fontSize: 16 },
});
