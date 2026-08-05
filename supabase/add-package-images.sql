alter table public.shipments
  add column if not exists package_image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'package-images',
  'package-images',
  true,
  10485760,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload package images" on storage.objects;
drop policy if exists "Admins can update package images" on storage.objects;
drop policy if exists "Admins can delete package images" on storage.objects;

create policy "Admins can upload package images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'package-images'
  and public.is_admin()
);

create policy "Admins can update package images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'package-images'
  and public.is_admin()
)
with check (
  bucket_id = 'package-images'
  and public.is_admin()
);

create policy "Admins can delete package images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'package-images'
  and public.is_admin()
);

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
    'sender_city', s.sender_city,
    'receiver_name', s.receiver_name,
    'receiver_address', s.receiver_address,
    'receiver_city', s.receiver_city,
    'receiver_postcode', s.receiver_postcode,
    'receiver_place_id', s.receiver_place_id,
    'package_type', s.package_type,
    'package_image_url', s.package_image_url,
    'weight', s.weight,
    'delivery_service', s.delivery_service,
    'current_status', s.current_status,
    'estimated_delivery_date', s.estimated_delivery_date,
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
            'event_time', te.event_time,
            'location', te.location,
            'status', te.status,
            'description', te.description,
            'created_at', te.created_at
          )
          order by te.event_time asc
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
