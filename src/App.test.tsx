import { render, screen } from "@testing-library/react";
import App from "./App";

it("renders the page heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
});
