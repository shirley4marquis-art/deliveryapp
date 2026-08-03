"use client";

import { CheckCircle2, ChevronDown, Mail, XCircle } from "lucide-react";
import type { CustomerEmailLog, ParcelStatus } from "@/lib/types";

export function CustomerEmailHistory({
  logs,
  status,
}: {
  logs: CustomerEmailLog[];
  status: ParcelStatus;
}) {
  const successful = logs.filter((log) => log.sent_successfully);
  const sent = successful.filter((log) => !isReply(log));
  const replies = successful.filter(isReply);
  const nextEmail = suggestedNextEmail(status, sent, replies);

  return (
    <div className="grid gap-2">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
          Next email
        </p>
        <p className="mt-1 text-sm font-black text-blue-950">{nextEmail}</p>
      </div>
      <details className="rounded-lg border border-slate-200 bg-slate-50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-black text-[#07152f]">
          <span className="inline-flex items-center gap-2">
            <Mail size={15} />
            Email history — {sent.length} sent
            {replies.length ? ` · ${replies.length} replied` : ""}
          </span>
          <ChevronDown size={16} />
        </summary>
        <div className="border-t border-slate-200 p-3">
        <div className="mt-3 grid gap-2">
          {logs.map((log, index) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-3"
              key={log.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#07152f]">
                    {emailTitle(log)}
                  </p>
                  <p className="mt-0.5 text-xs text-[#50627f]">
                    {formatSentAt(log.sent_at)}
                    {log.tracking_number
                      ? ` · ${log.tracking_number}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${
                    isReply(log)
                      ? "bg-violet-100 text-violet-800"
                      : log.sent_successfully
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {log.sent_successfully ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <XCircle size={12} />
                  )}
                  {isReply(log)
                    ? "Received"
                    : log.sent_successfully
                      ? "Sent"
                      : "Failed"}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#50627f]">{log.subject}</p>
              {index === 0 ? (
                <span className="mt-2 inline-block rounded-full bg-[#07152f] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                  Latest
                </span>
              ) : null}
              {!log.sent_successfully && log.error_message ? (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  {log.error_message}
                </p>
              ) : null}
              {isReply(log) && log.error_message ? (
                <p className="mt-2 rounded-md bg-violet-50 p-2 text-xs text-violet-900">
                  {log.error_message}
                </p>
              ) : null}
            </article>
          ))}
          {!logs.length ? (
            <p className="rounded-lg bg-white p-3 text-xs text-[#50627f]">
              No email attempts have been recorded for this customer yet.
            </p>
          ) : null}
        </div>
        </div>
      </details>
    </div>
  );
}

function emailTitle(log: CustomerEmailLog) {
  if (isReply(log)) return "Customer reply";
  const value = `${log.status} ${log.subject}`.toLowerCase();
  if (value.includes("vat") || value.includes("payment")) {
    return "VAT/payment notice";
  }
  if (value.includes("delivery attempt")) return "Delivery attempted";
  if (value.includes("scheduled")) return "Delivery scheduled";
  if (value.includes("address") || value.includes("delivery details")) {
    return "Delivery details confirmation";
  }
  if (value.includes("status") || value.includes("update")) {
    return "Shipment status update";
  }
  return log.status || "Custom email";
}

function suggestedNextEmail(
  status: ParcelStatus,
  sent: CustomerEmailLog[],
  replies: CustomerEmailLog[],
) {
  if (!sent.length) return "Delivery details confirmation";
  if (
    sent.some((log) => emailTitle(log) === "Delivery details confirmation") &&
    !replies.length
  ) {
    return "Awaiting customer delivery-details reply";
  }
  if (status === "On Hold" || status === "Customs/Processing Check") {
    return "VAT/payment notice";
  }
  if (status === "Delivery Attempted") return "Delivery attempted";
  if (status === "Out for Delivery") return "Out-for-delivery status update";
  if (status === "Delivered") return "Delivery confirmation";
  if (status === "Shipment Created") return "Shipment status update";
  return "Shipment status update";
}

function isReply(log: CustomerEmailLog) {
  return log.status.toLowerCase() === "customer reply received";
}

function formatSentAt(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
