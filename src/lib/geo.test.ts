import { haversineMeters, roundCoord } from "./geo";

describe("haversineMeters", () => {
  it("is zero for the same point", () => {
    expect(haversineMeters({ lat: 60.17, lon: 24.94 }, { lat: 60.17, lon: 24.94 })).toBe(0);
  });

  it("matches the known Helsinki–Tampere distance", () => {
    // Helsinki Central Station → Tampere station: about 160 km in a straight line.
    const d = haversineMeters({ lat: 60.1719, lon: 24.9414 }, { lat: 61.4985, lon: 23.7737 });
    expect(d / 1000).toBeCloseTo(160.3, 0);
  });
});

describe("roundCoord", () => {
  it("rounds to 3 decimals by default", () => {
    expect(roundCoord(60.171949)).toBe(60.172);
    expect(roundCoord(-0.12345)).toBe(-0.123);
  });
});
