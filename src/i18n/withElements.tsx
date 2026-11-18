import { Fragment, type ReactNode } from "react";

/** Puts elements where `{name}`s are in a translated text, keeping the word order of the language. */
export function withElements(text: string, elements: Record<string, ReactNode>): ReactNode {
  // split() with a capture group alternates plain text and placeholder names.
  return text
    .split(/\{(\w+)\}/)
    .map((part, i) => <Fragment key={i}>{i % 2 === 0 ? part : elements[part]}</Fragment>);
}
