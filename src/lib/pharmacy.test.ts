import { nearest, type Pharmacy } from "./pharmacy";

const pharmacy = (id: string, lat: number): Pharmacy => ({
  id,
  lat,
  lon: 25,
  name: id,
  address: "Katu 1",
  postcode: "00100",
  city: "Helsinki",
  branch: false,
});

describe("nearest", () => {
  it("returns the nearest ones first, with the distance", () => {
    const origin = { lat: 60, lon: 25 };
    const result = nearest(
      [pharmacy("far", 60.1), pharmacy("near", 60.01), pharmacy("middle", 60.05)],
      origin,
      2,
    );
    expect(result.map((p) => p.id)).toEqual(["near", "middle"]);
    expect(result[0].distanceMeters).toBeCloseTo(1112, -1);
  });

  it("returns everything when there are fewer than asked for", () => {
    expect(nearest([pharmacy("only", 60.1)], { lat: 60, lon: 25 }, 3)).toHaveLength(1);
  });
});
