export type LatLng = { lat: number; lng: number };
export type Place = {
  id: string;
  name: string;
  address: string;
  rating: number;
  ratingCount: number;
  location: LatLng;
};

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

export function pickTop(places: Place[], n: number): Place[] {
  return [...places].sort((a, b) => b.ratingCount - a.ratingCount).slice(0, n);
}

// No real-world starting point (e.g. searching a province you're not in yet):
// use the first (most relevant) place as the anchor and visit the rest nearest-first.
export function orderFromAnchor(places: Place[]): Place[] {
  if (places.length === 0) return places;
  const [anchor, ...rest] = places;
  return [anchor, ...orderNearestNeighbor(anchor.location, rest)];
}

export function orderNearestNeighbor(start: LatLng, places: Place[]): Place[] {
  const left = [...places];
  const out: Place[] = [];
  let cur = start;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (haversineKm(cur, left[i].location) < haversineKm(cur, left[best].location)) best = i;
    }
    const [next] = left.splice(best, 1);
    out.push(next);
    cur = next.location;
  }
  return out;
}

const ll = (p: LatLng) => `${p.lat},${p.lng}`;

export function buildMapsUrl(origin: LatLng, ordered: Place[]): string {
  const dest = ordered[ordered.length - 1];
  const via = ordered.slice(0, -1);
  const q = new URLSearchParams({
    api: "1",
    origin: ll(origin),
    destination: ll(dest.location),
    travelmode: "driving",
  });
  if (via.length) {
    q.set("waypoints", via.map((p) => ll(p.location)).join("|"));
  }
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}
