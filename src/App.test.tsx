import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import type { Locale } from "./i18n/translate";

function renderApp(locale: Locale = "en") {
  return render(
    <I18nProvider locale={locale}>
      <App />
    </I18nProvider>,
  );
}

it("renders the page heading", () => {
  renderApp();
  expect(screen.getByRole("heading", { level: 1, name: "Nearest pharmacy" })).toBeInTheDocument();
});

it("switches language and updates the page language", async () => {
  const user = userEvent.setup();
  renderApp("en");

  await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "fi");

  expect(screen.getByRole("heading", { level: 1, name: "Lähin apteekki" })).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("fi");
});
