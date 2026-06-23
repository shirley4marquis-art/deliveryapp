"use client";

import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

type Props = {
  pickupLat: string;
  pickupLng: string;
  deliveryLat: string;
  deliveryLng: string;
  currentLat: string;
  currentLng: string;
  onCurrentLocationChange: (lat: string, lng: string) => void;
};

export function AdminRouteMap({
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  currentLat,
  currentLng,
  onCurrentLocationChange,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  // Keep callback stable inside the effect via a ref (avoids stale closure)
  const callbackRef = useRef(onCurrentLocationChange);
  useEffect(() => {
    callbackRef.current = onCurrentLocationChange;
  });

  // Initial current-location snapshot (only read once per map init, not on drag updates)
  const initCurrentRef = useRef({ lat: currentLat, lng: currentLng });

  const hasPickup = Boolean(pickupLat && pickupLng);
  const hasDelivery = Boolean(deliveryLat && deliveryLng);

  useEffect(() => {
    // Sync snapshot before the map initialises so it uses the latest values
    initCurrentRef.current = { lat: currentLat, lng: currentLng };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng]);

  useEffect(() => {
    if (!hasPickup || !hasDelivery || !mapRef.current) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      // Fix broken default marker icons in bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const pLat = parseFloat(pickupLat);
      const pLng = parseFloat(pickupLng);
      const dLat = parseFloat(deliveryLat);
      const dLng = parseFloat(deliveryLng);
      const cLat = initCurrentRef.current.lat
        ? parseFloat(initCurrentRef.current.lat)
        : pLat;
      const cLng = initCurrentRef.current.lng
        ? parseFloat(initCurrentRef.current.lng)
        : pLng;

      const map = L.map(mapRef.current).setView(
        [(pLat + dLat) / 2, (pLng + dLng) / 2],
        7,
      );
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      function makeIcon(bg: string, label: string) {
        return L.divIcon({
          className: "",
          html: `<div style="background:${bg};color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.3)">${label}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -20],
        });
      }

      // Pickup marker (red)
      L.marker([pLat, pLng], { icon: makeIcon("#ef3340", "P") })
        .addTo(map)
        .bindPopup("<strong>Pickup (Sender)</strong>");

      // Delivery marker (green)
      L.marker([dLat, dLng], { icon: makeIcon("#10b981", "D") })
        .addTo(map)
        .bindPopup("<strong>Delivery destination</strong>");

      // Current location marker (amber, draggable)
      const currentMarker = L.marker([cLat, cLng], {
        icon: makeIcon("#f59e0b", "📦"),
        draggable: true,
        title: "Drag to update current parcel location",
      })
        .addTo(map)
        .bindPopup(
          "<strong>Current parcel location</strong><br><em>Drag to reposition</em>",
        );

      currentMarker.on("dragend", () => {
        const pos = currentMarker.getLatLng();
        callbackRef.current(String(pos.lat), String(pos.lng));
      });

      // Try OSRM for a real road route; fall back to a straight dashed line
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?geometries=geojson&overview=full`;
        const routeRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(6000) });
        const routeData = await routeRes.json();
        const coords = routeData.routes?.[0]?.geometry?.coordinates as
          | [number, number][]
          | undefined;

        if (coords?.length) {
          L.polyline(
            coords.map(([lng, lat]) => [lat, lng] as [number, number]),
            { color: "#0047bb", weight: 5, opacity: 0.85 },
          ).addTo(map);
        } else {
          throw new Error("no route");
        }
      } catch {
        L.polyline(
          [
            [pLat, pLng],
            [dLat, dLng],
          ],
          { color: "#0047bb", weight: 4, opacity: 0.7, dashArray: "10 6" },
        ).addTo(map);
      }

      const bounds = L.latLngBounds([
        [pLat, pLng],
        [dLat, dLng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  // currentLat / currentLng intentionally excluded — handled via initCurrentRef
  // to prevent the map re-initialising every time the draggable marker moves.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPickup, hasDelivery, pickupLat, pickupLng, deliveryLat, deliveryLng]);

  if (!hasPickup || !hasDelivery) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
        <MapPin className="text-slate-300" size={32} />
        <p className="text-sm font-semibold text-slate-500">
          Select both sender and receiver addresses to see the live delivery
          route map here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="h-96 overflow-hidden rounded-lg border border-[#c8d9f5]"
        ref={mapRef}
      />
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#ef3340]" />
          Pickup (sender)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#10b981]" />
          Delivery destination
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#f59e0b]" />
          Current parcel location — drag to reposition
        </span>
      </div>
    </div>
  );
}
