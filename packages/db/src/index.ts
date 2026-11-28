import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Session } from "@supabase/supabase-js";
export type { Database } from "./database.types";
export type ObalaClient = SupabaseClient<Database>;

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type Business = Tables["businesses"]["Row"];
export type ItemType = Tables["item_types"]["Row"];
export type Unit = Tables["units"]["Row"];
export type ItemTypeSlot = Tables["item_type_slots"]["Row"];
export type Booking = Tables["bookings"]["Row"];
export type BookingStatus = Enums["booking_status"];
export type BookingSource = Enums["booking_source"];
export type BusinessCategory = Enums["business_category"];
export type PaymentMethod = Enums["payment_method"];
export type AssignmentMode = Enums["assignment_mode"];
export type CrowdLevel = Enums["crowd_level"];
export type MemberRole = Enums["member_role"];
export type NearbyBusiness =
  Database["public"]["Functions"]["nearby_businesses"]["Returns"][number];
export type MapBusiness = Database["public"]["Functions"]["map_businesses"]["Returns"][number];
export type PriceUnit = Enums["price_unit"];

/** Odgovor funkcije business_public (stranica objekta za turiste). */
export interface PublicBusiness {
  id: string;
  slug: string;
  name: string;
  category: BusinessCategory;
  description: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  place: string | null;
  lat: number;
  lng: number;
  opening_hours: Record<string, [string, string][]> | null;
  season_start: string | null;
  season_end: string | null;
  listed: boolean;
  reservations_enabled: boolean;
  reservation_note: string | null;
  crowd: CrowdLevel;
  offers: PublicOffer[];
  photos: string[];
}

export interface PublicOffer {
  id: string;
  name: string;
  description: string | null;
  template_key: string | null;
  price_cents: number | null;
  price_unit: PriceUnit;
  duration_min: number | null;
  reservable: boolean;
  slots: {
    name: string;
    starts_at: string;
    ends_at: string | null;
    price_cents: number | null;
    reservable: boolean;
  }[];
}

export type DailyReportRow = Database["public"]["Views"]["report_daily"]["Row"];
export type SeasonReportRow = Database["public"]["Views"]["report_season"]["Row"];

export function createClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createSupabaseClient<Database>>[2],
): ObalaClient {
  return createSupabaseClient<Database>(url, anonKey, options);
}
