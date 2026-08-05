"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Pause, Route, Zap } from "lucide-react";
import type { Shipment } from "@/lib/types";
import {
  calculateETA,
  calculateProgress,
  distanceRemaining,
  formatDuration,
  interpolatePosition,
  isDelivered,
  isMoving,
  LIVE_TRACKING_SPEED_KMH,
} from "@/lib/transit";

type StaticPoint = { label: string; lat: number; lng: number; color: string };

// Geocode an address via our proxy (only used when no stored coords)
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query?.trim()) return null;
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function isCoord(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// ─── Live Tracking Panel ──────────────────────────────────────────────────────

function LiveTrackingPanel({ shipment }: { shipment: Shipment }) {
  const [progress, setProgress] = useState(0);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [now, setNow] = useState(0);

  const geometry = shipment.route_geometry;
  const duration = shipment.route_duration_minutes ?? 0;
  const distance = shipment.route_distance_km ?? 0;
  const startedAt = shipment.transit_started_at;

  useEffect(() => {
    if (!startedAt || !duration) return;

    function tick() {
      setNow(Date.now());
      const p = calculateProgress(startedAt!, duration);
      setProgress(p);
      if (geometry?.length) {
        setPos(interpolatePosition(geometry, p));
      }
    }

    tick();
    const id = setInterval(tick, 5000); // recalculate every 5 s
    return () => clearInterval(id);
  }, [startedAt, duration, geometry]);

  if (!startedAt || !duration) return null;

  const eta = calculateETA(startedAt, duration);
  const remaining = distanceRemaining(distance, progress);
  const minutesLeft = Math.max(
    0,
    (eta.getTime() - now) / 60000,
  );
  const pct = Math.round(progress * 100);

  return (
    <div className="mt-4 rounded-xl border border-[#c8d9f5] bg-[#f3f7ff] p-4">
      {/* Progress bar */}
      <div className="mb-3 flex items-center justify-between text-xs font-bold text-[#0047bb]">
        <span>Delivery progress</span>
        <span>{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#c8d9f5]">
        <div
          className="h-full rounded-full bg-[#0047bb] transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Travel speed</p>
          <p className="mt-0.5 text-sm font-black text-[#07152f]">
            {LIVE_TRACKING_SPEED_KMH} km/h
          </p>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Distance left</p>
          <p className="mt-0.5 text-sm font-black text-[#07152f]">
            {remaining < 1 ? `${Math.round(remaining * 1000)} m` : `${remaining.toFixed(1)} km`}
          </p>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">ETA</p>
          <p className="mt-0.5 text-sm font-black text-[#07152f]">
            {minutesLeft < 1
              ? "Arriving soon"
              : formatDuration(minutesLeft)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Arrives by</p>
          <p className="mt-0.5 text-sm font-black text-[#07152f]">
            {new Intl.DateTimeFormat("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(eta)}
          </p>
        </div>
      </div>

      {pos && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Last position update: {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(now))}
        </p>
      )}
    </div>
  );
}

// ─── Main Map Component ───────────────────────────────────────────────────────

export function TrackingMap({ shipment }: { shipment: Shipment }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const parcelMarkerRef = useRef<unknown>(null); // moving parcel marker
  const [staticPoints, setStaticPoints] = useState<StaticPoint[]>([]);
  const [resolving, setResolving] = useState(true);

  const hasGeometry =
    Array.isArray(shipment.route_geometry) &&
    shipment.route_geometry.length > 1;

  const liveActive =
    !!shipment.live_tracking_enabled &&
    isMoving(shipment.current_status) &&
    !!shipment.transit_started_at &&
    hasGeometry;

  const delivered = isDelivered(shipment.current_status);

  // Step 1 — Build static marker points (geocode if needed)
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      setResolving(true);
      const pts: StaticPoint[] = [];

      // Pickup
      if (isCoord(shipment.pickup_lat) && isCoord(shipment.pickup_lng)) {
        pts.push({ label: `Pickup — ${shipment.sender_city || "Sender"}`, lat: shipment.pickup_lat, lng: shipment.pickup_lng, color: "#ef3340" });
      } else if (shipment.sender_address || shipment.sender_city) {
        const geo = await geocode(shipment.sender_address || shipment.sender_city || "");
        if (geo && !cancelled) pts.push({ label: `Pickup — ${shipment.sender_city || "Sender"}`, ...geo, color: "#ef3340" });
      }

      // Delivery
      if (isCoord(shipment.delivery_lat) && isCoord(shipment.delivery_lng)) {
        pts.push({ label: `Delivery — ${shipment.receiver_city || "Receiver"}`, lat: shipment.delivery_lat, lng: shipment.delivery_lng, color: "#10b981" });
      } else if (shipment.receiver_address || shipment.receiver_city) {
        const geo = await geocode(shipment.receiver_address || shipment.receiver_city || "");
        if (geo && !cancelled) pts.push({ label: `Delivery — ${shipment.receiver_city || "Receiver"}`, ...geo, color: "#10b981" });
      }

      if (!cancelled) { setStaticPoints(pts); setResolving(false); }
    }
    void resolve();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment.id]);

  // Step 2 — Create/recreate the Leaflet map when static points arrive
  useEffect(() => {
    if (resolving || staticPoints.length === 0 || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current).setView(
        [staticPoints[0].lat, staticPoints[0].lng],
        staticPoints.length === 1 ? 12 : 7,
      );
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      function makeIcon(color: string, label: string, size = 32) {
        return L.divIcon({
          className: "",
          html: `<div style="background:${color};color:#fff;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${size * 0.4}px;font-weight:900;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.3)">${label}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2 - 4],
        });
      }

      // Static pickup + delivery markers
      staticPoints.forEach((pt) => {
        const isPickup = pt.color === "#ef3340";
        L.marker([pt.lat, pt.lng], { icon: makeIcon(pt.color, isPickup ? "P" : "D") })
          .addTo(map)
          .bindPopup(`<strong>${pt.label}</strong>`);
        bounds.extend([pt.lat, pt.lng]);
      });

      // Draw route polyline
      if (hasGeometry && shipment.route_geometry) {
        L.polyline(
          shipment.route_geometry.map(([lat, lng]) => [lat, lng] as [number, number]),
          { color: "#0047bb", weight: 5, opacity: 0.75 },
        ).addTo(map);
      } else if (staticPoints.length >= 2) {
        // Fallback straight dashed line
        L.polyline(
          staticPoints.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#0047bb", weight: 4, opacity: 0.6, dashArray: "10 6" },
        ).addTo(map);
      }

      // Live parcel marker — positioned immediately
      if (liveActive && shipment.route_geometry && shipment.transit_started_at && shipment.route_duration_minutes) {
        const p = calculateProgress(shipment.transit_started_at, shipment.route_duration_minutes);
        const pos = interpolatePosition(shipment.route_geometry, p);
        const parcelMarker = L.marker([pos.lat, pos.lng], {
          icon: makeIcon("#f59e0b", "📦", 36),
          zIndexOffset: 1000,
        }).addTo(map).bindPopup("<strong>Your parcel</strong><br>Moving now");
        parcelMarkerRef.current = parcelMarker;
        bounds.extend([pos.lat, pos.lng]);
      }

      if (
        !liveActive &&
        !delivered &&
        isCoord(shipment.current_lat) &&
        isCoord(shipment.current_lng)
      ) {
        L.marker([shipment.current_lat, shipment.current_lng], {
          icon: makeIcon("#f59e0b", "⏸", 36),
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup("<strong>Your parcel</strong><br>Tracking paused");
        bounds.extend([shipment.current_lat, shipment.current_lng]);
      }

      // Delivered — parcel marker at destination
      if (delivered && staticPoints.length >= 2) {
        const dest = staticPoints[staticPoints.length - 1];
        L.marker([dest.lat, dest.lng], {
          icon: makeIcon("#059669", "✓", 36),
          zIndexOffset: 1000,
        }).addTo(map).bindPopup("<strong>Delivered ✓</strong>");
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
        parcelMarkerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolving, staticPoints, hasGeometry, liveActive, delivered]);

  // Step 3 — Move the parcel marker every 5 seconds while in transit
  useEffect(() => {
    if (!liveActive || !shipment.route_geometry || !shipment.transit_started_at || !shipment.route_duration_minutes) return;

    const geometry = shipment.route_geometry;
    const startedAt = shipment.transit_started_at;
    const duration = shipment.route_duration_minutes;

    const id = setInterval(() => {
      const marker = parcelMarkerRef.current as {
        setLatLng: (latlng: [number, number]) => void;
      } | null;
      if (!marker) return;
      const p = calculateProgress(startedAt, duration);
      const pos = interpolatePosition(geometry, p);
      marker.setLatLng([pos.lat, pos.lng]);
    }, 5000);

    return () => clearInterval(id);
  }, [liveActive, shipment.route_geometry, shipment.transit_started_at, shipment.route_duration_minutes]);

  return (
    <section className="mt-5 rounded-xl border border-[#c8d9f5] bg-[#f7faff] p-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-lg font-black text-[#07152f]">
          <Route aria-hidden="true" size={20} />
          {liveActive ? "Live route map" : "Delivery route"}
        </h3>
        {liveActive && (
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#0047bb] px-3 py-1.5 text-xs font-bold text-white">
            <Zap size={13} className="animate-pulse" />
            Live tracking active
          </span>
        )}
        {!liveActive && isCoord(shipment.current_lat) && isCoord(shipment.current_lng) && (
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#0047bb]">
            <Pause aria-hidden="true" size={16} />
            Tracking paused · location recorded
          </span>
        )}
      </div>

      {/* Map */}
      {resolving ? (
        <div className="mt-4 flex h-72 items-center justify-center rounded-lg border border-[#c8d9f5] bg-white">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c8d9f5] border-t-[#0047bb]" />
            <p className="text-sm font-semibold text-slate-400">Loading map…</p>
          </div>
        </div>
      ) : staticPoints.length > 0 ? (
        <div
          className="mt-4 h-72 overflow-hidden rounded-lg border border-[#c8d9f5]"
          ref={mapRef}
        />
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-[#9bb8ea] bg-white p-5">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 shrink-0 text-slate-400" size={18} />
            <p className="text-sm font-semibold text-[#10213f]">
              Route information not yet available for this shipment.
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      {staticPoints.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#07152f] ring-1 ring-slate-200">
            <span className="h-3 w-3 rounded-full bg-[#ef3340]" /> Pickup
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#07152f] ring-1 ring-slate-200">
            <span className="h-3 w-3 rounded-full bg-[#10b981]" /> Destination
          </span>
          {liveActive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#07152f] ring-1 ring-slate-200">
              <span className="h-3 w-3 rounded-full bg-[#f59e0b]" /> Your parcel (live)
            </span>
          )}
        </div>
      )}

      {/* Live progress panel */}
      {liveActive && <LiveTrackingPanel shipment={shipment} />}

      {/* Delivered panel */}
      {delivered && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl text-white">✓</span>
          <div>
            <p className="font-black text-green-800">Delivered Successfully</p>
            {shipment.updated_at && (
              <p className="mt-0.5 text-xs text-green-700">
                {new Intl.DateTimeFormat("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(new Date(shipment.updated_at))}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
