import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { color } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/auth";
import { BusinessProvider, useBusiness } from "@/lib/business";
import { SunProvider } from "@/lib/sun";

/** Bez prijave → prijava; prijavljen bez objekta → čarobnjak; inače bilježnica. */
function Gate() {
  const { session, loading: authLoading } = useAuth();
  const { memberships, loading } = useBusiness();
  const segments = useSegments();
  const router = useRouter();
  const first = segments[0] as string | undefined;

  useEffect(() => {
    if (authLoading || (session && loading)) return;
    if (!session) {
      if (first !== "prijava") router.replace("/prijava");
    } else if (memberships.length === 0) {
      if (first !== "carobnjak") router.replace("/carobnjak");
    } else if (first === "prijava" || first === "carobnjak") {
      router.replace("/");
    }
  }, [authLoading, loading, session, memberships.length, first, router]);

  // Navigacija mora ostati montirana i dok se učitava, inače se aplikacija ispočetka montira.
  const busy = authLoading || (session && loading);
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="prijava" />
        <Stack.Screen name="carobnjak" />
        <Stack.Screen name="radni-dan" />
      </Stack>
      {busy ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center", backgroundColor: color.background },
          ]}
        >
          <ActivityIndicator color={color.buttonText} />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold, Inter_400Regular, Inter_600SemiBold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <BusinessProvider>
          <SunProvider>
            <Gate />
          </SunProvider>
        </BusinessProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
