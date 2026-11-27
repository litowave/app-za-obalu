import { formatEur, PRICE_UNIT_LABEL } from "@obala/core";
import type { ItemType, Unit } from "@obala/db";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ItemForm } from "@/components/ItemForm";
import { ChevronIcon } from "@/components/icons";
import {
  Body,
  color,
  fonts,
  radius,
  Screen,
  SectionHeading,
  space,
  Title,
  Toast,
} from "@/components/ui";
import { useBusiness } from "@/lib/business";
import { createItemType } from "@/lib/items";
import { supabase } from "@/lib/supabase";

export default function Predmeti() {
  const { active, isOwner } = useBusiness();
  const router = useRouter();
  const [types, setTypes] = useState<ItemType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const businessId = active?.business.id;

  const load = useCallback(async () => {
    if (!businessId) return;
    const [t, u] = await Promise.all([
      supabase
        .from("item_types")
        .select("*")
        .eq("business_id", businessId)
        .is("archived_at", null)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("units")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("position"),
    ]);
    if (t.data) setTypes(t.data);
    if (u.data) setUnits(u.data);
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!businessId) return null;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Title>Predmeti</Title>
        <Body muted>Sve što iznajmljuješ, s oznakama kakve koristiš na plaži.</Body>
        {types.map((t) => {
          const list = units.filter((u) => u.item_type_id === t.id);
          const first = list[0]?.label;
          const last = list[list.length - 1]?.label;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => router.push(`/predmeti/${t.id}`)}
              style={s.row}
            >
              <View style={s.icon}>
                <Text style={s.iconText}>{(t.label_prefix || t.name).slice(0, 3)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{t.name}</Text>
                <Text style={s.meta}>
                  {list.length} kom{first ? ` · ${first} do ${last}` : ""}
                  {t.price_cents != null
                    ? ` · ${formatEur(t.price_cents)} / ${PRICE_UNIT_LABEL[t.price_unit]}`
                    : ""}
                </Text>
              </View>
              <ChevronIcon direction="right" color={color.textMuted} />
            </Pressable>
          );
        })}
        {isOwner ? (
          <>
            <SectionHeading>Dodaj novi predmet</SectionHeading>
            <ItemForm
              businessId={businessId}
              onSave={async (input) => {
                await createItemType(input);
                setToast("Dodano, vidi pod Danas");
                setTimeout(() => setToast(null), 2000);
                await load();
              }}
            />
          </>
        ) : (
          <Body muted>Predmete i cijene mijenja vlasnik objekta.</Body>
        )}
      </Screen>
      <Toast message={toast} />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
    padding: space.m,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: color.border,
    minHeight: 64,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: color.buttonTop,
    borderBottomWidth: 3,
    borderBottomColor: color.buttonEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontFamily: fonts.bodyStrong, fontSize: 13, color: color.buttonText },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16, color: color.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: color.textMuted, marginTop: 2 },
});
