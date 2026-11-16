import { expect, test, type Page } from "@playwright/test";

// The pharmacy list is a dynamic import: `pharmacies-<hash>.js` in the build,
// `pharmacies.json` under the dev server.
const PHARMACY_LIST = /\/pharmacies[^/]*\.(js|json)(\?|$)/;

/** Records requests for the pharmacy list, so a test can check when it was fetched. */
function trackPharmacyListRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (PHARMACY_LIST.test(new URL(request.url()).pathname)) urls.push(request.url());
  });
  return urls;
}

/** The postcode of each listed pharmacy, from its address line ("Street 1, 00100 City"). */
async function resultPostcodes(page: Page): Promise<string[]> {
  const results = page.getByRole("region", {
    name: /pharmacies near you|lähellä olevat apteekit/i,
  });
  const texts = await results.getByRole("listitem").allInnerTexts();
  return texts.map((text) => text.match(/\b\d{5}\b/)?.[0] ?? "");
}

test.describe("Helsinki centre, English", () => {
  test.use({
    locale: "en-GB",
    permissions: ["geolocation"],
    geolocation: { latitude: 60.1699, longitude: 24.9384 },
  });

  test("shows the nearest pharmacies and loads the list only after the tap", async ({ page }) => {
    const listRequests = trackPharmacyListRequests(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { level: 1, name: "Nearest pharmacy" })).toBeVisible();
    expect(listRequests, "pharmacy list fetched before the tap").toEqual([]);

    await page.getByRole("button", { name: "Use my location" }).click();

    await expect(page.getByRole("status")).toHaveText("Showing the 3 nearest pharmacies.");
    expect(listRequests).toHaveLength(1);

    const results = page.getByRole("region", { name: "Pharmacies near you" });
    await expect(results.getByRole("listitem")).toHaveCount(3);
    await expect(results.getByRole("heading", { name: "Pharmacies near you" })).toBeFocused();
    await expect(results).toContainText("Check opening hours with the pharmacy");
    // Helsinki centre postcodes start with 00.
    for (const postcode of await resultPostcodes(page)) expect(postcode).toMatch(/^00\d{3}$/);
    await expect(results.getByRole("listitem").first()).toContainText("metres in a straight line");
  });
});

test.describe("Kalajärvi, Finnish, 320 px wide", () => {
  test.use({
    locale: "fi-FI",
    viewport: { width: 320, height: 640 },
    permissions: ["geolocation"],
    geolocation: { latitude: 60.305, longitude: 24.74 },
  });

  test("shows the nearest pharmacies without horizontal scrolling", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fi");

    await page.getByRole("button", { name: "Käytä sijaintiani" }).click();

    await expect(page.getByRole("status")).toHaveText("Näytetään 3 lähintä apteekkia.");
    const results = page.getByRole("region", { name: "Lähellä olevat apteekit" });
    await expect(results.getByRole("listitem")).toHaveCount(3);
    await expect(results).toContainText("Tarkista aukioloajat apteekista");
    // The nearest is in Espoo (02xxx); the next ones are a few km away in Vantaa (01xxx).
    const [first] = await resultPostcodes(page);
    expect(first).toMatch(/^02\d{3}$/);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "page scrolls horizontally at 320 px").toBeLessThanOrEqual(0);
  });
});

test.describe("Berlin, outside Finland", () => {
  test.use({
    locale: "en-GB",
    permissions: ["geolocation"],
    geolocation: { latitude: 52.52, longitude: 13.405 },
  });

  test("still shows the nearest pharmacies in Finland", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Use my location" }).click();

    await expect(page.getByRole("status")).toHaveText("Showing the 3 nearest pharmacies.");
    const results = page.getByRole("region", { name: "Pharmacies near you" });
    await expect(results.getByRole("listitem")).toHaveCount(3);
    // The closest Finnish pharmacies to Berlin are in Åland (postcodes 22xxx), ~930 km away.
    for (const postcode of await resultPostcodes(page)) expect(postcode).toMatch(/^22\d{3}$/);
    await expect(results.getByRole("listitem").first()).toContainText(
      /\d{3} kilometres in a straight line/,
    );
  });
});
