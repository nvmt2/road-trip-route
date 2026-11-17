import "server-only";
import type { LatLng, Place } from "./route";

export type Category = "food" | "sights";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location";

const QUERIES: Record<Category, { textQuery: string; includedType: string }> = {
  food: { textQuery: "quán ăn ngon địa phương", includedType: "restaurant" },
  sights: { textQuery: "điểm tham quan", includedType: "tourist_attraction" },
};

type GPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
};

export async function searchPlaces(
  center: LatLng,
  category: Category,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Place[]> {
  const res = await fetchFn(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify({
      ...QUERIES[category],
      openNow: true,
      minRating: 4.3,
      pageSize: 20,
      languageCode: "vi",
      locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: 5000 } },
    }),
  });
  if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: GPlace[] };
  return (data.places ?? []).flatMap((p) =>
    p.id && typeof p.location?.latitude === "number" && typeof p.location?.longitude === "number"
      ? [{
          id: p.id,
          name: p.displayName?.text ?? "(không tên)",
          address: p.formattedAddress ?? "",
          rating: p.rating ?? 0,
          ratingCount: p.userRatingCount ?? 0,
          location: { lat: p.location.latitude, lng: p.location.longitude },
        }]
      : [],
  );
}
