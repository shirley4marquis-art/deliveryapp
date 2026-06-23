"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function HomeTrackForm() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tracking = value.trim().toUpperCase().replace(/\s+/g, "");
    if (tracking) {
      router.push(`/track?q=${encodeURIComponent(tracking)}`);
    } else {
      router.push("/track");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-7 flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md"
    >
      <input
        className="min-w-0 flex-1 px-4 py-3 text-sm text-[#07152f] placeholder-slate-400 outline-none"
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter tracking number (e.g. RR123456789GB)"
        value={value}
      />
      <button
        type="submit"
        className="flex shrink-0 items-center gap-2 bg-[#0047bb] px-5 py-3 text-sm font-bold text-white hover:bg-[#0039a0]"
      >
        <Search size={16} />
        Track Parcel
      </button>
    </form>
  );
}
