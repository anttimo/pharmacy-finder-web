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

  const heading = await screen.findByRole("heading", { level: 2, name: "Pharmacies near you" });
  expect(screen.getByRole("status")).toHaveTextContent("Showing the 3 nearest pharmacies.");
  // Focus moves to the results, so they are noticed; Tab goes on into them.
  expect(heading).toHaveFocus();
  await user.tab();
  expect(
    screen.getByRole("link", { name: "Show on Google Maps: Near Apteekki (opens in a new tab)" }),
  ).toHaveFocus();
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
  const map = screen.getByRole("link", {
    name: "Show on Google Maps: Near Apteekki (opens in a new tab)",
  });
  expect(map).toHaveTextContent("Show on Google Maps");
  expect(map).toHaveAttribute("target", "_blank");
  expect(map).toHaveAttribute(
    "href",
    expect.stringContaining(encodeURIComponent("Near Apteekki, Kaivokatu 1, 00100 Helsinki")),
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

describe("address search", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const places = (...labels: string[]) =>
    Response.json({
      results: labels.map((label, i) => ({ label, lat: 60.17 + i / 10, lon: 24.93 })),
    });

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    load.mockResolvedValue([
      pharmacy({ id: "kamppi", name: "Kamppi Apteekki", lat: 60.169, lon: 24.931 }),
      pharmacy({ id: "far", name: "Far Apteekki", lat: 61.5, lon: 23.8 }),
    ]);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  const field = () => screen.getByRole("combobox", { name: "Address or place" });

  it("chooses a suggestion with the keyboard and lists pharmacies near it", async () => {
    const user = userEvent.setup();
    const geo = mockGeolocation();
    fetchMock.mockResolvedValue(places("Kamppi, Helsinki", "Kampinkuja, Helsinki"));
    renderApp();

    await user.type(field(), "kamp");
    const listbox = await screen.findByRole("listbox", { name: "Address or place" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(2);
    expect(field()).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2 suggestions."));

    await user.keyboard("{ArrowDown}");
    const first = screen.getByRole("option", { name: "Kamppi, Helsinki" });
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(field()).toHaveAttribute("aria-activedescendant", first.id);
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("heading", { name: "Pharmacies near Kamppi, Helsinki" }),
    ).toBeInTheDocument();
    expect(field()).toHaveValue("Kamppi, Helsinki");
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Showing the 2 nearest pharmacies.");
    expect(screen.getByText(/Check opening hours with the pharmacy/)).toBeInTheDocument();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();

    // Only the text and language go to our own proxy: no location, no key.
    const url = new URL(String(fetchMock.mock.calls.at(-1)![0]), "https://example.test");
    expect(url.pathname).toBe("/api/geocode");
    expect([...url.searchParams.keys()].sort()).toEqual(["lang", "text"]);
  });

  it("chooses a suggestion with a click", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(places("Kamppi, Helsinki"));
    renderApp();

    await user.type(field(), "kamp");
    await user.click(await screen.findByRole("option", { name: "Kamppi, Helsinki" }));
    expect(
      await screen.findByRole("heading", { name: "Pharmacies near Kamppi, Helsinki" }),
    ).toBeInTheDocument();
  });

  it("takes the top suggestion on Enter, even before suggestions arrive", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(places("Kamppi, Helsinki", "Kampinkuja, Helsinki"));
    renderApp();

    await user.type(field(), "kamp{Enter}");
    expect(
      await screen.findByRole("heading", { name: "Pharmacies near Kamppi, Helsinki" }),
    ).toBeInTheDocument();
  });

  it("says when no places match", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(places());
    renderApp();

    await user.type(field(), "zzqq");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No places found."));
    expect(field()).toHaveAttribute("aria-expanded", "false");
  });

  it("offers a retry when search fails, and keeps location available", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(Response.json({ error: "upstream_error" }, { status: 502 }))
      .mockResolvedValue(places("Kamppi, Helsinki"));
    renderApp();

    await user.type(field(), "kamp");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Address search isn't working"),
    );
    expect(screen.getByRole("button", { name: "Use my location" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(field()).toHaveFocus();
    expect(await screen.findByRole("option", { name: "Kamppi, Helsinki" })).toBeInTheDocument();
  });

  it("closes the list with Escape, then clears the field", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(places("Kamppi, Helsinki"));
    renderApp();

    await user.type(field(), "kamp");
    await screen.findByRole("option", { name: "Kamppi, Helsinki" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 suggestion."));
    await user.keyboard("{Escape}");
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(field()).toHaveValue("kamp");
    // A closed list can't be reached, so its count isn't announced any more.
    expect(screen.getByRole("status")).toHaveTextContent("");
    await user.keyboard("{Escape}");
    expect(field()).toHaveValue("");
  });

  /** Chooses Kamppi, so there are results on screen to lose. */
  async function searchKamppi(user: ReturnType<typeof userEvent.setup>) {
    await user.type(field(), "kamp");
    await user.click(await screen.findByRole("option", { name: "Kamppi, Helsinki" }));
    return screen.findByRole("heading", { name: "Pharmacies near Kamppi, Helsinki" });
  }

  it("retries a failed search near the same place", async () => {
    const user = userEvent.setup();
    const geo = mockGeolocation();
    fetchMock.mockResolvedValue(places("Kamppi, Helsinki"));
    load.mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"));
    renderApp();

    await user.type(field(), "kamp");
    await user.click(await screen.findByRole("option", { name: "Kamppi, Helsinki" }));
    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", { name: "Pharmacies near Kamppi, Helsinki" }),
    ).toBeInTheDocument();
    expect(field()).toHaveValue("Kamppi, Helsinki");
    expect(load).toHaveBeenCalledTimes(2);
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("moves focus to the new results", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(places("Kamppi, Helsinki"));
    renderApp();

    const heading = await searchKamppi(user);
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it("marks an address that wasn't found as invalid on leaving, and drops the old results", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(places("Kamppi, Helsinki")).mockResolvedValue(places());
    renderApp();
    const heading = await searchKamppi(user);

    await user.clear(field());
    await user.type(field(), "zzqq");
    await waitFor(() => expect(field()).toHaveAccessibleDescription(/No places found/));
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(heading).toBeInTheDocument(); // still typing: nothing dropped yet

    await user.tab();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription(/No places found/);
    expect(screen.getByRole("status")).toHaveTextContent("No places found");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();

    // Typing again takes the error away.
    await user.type(field(), "x");
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("asks to choose from the suggestions when leaving without choosing", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(places("Kamppi, Helsinki"));
    renderApp();

    await user.type(field(), "kamp");
    await screen.findByRole("option", { name: "Kamppi, Helsinki" });
    await user.tab();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription(/Choose a place from the suggestions/);
  });

  it("marks the field invalid on Enter when nothing matches", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(places());
    renderApp();

    await user.type(field(), "zzqq");
    await waitFor(() => expect(field()).toHaveAccessibleDescription(/No places found/));
    await user.keyboard("{Enter}");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveFocus();
  });

  it.each([
    ["Enter", "{Enter}"],
    ["leaving the field", "{Tab}"],
  ])("asks for at least two letters on %s with one", async (_, key) => {
    const user = userEvent.setup();
    renderApp();

    await user.type(field(), `k${key}`);
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription(/Type at least two letters/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forgets an Enter still waiting for suggestions once the user leaves the field", async () => {
    const user = userEvent.setup();
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    renderApp();

    await user.type(field(), "kamp{Enter}");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await user.tab();
    const focusedAfterLeaving = document.activeElement;
    expect(field()).toHaveAttribute("aria-invalid", "true");

    await act(async () => answer(places("Kamppi, Helsinki")));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(field()).toHaveValue("kamp");
    expect(document.activeElement).toBe(focusedAfterLeaving);
  });

  it("doesn't judge new text by the old text's 'no matches' on a quick Enter", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(places()).mockResolvedValue(places("Kamppi, Helsinki"));
    renderApp();

    await user.type(field(), "kampx");
    await waitFor(() => expect(field()).toHaveAccessibleDescription(/No places found/));
    await user.keyboard("{Backspace}{Enter}");
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(
      await screen.findByRole("heading", { name: "Pharmacies near Kamppi, Helsinki" }),
    ).toBeInTheDocument();
  });

  it("offers location first, then the search field", () => {
    renderApp();
    const button = screen.getByRole("button", { name: "Use my location" });
    expect(button.compareDocumentPosition(field()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("clears the field when the location button is used", async () => {
    const user = userEvent.setup();
    const geo = mockGeolocation();
    fetchMock.mockResolvedValue(places("Kamppi, Helsinki"));
    renderApp();

    await user.type(field(), "kamp");
    await screen.findByRole("option", { name: "Kamppi, Helsinki" });
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    expect(field()).toHaveValue("");
    await act(async () => geo.succeed());
    expect(await screen.findByRole("heading", { name: "Pharmacies near you" })).toBeInTheDocument();
  });
});
