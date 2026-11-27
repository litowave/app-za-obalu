import type { ItemTemplate, LabelStyle, PriceUnit } from "@obala/core";
import { supabase } from "./supabase";

export interface NewItemInput {
  businessId: string;
  name: string;
  templateKey: string;
  prefix: string;
  labelStyle: LabelStyle;
  count: number;
  priceCents: number | null;
  priceUnit: PriceUnit;
  durationMin: number | null;
  /** Vlastite oznake po poziciji (1 = prva), ako ih je korisnik promijenio prije spremanja. */
  customLabels?: Record<number, string>;
}

export function inputFromTemplate(businessId: string, t: ItemTemplate): NewItemInput {
  return {
    businessId,
    name: t.name,
    templateKey: t.key,
    prefix: t.prefix,
    labelStyle: t.labelStyle,
    count: t.count,
    priceCents: Math.round(t.priceEur * 100),
    priceUnit: t.priceUnit,
    durationMin: t.durationMin ?? null,
  };
}

/** Sprema novu vrstu predmeta, stvara numerirane jedinice i upisuje vlastite oznake. */
export async function createItemType(input: NewItemInput): Promise<string> {
  const { data, error } = await supabase
    .from("item_types")
    .insert({
      business_id: input.businessId,
      name: input.name.trim(),
      template_key: input.templateKey,
      label_prefix: input.prefix.trim(),
      label_style: input.labelStyle,
      price_cents: input.priceCents,
      price_unit: input.priceUnit,
      default_duration_min: input.durationMin,
    })
    .select("id")
    .single();
  if (error) throw error;
  if (input.count > 0) {
    const { error: e2 } = await supabase.rpc("add_units", {
      p_item_type_id: data.id,
      p_count: input.count,
    });
    if (e2) throw e2;
  }
  for (const [pos, label] of Object.entries(input.customLabels ?? {})) {
    const { error: e3 } = await supabase
      .from("units")
      .update({ label: label.trim() })
      .eq("item_type_id", data.id)
      .eq("position", Number(pos));
    if (e3) throw e3;
  }
  return data.id;
}
