"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Inbox,
  LogOut,
  PackagePlus,
  ShoppingBag,
  Tags,
  ReceiptText,
} from "lucide-react";

const panels = [
  {
    title: "Email inbox",
    description:
      "Check customer replies and review every message sent from Royal Runs Delivery.",
    href: "/admin/email",
    action: "Open email inbox",
    icon: Inbox,
    accent: "border-sky-200 bg-gradient-to-br from-sky-50 to-white",
    iconClass: "bg-sky-100 text-sky-800",
    actionClass: "text-sky-800",
  },
  {
    title: "Receipt printer",
    description:
      "Turn pasted Ruco invoices into verified 80 mm thermal purchase receipts.",
    href: "/admin/receipts",
    action: "Create receipt",
    icon: ReceiptText,
    accent: "border-violet-200 bg-gradient-to-br from-violet-50 to-white",
    iconClass: "bg-violet-100 text-violet-800",
    actionClass: "text-violet-800",
  },
  {
    title: "New orders",
    description:
      "Import an incoming order or create a new shipment and tracking number.",
    href: "/admin/new-order",
    action: "Manage new orders",
    icon: PackagePlus,
    accent: "border-blue-200 bg-gradient-to-br from-blue-50 to-white",
    iconClass: "bg-blue-100 text-[#0047bb]",
    actionClass: "text-[#0047bb]",
  },
  {
    title: "Ruco Supply",
    description:
      "View Ruco orders by shipment status, send VAT messages, and manage tracking.",
    href: "/admin/orders/ruco",
    action: "Open Ruco panel",
    icon: Boxes,
    accent: "border-yellow-300 bg-gradient-to-br from-yellow-50 to-white",
    iconClass: "bg-yellow-200 text-yellow-900",
    actionClass: "text-yellow-900",
  },
  {
    title: "1:1 Connect",
    description:
      "View individual store orders, shipment categories, images, and tracking.",
    href: "/admin/orders/one-connect",
    action: "Open 1:1 Connect panel",
    icon: ShoppingBag,
    accent: "border-green-200 bg-gradient-to-br from-green-50 to-white",
    iconClass: "bg-green-100 text-green-800",
    actionClass: "text-green-800",
  },
  {
    title: "Unclassified",
    description:
      "View shipments created from label details that do not identify a known order source.",
    href: "/admin/orders/unclassified",
    action: "Open unclassified panel",
    icon: Tags,
    accent: "border-slate-300 bg-gradient-to-br from-slate-50 to-white",
    iconClass: "bg-slate-200 text-slate-800",
    actionClass: "text-slate-800",
  },
] as const;

export function AdminPortal() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin-login");
  }

  return (
    <div className="grid gap-8">
      <header className="rounded-2xl bg-[#07152f] p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Admin control centre
            </p>
            <h1 className="mt-3 text-3xl font-black md:text-4xl">
              Shipment management
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-blue-100">
              Choose the workspace you need. Order creation and each shipment
              source are managed in their own focused panel.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white bg-[#ef3340] px-6 py-3.5 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            onClick={() => void logout()}
            type="button"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <section>
        <div>
          <h2 className="text-xl font-black text-[#07152f]">Admin panels</h2>
          <p className="mt-1 text-sm text-[#50627f]">
            Open one panel to manage only the orders relevant to that task.
          </p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {panels.map((panel) => {
            const Icon = panel.icon;
            return (
              <Link
                className={`group flex min-h-64 flex-col rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${panel.accent}`}
                href={panel.href}
                key={panel.href}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${panel.iconClass}`}
                >
                  <Icon size={23} />
                </span>
                <h3 className="mt-6 text-2xl font-black text-[#07152f]">
                  {panel.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#50627f]">
                  {panel.description}
                </p>
                <span
                  className={`mt-6 inline-flex items-center gap-2 text-sm font-black ${panel.actionClass}`}
                >
                  {panel.action}
                  <ArrowRight
                    className="transition group-hover:translate-x-1"
                    size={17}
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
