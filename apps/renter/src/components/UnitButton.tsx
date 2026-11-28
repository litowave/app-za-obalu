import { color, type UnitState, unitState, unitStyle, unitTextStyle } from "@obala/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSun } from "@/lib/sun";
import { CheckIcon, ClockIcon } from "./icons";
import { fonts } from "./ui";

const STATE_LABEL: Record<UnitState, string> = {
  free: "slobodno",
  reserved: "rezervirano",
  sold: "prodano",
};

/**
 * Mjesto u mreži. Samo dvije vrste gumba (odobreni izgled): slobodno i rezervirano su isti
 * podignut gumb, rezervirano ima mali sat; prodano je utisnuto i zasivljeno, s kvačicom.
 */
export function UnitButton({
  label,
  state,
  selected,
  pending,
  onPress,
  onLongPress,
}: {
  label: string;
  state: UnitState;
  selected?: boolean;
  pending?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { sunMode } = useSun();
  const text = unitTextStyle(state, { sunMode });
  const icon = unitState[state].icon;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${STATE_LABEL[state]}${pending ? ", čeka slanje" : ""}`}
      accessibilityState={{ selected: Boolean(selected) }}
      style={({ pressed }) => [
        unitStyle(state, { sunMode }),
        styles.unit,
        pressed && state !== "sold" && styles.pressed,
        selected && styles.selected,
      ]}
    >
      <View style={styles.inner}>
        {icon === "check" ? <CheckIcon size={14} color={text.color} /> : null}
        {icon === "clock" ? <ClockIcon size={14} color={text.color} /> : null}
        <Text style={[text, { fontFamily: fonts.bodyStrong }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {pending ? <View style={styles.pendingDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  unit: { paddingHorizontal: 8, flexGrow: 0 },
  inner: { flexDirection: "row", alignItems: "center", gap: 4 },
  pressed: { borderBottomWidth: 1, marginTop: 3 },
  selected: { borderWidth: 3, borderColor: color.link },
  pendingDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: color.focus,
  },
});
