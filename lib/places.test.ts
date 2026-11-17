import { describe, expect, it, vi } from "vitest";
import { searchPlaces } from "./places";

const okResponse = (places: unknown[]) =>
  new Response(JSON.stringify({ places }), { status: 200, headers: { "content-type": "application/json" } });

describe("searchPlaces", () => {
  it("sends filters and maps the response", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse([
        { id: "x", displayName: { text: "Bún bò" }, formattedAddress: "Huế", rating: 4.6, userRatingCount: 900, location: { latitude: 16.4, longitude: 107.5 } },
        { id: "noloc", displayName: { text: "Ghost" }, rating: 4.9, userRatingCount: 1 },
      ]),
    );
    const r = await searchPlaces({ lat: 16.46, lng: 107.59 }, "food", "KEY", fetchFn);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(init.headers["X-Goog-Api-Key"]).toBe("KEY");
    const body = JSON.parse(init.body);
    expect(body.openNow).toBe(true);
    expect(body.minRating).toBe(4.0);
    expect(body.includedType).toBe("restaurant");
    expect(body.locationBias.circle.radius).toBe(5000);
    expect(body.locationBias.circle.center).toEqual({ latitude: 16.46, longitude: 107.59 });
    expect(r).toEqual([{ id: "x", name: "Bún bò", address: "Huế", rating: 4.6, ratingCount: 900, location: { lat: 16.4, lng: 107.5 } }]);
  });

  it("keeps only rating >= 4.3 after the response (API rounds minRating to 0.5 steps)", async () => {
    const loc = { latitude: 1, longitude: 1 };
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse([
        { id: "keep44", displayName: { text: "a" }, rating: 4.4, userRatingCount: 3000, location: loc },
        { id: "keep43", displayName: { text: "b" }, rating: 4.3, userRatingCount: 10, location: loc },
        { id: "drop42", displayName: { text: "c" }, rating: 4.2, userRatingCount: 9000, location: loc },
      ]),
    );
    const r = await searchPlaces({ lat: 0, lng: 0 }, "food", "KEY", fetchFn);
    expect(r.map((p) => p.id)).toEqual(["keep44", "keep43"]);
  });

  it("uses tourist_attraction for sights", async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([]));
    await searchPlaces({ lat: 0, lng: 0 }, "sights", "KEY", fetchFn);
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).includedType).toBe("tourist_attraction");
  });

  it("returns [] when Google omits places", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await searchPlaces({ lat: 0, lng: 0 }, "food", "KEY", fetchFn)).toEqual([]);
  });

  it("throws on non-200", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("denied", { status: 403 }));
    await expect(searchPlaces({ lat: 0, lng: 0 }, "food", "KEY", fetchFn)).rejects.toThrow();
  });
});
