import { type ItemTemplate, templateGroups } from "@obala/core";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronIcon } from "./icons";
import { color, fonts, Label, radius, Sheet } from "./ui";

/**
 * Padajući izbornik predmeta po skupinama (Plaža, Vodeni sportovi, Zabava, Usluge),
 * s opcijom "Vlastiti naziv…" na dnu, kao u odobrenom prototipu.
 */
export function TemplatePicker({
  value,
  onSelect,
  onCustom,
}: {
  /** Naziv odabranog predloška, "custom" ili null. */
  value: string | null;
  onSelect: (t: ItemTemplate) => void;
  onCustom: () => void;
}) {
  const [open, setOpen] = useState(false);
  const shown = value === "custom" ? "Vlastiti naziv…" : (value ?? "Odaberi predmet");
  return (
    <View>
      <Label>Predmet</Label>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Predmet: ${shown}`}
        style={styles.select}
      >
        <Text style={[styles.selectText, !value && styles.placeholder]}>{shown}</Text>
        <ChevronIcon color={color.buttonText} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        {templateGroups().map((g) => (
          <View key={g.group} style={styles.group}>
            <Text style={styles.groupTitle}>{g.group}</Text>
            {g.items.map((t) => (
              <Pressable
                key={t.key}
                accessibilityRole="button"
                onPress={() => {
                  onSelect(t);
                  setOpen(false);
                }}
                style={[styles.option, value === t.name && styles.optionOn]}
              >
                <Text style={styles.optionText}>{t.name}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onCustom();
            setOpen(false);
          }}
          style={[styles.option, styles.custom, value === "custom" && styles.optionOn]}
        >
          <Text style={[styles.optionText, styles.customText]}>Vlastiti naziv…</Text>
        </Pressable>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  select: {
    minHeight: 48,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: color.seaLight,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { fontFamily: fonts.body, fontSize: 16, color: color.text },
  placeholder: { color: color.textMuted },
  group: { marginBottom: 8 },
  groupTitle: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12.5,
    color: color.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
  },
  option: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: radius.s,
  },
  optionOn: { backgroundColor: color.surfaceSea },
  optionText: { fontFamily: fonts.body, fontSize: 16, color: color.text },
  custom: { borderTopWidth: 1, borderTopColor: color.border, marginTop: 4 },
  customText: { fontFamily: fonts.bodyStrong, color: color.link },
});
