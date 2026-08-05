import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { verifyTelegramAdminLink } from "@/lib/telegram-auth";

export default async function TelegramLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; linked?: string; error?: string }>;
}) {
  const params = await searchParams;
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    const next = `/admin/telegram-link${params.token ? `?token=${encodeURIComponent(params.token)}` : ""}`;
    redirect(`/admin-login?next=${encodeURIComponent(next)}`);
  }

  if (params.linked === "1") {
    return <Status title="Telegram connected" message="This Telegram chat can now use Royal Runs admin commands." />;
  }
  if (params.error || !params.token || !verifyTelegramAdminLink(params.token)) {
    return <Status title="Link expired" message="Return to the Telegram bot and send /start to request a fresh admin link." />;
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <div className="rounded-2xl border border-[#c8d9f5] bg-white p-8 shadow-lg">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0047bb]">Royal Runs admin</p>
        <h1 className="mt-3 text-3xl font-black text-[#07152f]">Connect Telegram</h1>
        <p className="mt-4 leading-7 text-[#10213f]">Authorize this Telegram chat to create shipments, upload parcel photos, and send customer emails.</p>
        <form action="/api/admin/telegram-link" method="post">
          <input name="token" type="hidden" value={params.token} />
          <button className="mt-7 w-full rounded-lg bg-[#0047bb] px-5 py-3 font-bold text-white hover:bg-[#003894]" type="submit">Authorize Telegram chat</button>
        </form>
      </div>
    </main>
  );
}

function Status({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <div className="rounded-2xl border border-[#c8d9f5] bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-black text-[#07152f]">{title}</h1>
        <p className="mt-4 leading-7 text-[#10213f]">{message}</p>
        <Link className="mt-6 inline-flex font-bold text-[#0047bb]" href="/admin">Return to admin</Link>
      </div>
    </main>
  );
}
