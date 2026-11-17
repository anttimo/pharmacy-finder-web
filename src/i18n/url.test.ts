import { localeFromUrl, urlWithLocale } from "./url";

describe("localeFromUrl", () => {
  it("reads a supported language", () => {
    expect(localeFromUrl("https://example.test/?lang=fi")).toBe("fi");
  });

  it("ignores a missing or unsupported language", () => {
    expect(localeFromUrl("https://example.test/")).toBeUndefined();
    expect(localeFromUrl("https://example.test/?lang=sv")).toBeUndefined();
  });
});

describe("urlWithLocale", () => {
  it("sets or replaces the language and keeps the rest of the URL", () => {
    expect(urlWithLocale("https://example.test/?a=1#top", "fi")).toBe(
      "https://example.test/?a=1&lang=fi#top",
    );
    expect(urlWithLocale("https://example.test/?lang=fi", "en")).toBe(
      "https://example.test/?lang=en",
    );
  });
});
