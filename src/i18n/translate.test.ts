import en from "./en";
import fi from "./fi";
import { detectLocale, translate, translatePlural } from "./translate";

describe("detectLocale", () => {
  it("picks the first supported language", () => {
    expect(detectLocale(["de-DE", "fi-FI", "en"])).toBe("fi");
  });

  it("falls back to English", () => {
    expect(detectLocale(["sv-FI"])).toBe("en");
    expect(detectLocale([])).toBe("en");
  });
});

describe("translate", () => {
  it("looks up nested keys", () => {
    expect(translate(fi, "fi", "results.phone")).toBe("Puhelin:");
  });

  it("interpolates variables", () => {
    expect(translate(en, "en", "results.distance", { distance: "300 metres" })).toBe(
      "300 metres in a straight line",
    );
  });
});

describe("translatePlural", () => {
  it("chooses the plural form and formats the count", () => {
    expect(translatePlural(en, "en", "status.found", 1)).toBe("Showing the nearest pharmacy.");
    expect(translatePlural(fi, "fi", "status.found", 3)).toBe("Näytetään 3 lähintä apteekkia.");
  });
});
