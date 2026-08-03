alter table public.shipments
  add column if not exists order_source text;

comment on column public.shipments.order_source is
  'Identifies the storefront or partner that originated the shipment.';

notify pgrst, 'reload schema';
