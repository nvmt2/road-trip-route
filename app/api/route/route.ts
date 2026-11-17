import { NextResponse } from "next/server";
import { searchPlaces, type Category } from "@/lib/places";
import { buildMapsUrl, orderNearestNeighbor, pickTop } from "@/lib/route";

const CATEGORIES: Category[] = ["food", "sights"];

function parse(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const { lat, lng, category, count } = body as Record<string, unknown>;
  if (typeof lat !== "number" || lat < -90 || lat > 90) return null;
  if (typeof lng !== "number" || lng < -180 || lng > 180) return null;
  if (!CATEGORIES.includes(category as Category)) return null;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 3 || count > 5) return null;
  return { origin: { lat, lng }, category: category as Category, count };
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

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "Server chưa cấu hình API key" }, { status: 500 });

  try {
    const found = await searchPlaces(input.origin, input.category, key);
    const places = orderNearestNeighbor(input.origin, pickTop(found, input.count));
    return NextResponse.json({ places, mapsUrl: places.length ? buildMapsUrl(input.origin, places) : null });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Không gọi được Google Places, thử lại sau" }, { status: 502 });
  }
}
