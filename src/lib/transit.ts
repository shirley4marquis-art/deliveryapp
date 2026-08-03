export type RouteGeometry = [number, number][]; // [lat, lng] pairs
export const LIVE_TRACKING_SPEED_KMH = 25;

// Statuses that should trigger live movement
export const MOVING_STATUSES = new Set(["In Transit", "Out for Delivery"]);

// Statuses that pause movement (marker stays fixed)
export const PAUSED_STATUSES = new Set([
  "Arrived at Sorting Facility",
  "Customs/Processing Check",
  "At Local Depot",
  "On Hold",
  "Delivery Attempted",
]);

export function isMoving(status: string): boolean {
  return MOVING_STATUSES.has(status);
}

export function isDelivered(status: string): boolean {
  return status === "Delivered";
}

// Fetch route from OSRM and return geometry + stats
export async function fetchOSRMRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<{
  geometry: RouteGeometry;
  distanceKm: number;
  durationMinutes: number;
} | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      `?geometries=geojson&overview=full`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();

    const route = data.routes?.[0];
    if (!route?.geometry?.coordinates) return null;

    // OSRM returns [lng, lat] — convert to [lat, lng]
    const geometry: RouteGeometry = (
      route.geometry.coordinates as [number, number][]
    ).map(([lng, lat]) => [lat, lng]);

    return {
      geometry,
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
    };
  } catch {
    return null;
  }
}

// Haversine distance in km between two [lat, lng] points
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Find the [lat, lng] point at a given progress (0–1) along the route
export function interpolatePosition(
  geometry: RouteGeometry,
  progress: number,
): { lat: number; lng: number } {
  if (!geometry.length) return { lat: 0, lng: 0 };
  if (progress <= 0) return { lat: geometry[0][0], lng: geometry[0][1] };
  if (progress >= 1) {
    const last = geometry[geometry.length - 1];
    return { lat: last[0], lng: last[1] };
  }

  // Build cumulative distance along the polyline
  let total = 0;
  const cumulative: number[] = [0];
  for (let i = 1; i < geometry.length; i++) {
    total += haversine(geometry[i - 1], geometry[i]);
    cumulative.push(total);
  }

  const target = progress * total;

  for (let i = 1; i < geometry.length; i++) {
    if (cumulative[i] >= target) {
      const segLen = cumulative[i] - cumulative[i - 1];
      const t = segLen > 0 ? (target - cumulative[i - 1]) / segLen : 0;
      const a = geometry[i - 1];
      const b = geometry[i];
      return {
        lat: a[0] + (b[0] - a[0]) * t,
        lng: a[1] + (b[1] - a[1]) * t,
      };
    }
  }

  const last = geometry[geometry.length - 1];
  return { lat: last[0], lng: last[1] };
}

export function routeDurationAtSpeed(distanceKm: number): number {
  return (distanceKm / LIVE_TRACKING_SPEED_KMH) * 60;
}

export function routeProgressAtPosition(
  geometry: RouteGeometry,
  position: { lat: number; lng: number },
): number {
  if (geometry.length < 2) return 0;
  let totalDistance = 0;
  const cumulative = [0];
  for (let index = 1; index < geometry.length; index += 1) {
    totalDistance += haversine(geometry[index - 1], geometry[index]);
    cumulative.push(totalDistance);
  }
  if (!totalDistance) return 0;

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  geometry.forEach((point, index) => {
    const distance = haversine(point, [position.lat, position.lng]);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  return Math.min(0.98, cumulative[closestIndex] / totalDistance);
}

// Calculate how far along the route the parcel should be right now (0–0.98)
export function calculateProgress(
  transitStartedAt: string,
  durationMinutes: number,
): number {
  const elapsedMinutes =
    (Date.now() - new Date(transitStartedAt).getTime()) / 60000;

  let raw = Math.max(0, elapsedMinutes / durationMinutes);

  // Realistic deceleration in final 10% — parcel slows as it approaches
  if (raw > 0.9) {
    const finalPhase = Math.min((raw - 0.9) / 0.1, 1);
    raw = 0.9 + finalPhase * 0.08; // never exceeds 0.98
  }

  return Math.min(raw, 0.98);
}

// ETA = transit_started_at + route_duration
export function calculateETA(
  transitStartedAt: string,
  durationMinutes: number,
): Date {
  return new Date(
    new Date(transitStartedAt).getTime() + durationMinutes * 60 * 1000,
  );
}

// Distance remaining in km
export function distanceRemaining(
  distanceKm: number,
  progress: number,
): number {
  return Math.max(0, distanceKm * (1 - progress));
}

// Format a duration in minutes to human-readable string
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
