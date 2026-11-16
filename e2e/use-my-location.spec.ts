import { expect, test, type Locator, type Page } from "@playwright/test";

// These tests check how the app behaves, not what the pharmacy list contains: a rebuild of
// pharmacies.json mustn't break them. The data itself is checked in src/data/pharmacies.test.ts.

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

/**
 * The distance of each listed pharmacy in metres, read from its text ("350 metres",
 * "1.2 kilometres", "1,2 kilometriä").
 */
async function resultDistances(results: Locator): Promise<number[]> {
  const texts = await results.getByRole("listitem").allInnerTexts();
  return texts.map((text) => {
    const match = text.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*(kilo)?metr/);
    if (!match) throw new Error(`No distance in: ${text}`);
    const value = Number(match[1].replace(/\s/g, "").replace(",", "."));
    return match[2] ? value * 1000 : value;
  });
}

/** Expects exactly three results, nearest first. */
async function expectThreeNearestFirst(results: Locator) {
  await expect(results.getByRole("listitem")).toHaveCount(3);
  const distances = await resultDistances(results);
  expect(distances).toEqual(distances.toSorted((a, b) => a - b));
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
    await expectThreeNearestFirst(results);
    await expect(page.getByRole("button", { name: "Use my location" })).toBeFocused();
    await expect(results).toContainText("Check opening hours with the pharmacy");
    await expect(results.getByRole("listitem").first()).toContainText("in a straight line");
  });
});

test.describe("Finnish, 320 px wide", () => {
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
    await expectThreeNearestFirst(results);
    await expect(results).toContainText("Tarkista aukioloajat apteekista");

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
    await expectThreeNearestFirst(results);
    await expect(results.getByRole("listitem").first()).toContainText(
      "kilometres in a straight line",
    );
  });
});
