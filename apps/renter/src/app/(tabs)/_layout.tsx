import { Tabs } from "expo-router";
import { color, fonts } from "@/components/ui";

export default function TabsLayout() {
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
      <Tabs.Screen name="predmeti" options={{ title: "Predmeti" }} />
      <Tabs.Screen name="postavke" options={{ title: "Postavke" }} />
    </Tabs>
  );
}
