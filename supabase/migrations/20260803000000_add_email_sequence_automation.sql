create table if not exists public.shipment_email_automation (
  shipment_id uuid primary key references public.shipments(id) on delete cascade,
  enabled boolean not null default true,
  packaging_fee_paid boolean not null default false,
  vat_fee_paid boolean not null default false,
  seller_legal_name text,
  vat_registration_number text,
  vat_invoice_number text,
  payment_deadline timestamp with time zone,
  payment_instructions text,
  delivery_time_window text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.shipment_automation_email_logs (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  step_key text not null,
  scheduled_for timestamp with time zone not null,
  state text not null check (state in ('pending', 'deferred', 'blocked', 'sent', 'failed', 'skipped')),
  reason text,
  subject text,
  email_id text,
  last_checked_at timestamp with time zone not null default now(),
  sent_at timestamp with time zone,
  unique (shipment_id, step_key)
);

create index if not exists shipment_automation_logs_due_idx
  on public.shipment_automation_email_logs (state, scheduled_for);

alter table public.shipment_email_automation enable row level security;
alter table public.shipment_automation_email_logs enable row level security;

create policy "Admins can view shipment email automation"
on public.shipment_email_automation for select
to authenticated
using (public.is_admin());

create policy "Admins can create shipment email automation"
on public.shipment_email_automation for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update shipment email automation"
on public.shipment_email_automation for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can view shipment automation logs"
on public.shipment_automation_email_logs for select
to authenticated
using (public.is_admin());

create policy "Admins can create shipment automation logs"
on public.shipment_automation_email_logs for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update shipment automation logs"
on public.shipment_automation_email_logs for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.set_shipment_email_automation_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_shipment_email_automation_updated_at
  on public.shipment_email_automation;

create trigger set_shipment_email_automation_updated_at
before update on public.shipment_email_automation
for each row execute function public.set_shipment_email_automation_updated_at();
