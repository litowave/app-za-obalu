// Ručno napisano prema supabase/migrations. Nakon promjene sheme pregazi s `pnpm db:types`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; locale: string; created_at: Timestamp; updated_at: Timestamp };
        Insert: { id: string; full_name?: string | null; locale?: string };
        Update: { full_name?: string | null; locale?: string };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          category: Database["public"]["Enums"]["business_category"];
          description: string | null;
          phone: string | null;
          website: string | null;
          address: string | null;
          place: string | null;
          location: unknown;
          is_published: boolean;
          reservations_enabled: boolean;
          reservation_hold_until: string | null;
          reservation_note: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          slug: string;
          category: Database["public"]["Enums"]["business_category"];
          description?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          place?: string | null;
          /** WKT, npr. "SRID=4326;POINT(15.92 43.58)" (lng lat) */
          location: string;
          is_published?: boolean;
          reservations_enabled?: boolean;
          reservation_hold_until?: string | null;
          reservation_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
        Relationships: [];
      };
      business_members: {
        Row: {
          business_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["member_role"];
          created_at: Timestamp;
        };
        Insert: { business_id: string; user_id: string; role?: Database["public"]["Enums"]["member_role"] };
        Update: { role?: Database["public"]["Enums"]["member_role"] };
        Relationships: [];
      };
      item_types: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          label_style: Database["public"]["Enums"]["label_style"];
          label_prefix: string;
          price_cents: number | null;
          price_unit: Database["public"]["Enums"]["price_unit"];
          reservable: boolean;
          sort_order: number;
          archived_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          label_style?: Database["public"]["Enums"]["label_style"];
          label_prefix?: string;
          price_cents?: number | null;
          price_unit?: Database["public"]["Enums"]["price_unit"];
          reservable?: boolean;
          sort_order?: number;
          archived_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["item_types"]["Insert"]>;
        Relationships: [];
      };
      units: {
        Row: {
          id: string;
          item_type_id: string;
          business_id: string;
          position: number;
          label: string;
          is_active: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: { id?: string; item_type_id: string; position: number; label: string; is_active?: boolean };
        Update: { label?: string; is_active?: boolean };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          business_id: string;
          unit_id: string;
          service_date: string;
          starts_at: Timestamp;
          ends_at: Timestamp;
          period: string;
          status: Database["public"]["Enums"]["booking_status"];
          source: Database["public"]["Enums"]["booking_source"];
          hold_until: Timestamp | null;
          price_cents: number | null;
          customer_name: string | null;
          customer_phone: string | null;
          note: string | null;
          created_by: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          unit_id: string;
          service_date: string;
          starts_at?: Timestamp | null;
          ends_at?: Timestamp | null;
          status?: Database["public"]["Enums"]["booking_status"];
          source?: Database["public"]["Enums"]["booking_source"];
          hold_until?: Timestamp | null;
          price_cents?: number | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      report_daily: {
        Row: {
          business_id: string;
          item_type_id: string;
          day: string;
          sold_count: number;
          app_reservations: number;
          expired_count: number;
          cancelled_count: number;
          revenue_cents: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_units: {
        Args: { p_item_type_id: string; p_count: number };
        Returns: Database["public"]["Tables"]["units"]["Row"][];
      };
      unit_label: {
        Args: { p_style: Database["public"]["Enums"]["label_style"]; p_position: number; p_prefix?: string };
        Returns: string;
      };
      nearby_businesses: {
        Args: { p_lat: number; p_lng: number; p_radius_m?: number };
        Returns: {
          id: string;
          name: string;
          slug: string;
          category: Database["public"]["Enums"]["business_category"];
          place: string | null;
          lat: number;
          lng: number;
          distance_m: number;
          reservations_enabled: boolean;
          units_total: number;
          units_occupied: number;
        }[];
      };
      request_reservation: {
        Args: { p_item_type_id: string; p_date: string; p_customer_name: string; p_customer_phone: string };
        Returns: { booking_id: string; unit_label: string; hold_until: Timestamp | null; note: string | null }[];
      };
    };
    Enums: {
      business_category: "beach" | "watersports" | "boat_rental" | "aquapark" | "other";
      member_role: "owner" | "staff";
      label_style: "number" | "letter";
      price_unit: "day" | "half_day" | "hour" | "session";
      booking_status: "reserved" | "sold" | "cancelled" | "expired";
      booking_source: "walk_in" | "tourist_app" | "phone";
    };
    CompositeTypes: Record<string, never>;
  };
};
