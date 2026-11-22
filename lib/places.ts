import "server-only";
import type { LatLng, Place } from "./route";

export type Category = "food" | "sights";
export type Location = { center: LatLng } | { near: string };

// SPIKE: Foursquare free tier has no rating/review-count data (those are
// paid "Pro Fields"), so this just returns open, nearby matches ranked by
// Foursquare's default relevance — no quality filter.
const ENDPOINT = "https://places-api.foursquare.com/places/search";
const API_VERSION = "2025-06-17";
const FIELDS = "fsq_place_id,name,location,latitude,longitude";

const QUERIES: Record<Category, string> = {
  food: "quán ăn ngon địa phương",
  sights: "điểm tham quan",
};

type FsqPlace = {
  fsq_place_id?: string;
  name?: string;
  location?: { formatted_address?: string };
  latitude?: number;
  longitude?: number;
};

export async function searchPlaces(
  location: Location,
  category: Category,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Place[]> {
  const params = new URLSearchParams({
    query: QUERIES[category],
    open_now: "true",
    limit: "20",
    fields: FIELDS,
  });
  if ("center" in location) {
    params.set("ll", `${location.center.lat},${location.center.lng}`);
    params.set("radius", "5000");
  } else {
    params.set("near", location.near);
  }
  const res = await fetchFn(`${ENDPOINT}?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "X-Places-Api-Version": API_VERSION, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { results?: FsqPlace[] };
  return (data.results ?? []).flatMap((p) =>
    p.fsq_place_id && typeof p.latitude === "number" && typeof p.longitude === "number"
      ? [{
          id: p.fsq_place_id,
          name: p.name ?? "(không tên)",
          address: p.location?.formatted_address ?? "",
          rating: 0,
          ratingCount: 0,
          location: { lat: p.latitude, lng: p.longitude },
        }]
      : [],
  );
}
