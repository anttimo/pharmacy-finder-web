import { describe, expect, it } from "vitest";
import {
  applyOverride,
  type GeocodeFeature,
  geocodeQueries,
  isOpenToPublic,
  judgeMatch,
  type KantaItem,
  toRecord,
} from "./kanta.ts";

function item(
  attrs: Record<string, string>,
  expirationDate = "2100-12-31",
  beginDate = "1900-01-01",
): KantaItem {
  return {
    conceptCodeId: "1.2.246.553.1.52",
    beginDate,
    expirationDate,
    attributes: Object.entries(attrs).map(([attributeName, v]) => ({
      attributeName,
      attributeValue: [v],
    })),
  };
}

const helsinki4 = {
  LongName: "Helsingin 4. apteekki",
  Abbreviation: "Helsingin 4. apteekki",
  StreetAddress: "Mannerheimintie 1",
  PostAddress: "PL 123, 00101, Helsinki",
  PostNumber: "00100",
  PostOffice: "Helsinki",
  PhoneNumber: "(09) 123 4567",
  ApteekkiTyyppi: "Apteekki",
};

describe("toRecord", () => {
  it("maps the register attributes", () => {
    expect(toRecord(item(helsinki4))).toEqual({
      id: "1.2.246.553.1.52",
      name: "Helsingin 4. apteekki",
      address: "Mannerheimintie 1",
      postcode: "00100",
      city: "Helsinki",
      phone: "(09) 123 4567",
      branch: false,
    });
  });

  it("falls back to the postal street when there is no visiting address", () => {
    const { StreetAddress: _, ...rest } = helsinki4;
    expect(toRecord(item({ ...rest, PostAddress: "Puntarikatu 3, 20780, Kaarina" })).address).toBe(
      "Puntarikatu 3",
    );
  });

  it("marks branch pharmacies", () => {
    expect(toRecord(item({ ...helsinki4, ApteekkiTyyppi: "Sivuapteekki" })).branch).toBe(true);
  });

  it("throws on an item without a name", () => {
    expect(() => toRecord(item({ PostNumber: "00100" }))).toThrow(/Unmapped item/);
  });
});

describe("isOpenToPublic", () => {
  it("keeps open pharmacies and branches", () => {
    expect(isOpenToPublic(item(helsinki4), "2026-11-16")).toBe(true);
    expect(isOpenToPublic(item({ ApteekkiTyyppi: "Sivuapteekki" }), "2026-11-16")).toBe(true);
  });

  it("drops pharmacies that haven't opened yet", () => {
    expect(isOpenToPublic(item(helsinki4, "2100-12-31", "2026-12-01"), "2026-11-16")).toBe(false);
    expect(isOpenToPublic(item(helsinki4, "2100-12-31", "2026-11-16"), "2026-11-16")).toBe(true);
  });

  it("drops closed pharmacies", () => {
    expect(isOpenToPublic(item(helsinki4, "2026-11-15"), "2026-11-16")).toBe(false);
  });

  it("drops hospital pharmacies and medicine centres", () => {
    expect(isOpenToPublic(item({ ApteekkiTyyppi: "Sairaala-apteekki" }), "2026-11-16")).toBe(false);
    expect(isOpenToPublic(item({ ApteekkiTyyppi: "Lääkekeskus" }), "2026-11-16")).toBe(false);
  });
});

describe("judgeMatch", () => {
  const feature = (
    confidence: number,
    layer: string,
    lon = 24.94,
    lat = 60.17,
  ): GeocodeFeature => ({
    geometry: { coordinates: [lon, lat] },
    properties: { confidence, layer, label: "Mannerheimintie 1, Helsinki" },
  });

  it("accepts a confident address match", () => {
    expect(judgeMatch(feature(1, "address"))).toEqual({ lat: 60.17, lon: 24.94 });
  });

  it("rejects a missing, unsure, imprecise or out-of-country match", () => {
    expect(judgeMatch(undefined)).toBe("no match");
    expect(judgeMatch(feature(0.6, "address"))).toMatch(/^low confidence 0.6/);
    expect(judgeMatch(feature(1, "street"))).toMatch(/^imprecise match \(street/);
    expect(judgeMatch(feature(1, "address", 18.06, 59.33))).toMatch(/^outside Finland/);
  });
});

describe("geocodeQueries", () => {
  it("tries the full address first, then without the post office", () => {
    expect(geocodeQueries(toRecord(item({ ...helsinki4, PostOffice: "Söderkulla" })))).toEqual([
      "Mannerheimintie 1, 00100 Söderkulla",
      "Mannerheimintie 1, 00100",
    ]);
  });

  it("has nothing to try without an address", () => {
    const { StreetAddress: _, PostAddress: __, ...rest } = helsinki4;
    expect(geocodeQueries(toRecord(item(rest)))).toEqual([]);
  });
});

describe("applyOverride", () => {
  const override = {
    name: "Helsingin 4. apteekki",
    registerAddress: "Mannerheimintie 1",
    address: "Aleksanterinkatu 2",
    postcode: "00170",
    city: "Helsinki",
    note: "test",
  };

  it("replaces the address while the register still matches", () => {
    const { rec, stale } = applyOverride(toRecord(item(helsinki4)), override);
    expect(stale).toBe(false);
    expect(rec).toMatchObject({ address: "Aleksanterinkatu 2", postcode: "00170" });
  });

  it("keeps the register address and reports a stale override when the register changed", () => {
    const changed = toRecord(item({ ...helsinki4, StreetAddress: "Kaivokatu 1" }));
    expect(applyOverride(changed, override)).toEqual({ rec: changed, stale: true });
  });

  it("leaves records without an override alone", () => {
    const rec = toRecord(item(helsinki4));
    expect(applyOverride(rec, undefined)).toEqual({ rec, stale: false });
  });
});
