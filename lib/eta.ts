import { haversineMeters } from "@/lib/utils";

export type StopCoord = { name: string; lat: number; lng: number };

export type VehicleForEta = {
  latitude: number;
  longitude: number;
  /** Metres per second, or null when the device did not report speed. */
  speed: number | null;
  lastUpdatedAt: Date | string;
};

export type StopEta = { stopIndex: number; stopName: string; etaMinutes: number | null };

const FALLBACK_SPEED_MPS = 18 * 1000 / 3600;
const MIN_TRUSTED_SPEED_MPS = 8 * 1000 / 3600;
const MAX_TRUSTED_SPEED_MPS = 60 * 1000 / 3600;
const SPEED_FRESH_MS = 3 * 60 * 1000;
const MAX_ETA_DISTANCE_METERS = 30_000;
const MAX_ROUTE_DEVIATION_METERS = 1_200;

/**
 * Projects a live vehicle onto the closest route segment, then measures the
 * remaining route distance to each later stop. The stored stop order is the
 * travel direction for this first ETA implementation.
 */
export function estimateEtas(
  vehicle: VehicleForEta,
  stops: StopCoord[],
): { nextStopIndex: number; etas: StopEta[] } {
  const etas: StopEta[] = stops.map((stop, stopIndex) => ({
    stopIndex,
    stopName: stop.name,
    etaMinutes: null,
  }));
  if (stops.length < 2) return { nextStopIndex: -1, etas };

  let closestSegment = 0;
  let closestFraction = 0;
  let closestRawFraction = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < stops.length - 1; index += 1) {
    const projection = projectToSegment(vehicle, stops[index], stops[index + 1]);
    if (projection.distanceMeters < closestDistance) {
      closestDistance = projection.distanceMeters;
      closestSegment = index;
      closestFraction = projection.fraction;
      closestRawFraction = projection.rawFraction;
    }
  }

  if (closestDistance > MAX_ROUTE_DEVIATION_METERS) return { nextStopIndex: -1, etas };
  if (closestSegment === stops.length - 2 && closestRawFraction > 1) return { nextStopIndex: -1, etas };

  const beforeFirstStop = closestSegment === 0 && closestRawFraction < 0;
  const nextStopIndex = beforeFirstStop ? 0 : closestSegment + 1;
  let remainingMeters = beforeFirstStop
    ? haversineMeters([vehicle.longitude, vehicle.latitude], [stops[0].lng, stops[0].lat])
    : distance(stops[closestSegment], stops[nextStopIndex]) * (1 - closestFraction);
  const speed = trustedSpeed(vehicle);

  for (let index = nextStopIndex; index < stops.length; index += 1) {
    if (index > nextStopIndex) {
      remainingMeters += distance(stops[index - 1], stops[index]);
    }
    etas[index].etaMinutes = remainingMeters <= MAX_ETA_DISTANCE_METERS
      ? Math.max(1, Math.round(remainingMeters / speed / 60))
      : null;
  }

  return { nextStopIndex, etas };
}

function trustedSpeed(vehicle: VehicleForEta) {
  const reported = vehicle.speed;
  const ageMs = Date.now() - new Date(vehicle.lastUpdatedAt).getTime();
  if (reported !== null && Number.isFinite(reported) && reported <= MAX_TRUSTED_SPEED_MPS && ageMs < SPEED_FRESH_MS) {
    return Math.max(reported, MIN_TRUSTED_SPEED_MPS);
  }
  return FALLBACK_SPEED_MPS;
}

/** Local equirectangular projection is accurate enough for adjacent city stops. */
function projectToSegment(vehicle: VehicleForEta, start: StopCoord, end: StopCoord) {
  const latitudeScale = 111_320;
  const longitudeScale = latitudeScale * Math.cos((vehicle.latitude * Math.PI) / 180);
  const bx = (end.lng - start.lng) * longitudeScale;
  const by = (end.lat - start.lat) * latitudeScale;
  const px = (vehicle.longitude - start.lng) * longitudeScale;
  const py = (vehicle.latitude - start.lat) * latitudeScale;
  const lengthSquared = bx * bx + by * by;
  const rawFraction = lengthSquared === 0 ? 0 : (px * bx + py * by) / lengthSquared;
  const fraction = Math.max(0, Math.min(1, rawFraction));
  const dx = px - fraction * bx;
  const dy = py - fraction * by;
  return { fraction, rawFraction, distanceMeters: Math.hypot(dx, dy) };
}

function distance(a: StopCoord, b: StopCoord) {
  return haversineMeters([a.lng, a.lat], [b.lng, b.lat]);
}
