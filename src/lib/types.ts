export const parcelStatuses = [
  "Shipment Created",
  "Parcel Collected",
  "At Local Depot",
  "In Transit",
  "Arrived at Sorting Facility",
  "Customs/Processing Check",
  "Out for Delivery",
  "Delivery Attempted",
  "Delivered",
  "On Hold",
] as const;

export type ParcelStatus = (typeof parcelStatuses)[number];

export type TrackingEvent = {
  id: string;
  shipment_id: string;
  event_time: string;
  location: string;
  status: ParcelStatus;
  description: string | null;
  created_at?: string;
};

export type Shipment = {
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
  created_at?: string;
  updated_at?: string;
  tracking_events?: TrackingEvent[];
};

export type ShipmentInput = Omit<
  Shipment,
  | "id"
  | "external_order_id"
  | "order_source"
  | "created_at"
  | "updated_at"
  | "tracking_events"
  | "package_image_url"
  | "transit_started_at"
  | "route_geometry"
  | "route_distance_km"
  | "route_duration_minutes"
  | "live_tracking_enabled"
>;

export type TrackingEventInput = Omit<
  TrackingEvent,
  "id" | "shipment_id" | "created_at"
>;
