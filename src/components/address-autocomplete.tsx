"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

type NominatimResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
};

export type VerifiedAddress = {
  address: string;
  city: string;
  postcode: string;
  lat: string;
  lng: string;
  placeId: string;
};

function extractPostcode(text: string): string {
  const match = text.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/i);
  return match ? match[0].toUpperCase().replace(/\s+/g, " ") : "";
}

function extractCity(result: NominatimResult): string {
  const a = result.address;
  return (
    a.city ||
    a.town ||
    a.village ||
    a.hamlet ||
    a.city_district ||
    a.suburb ||
    a.neighbourhood ||
    a.county ||
    a.state_district ||
    a.state ||
    result.display_name.split(",").find((s) => {
      const t = s.trim();
      return t.length > 1 && !/^\d/.test(t);
    }) ||
    ""
  );
}

function buildVerifiedAddress(result: NominatimResult, overrideText?: string): VerifiedAddress {
  return {
    address: overrideText ?? result.display_name,
    city: extractCity(result),
    postcode: result.address.postcode || extractPostcode(result.display_name) || "",
    lat: result.lat,
    lng: result.lon,
    placeId: `osm:${result.place_id}`,
  };
}

export function AddressAutocomplete({
  label,
  value,
  helperText,
  onChange,
  onVerifiedAddress,
}: {
  label: string;
  value: string;
  verified?: boolean;
  helperText?: string;
  onChange: (value: string) => void;
  onVerifiedAddress: (address: VerifiedAddress) => void;
}) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [geocoded, setGeocoded] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether a dropdown item was just clicked so we skip autoGeocode on blur
  const justPickedRef = useRef(false);
  // Keep latest results accessible in autoGeocode without re-running the effect
  const resultsRef = useRef<NominatimResult[]>([]);

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setResults([]);
      resultsRef.current = [];
      setOpen(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data: NominatimResult[] = await res.json();
      setResults(data.slice(0, 6));
      resultsRef.current = data.slice(0, 6);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
      resultsRef.current = [];
    }
    setSearching(false);
  }, []);

  function handleInput(val: string) {
    setGeocoded(false);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  }

  function selectResult(result: NominatimResult) {
    justPickedRef.current = true;
    setGeocoded(true);
    onVerifiedAddress(buildVerifiedAddress(result));
    onChange(result.display_name);
    setResults([]);
    resultsRef.current = [];
    setOpen(false);
  }

  // Auto-geocode when the user leaves the field without picking from the list.
  // Uses cached results if available, otherwise makes a fresh request.
  async function autoGeocode() {
    setOpen(false);

    if (justPickedRef.current) {
      justPickedRef.current = false;
      return;
    }

    const query = value.trim();
    if (!query || query.length < 3) return;

    let pool = resultsRef.current;

    if (pool.length === 0) {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        pool = await res.json();
      } catch {
        return;
      }
    }

    if (pool.length === 0) return;

    // Use top result but preserve the text the user typed
    onVerifiedAddress(buildVerifiedAddress(pool[0], query));
    setGeocoded(true);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative mt-4 first:mt-0">
      <label>
        <span className="text-sm font-bold text-[#10213f]">{label}</span>
        <div className="relative">
          <input
            autoComplete="off"
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-4 pr-9 outline-none focus:border-[#0047bb]"
            inputMode="search"
            onBlur={autoGeocode}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Type an address or postcode"
            value={value}
          />
          {searching && (
            <Loader2
              className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 animate-spin text-slate-400"
              size={15}
            />
          )}
          {geocoded && !searching && (
            <CheckCircle2
              className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-green-500"
              size={15}
            />
          )}
        </div>
      </label>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl">
          {results.map((result) => {
            const addr = result.address;
            const line1 = [addr.house_number, addr.road].filter(Boolean).join(" ");
            const line2 = addr.city || addr.town || addr.village || addr.county || "";
            const postcode = addr.postcode || extractPostcode(result.display_name);
            return (
              <li
                key={result.place_id}
                className="cursor-pointer border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-[#f0f6ff]"
                onMouseDown={() => selectResult(result)}
              >
                <p className="font-semibold text-[#07152f]">
                  {line1 || line2}{postcode ? `, ${postcode}` : ""}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {result.display_name}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {helperText && (
        <span className="mt-1 block text-xs text-slate-400">{helperText}</span>
      )}
    </div>
  );
}
