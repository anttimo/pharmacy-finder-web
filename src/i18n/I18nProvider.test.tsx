import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { I18nProvider } from "./I18nProvider";

// No `locale` prop here: these tests cover how the starting language is chosen and saved.
function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

function browserLanguages(languages: string[]) {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(languages);
}

const finnishHeading = () => screen.getByRole("heading", { level: 1, name: "Lähin apteekki" });
const englishHeading = () => screen.getByRole("heading", { level: 1, name: "Nearest pharmacy" });

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

it("starts in the browser's language", () => {
  browserLanguages(["fi-FI", "en"]);
  renderApp();
  expect(finnishHeading()).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("fi");
});

it("remembers the chosen language over the browser's", async () => {
  const user = userEvent.setup();
  browserLanguages(["en-GB"]);
  const { unmount } = renderApp();

  await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "fi");
  unmount();
  renderApp(); // a later visit

  expect(finnishHeading()).toBeInTheDocument();
});

it("ignores a saved value that isn't a supported language", () => {
  browserLanguages(["en-GB"]);
  localStorage.setItem("locale", "sv");
  renderApp();
  expect(englishHeading()).toBeInTheDocument();
});

it("still works when storage is blocked", async () => {
  const user = userEvent.setup();
  browserLanguages(["fi-FI"]);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  renderApp();
  expect(finnishHeading()).toBeInTheDocument();

  // Switching still applies for this visit even though it can't be saved.
  await user.selectOptions(screen.getByRole("combobox", { name: "Kieli" }), "en");
  expect(englishHeading()).toBeInTheDocument();
});
