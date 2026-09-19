import { haversineMeters } from "@/lib/utils";

export type StopCoord = { name: string; lat: number; lng: number };

export type VehicleForEta = {
  latitude: number;
  longitude: number;
  /** Direction of travel in degrees, when reported by the device. */
  heading?: number | null;
  /** Metres per second, or null when the device did not report speed. */
  speed: number | null;
  lastUpdatedAt: Date | string;
};

export type StopEta = { stopIndex: number; stopName: string; etaMinutes: number | null };
export type RouteDirection = "forward" | "reverse";
export type EtaEstimate = { nextStopIndex: number; direction: RouteDirection; etas: StopEta[] };

const FALLBACK_SPEED_MPS = 18 * 1000 / 3600;
const MIN_TRUSTED_SPEED_MPS = 8 * 1000 / 3600;
const MAX_TRUSTED_SPEED_MPS = 60 * 1000 / 3600;
const SPEED_FRESH_MS = 3 * 60 * 1000;
const MAX_ETA_DISTANCE_METERS = 30_000;
const MAX_ROUTE_DEVIATION_METERS = 1_200;

/**
 * Projects a live vehicle onto both route directions. Device heading selects
 * the most plausible direction when it is available.
 */
export function estimateEtas(
  vehicle: VehicleForEta,
  stops: StopCoord[],
): EtaEstimate {
  if (stops.length < 2) return { nextStopIndex: -1, direction: "forward", etas: emptyEtas(stops) };
  const forward = estimateDirection(vehicle, stops, "forward", (index) => index);
  const reversedStops = [...stops].reverse();
  const reverse = estimateDirection(vehicle, reversedStops, "reverse", (index) => stops.length - 1 - index);
  const chosen = forward.score <= reverse.score ? forward : reverse;
  return { nextStopIndex: chosen.nextStopIndex, direction: chosen.direction, etas: chosen.etas };
}

function estimateDirection(
  vehicle: VehicleForEta,
  orderedStops: StopCoord[],
  direction: RouteDirection,
  originalIndex: (orderedIndex: number) => number,
): EtaEstimate & { score: number } {
  const etas = emptyEtas(direction === "forward" ? orderedStops : [...orderedStops].reverse());

  let closestSegment = 0;
  let closestFraction = 0;
  let closestRawFraction = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < orderedStops.length - 1; index += 1) {
    const projection = projectToSegment(vehicle, orderedStops[index], orderedStops[index + 1]);
    if (projection.distanceMeters < closestDistance) {
      closestDistance = projection.distanceMeters;
      closestSegment = index;
      closestFraction = projection.fraction;
      closestRawFraction = projection.rawFraction;
    }
  }

  const routeBearing = bearing(orderedStops[closestSegment], orderedStops[closestSegment + 1]);
  const headingPenalty = vehicle.heading !== null && vehicle.heading !== undefined && Number.isFinite(vehicle.heading)
    ? angularDifference(vehicle.heading, routeBearing) * 12
    : direction === "reverse" ? 0.01 : 0;
  const score = closestDistance + headingPenalty;
  if (closestDistance > MAX_ROUTE_DEVIATION_METERS) return { nextStopIndex: -1, direction, etas, score: Number.POSITIVE_INFINITY };
  if (closestSegment === orderedStops.length - 2 && closestRawFraction > 1) return { nextStopIndex: -1, direction, etas, score: Number.POSITIVE_INFINITY };

  const beforeFirstStop = closestSegment === 0 && closestRawFraction < 0;
  const nextOrderedIndex = beforeFirstStop ? 0 : closestSegment + 1;
  let remainingMeters = beforeFirstStop
    ? haversineMeters([vehicle.longitude, vehicle.latitude], [orderedStops[0].lng, orderedStops[0].lat])
    : distance(orderedStops[closestSegment], orderedStops[nextOrderedIndex]) * (1 - closestFraction);
  const speed = trustedSpeed(vehicle);

  for (let index = nextOrderedIndex; index < orderedStops.length; index += 1) {
    if (index > nextOrderedIndex) {
      remainingMeters += distance(orderedStops[index - 1], orderedStops[index]);
    }
    etas[originalIndex(index)].etaMinutes = remainingMeters <= MAX_ETA_DISTANCE_METERS
      ? Math.max(1, Math.round(remainingMeters / speed / 60))
      : null;
  }

  return { nextStopIndex: originalIndex(nextOrderedIndex), direction, etas, score };
}

function emptyEtas(stops: StopCoord[]): StopEta[] {
  return stops.map((stop, stopIndex) => ({ stopIndex, stopName: stop.name, etaMinutes: null }));
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

function bearing(a: StopCoord, b: StopCoord) {
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const deltaLng = (b.lng - a.lng) * Math.PI / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function angularDifference(a: number, b: number) {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
}
