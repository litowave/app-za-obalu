// Generirano naredbom `pnpm db:types` (supabase gen types). Ne mijenjati ručno.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      blocked_phones: {
        Row: {
          business_id: string;
          created_at: string;
          note: string | null;
          phone: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          note?: string | null;
          phone: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          note?: string | null;
          phone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocked_phones_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          business_id: string;
          cancelled_by: Database["public"]["Enums"]["cancelled_by"] | null;
          checked_in_at: string | null;
          created_at: string;
          created_by: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          ends_at: string | null;
          group_id: string;
          hold_until: string | null;
          id: string;
          note: string | null;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          period: unknown;
          price_cents: number | null;
          public_token: string | null;
          released_at: string | null;
          seen_at: string | null;
          service_date: string;
          slot_id: string | null;
          source: Database["public"]["Enums"]["booking_source"];
          starts_at: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          unit_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          cancelled_by?: Database["public"]["Enums"]["cancelled_by"] | null;
          checked_in_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          ends_at?: string | null;
          group_id?: string;
          hold_until?: string | null;
          id?: string;
          note?: string | null;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          period?: never;
          price_cents?: number | null;
          public_token?: string | null;
          released_at?: string | null;
          seen_at?: string | null;
          service_date: string;
          slot_id?: string | null;
          source?: Database["public"]["Enums"]["booking_source"];
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          unit_id: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          cancelled_by?: Database["public"]["Enums"]["cancelled_by"] | null;
          checked_in_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          ends_at?: string | null;
          group_id?: string;
          hold_until?: string | null;
          id?: string;
          note?: string | null;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          period?: never;
          price_cents?: number | null;
          public_token?: string | null;
          released_at?: string | null;
          seen_at?: string | null;
          service_date?: string;
          slot_id?: string | null;
          source?: Database["public"]["Enums"]["booking_source"];
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          unit_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_slot_id_fkey";
            columns: ["slot_id"];
            isOneToOne: false;
            referencedRelation: "item_type_slots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      business_invites: {
        Row: {
          accepted_at: string | null;
          business_id: string;
          created_at: string;
          email: string;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["member_role"];
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          business_id: string;
          created_at?: string;
          email: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
        };
        Update: {
          accepted_at?: string | null;
          business_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
        };
        Relationships: [
          {
            foreignKeyName: "business_invites_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          business_id: string;
          created_at: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_photos: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          sort_order: number;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_photos_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          address: string | null;
          approved_at: string | null;
          approved_by: string | null;
          booking_closes_at: string | null;
          booking_opens_at: string;
          booking_opens_days_before: number;
          category: Database["public"]["Enums"]["business_category"];
          created_at: string;
          description: string | null;
          id: string;
          is_demo: boolean;
          is_published: boolean;
          location: unknown;
          name: string;
          opening_hours: Json | null;
          owner_id: string;
          phone: string | null;
          place: string | null;
          reservation_hold_until: string | null;
          reservation_note: string | null;
          reservations_enabled: boolean;
          season_end: string | null;
          season_start: string | null;
          slug: string;
          subscription_until: string | null;
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          booking_closes_at?: string | null;
          booking_opens_at?: string;
          booking_opens_days_before?: number;
          category: Database["public"]["Enums"]["business_category"];
          created_at?: string;
          description?: string | null;
          id?: string;
          is_demo?: boolean;
          is_published?: boolean;
          location: unknown;
          name: string;
          opening_hours?: Json | null;
          owner_id?: string;
          phone?: string | null;
          place?: string | null;
          reservation_hold_until?: string | null;
          reservation_note?: string | null;
          reservations_enabled?: boolean;
          season_end?: string | null;
          season_start?: string | null;
          slug: string;
          subscription_until?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          booking_closes_at?: string | null;
          booking_opens_at?: string;
          booking_opens_days_before?: number;
          category?: Database["public"]["Enums"]["business_category"];
          created_at?: string;
          description?: string | null;
          id?: string;
          is_demo?: boolean;
          is_published?: boolean;
          location?: unknown;
          name?: string;
          opening_hours?: Json | null;
          owner_id?: string;
          phone?: string | null;
          place?: string | null;
          reservation_hold_until?: string | null;
          reservation_note?: string | null;
          reservations_enabled?: boolean;
          season_end?: string | null;
          season_start?: string | null;
          slug?: string;
          subscription_until?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      item_type_slots: {
        Row: {
          archived_at: string | null;
          business_id: string;
          created_at: string;
          ends_at: string | null;
          ends_at_sunset: boolean | null;
          id: string;
          item_type_id: string;
          name: string;
          price_cents: number | null;
          reservable: boolean;
          sort_order: number;
          starts_at: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          business_id: string;
          created_at?: string;
          ends_at?: string | null;
          ends_at_sunset?: never;
          id?: string;
          item_type_id: string;
          name: string;
          price_cents?: number | null;
          reservable?: boolean;
          sort_order?: number;
          starts_at: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          business_id?: string;
          created_at?: string;
          ends_at?: string | null;
          ends_at_sunset?: never;
          id?: string;
          item_type_id?: string;
          name?: string;
          price_cents?: number | null;
          reservable?: boolean;
          sort_order?: number;
          starts_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_type_slots_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_type_slots_item_type_id_fkey";
            columns: ["item_type_id"];
            isOneToOne: false;
            referencedRelation: "item_types";
            referencedColumns: ["id"];
          },
        ];
      };
      item_types: {
        Row: {
          archived_at: string | null;
          assignment_mode: Database["public"]["Enums"]["assignment_mode"];
          booking_closes_at: string | null;
          booking_opens_at: string | null;
          booking_opens_days_before: number | null;
          business_id: string;
          created_at: string;
          default_duration_min: number | null;
          description: string | null;
          id: string;
          label_prefix: string;
          label_style: Database["public"]["Enums"]["label_style"];
          name: string;
          price_cents: number | null;
          price_unit: Database["public"]["Enums"]["price_unit"];
          reservable: boolean;
          reservation_hold_until: string | null;
          sort_order: number;
          template_key: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          assignment_mode?: Database["public"]["Enums"]["assignment_mode"];
          booking_closes_at?: string | null;
          booking_opens_at?: string | null;
          booking_opens_days_before?: number | null;
          business_id: string;
          created_at?: string;
          default_duration_min?: number | null;
          description?: string | null;
          id?: string;
          label_prefix?: string;
          label_style?: Database["public"]["Enums"]["label_style"];
          name: string;
          price_cents?: number | null;
          price_unit?: Database["public"]["Enums"]["price_unit"];
          reservable?: boolean;
          reservation_hold_until?: string | null;
          sort_order?: number;
          template_key?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          assignment_mode?: Database["public"]["Enums"]["assignment_mode"];
          booking_closes_at?: string | null;
          booking_opens_at?: string | null;
          booking_opens_days_before?: number | null;
          business_id?: string;
          created_at?: string;
          default_duration_min?: number | null;
          description?: string | null;
          id?: string;
          label_prefix?: string;
          label_style?: Database["public"]["Enums"]["label_style"];
          name?: string;
          price_cents?: number | null;
          price_unit?: Database["public"]["Enums"]["price_unit"];
          reservable?: boolean;
          reservation_hold_until?: string | null;
          sort_order?: number;
          template_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_types_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      popular_times: {
        Row: {
          avg_occupancy: number;
          business_id: string;
          dow: number;
          hour: number;
          refreshed_at: string;
          sample_days: number;
          weeks_with_data: number;
        };
        ComputedFields: never;
        Insert: {
          avg_occupancy: number;
          business_id: string;
          dow: number;
          hour: number;
          refreshed_at?: string;
          sample_days: number;
          weeks_with_data: number;
        };
        Update: {
          avg_occupancy?: number;
          business_id?: string;
          dow?: number;
          hour?: number;
          refreshed_at?: string;
          sample_days?: number;
          weeks_with_data?: number;
        };
        Relationships: [
          {
            foreignKeyName: "popular_times_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          locale: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_messages: {
        Row: {
          body: string;
          business_id: string;
          created_at: string;
          data: NonNullable<Json>;
          failed_count: number | null;
          group_id: string;
          id: number;
          request_id: number | null;
          sent_at: string | null;
          sent_count: number | null;
          title: string;
          tokens: string[];
        };
        ComputedFields: never;
        Insert: {
          body: string;
          business_id: string;
          created_at?: string;
          data?: NonNullable<Json>;
          failed_count?: number | null;
          group_id: string;
          id?: never;
          request_id?: number | null;
          sent_at?: string | null;
          sent_count?: number | null;
          title: string;
          tokens: string[];
        };
        Update: {
          body?: string;
          business_id?: string;
          created_at?: string;
          data?: NonNullable<Json>;
          failed_count?: number | null;
          group_id?: string;
          id?: never;
          request_id?: number | null;
          sent_at?: string | null;
          sent_count?: number | null;
          title?: string;
          tokens?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "push_messages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          auth: string | null;
          business_id: string;
          created_at: string;
          last_seen_at: string;
          p256dh: string | null;
          platform: string;
          token: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth?: string | null;
          business_id: string;
          created_at?: string;
          last_seen_at?: string;
          p256dh?: string | null;
          platform?: string;
          token: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Update: {
          auth?: string | null;
          business_id?: string;
          created_at?: string;
          last_seen_at?: string;
          p256dh?: string | null;
          platform?: string;
          token?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      qr_codes: {
        Row: {
          code: string;
          contact: string | null;
          created_at: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["qr_kind"];
          location: unknown;
          name: string;
          place: string | null;
          print_batch: string | null;
          redirect_to: string | null;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          contact?: string | null;
          created_at?: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["qr_kind"];
          location?: unknown;
          name: string;
          place?: string | null;
          print_batch?: string | null;
          redirect_to?: string | null;
        };
        Update: {
          code?: string;
          contact?: string | null;
          created_at?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["qr_kind"];
          location?: unknown;
          name?: string;
          place?: string | null;
          print_batch?: string | null;
          redirect_to?: string | null;
        };
        Relationships: [];
      };
      qr_scans: {
        Row: {
          code: string;
          id: number;
          scanned_on: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          id?: never;
          scanned_on?: string;
        };
        Update: {
          code?: string;
          id?: never;
          scanned_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qr_scans_code_fkey";
            columns: ["code"];
            isOneToOne: false;
            referencedRelation: "qr_codes";
            referencedColumns: ["code"];
          },
        ];
      };
      units: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          item_type_id: string;
          label: string;
          position: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          item_type_id: string;
          label: string;
          position: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          item_type_id?: string;
          label?: string;
          position?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "units_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "units_item_type_id_fkey";
            columns: ["item_type_id"];
            isOneToOne: false;
            referencedRelation: "item_types";
            referencedColumns: ["id"];
          },
        ];
      };
      workdays: {
        Row: {
          business_id: string;
          closed_at: string | null;
          closed_by: string | null;
          counted_cash_cents: number | null;
          expected_card_cents: number | null;
          expected_cash_cents: number | null;
          note: string | null;
          opened_at: string;
          opened_by: string | null;
          work_date: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          closed_at?: string | null;
          closed_by?: string | null;
          counted_cash_cents?: number | null;
          expected_card_cents?: number | null;
          expected_cash_cents?: number | null;
          note?: string | null;
          opened_at?: string;
          opened_by?: string | null;
          work_date: string;
        };
        Update: {
          business_id?: string;
          closed_at?: string | null;
          closed_by?: string | null;
          counted_cash_cents?: number | null;
          expected_card_cents?: number | null;
          expected_cash_cents?: number | null;
          note?: string | null;
          opened_at?: string;
          opened_by?: string | null;
          work_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workdays_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      booking_amounts: {
        Row: {
          business_id: string;
          group_id: string;
          id: string;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          price_cents: number | null;
          service_date: string;
          status: Database["public"]["Enums"]["booking_status"];
        };
        ComputedFields: never;
        Insert: {
          business_id?: string | null;
          group_id?: string | null;
          id?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          price_cents?: number | null;
          service_date?: string | null;
          status?: Database["public"]["Enums"]["booking_status"] | null;
        };
        Update: {
          business_id?: string | null;
          group_id?: string | null;
          id?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          price_cents?: number | null;
          service_date?: string | null;
          status?: Database["public"]["Enums"]["booking_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      report_daily: {
        Row: {
          app_reservations: number | null;
          business_id: string;
          cancelled_count: number | null;
          card_cents: number | null;
          cash_cents: number | null;
          day: string;
          expired_count: number | null;
          item_type_id: string;
          phone_reservations: number | null;
          revenue_cents: number | null;
          sold_count: number | null;
          walk_in_sales: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "units_item_type_id_fkey";
            columns: ["item_type_id"];
            isOneToOne: false;
            referencedRelation: "item_types";
            referencedColumns: ["id"];
          },
        ];
      };
      report_season: {
        Row: {
          app_reservations: number | null;
          business_id: string;
          card_cents: number | null;
          cash_cents: number | null;
          first_day: string | null;
          last_day: string | null;
          no_shows: number | null;
          reservations_total: number | null;
          revenue_cents: number | null;
          season: number | null;
          sold_count: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      accept_invites: { Args: Record<PropertyKey, never>; Returns: number };
      add_units: {
        Args: { p_count: number; p_item_type_id: string };
        Returns: {
          business_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          item_type_id: string;
          label: string;
          position: number;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "units";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      approve_business: {
        Args: { p_business_id: string; p_subscription_until?: string };
        Returns: undefined;
      };
      available_units: {
        Args: { p_date: string; p_item_type_id: string; p_slot_id?: string };
        Returns: {
          is_free: boolean;
          label: string;
          unit_id: string;
          unit_position: number;
        }[];
      };
      block_booking_phone: { Args: { p_booking_id: string; p_note?: string }; Returns: string };
      booking_window: {
        Args: { p_date: string; p_item_type_id: string };
        Returns: {
          closes_at: string;
          opens_at: string;
        }[];
      };
      business_crowd_level: {
        Args: { p_business_id: string };
        Returns: Database["public"]["Enums"]["crowd_level"];
      };
      business_is_listed: {
        Args: {
          p_approved_at: string;
          p_is_demo: boolean;
          p_is_published: boolean;
          p_subscription_until: string;
        };
        Returns: boolean;
      };
      business_popular_times: {
        Args: { p_business_id: string; p_dow?: number };
        Returns: {
          hour: number;
          level: Database["public"]["Enums"]["crowd_level"];
        }[];
      };
      can_see_workday: { Args: { p_business_id: string; p_date: string }; Returns: boolean };
      cancel_booking: { Args: { p_booking_id: string }; Returns: undefined };
      cancel_reservation: { Args: { p_token: string }; Returns: number };
      catalog_price: { Args: { p_slot_id: string; p_unit_id: string }; Returns: number };
      check_in: {
        Args: {
          p_booking_id: string;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
        };
        Returns: undefined;
      };
      close_workday: {
        Args: { p_business_id: string; p_counted_cash_cents: number; p_note?: string };
        Returns: {
          business_id: string;
          closed_at: string | null;
          closed_by: string | null;
          counted_cash_cents: number | null;
          expected_card_cents: number | null;
          expected_cash_cents: number | null;
          note: string | null;
          opened_at: string;
          opened_by: string | null;
          work_date: string;
        };
        SetofOptions: {
          from: "*";
          to: "workdays";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_demo_business: { Args: Record<PropertyKey, never>; Returns: string };
      crowd_level_for: {
        Args: { p_occupied: number; p_total: number };
        Returns: Database["public"]["Enums"]["crowd_level"];
      };
      day_label: { Args: { p_date: string }; Returns: string };
      effective_booking_rules: {
        Args: { p_item_type_id: string };
        Returns: {
          closes_at: string;
          hold_until: string;
          opens_at: string;
          opens_days_before: number;
        }[];
      };
      is_active_booking: {
        Args: {
          at_time?: string;
          b: Omit<
            Database["public"]["Tables"]["bookings"]["Row"],
            Database["public"]["Tables"]["bookings"]["ComputedFields"]
          >;
        };
        Returns: boolean;
      };
      is_business_listed: { Args: { p_business_id: string }; Returns: boolean };
      is_business_member: { Args: { p_business_id: string }; Returns: boolean };
      is_business_owner: { Args: { p_business_id: string }; Returns: boolean };
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      local_midnight: { Args: { d: string }; Returns: string };
      mark_reservations_seen: { Args: { p_business_id: string }; Returns: number };
      move_booking: { Args: { p_booking_id: string; p_unit_id: string }; Returns: undefined };
      nearby_businesses: {
        Args: { p_lat: number; p_lng: number; p_radius_m?: number };
        Returns: {
          category: Database["public"]["Enums"]["business_category"];
          crowd: Database["public"]["Enums"]["crowd_level"];
          distance_m: number;
          id: string;
          lat: number;
          lng: number;
          name: string;
          place: string;
          reservations_enabled: boolean;
          slug: string;
        }[];
      };
      normalize_phone: { Args: { p_phone: string }; Returns: string };
      occupancy_by_hour: {
        Args: { p_business_id: string; p_from: string; p_to: string };
        Returns: {
          day: string;
          hour: number;
          occupied: number;
          total: number;
        }[];
      };
      open_workday: {
        Args: { p_business_id: string };
        Returns: {
          business_id: string;
          closed_at: string | null;
          closed_by: string | null;
          counted_cash_cents: number | null;
          expected_card_cents: number | null;
          expected_cash_cents: number | null;
          note: string | null;
          opened_at: string;
          opened_by: string | null;
          work_date: string;
        };
        SetofOptions: {
          from: "*";
          to: "workdays";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      purge_guest_data: { Args: Record<PropertyKey, never>; Returns: number };
      queue_reservation_push: { Args: { p_group_id: string }; Returns: number };
      record_reservation: {
        Args: {
          p_customer_name: string;
          p_customer_phone?: string;
          p_date: string;
          p_hold_until?: string;
          p_note?: string;
          p_slot_id?: string;
          p_source?: Database["public"]["Enums"]["booking_source"];
          p_unit_ids: string[];
        };
        Returns: {
          booking_id: string;
          group_id: string;
          hold_until: string;
          unit_id: string;
        }[];
      };
      record_sale: {
        Args: {
          p_date?: string;
          p_days?: number;
          p_duration_min?: number;
          p_note?: string;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
          p_price_cents?: number;
          p_slot_id?: string;
          p_unit_ids: string[];
        };
        Returns: {
          booking_id: string;
          group_id: string;
          service_date: string;
          unit_id: string;
        }[];
      };
      refresh_popular_times: { Args: Record<PropertyKey, never>; Returns: number };
      register_web_push: {
        Args: {
          p_auth: string;
          p_business_id: string;
          p_endpoint: string;
          p_p256dh: string;
          p_user_agent?: string;
        };
        Returns: boolean;
      };
      release_booking: { Args: { p_booking_id: string }; Returns: undefined };
      release_expired_reservations: { Args: Record<PropertyKey, never>; Returns: number };
      request_reservation: {
        Args: {
          p_accepted_terms: boolean;
          p_customer_name: string;
          p_customer_phone: string;
          p_date: string;
          p_item_type_id: string;
          p_quantity?: number;
          p_slot_id?: string;
          p_unit_ids?: string[];
        };
        Returns: {
          group_id: string;
          hold_until: string;
          note: string;
          public_token: string;
          unit_labels: string[];
        }[];
      };
      reservation_availability: {
        Args: { p_date: string; p_item_type_id: string };
        Returns: {
          closes_at: string;
          hold_until: string;
          opens_at: string;
          state: string;
        }[];
      };
      reservation_by_token: {
        Args: { p_token: string };
        Returns: {
          business_address: string;
          business_name: string;
          business_phone: string;
          business_place: string;
          can_cancel: boolean;
          hold_until: string;
          item_type_name: string;
          lat: number;
          lng: number;
          service_date: string;
          slot_name: string;
          status: Database["public"]["Enums"]["booking_status"];
          unit_labels: string[];
        }[];
      };
      resolve_qr: {
        Args: { p_code: string };
        Returns: {
          kind: Database["public"]["Enums"]["qr_kind"];
          lat: number;
          lng: number;
          name: string;
          place: string;
          redirect_to: string;
        }[];
      };
      set_booking_price: {
        Args: { p_booking_id: string; p_price_cents: number };
        Returns: undefined;
      };
      set_subscription: { Args: { p_business_id: string; p_until: string }; Returns: undefined };
      set_unit_count: { Args: { p_count: number; p_item_type_id: string }; Returns: number };
      slot_range: { Args: { p_date: string; p_slot_id: string }; Returns: unknown };
      slugify: { Args: { p_text: string }; Returns: string };
      sunset_at: { Args: { p_date: string; p_lat: number; p_lng: number }; Returns: string };
      unit_label: {
        Args: {
          p_position: number;
          p_prefix?: string;
          p_style: Database["public"]["Enums"]["label_style"];
        };
        Returns: string;
      };
      unregister_web_push: { Args: { p_endpoint: string }; Returns: boolean };
      validate_booking_rules: { Args: { p_item_type_id: string }; Returns: undefined };
      vault_secret: { Args: { p_name: string }; Returns: string };
      workday_totals: {
        Args: { p_business_id: string; p_date?: string };
        Returns: {
          amount_cents: number;
          item_type_id: string;
          item_type_name: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          sales: number;
        }[];
      };
    };
    Enums: {
      assignment_mode: "guest_choice" | "auto";
      booking_source: "walk_in" | "tourist_app" | "phone";
      booking_status: "reserved" | "sold" | "cancelled" | "expired";
      business_category:
        | "beach"
        | "watersports"
        | "aquapark"
        | "massage"
        | "diving"
        | "self_service"
        | "other";
      cancelled_by: "guest" | "business";
      crowd_level: "no_data" | "empty" | "few" | "moderate" | "busy" | "full";
      label_style: "number" | "letter";
      member_role: "owner" | "staff";
      payment_method: "cash" | "card";
      price_unit: "day" | "half_day" | "hour" | "session";
      qr_kind: "accommodation" | "public_place";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      assignment_mode: ["guest_choice", "auto"],
      booking_source: ["walk_in", "tourist_app", "phone"],
      booking_status: ["reserved", "sold", "cancelled", "expired"],
      business_category: [
        "beach",
        "watersports",
        "aquapark",
        "massage",
        "diving",
        "self_service",
        "other",
      ],
      cancelled_by: ["guest", "business"],
      crowd_level: ["no_data", "empty", "few", "moderate", "busy", "full"],
      label_style: ["number", "letter"],
      member_role: ["owner", "staff"],
      payment_method: ["cash", "card"],
      price_unit: ["day", "half_day", "hour", "session"],
      qr_kind: ["accommodation", "public_place"],
    },
  },
} as const;
