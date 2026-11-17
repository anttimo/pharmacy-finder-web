import { formatDistance, telHref } from "./format";

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

  it("drops the decimal from 10 km up", () => {
    expect(normalize(formatDistance(12_600, "en"))).toBe("13 kilometres");
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
