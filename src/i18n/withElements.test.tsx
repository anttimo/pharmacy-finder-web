import { render } from "@testing-library/react";
import { withElements } from "./withElements";

const html = (text: string, elements: Parameters<typeof withElements>[1]) =>
  render(<p>{withElements(text, elements)}</p>).container.innerHTML;

it("puts each element where its placeholder is, in the text's own word order", () => {
  expect(html("Source: {link}.", { link: <a href="/a">A</a> })).toBe(
    '<p>Source: <a href="/a">A</a>.</p>',
  );
  expect(html("{b} before {a}", { a: <i>a</i>, b: <b>b</b> })).toBe(
    "<p><b>b</b> before <i>a</i></p>",
  );
});

it("leaves text without placeholders as it is", () => {
  expect(html("Plain text", {})).toBe("<p>Plain text</p>");
});
