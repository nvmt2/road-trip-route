import { describe, expect, it, vi } from "vitest";
import { searchPlaces } from "./places";

const okResponse = (results: unknown[]) =>
  new Response(JSON.stringify({ results }), { status: 200, headers: { "content-type": "application/json" } });

describe("searchPlaces (spike: Foursquare free fields, no rating)", () => {
  it("sends filters and maps the response for a center point", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse([
        { fsq_place_id: "x", name: "Bún bò", location: { formatted_address: "Huế" }, latitude: 16.4, longitude: 107.5 },
        { fsq_place_id: "noloc", name: "Ghost" },
      ]),
    );
    const r = await searchPlaces({ center: { lat: 16.46, lng: 107.59 } }, "food", "KEY", fetchFn);
    const [rawUrl, init] = fetchFn.mock.calls[0];
    const url = new URL(rawUrl);
    expect(url.origin + url.pathname).toBe("https://places-api.foursquare.com/places/search");
    expect(url.searchParams.get("ll")).toBe("16.46,107.59");
    expect(url.searchParams.get("radius")).toBe("5000");
    expect(url.searchParams.has("near")).toBe(false);
    expect(url.searchParams.get("open_now")).toBe("true");
    expect(init.headers.Authorization).toBe("Bearer KEY");
    expect(init.headers["X-Places-Api-Version"]).toBe("2025-06-17");
    expect(r).toEqual([{ id: "x", name: "Bún bò", address: "Huế", rating: 0, ratingCount: 0, location: { lat: 16.4, lng: 107.5 } }]);
  });

  it("sends 'near' and omits ll/radius for a place name", async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([]));
    await searchPlaces({ near: "Đà Nẵng" }, "food", "KEY", fetchFn);
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.searchParams.get("near")).toBe("Đà Nẵng");
    expect(url.searchParams.has("ll")).toBe(false);
    expect(url.searchParams.has("radius")).toBe(false);
  });

  it("uses the sights query", async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([]));
    await searchPlaces({ center: { lat: 0, lng: 0 } }, "sights", "KEY", fetchFn);
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.searchParams.get("query")).toBe("điểm tham quan");
  });

  it("drops results missing coordinates or id", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse([{ fsq_place_id: "keep", name: "a", latitude: 1, longitude: 1 }, { name: "no id", latitude: 1, longitude: 1 }]),
    );
    const r = await searchPlaces({ center: { lat: 0, lng: 0 } }, "food", "KEY", fetchFn);
    expect(r.map((p) => p.id)).toEqual(["keep"]);
  });

  it("returns [] when Foursquare omits results", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await searchPlaces({ center: { lat: 0, lng: 0 } }, "food", "KEY", fetchFn)).toEqual([]);
  });

  it("throws on non-200", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("denied", { status: 403 }));
    await expect(searchPlaces({ center: { lat: 0, lng: 0 } }, "food", "KEY", fetchFn)).rejects.toThrow();
  });
});
