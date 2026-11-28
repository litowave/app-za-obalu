/**
 * Osnovni dijelovi sučelja prema odobrenom izgledu (@obala/theme):
 * bijela pozadina, jedna nježna morska boja, meki 3D gumbi visoki najmanje 48 px.
 */

import { button, card, color, depth, font, fontSize, radius, space, touch } from "@obala/theme";
import { type ReactNode, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSun } from "@/lib/sun";

export const fonts = {
  heading: "Poppins_600SemiBold",
  body: "Inter_400Regular",
  bodyStrong: "Inter_600SemiBold",
};

export function Screen({
  children,
  scroll = true,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const content = padded ? <View style={styles.screenPad}>{children}</View> : children;
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

type ButtonKind = "primary" | "glass" | "text";

/** 3D gumb: podignut, a kad se pritisne spusti se. "glass" je sporedna radnja, "text" tiha. */
export function Button({
  title,
  onPress,
  kind = "primary",
  disabled,
  loading,
  block,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  accessibilityHint?: string;
}) {
  const { sunMode } = useSun();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        kind === "primary" && button.primary,
        kind === "primary" && pressed && button.primaryPressed,
        kind === "glass" && [styles.glass, pressed && styles.glassPressed],
        kind === "text" && styles.textButton,
        sunMode && kind !== "text" && styles.sunBorder,
        block && styles.block,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color.buttonText} />
      ) : (
        <Text
          style={[
            kind === "primary" ? button.primaryText : styles.secondaryText,
            { fontFamily: fonts.bodyStrong },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { sunMode } = useSun();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipOn, sunMode && styles.sunBorder]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>
        {label}
        {count != null ? <Text style={styles.chipCount}> {count}</Text> : null}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  const { sunMode } = useSun();
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={color.textMuted}
        style={[styles.input, sunMode && styles.sunBorder]}
        accessibilityLabel={label}
        {...input}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 1000,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manje"
          onPress={() => onChange(Math.max(min, value - 1))}
          style={styles.stepBtn}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <TextInput
          value={String(value)}
          onChangeText={(t) => {
            const n = Number.parseInt(t.replace(/\D/g, ""), 10);
            onChange(Number.isNaN(n) ? min : Math.min(max, Math.max(min, n)));
          }}
          keyboardType="number-pad"
          accessibilityLabel={label}
          style={styles.stepValue}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Više"
          onPress={() => onChange(Math.min(max, value + 1))}
          style={styles.stepBtn}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[card, styles.cardShadow, style]}>{children}</View>;
}

/** Donji list (bottom sheet) s ručkom, kao u prototipu. */
export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Zatvori" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </Modal>
  );
}

/** Kratka obavijest na dnu, s neobaveznim gumbom (npr. "Poništi"). */
export function Toast({
  message,
  actionLabel,
  onAction,
}: {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [message, opacity]);
  if (!message) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite">
      <Text style={styles.toastText}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" style={styles.toastAction}>
          <Text style={styles.toastActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerText}>{children}</Text>
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert">
      {children}
    </Text>
  );
}

export function Row({ children, gap = space.s }: { children: ReactNode; gap?: number }) {
  return <View style={[styles.row, { gap }]}>{children}</View>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  scroll: { paddingBottom: 48 },
  screenPad: { paddingHorizontal: space.l, paddingTop: space.m, gap: space.l },
  title: { fontFamily: fonts.heading, fontSize: fontSize.title, color: color.text },
  subtitle: { fontFamily: fonts.heading, fontSize: fontSize.subtitle, color: color.text },
  body: { fontFamily: fonts.body, fontSize: fontSize.body, color: color.text, lineHeight: 21 },
  muted: { color: color.textMuted },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSize.label,
    color: color.textMuted,
    marginBottom: 6,
  },
  section: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSize.label,
    color: color.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: space.s,
  },
  glass: {
    minHeight: touch.button,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceSea,
    borderWidth: 1,
    borderColor: color.seaLight,
  },
  glassPressed: { backgroundColor: color.seaLight },
  textButton: {
    minHeight: touch.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryText: { color: color.link, fontSize: 16 },
  block: { alignSelf: "stretch" },
  disabled: { opacity: 0.5 },
  sunBorder: { borderWidth: 2, borderColor: "#1F5A55" },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: "center",
  },
  chipOn: {
    backgroundColor: color.buttonTop,
    borderColor: color.buttonEdge,
    borderBottomWidth: depth.raised - 1,
  },
  chipText: { fontFamily: fonts.bodyStrong, fontSize: 14, color: color.textMuted },
  chipTextOn: { color: color.buttonText },
  chipCount: { fontFamily: fonts.body, fontSize: 12 },
  field: { gap: 0 },
  input: {
    minHeight: touch.button,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: color.seaLight,
    backgroundColor: color.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: color.text,
  },
  hint: { fontFamily: fonts.body, fontSize: 13, color: color.textMuted, marginTop: 4 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSea,
    alignSelf: "flex-start",
  },
  stepBtn: {
    width: touch.button,
    height: touch.button,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { fontSize: 24, color: color.buttonText, fontFamily: fonts.bodyStrong },
  stepValue: {
    width: 64,
    textAlign: "center",
    fontFamily: fonts.heading,
    fontSize: 18,
    color: color.text,
  },
  cardShadow: {
    shadowColor: "#46827D",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 4, height: 8 },
    elevation: 2,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(31, 79, 75, 0.25)" },
  sheet: {
    maxHeight: "85%",
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    paddingHorizontal: space.l,
    paddingBottom: 32,
    paddingTop: space.s,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.seaLight,
    marginBottom: space.m,
  },
  toast: {
    position: "absolute",
    left: space.l,
    right: space.l,
    bottom: 20,
    borderRadius: radius.m,
    backgroundColor: color.text,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
  },
  toastText: { flex: 1, color: "#FFFFFF", fontFamily: fonts.body, fontSize: 15 },
  toastAction: { minHeight: 36, justifyContent: "center", paddingHorizontal: 8 },
  toastActionText: { color: color.seaLight, fontFamily: fonts.bodyStrong, fontSize: 15 },
  banner: {
    backgroundColor: color.surfaceSea,
    borderRadius: radius.s,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.seaLight,
  },
  bannerText: { fontFamily: fonts.bodyStrong, fontSize: 14, color: color.buttonText },
  error: { fontFamily: fonts.bodyStrong, fontSize: 14, color: color.text },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
});

export { color, font, radius, space };
