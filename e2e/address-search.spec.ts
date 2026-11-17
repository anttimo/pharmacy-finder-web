import { expect, test, type Page } from "@playwright/test";

// /api/geocode is stubbed: CI has no Digitransit key, and these tests check the search UI,
// not Digitransit. The Worker itself is tested in worker/geocode.test.ts.
const KAMPPI = { label: "Kamppi, Helsinki", lat: 60.1685, lon: 24.9305 };
const SUGGESTIONS = [KAMPPI, { label: "Kampinkuja, Helsinki", lat: 60.168, lon: 24.93 }];

/** Answers address search with `results` and records each request's query. */
async function stubGeocode(page: Page, results: object[]): Promise<URLSearchParams[]> {
  const queries: URLSearchParams[] = [];
  await page.route("**/api/geocode?*", (route) => {
    queries.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: { results } });
  });
  return queries;
}

test.describe("English", () => {
  test.use({ locale: "en-GB" });

  test("chooses a place with the keyboard and lists the pharmacies near it", async ({ page }) => {
    const queries = await stubGeocode(page, SUGGESTIONS);
    await page.goto("/");

    const field = page.getByRole("combobox", { name: "Address or place" });
    await field.pressSequentially("kamp");
    const listbox = page.getByRole("listbox", { name: "Address or place" });
    await expect(listbox.getByRole("option")).toHaveCount(2);

    await field.press("ArrowDown");
    await expect(page.getByRole("option", { name: "Kamppi, Helsinki" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await field.press("Enter");

    const results = page.getByRole("region", { name: "Pharmacies near Kamppi, Helsinki" });
    await expect(results.getByRole("listitem")).toHaveCount(3);
    await expect(results).toContainText("Check opening hours with the pharmacy");
    await expect(page.getByRole("status")).toHaveText("Showing the 3 nearest pharmacies.");
    await expect(field).toBeFocused();
    await expect(listbox).toBeHidden();

    // Debounced: not one request per letter. Only text and language are sent.
    expect(queries.length).toBeLessThan(3);
    expect([...queries.at(-1)!.keys()].sort()).toEqual(["lang", "text"]);
  });
});

test.describe("Finnish, 320 px wide", () => {
  test.use({ locale: "fi-FI", viewport: { width: 320, height: 640 } });

  test("fits the search and its suggestions without horizontal scrolling", async ({ page }) => {
    await stubGeocode(page, SUGGESTIONS);
    await page.goto("/");

    await page.getByRole("combobox", { name: "Osoite tai paikka" }).pressSequentially("kamp");
    await expect(page.getByRole("option")).toHaveCount(2);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "page scrolls horizontally at 320 px").toBeLessThanOrEqual(0);

    await page.getByRole("option", { name: "Kamppi, Helsinki" }).click();
    await expect(
      page.getByRole("region", { name: "Lähimmät apteekit: Kamppi, Helsinki" }),
    ).toBeVisible();
  });
});
