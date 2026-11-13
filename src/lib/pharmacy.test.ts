import { parseOverpass, sortByDistance } from "./pharmacy";

describe("parseOverpass", () => {
  it("reads nodes, and ways via their center, with name, address and hours", () => {
    const result = parseOverpass({
      elements: [
        {
          type: "node",
          id: 1,
          lat: 60.1,
          lon: 24.9,
          tags: {
            name: "Apteekki A",
            "addr:street": "Katu",
            "addr:housenumber": "5",
            "addr:postcode": "00100",
            "addr:city": "Helsinki",
            opening_hours: "Mo-Fr 08:00-20:00",
          },
        },
        { type: "way", id: 2, center: { lat: 60.2, lon: 24.8 }, tags: {} },
      ],
    });

    expect(result).toEqual([
      {
        id: "node/1",
        lat: 60.1,
        lon: 24.9,
        name: "Apteekki A",
        address: "Katu 5, 00100 Helsinki",
        openingHours: "Mo-Fr 08:00-20:00",
      },
      {
        id: "way/2",
        lat: 60.2,
        lon: 24.8,
        name: undefined,
        address: undefined,
        openingHours: undefined,
      },
    ]);
  });

  it("drops duplicates and elements without coordinates", () => {
    const result = parseOverpass({
      elements: [
        { type: "node", id: 1, lat: 1, lon: 1 },
        { type: "node", id: 1, lat: 1, lon: 1 },
        { type: "relation", id: 3 },
      ],
    });
    expect(result.map((p) => p.id)).toEqual(["node/1"]);
  });

  it("keeps a node and a way that share a numeric id", () => {
    const result = parseOverpass({
      elements: [
        { type: "node", id: 7, lat: 1, lon: 1 },
        { type: "way", id: 7, center: { lat: 2, lon: 2 } },
      ],
    });
    expect(result).toHaveLength(2);
  });

  it("returns nothing for an unexpected shape", () => {
    expect(parseOverpass(null)).toEqual([]);
    expect(parseOverpass({})).toEqual([]);
  });
});

describe("sortByDistance", () => {
  it("sorts nearest first and adds the distance", () => {
    const origin = { lat: 60, lon: 25 };
    const sorted = sortByDistance(
      [
        { id: "node/far", lat: 60.1, lon: 25 },
        { id: "node/near", lat: 60.01, lon: 25 },
      ],
      origin,
    );
    expect(sorted.map((p) => p.id)).toEqual(["node/near", "node/far"]);
    expect(sorted[0].distanceMeters).toBeCloseTo(1112, -1);
  });
});
