import { unitLabels } from "@obala/core";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

// Kostur "digitalne bilježnice": dodir na jedinicu označi je prodanom.
// Podaci su zasad lokalni; sljedeći korak je spajanje na Supabase i offline sinkronizacija.
const demoTypes = [
  { name: "Ležaljke", labels: unitLabels("number", 24, "L") },
  { name: "Suncobrani", labels: unitLabels("number", 12, "S") },
  { name: "Cabane", labels: ["VIP", ...unitLabels("letter", 5, "", 2)] },
];

export default function Today() {
  const dark = useColorScheme() === "dark";
  const [sold, setSold] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) =>
    setSold((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const total = useMemo(() => demoTypes.reduce((n, t) => n + t.labels.length, 0), []);

  return (
    <ScrollView
      style={{ backgroundColor: dark ? "#0b141a" : "#f6f8f9" }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.summary, dark && styles.textDark]}>
        Prodano {sold.size} od {total}
      </Text>
      {demoTypes.map((type) => (
        <View key={type.name} style={styles.section}>
          <Text style={[styles.heading, dark && styles.textDark]}>{type.name}</Text>
          <View style={styles.grid}>
            {type.labels.map((label) => {
              const key = `${type.name}:${label}`;
              const isSold = sold.has(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggle(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSold }}
                  accessibilityLabel={`${type.name} ${label}, ${isSold ? "prodano" : "slobodno"}`}
                  style={[styles.unit, isSold ? styles.unitSold : dark && styles.unitDark]}
                >
                  <Text style={[styles.unitText, (isSold || dark) && styles.textDark]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  summary: { fontSize: 15, color: "#5b6b76" },
  section: { gap: 10 },
  heading: { fontSize: 18, fontWeight: "600", color: "#0f1f2a" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  unit: {
    minWidth: 56,
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  unitDark: { backgroundColor: "#13212a" },
  unitSold: { backgroundColor: "#0a6c8f" },
  unitText: { fontSize: 15, fontWeight: "600", color: "#0f1f2a" },
  textDark: { color: "#e6eef2" },
});
