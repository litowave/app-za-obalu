import { Stack } from "expo-router";
import { color } from "@/components/ui";

export default function PredmetiLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}
    />
  );
}
