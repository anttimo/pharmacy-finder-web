---
name: add-ui-string
description: Add or change user-facing text in the web app, in Finnish, Swedish and English together. Use whenever a component needs new visible text, an aria-label, alt text or an error message.
---

# Add a UI string

1. **Reuse first.** Search the existing keys in `src/i18n/en.ts` before adding a new one.
2. **Name the key** by area, dot-separated: `results.empty.title`, `errors.locationDenied.body`.
3. **Add it to all three dictionaries in the same change:** `src/i18n/en.ts`, `fi.ts`, `sv.ts`. English is the source type, and `fi` and `sv` are typed against it, so a missing key fails typecheck. Never leave a placeholder copy of the English text.
4. **Write natural translations, not word-for-word ones.**
   - Finnish: plain written Finnish (apteekki, aukioloajat).
   - Swedish: Finland Swedish (apotek, öppettider), not Sweden-Swedish idioms.
   - Same register in all three: short, calm, polite.
5. **No string building.** Use interpolation (`{distance}`) instead of concatenation. For plurals use the `Intl.PluralRules` helper. Format numbers, distances and times with `Intl` for the active locale (Finnish uses a decimal comma).
6. **Use it** through `t('key')`. JSX has no string literals apart from punctuation.
7. **Flag uncertainty.** If you're not confident in a translation, add `// TODO(i18n-review)` on that line and list it in your summary.
8. Run `npm run typecheck`.
