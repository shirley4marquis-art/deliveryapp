export default function AdminLoginLoading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c8d9f5] border-t-[#0047bb]" />
      <p className="text-sm font-semibold text-[#10213f]">Loading…</p>
    </main>
  );
}
