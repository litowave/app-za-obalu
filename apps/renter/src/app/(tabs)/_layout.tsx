import { Tabs } from "expo-router";
import { type ColorValue, StyleSheet, Text, View } from "react-native";
import { color, fonts } from "@/components/ui";
import { usePushNotifications } from "@/lib/push";
import { ReservationsProvider, useReservations } from "@/lib/reservations";

export default function TabsLayout() {
  return (
    <ReservationsProvider>
      <TabsInner />
    </ReservationsProvider>
  );
}

/** Naziv kartice s brojem novih stavki (ikone kartice su namjerno skrivene). */
function TabLabel({ title, tint, count }: { title: string; tint: ColorValue; count?: number }) {
  return (
    <View style={s.label}>
      <Text style={[s.text, { color: tint }]} numberOfLines={1}>
        {title}
      </Text>
      {count ? (
        <View style={s.badge} accessibilityLabel={`${count} novih`}>
          <Text style={s.badgeText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

function TabsInner() {
  const { newCount } = useReservations();
  usePushNotifications();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.buttonText,
        tabBarInactiveTintColor: color.textMuted,
        tabBarActiveBackgroundColor: color.surfaceSea,
        tabBarLabelStyle: { fontFamily: fonts.bodyStrong, fontSize: 13 },
        tabBarIconStyle: { display: "none" },
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.border, height: 64 },
        tabBarItemStyle: { borderRadius: 16, margin: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Danas" }} />
      <Tabs.Screen
        name="rezervacije"
        options={{
          title: newCount > 0 ? `Rezervacije, ${newCount} novih` : "Rezervacije",
          tabBarLabel: ({ color: tint }) => (
            <TabLabel title="Rezervacije" tint={tint} count={newCount} />
          ),
        }}
      />
      <Tabs.Screen name="predmeti" options={{ title: "Predmeti" }} />
      <Tabs.Screen name="postavke" options={{ title: "Postavke" }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  label: { flexDirection: "row", alignItems: "center", gap: 4 },
  text: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: color.buttonText,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: fonts.bodyStrong, fontSize: 11, color: color.surface },
});
