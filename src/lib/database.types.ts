import type { ParcelStatus } from "./types";

export type Database = {
  public: {
    Tables: {
      shipments: {
        Row: {
          id: string;
          tracking_number: string;
          external_order_id: string | null;
          order_source: string | null;
          sender_name: string;
          sender_address: string;
          sender_city: string;
          sender_place_id: string | null;
          receiver_name: string;
          receiver_email: string | null;
          receiver_address: string;
          receiver_city: string;
          receiver_postcode: string;
          receiver_place_id: string | null;
          package_type: string;
          package_image_url: string | null;
          weight: string;
          delivery_service: string;
          current_status: ParcelStatus;
          estimated_delivery_date: string;
          notes: string | null;
          pickup_lat: number | null;
          pickup_lng: number | null;
          delivery_lat: number | null;
          delivery_lng: number | null;
          current_lat: number | null;
          current_lng: number | null;
          transit_started_at: string | null;
          route_geometry: [number, number][] | null;
          route_distance_km: number | null;
          route_duration_minutes: number | null;
          live_tracking_enabled: boolean | null;
          customs_charge_amount: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tracking_number: string;
          external_order_id?: string | null;
          order_source?: string | null;
          sender_name: string;
          sender_address: string;
          sender_city: string;
          sender_place_id?: string | null;
          receiver_name: string;
          receiver_email?: string | null;
          receiver_address: string;
          receiver_city: string;
          receiver_postcode: string;
          receiver_place_id?: string | null;
          package_type: string;
          package_image_url?: string | null;
          weight: string;
          delivery_service: string;
          current_status: ParcelStatus;
          estimated_delivery_date: string;
          notes?: string | null;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          current_lat?: number | null;
          current_lng?: number | null;
          transit_started_at?: string | null;
          route_geometry?: [number, number][] | null;
          route_distance_km?: number | null;
          route_duration_minutes?: number | null;
          live_tracking_enabled?: boolean | null;
          customs_charge_amount?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "tracking_events_shipment_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "tracking_events";
            referencedColumns: ["shipment_id"];
          },
        ];
      };
      tracking_events: {
        Row: {
          id: string;
          shipment_id: string;
          event_time: string;
          location: string;
          status: ParcelStatus;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shipment_id: string;
          event_time: string;
          location: string;
          status: ParcelStatus;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tracking_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "tracking_events_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_users: {
        Row: {
          user_id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
        Relationships: [];
      };
      shipment_email_logs: {
        Row: {
          id: string;
          shipment_id: string;
          receiver_email: string;
          status: string;
          subject: string;
          sent_successfully: boolean;
          error_message: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          shipment_id: string;
          receiver_email: string;
          status: string;
          subject: string;
          sent_successfully?: boolean;
          error_message?: string | null;
          sent_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipment_email_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "shipment_email_logs_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      telegram_admin_chats: {
        Row: {
          chat_id: string;
          admin_user_id: string;
          admin_email: string;
          authorized_at: string;
          last_seen_at: string;
        };
        Insert: {
          chat_id: string;
          admin_user_id: string;
          admin_email: string;
          authorized_at?: string;
          last_seen_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["telegram_admin_chats"]["Insert"]>;
        Relationships: [];
      };
      shipment_email_automation: {
        Row: {
          shipment_id: string;
          enabled: boolean;
          packaging_fee_paid: boolean;
          vat_fee_paid: boolean;
          seller_legal_name: string | null;
          vat_registration_number: string | null;
          vat_invoice_number: string | null;
          payment_deadline: string | null;
          payment_instructions: string | null;
          delivery_time_window: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          shipment_id: string;
          enabled?: boolean;
          packaging_fee_paid?: boolean;
          vat_fee_paid?: boolean;
          seller_legal_name?: string | null;
          vat_registration_number?: string | null;
          vat_invoice_number?: string | null;
          payment_deadline?: string | null;
          payment_instructions?: string | null;
          delivery_time_window?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipment_email_automation"]["Insert"]>;
        Relationships: [];
      };
      shipment_automation_email_logs: {
        Row: {
          id: string;
          shipment_id: string;
          step_key: string;
          scheduled_for: string;
          state: "pending" | "deferred" | "blocked" | "sent" | "failed" | "skipped";
          reason: string | null;
          subject: string | null;
          email_id: string | null;
          last_checked_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          shipment_id: string;
          step_key: string;
          scheduled_for: string;
          state: "pending" | "deferred" | "blocked" | "sent" | "failed" | "skipped";
          reason?: string | null;
          subject?: string | null;
          email_id?: string | null;
          last_checked_at?: string;
          sent_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["shipment_automation_email_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_public_tracking: {
        Args: { p_tracking_number: string };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
