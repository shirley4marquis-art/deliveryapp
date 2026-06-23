alter table public.shipments
  add column if not exists sender_place_id text,
  add column if not exists receiver_place_id text,
  add column if not exists receiver_email text,
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision,
  add column if not exists delivery_lat double precision,
  add column if not exists delivery_lng double precision,
  add column if not exists current_lat double precision,
  add column if not exists current_lng double precision,
  add column if not exists transit_started_at timestamp with time zone,
  add column if not exists route_geometry jsonb,
  add column if not exists route_distance_km double precision,
  add column if not exists route_duration_minutes double precision,
  add column if not exists live_tracking_enabled boolean default false,
  add column if not exists customs_charge_amount text;

create or replace function public.get_public_tracking(p_tracking_number text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id,
    'tracking_number', s.tracking_number,
    'sender_name', s.sender_name,
    'sender_address', s.sender_address,
    'sender_city', s.sender_city,
    'sender_place_id', s.sender_place_id,
    'receiver_name', s.receiver_name,
    'receiver_address', s.receiver_address,
    'receiver_city', s.receiver_city,
    'receiver_postcode', s.receiver_postcode,
    'receiver_place_id', s.receiver_place_id,
    'package_type', s.package_type,
    'weight', s.weight,
    'delivery_service', s.delivery_service,
    'current_status', s.current_status,
    'estimated_delivery_date', s.estimated_delivery_date,
    'notes', s.notes,
    'pickup_lat', s.pickup_lat,
    'pickup_lng', s.pickup_lng,
    'delivery_lat', s.delivery_lat,
    'delivery_lng', s.delivery_lng,
    'current_lat', s.current_lat,
    'current_lng', s.current_lng,
    'transit_started_at', s.transit_started_at,
    'route_geometry', s.route_geometry,
    'route_distance_km', s.route_distance_km,
    'route_duration_minutes', s.route_duration_minutes,
    'live_tracking_enabled', s.live_tracking_enabled,
    'created_at', s.created_at,
    'updated_at', s.updated_at,
    'tracking_events', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', te.id,
            'shipment_id', te.shipment_id,
            'status', te.status,
            'location', te.location,
            'description', te.description,
            'event_time', te.event_time,
            'created_at', te.created_at
          )
          order by te.event_time desc
        )
        from public.tracking_events te
        where te.shipment_id = s.id
      ),
      '[]'::jsonb
    )
  )
  from public.shipments s
  where s.tracking_number = upper(trim(p_tracking_number));
$$;
