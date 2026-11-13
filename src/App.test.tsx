import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import type { Locale } from "./i18n/translate";
import { jsonResponse, mockFetch, mockGeolocation, overpassResponse } from "./test/mocks";

function renderApp(locale: Locale = "en") {
  return render(
    <I18nProvider locale={locale}>
      <App />
    </I18nProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("does not ask for location on page load", () => {
  const geo = mockGeolocation();
  renderApp();
  expect(screen.getByRole("heading", { level: 1, name: "Nearest pharmacy" })).toBeInTheDocument();
  expect(geo.getCurrentPosition).not.toHaveBeenCalled();
});

it("lists nearby pharmacies, nearest first, with the required notes", async () => {
  const user = userEvent.setup();
  const geo = mockGeolocation();
  mockFetch(
    overpassResponse([
      { id: 1, lat: 60.18, lon: 24.9414, tags: { name: "Far Apteekki" } },
      {
        id: 2,
        lat: 60.1729,
        lon: 24.9414,
        tags: { name: "Near Apteekki", opening_hours: "Mo-Fr 08:00-20:00" },
      },
    ]),
  );
  renderApp();

  await user.click(screen.getByRole("button", { name: "Use my location" }));
  expect(screen.getByRole("status")).toHaveTextContent("Finding your location…");
  geo.succeed();

  const heading = await screen.findByRole("heading", { level: 2, name: "Pharmacies near you" });
  expect(heading).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent("2 pharmacies found within 2 kilometres.");

  const items = screen.getAllByRole("listitem");
  expect(items.map((li) => li.querySelector("h3")?.textContent)).toEqual([
    "Near Apteekki",
    "Far Apteekki",
  ]);
  expect(items[0]).toHaveTextContent("110 metres in a straight line");
  expect(items[0]).toHaveTextContent("Opening hours: Mo-Fr 08:00-20:00");
  expect(screen.getByText(/Check opening hours with the pharmacy/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "© OpenStreetMap contributors" })).toBeInTheDocument();
});

it("explains what to do when location permission is denied", async () => {
  const user = userEvent.setup();
  const geo = mockGeolocation();
  renderApp();

  await user.click(screen.getByRole("button", { name: "Use my location" }));
  geo.fail(1);

  expect(await screen.findByRole("status")).toHaveTextContent("Location access is turned off.");
  expect(screen.getByText(/allow location access for this site/)).toBeInTheDocument();
});

it("offers a retry after a network error", async () => {
  const user = userEvent.setup();
  const geo = mockGeolocation();
  mockFetch(
    new TypeError("Failed to fetch"),
    new TypeError("Failed to fetch"),
    overpassResponse([{ id: 1, lat: 60.172, lon: 24.9414, tags: { name: "Apteekki" } }]),
  );
  renderApp();

  await user.click(screen.getByRole("button", { name: "Use my location" }));
  geo.succeed();
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("We couldn't load pharmacy information."),
  );

  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByRole("button", { name: "Use my location" })).toHaveFocus();
  geo.succeed();
  expect(await screen.findByRole("heading", { name: "Pharmacies near you" })).toBeInTheDocument();
});

it("says so when nothing is found within the widest radius", async () => {
  const user = userEvent.setup();
  const geo = mockGeolocation();
  mockFetch(overpassResponse([]), overpassResponse([]), jsonResponse({ elements: [] }));
  renderApp();

  await user.click(screen.getByRole("button", { name: "Use my location" }));
  geo.succeed();

  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "No pharmacies found within 50 kilometres.",
    ),
  );
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

it("switches language and updates the page language", async () => {
  const user = userEvent.setup();
  renderApp("en");

  await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "fi");

  expect(screen.getByRole("heading", { level: 1, name: "Lähin apteekki" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Käytä sijaintiani" })).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("fi");
});
