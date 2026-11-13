import { formatDistance } from "./format";

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
