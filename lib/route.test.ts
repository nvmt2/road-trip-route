import { describe, expect, it } from "vitest";
import { buildMapsUrl, haversineKm, orderFromAnchor, orderNearestNeighbor, pickTop, type Place } from "./route";

const mk = (id: string, lat: number, lng: number, ratingCount = 100): Place => ({
  id, name: id, address: "", rating: 4.5, ratingCount, location: { lat, lng },
});

describe("haversineKm", () => {
  it("Hanoi to HCMC is about 1137 km", () => {
    const d = haversineKm({ lat: 21.0285, lng: 105.8542 }, { lat: 10.8231, lng: 106.6297 });
    expect(Math.abs(d - 1137)).toBeLessThanOrEqual(15);
  });
});

describe("pickTop", () => {
  it("returns highest ratingCount first, at most n", () => {
    const r = pickTop([mk("a", 0, 0, 10), mk("b", 0, 0, 500), mk("c", 0, 0, 50)], 2);
    expect(r.map((p) => p.id)).toEqual(["b", "c"]);
  });
  it("returns all when fewer than n", () => {
    expect(pickTop([mk("a", 0, 0)], 4)).toHaveLength(1);
  });
});

describe("orderNearestNeighbor", () => {
  it("visits nearest first", () => {
    const r = orderNearestNeighbor({ lat: 0, lng: 0 }, [mk("p3", 0, 3), mk("p1", 0, 1), mk("p2", 0, 2)]);
    expect(r.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });
});

describe("orderFromAnchor", () => {
  it("keeps the first place as anchor and orders the rest nearest-first", () => {
    const r = orderFromAnchor([mk("anchor", 0, 0), mk("p3", 0, 3), mk("p1", 0, 1), mk("p2", 0, 2)]);
    expect(r.map((p) => p.id)).toEqual(["anchor", "p1", "p2", "p3"]);
  });
  it("handles an empty list", () => {
    expect(orderFromAnchor([])).toEqual([]);
  });
});

describe("buildMapsUrl", () => {
  it("uses last place as destination and others as waypoints", () => {
    const url = new URL(buildMapsUrl({ lat: 1, lng: 2 }, [mk("A", 10, 11), mk("B", 20, 21), mk("C", 30, 31)]));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    const q = url.searchParams;
    expect(q.get("api")).toBe("1");
    expect(q.get("origin")).toBe("1,2");
    expect(q.get("destination")).toBe("30,31");
    expect(q.get("waypoints")).toBe("10,11|20,21");
    expect(q.get("travelmode")).toBe("driving");
  });
  it("omits waypoints with a single place", () => {
    const q = new URL(buildMapsUrl({ lat: 1, lng: 2 }, [mk("A", 10, 11)])).searchParams;
    expect(q.has("waypoints")).toBe(false);
    expect(q.get("destination")).toBe("10,11");
  });
});
