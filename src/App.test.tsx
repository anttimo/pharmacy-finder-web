import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { loadPharmacies } from "./data/pharmacies";
import { I18nProvider } from "./i18n/I18nProvider";
import type { Locale } from "./i18n/translate";
import { mockGeolocation, pharmacy } from "./test/mocks";

// The list import is the network boundary: in the browser it fetches a JS chunk.
vi.mock("./data/pharmacies", () => ({ loadPharmacies: vi.fn() }));
const load = vi.mocked(loadPharmacies);

function renderApp(locale: Locale = "en") {
  return render(
    <I18nProvider locale={locale}>
      <App />
    </I18nProvider>,
  );
}

afterEach(() => {
  load.mockReset();
  history.replaceState(null, "", "/");
});

it("does not ask for location or load the list on page load", () => {
  const geo = mockGeolocation();
  renderApp();
  expect(screen.getByRole("heading", { level: 1, name: "Nearest pharmacy" })).toBeInTheDocument();
  expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
});

it("shows the data source, with a link to the code server, and when the data was updated", () => {
  renderApp();
  const footer = within(screen.getByRole("contentinfo"));
  expect(screen.getByRole("contentinfo")).toHaveTextContent(
    "Pharmacy data source: Finnish Medicines Agency (Fimea) / THL CodeServer (Kanta Services)",
  );
  expect(footer.getByRole("link", { name: "THL CodeServer (Kanta Services)" })).toHaveAttribute(
    "href",
    "https://koodistopalvelu.kanta.fi/",
  );
  expect(screen.getByRole("contentinfo")).toHaveTextContent(
    /Pharmacy data updated \d{1,2} \w+ \d{4}\./,
  );
});

it("lists the three nearest pharmacies, nearest first, with the required notes", async () => {
  const user = userEvent.setup();
  const geo = mockGeolocation();
  load.mockResolvedValueOnce([
    pharmacy({ id: "far", name: "Far Apteekki", lat: 60.2, lon: 24.9414 }),
    pharmacy({
      id: "near",
      name: "Near Apteekki",
      lat: 60.1729,
      lon: 24.9414,
      address: "Kaivokatu 1",
      postcode: "00100",
      city: "Helsinki",
      phone: "(09) 123 4567",
    }),
    pharmacy({ id: "middle", name: "Middle Apteekki", lat: 60.18, lon: 24.9414 }),
    pharmacy({ id: "farthest", name: "Farthest Apteekki", lat: 61, lon: 24.9414 }),
  ]);
  renderApp();

  await user.click(screen.getByRole("button", { name: "Use my location" }));
  expect(screen.getByRole("status")).toHaveTextContent("Finding your location…");
  await act(async () => geo.succeed());

  await screen.findByRole("heading", { level: 2, name: "Pharmacies near you" });
  expect(screen.getByRole("status")).toHaveTextContent("Showing the 3 nearest pharmacies.");
  // Focus stays on the button (the live region announces the results); Tab reaches them next.
  expect(screen.getByRole("button", { name: "Use my location" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("link", { name: "Call Near Apteekki, (09) 123 4567" })).toHaveFocus();

  const items = screen.getAllByRole("listitem");
  expect(items.map((li) => li.querySelector("h3")?.textContent)).toEqual([
    "Near Apteekki",
    "Middle Apteekki",
    "Far Apteekki",
  ]);
  expect(items[0]).toHaveTextContent("110 metres in a straight line");
  expect(items[0]).toHaveTextContent("Kaivokatu 1, 00100 Helsinki");
  expect(screen.getByRole("link", { name: "Call Near Apteekki, (09) 123 4567" })).toHaveAttribute(
    "href",
    "tel:+35891234567",
  );
  expect(screen.getByText(/Check opening hours with the pharmacy/)).toBeInTheDocument();
});

it("starts over when the button is tapped again while the browser hasn't answered", async () => {
  const user = userEvent.setup();
  const geo = mockGeolocation();
  load.mockResolvedValueOnce([
    pharmacy({ id: "a", name: "A Apteekki", lat: 60.172, lon: 24.9414 }),
  ]);
  renderApp();

  const button = screen.getByRole("button", { name: "Use my location" });
  await user.click(button);
  expect(screen.getByRole("status")).toHaveTextContent("Finding your location…");
  // The first request never gets an answer (e.g. a dismissed permission prompt).
  await user.click(button);
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);

  geo.ignore();
  await act(async () => geo.succeed());
  expect(await screen.findByRole("heading", { name: "Pharmacies near you" })).toBeInTheDocument();
});

it("explains what to do when location permission is denied", async () => {
  const user = userEvent.setup();
  const geo = mockGeolocation();
  renderApp();

  await user.click(screen.getByRole("button", { name: "Use my location" }));
  act(() => geo.fail(1));

  expect(await screen.findByRole("status")).toHaveTextContent("Location access is turned off.");
  expect(screen.getByText(/allow location access for this site/)).toBeInTheDocument();
});

it("offers a retry when the pharmacy list can't be loaded", async () => {
  const user = userEvent.setup();
  const geo = mockGeolocation();
  load
    .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
    .mockResolvedValueOnce([pharmacy({ id: "a", lat: 60.172, lon: 24.9414 })]);
  renderApp();

  await user.click(screen.getByRole("button", { name: "Use my location" }));
  await act(async () => geo.succeed());
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("We couldn't load pharmacy information."),
  );

  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByRole("button", { name: "Use my location" })).toHaveFocus();
  await act(async () => geo.succeed());
  expect(await screen.findByRole("heading", { name: "Pharmacies near you" })).toBeInTheDocument();
});

it("switches language and updates the page language and title", async () => {
  const user = userEvent.setup();
  renderApp("en");
  expect(document.title).toBe("Nearest pharmacy");

  const english = screen.getByRole("link", { name: "en (English)" });
  const finnish = screen.getByRole("link", { name: "fi (Suomi)" });
  expect(english).toHaveAttribute("aria-current", "true");
  expect(finnish).toHaveAttribute("href", expect.stringMatching(/\?lang=fi$/));
  await user.click(finnish);

  expect(finnish).toHaveAttribute("aria-current", "true");
  expect(english).not.toHaveAttribute("aria-current");
  expect(window.location.search).toBe("?lang=fi");
  expect(screen.getByRole("heading", { level: 1, name: "Lähin apteekki" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Käytä sijaintiani" })).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("fi");
  expect(document.title).toBe("Lähin apteekki");
});
