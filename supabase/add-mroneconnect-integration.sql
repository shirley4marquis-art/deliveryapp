alter table public.shipments
  add column if not exists external_order_id text,
  add column if not exists order_source text;

create unique index if not exists shipments_external_order_id_idx
  on public.shipments (external_order_id)
  where external_order_id is not null;

-- Prompt PostgREST to pick up the new columns immediately.
notify pgrst, 'reload schema';
