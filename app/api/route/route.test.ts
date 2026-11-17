import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/places", () => ({ searchPlaces: vi.fn() }));
import { searchPlaces } from "@/lib/places";
import { POST } from "./route";

const mocked = vi.mocked(searchPlaces);
const req = (body: unknown) =>
  new Request("http://localhost/api/route", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const valid = { lat: 0, lng: 0, category: "food", count: 2 };
const mk = (id: string, lng: number, ratingCount: number) => ({
  id, name: id, address: "", rating: 4.5, ratingCount, location: { lat: 0, lng },
});

beforeEach(() => { process.env.GOOGLE_MAPS_API_KEY = "KEY"; mocked.mockReset(); });
afterEach(() => { delete process.env.GOOGLE_MAPS_API_KEY; });

describe("POST /api/route", () => {
  it.each([
    ["not json", "{"],
    ["bad lat", { ...valid, lat: 200 }],
    ["bad category", { ...valid, category: "bar" }],
    ["count too low", { ...valid, count: 2.5 }],
    ["count 6", { ...valid, count: 6 }],
    ["count 2", { ...valid, count: 2 }],
  ])("400 on %s", async (_n, body) => {
    const res = await POST(req(body));
    expect(res.status).toBe(400);
  });

  it("500 when key missing", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const res = await POST(req({ ...valid, count: 3 }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });

  it("502 when Google fails", async () => {
    mocked.mockRejectedValue(new Error("boom secret detail"));
    const res = await POST(req({ ...valid, count: 3 }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });

  it("returns top-N ordered places and maps url", async () => {
    mocked.mockResolvedValue([mk("far", 3, 900), mk("near", 1, 800), mk("low", 2, 5), mk("mid", 2, 700)]);
    const res = await POST(req({ ...valid, count: 3 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.places.map((p: { id: string }) => p.id)).toEqual(["near", "mid", "far"]);
    expect(data.mapsUrl).toContain("destination_place_id=far");
  });

  it("empty result gives null mapsUrl", async () => {
    mocked.mockResolvedValue([]);
    const data = await (await POST(req({ ...valid, count: 4 }))).json();
    expect(data).toEqual({ places: [], mapsUrl: null });
  });
});
