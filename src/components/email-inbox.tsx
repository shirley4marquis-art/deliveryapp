"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Inbox,
  Mail,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import type { CustomerEmailLog } from "@/lib/types";

type View = "inbox" | "sent" | "all";

export function EmailInbox() {
  const [logs, setLogs] = useState<CustomerEmailLog[]>([]);
  const [view, setView] = useState<View>("inbox");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const loadEmails = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    try {
      const response = await fetch("/api/admin/email-history", {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        logs?: CustomerEmailLog[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Unable to load email.");

      const nextLogs = result.logs || [];
      setLogs(nextLogs);
      setError("");
      announceNewReply(nextLogs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load email.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadEmails(), 0);
    const timer = window.setInterval(() => void loadEmails(true), 30_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadEmails]);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setError("This browser does not support desktop notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    if (permission !== "granted") {
      setError("Brave blocked notifications. Allow them for localhost in Site settings.");
    }
  }

  const replies = useMemo(() => logs.filter(isReply), [logs]);
  const sent = useMemo(() => logs.filter((log) => !isReply(log)), [logs]);
  const visible = view === "inbox" ? replies : view === "sent" ? sent : logs;

  return (
    <div className="grid gap-6">
      <header className="rounded-2xl bg-[#07152f] p-6 text-white shadow-lg md:p-8">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-blue-200 hover:text-white" href="/admin">
          <ArrowLeft size={16} /> Admin dashboard
        </Link>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">Royal Runs office</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Email inbox</h1>
            <p className="mt-2 text-sm font-medium text-blue-100">
              Customer replies appear here automatically. This page checks for new mail every 30 seconds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              onClick={() => void enableNotifications()}
              type="button"
            >
              <Mail size={16} /> {notificationsEnabled ? "Notifications on" : "Enable notifications"}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#07152f] disabled:opacity-60"
              disabled={refreshing}
              onClick={() => void loadEmails(true)}
              type="button"
            >
              <RefreshCw className={refreshing ? "animate-spin" : ""} size={16} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Replies received" value={replies.length} />
        <Stat label="Emails sent" value={sent.filter((log) => log.sent_successfully).length} />
        <Stat label="Failed" value={sent.filter((log) => !log.sent_successfully).length} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-4">
          <Tab active={view === "inbox"} count={replies.length} icon={<Inbox size={15} />} label="Inbox" onClick={() => setView("inbox")} />
          <Tab active={view === "sent"} count={sent.length} icon={<Send size={15} />} label="Sent" onClick={() => setView("sent")} />
          <Tab active={view === "all"} count={logs.length} icon={<Mail size={15} />} label="All mail" onClick={() => setView("all")} />
        </div>

        {error ? <p className="m-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading email…</p> : null}
        {!loading && !visible.length ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {view === "inbox" ? "No customer replies have arrived yet." : "No email records found."}
          </p>
        ) : null}

        <div className="divide-y divide-slate-100">
          {visible.map((log) => (
            <article className="grid gap-3 p-5 hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_auto]" key={log.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${isReply(log) ? "bg-violet-100 text-violet-800" : log.sent_successfully ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {isReply(log) ? "Reply" : log.sent_successfully ? "Sent" : "Failed"}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${sourceBadge(log.order_source).className}`}>
                    {sourceBadge(log.order_source).label}
                  </span>
                  {log.tracking_number ? (
                    <Link className="text-xs font-black text-[#0047bb] hover:underline" href={`/admin/tracking/${log.shipment_id}`}>
                      {log.tracking_number}
                    </Link>
                  ) : null}
                </div>
                <h2 className="mt-2 truncate text-base font-black text-[#07152f]">{log.subject || "No subject"}</h2>
                <p className="mt-1 text-sm text-[#50627f]">{log.receiver_email}</p>
                {isReply(log) && log.error_message ? (
                  <p className="mt-3 rounded-lg bg-violet-50 p-3 text-sm leading-6 text-violet-950">{log.error_message}</p>
                ) : null}
                {!log.sent_successfully && log.error_message ? (
                  <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{log.error_message}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 md:justify-end">
                {log.sent_successfully ? <CheckCircle2 className="text-green-600" size={15} /> : <XCircle className="text-red-600" size={15} />}
                {formatDate(log.sent_at)}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Tab({ active, count, icon, label, onClick }: { active: boolean; count: number; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black ${active ? "bg-[#0047bb] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`} onClick={onClick} type="button">
      {icon} {label} <span className={active ? "text-blue-100" : "text-slate-500"}>{count}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-2xl font-black text-[#07152f]">{value}</p><p className="mt-1 text-xs font-bold text-[#50627f]">{label}</p></div>;
}

function isReply(log: CustomerEmailLog) {
  return log.status.toLowerCase() === "customer reply received";
}

function sourceBadge(source: string | null) {
  if (source === "ruco") return { label: "Ruco Supply", className: "bg-yellow-200 text-yellow-900" };
  if (source === "one-connect") return { label: "1:1 Connect", className: "bg-green-100 text-green-800" };
  return { label: "Unclassified", className: "bg-slate-200 text-slate-800" };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function announceNewReply(logs: CustomerEmailLog[]) {
  const latest = logs.find(isReply);
  if (!latest) return;
  const storageKey = "royal-runs-latest-email-reply-v1";
  const previous = window.localStorage.getItem(storageKey);
  if (previous && previous !== latest.id && "Notification" in window && Notification.permission === "granted") {
    new Notification("Royal Runs: customer reply", { body: `${latest.receiver_email}: ${latest.subject}` });
  }
  window.localStorage.setItem(storageKey, latest.id);
}
