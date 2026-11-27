import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { color, fonts, radius } from "./ui";

/** Oznaka jedinice; dodirom postaje polje za vlastiti naziv. Sprema se na Enter ili kad polje izgubi fokus. */
export function LabelChip({
  label,
  custom,
  disabled,
  onCommit,
}: {
  label: string;
  custom?: boolean;
  disabled?: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft !== null) {
    const commit = () => {
      onCommit(draft.trim());
      setDraft(null);
    };
    return (
      <TextInput
        autoFocus
        value={draft}
        onChangeText={setDraft}
        maxLength={20}
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={commit}
        onBlur={commit}
        accessibilityLabel={`Nova oznaka umjesto ${label}`}
        style={[s.chip, s.editing]}
      />
    );
  }
  return (
    <Pressable
      disabled={disabled}
      onPress={() => setDraft(label)}
      accessibilityRole="button"
      accessibilityLabel={`Oznaka ${label}, dodirni za vlastiti naziv`}
      style={[s.chip, custom && s.custom]}
    >
      <Text style={s.text}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    minWidth: 52,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: radius.s,
    backgroundColor: color.surfaceSea,
    alignItems: "center",
    justifyContent: "center",
  },
  custom: { backgroundColor: color.buttonTop, borderWidth: 1, borderColor: color.buttonEdge },
  editing: {
    borderWidth: 2,
    borderColor: color.focus,
    fontFamily: fonts.bodyStrong,
    fontSize: 14,
    color: color.text,
    width: 110,
    textAlign: "center",
  },
  text: { fontFamily: fonts.bodyStrong, fontSize: 14, color: color.buttonText },
});
