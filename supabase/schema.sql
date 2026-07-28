create extension if not exists pgcrypto;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text unique not null check (tracking_number ~ '^RR[0-9]{9}GB$'),
  sender_name text,
  sender_address text,
  sender_city text,
  sender_place_id text,
  receiver_name text,
  receiver_email text,
  receiver_address text,
  receiver_city text,
  receiver_postcode text,
  receiver_place_id text,
  package_type text,
  package_image_url text,
  weight text,
  delivery_service text,
  current_status text,
  estimated_delivery_date date,
  notes text,
  pickup_lat double precision,
  pickup_lng double precision,
  delivery_lat double precision,
  delivery_lng double precision,
  current_lat double precision,
  current_lng double precision,
  transit_started_at timestamp with time zone,
  route_geometry jsonb,
  route_distance_km double precision,
  route_duration_minutes double precision,
  live_tracking_enabled boolean default false,
  customs_charge_amount text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.shipments
  add column if not exists sender_place_id text,
  add column if not exists receiver_place_id text,
  add column if not exists receiver_email text,
  add column if not exists package_image_url text,
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

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text not null,
  location text,
  description text,
  event_time timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.shipment_email_logs (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  receiver_email text not null,
  status text not null,
  subject text not null,
  sent_successfully boolean not null default false,
  error_message text,
  sent_at timestamp with time zone not null default now()
);

create index if not exists shipments_tracking_number_idx
  on public.shipments (tracking_number);

create index if not exists shipments_created_at_idx
  on public.shipments (created_at desc);

create index if not exists tracking_events_shipment_id_idx
  on public.tracking_events (shipment_id);

create index if not exists tracking_events_event_time_idx
  on public.tracking_events (event_time desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_shipments_updated_at on public.shipments;

create trigger set_shipments_updated_at
before update on public.shipments
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

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
    'package_image_url', s.package_image_url,
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

alter table public.shipments enable row level security;
alter table public.tracking_events enable row level security;
alter table public.admin_users enable row level security;
alter table public.shipment_email_logs enable row level security;

drop policy if exists "Admins can view shipments" on public.shipments;
drop policy if exists "Admins can create shipments" on public.shipments;
drop policy if exists "Admins can update shipments" on public.shipments;
drop policy if exists "Admins can delete shipments" on public.shipments;
drop policy if exists "Admins can view tracking events" on public.tracking_events;
drop policy if exists "Admins can create tracking events" on public.tracking_events;
drop policy if exists "Admins can update tracking events" on public.tracking_events;
drop policy if exists "Admins can delete tracking events" on public.tracking_events;
drop policy if exists "Admins can view admin users" on public.admin_users;
drop policy if exists "Admins can view email logs" on public.shipment_email_logs;
drop policy if exists "Admins can create email logs" on public.shipment_email_logs;

create policy "Admins can view shipments"
on public.shipments for select
to authenticated
using (public.is_admin());

create policy "Admins can create shipments"
on public.shipments for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update shipments"
on public.shipments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete shipments"
on public.shipments for delete
to authenticated
using (public.is_admin());

create policy "Admins can view tracking events"
on public.tracking_events for select
to authenticated
using (public.is_admin());

create policy "Admins can create tracking events"
on public.tracking_events for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update tracking events"
on public.tracking_events for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete tracking events"
on public.tracking_events for delete
to authenticated
using (public.is_admin());

create policy "Admins can view admin users"
on public.admin_users for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Admins can view email logs"
on public.shipment_email_logs for select
to authenticated
using (public.is_admin());

create policy "Admins can create email logs"
on public.shipment_email_logs for insert
to authenticated
with check (public.is_admin());

revoke all on public.shipments from anon;
revoke all on public.tracking_events from anon;
grant execute on function public.get_public_tracking(text) to anon, authenticated;

-- After creating an admin in Supabase Auth, add that user here:
-- insert into public.admin_users (user_id, email)
-- values ('00000000-0000-0000-0000-000000000000', 'admin@royalruns.co.uk');
