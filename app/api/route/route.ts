import { NextResponse } from "next/server";
import { searchPlaces, type Category, type Location } from "@/lib/places";
import { buildMapsUrl, orderFromAnchor, orderNearestNeighbor, pickTop } from "@/lib/route";

const CATEGORIES: Category[] = ["food", "sights"];

function parse(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const { lat, lng, near, category, count } = body as Record<string, unknown>;
  if (!CATEGORIES.includes(category as Category)) return null;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 3 || count > 5) return null;

  const location: Location | null =
    typeof near === "string" && near.trim()
      ? { near: near.trim() }
      : typeof lat === "number" && lat >= -90 && lat <= 90 && typeof lng === "number" && lng >= -180 && lng <= 180
        ? { center: { lat, lng } }
        : null;
  if (!location) return null;

  return { location, category: category as Category, count };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const input = parse(body);
  if (!input) return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });

  const key = process.env.FOURSQUARE_API_KEY;
  if (!key) return NextResponse.json({ error: "Server chưa cấu hình API key" }, { status: 500 });

  try {
    const found = await searchPlaces(input.location, input.category, key);
    const picked = pickTop(found, input.count);

    if ("center" in input.location) {
      const places = orderNearestNeighbor(input.location.center, picked);
      return NextResponse.json({ places, mapsUrl: places.length ? buildMapsUrl(input.location.center, places) : null });
    }

    const places = orderFromAnchor(picked);
    const mapsUrl = places.length > 1 ? buildMapsUrl(places[0].location, places.slice(1)) : null;
    return NextResponse.json({ places, mapsUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Không gọi được Foursquare Places, thử lại sau" }, { status: 502 });
  }
}
