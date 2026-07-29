export default function TrackingEditorLoading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center gap-3">
      <span className="h-7 w-7 animate-spin rounded-full border-4 border-[#c8d9f5] border-t-[#0047bb]" />
      <p className="font-semibold text-[#10213f]">Loading tracking editor…</p>
    </main>
  );
}
