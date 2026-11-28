import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database } from "./database.types";
export type ObalaClient = SupabaseClient<Database>;

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type Business = Tables["businesses"]["Row"];
export type ItemType = Tables["item_types"]["Row"];
export type Unit = Tables["units"]["Row"];
export type Booking = Tables["bookings"]["Row"];
export type BookingStatus = Enums["booking_status"];
export type BusinessCategory = Enums["business_category"];
export type NearbyBusiness =
  Database["public"]["Functions"]["nearby_businesses"]["Returns"][number];
export type DailyReportRow = Database["public"]["Views"]["report_daily"]["Row"];

export function createClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createSupabaseClient<Database>>[2],
): ObalaClient {
  return createSupabaseClient<Database>(url, anonKey, options);
}
