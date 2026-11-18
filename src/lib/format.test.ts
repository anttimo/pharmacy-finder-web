import { pharmacy } from "../test/mocks";
import { formatDate, formatDistance, mapsHref, telHref } from "./format";

// Intl may use non-breaking spaces between number and unit.
const normalize = (s: string) => s.replace(/\s/g, " ");

describe("formatDistance", () => {
  it("uses metres under 1 km, rounded to 10 m", () => {
    expect(normalize(formatDistance(348, "en"))).toBe("350 metres");
  });

  it("uses kilometres, with a decimal comma in Finnish", () => {
    expect(normalize(formatDistance(1234, "fi"))).toBe("1,2 kilometriä");
    expect(normalize(formatDistance(1234, "en"))).toBe("1.2 kilometres");
  });

  it("keeps one decimal from 10 km up", () => {
    expect(normalize(formatDistance(10_500, "en"))).toBe("10.5 kilometres");
    expect(normalize(formatDistance(12_640, "fi"))).toBe("12,6 kilometriä");
  });

  it("switches to kilometres when metres round up to 1000", () => {
    expect(normalize(formatDistance(996, "en"))).toBe("1 kilometre");
  });
});

describe("telHref", () => {
  it("turns a Finnish number into an international tel: link", () => {
    expect(telHref("(09) 849 2370")).toBe("tel:+35898492370");
    expect(telHref("010 5824430")).toBe("tel:+358105824430");
  });

  it("keeps a number that already has a country code", () => {
    expect(telHref("+358 40 123 4567")).toBe("tel:+358401234567");
  });
});

describe("formatDate", () => {
  it("writes the date in the active language", () => {
    expect(formatDate("2026-11-16T12:00:00.000Z", "en")).toBe("16 November 2026");
    expect(formatDate("2026-11-16T12:00:00.000Z", "fi")).toBe("16. marraskuuta 2026");
  });

  it("uses Finnish time, not the viewer's time zone", () => {
    // 23:30 UTC is already the next day in Helsinki.
    expect(formatDate("2026-11-16T23:30:00.000Z", "en")).toBe("17 November 2026");
  });
});

describe("mapsHref", () => {
  it("searches Google Maps for the pharmacy by name and address", () => {
    const href = mapsHref(
      pharmacy({
        id: "1",
        lat: 60.19,
        lon: 24.94,
        name: "Alppilan apteekki",
        address: "Fleminginkatu 1",
        postcode: "00530",
        city: "Helsinki",
      }),
    );
    const url = new URL(href);
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/search/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("query")).toBe(
      "Alppilan apteekki, Fleminginkatu 1, 00530 Helsinki",
    );
  });
});
