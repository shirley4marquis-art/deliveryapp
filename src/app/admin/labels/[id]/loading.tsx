export default function ShippingLabelLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="h-[680px] animate-pulse rounded-2xl bg-white" />
        <div className="h-[680px] animate-pulse rounded-2xl bg-white" />
      </div>
    </div>
  );
}
