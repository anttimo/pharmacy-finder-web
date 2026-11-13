---
name: a11y-check
description: Accessibility review of UI changes in the web app. Use before finishing any feature or fix that changes what the user sees or interacts with.
---

# Accessibility check

Go through the changed UI and report every item as **pass**, **fail (fixed)**, **fail (open)** or **n/a**. Fix what you can, then report.

## Structure
- Landmarks (`header`, `main`, `footer`), exactly one `h1`, no skipped heading levels.
- `<html lang>` follows the active locale (fi / sv / en).
- Lists of pharmacies are real lists (`ul`/`li`).

## Keyboard
- Every control can be reached with Tab, in a logical order, with a visible focus ring.
- No focus traps. Custom controls respond to Enter/Space.
- After a search completes, focus or announcement makes the result obvious (e.g. move focus to the results heading).

## Screen readers
- Every control has an accessible name, translated via `t()`.
- Status changes (locating, "N pharmacies found", errors) are announced through the single polite live region, not several competing ones.
- Distances and hours read naturally ("350 metres", not "350m"). Add visually hidden text where the visible form is abbreviated.
- Links say where they go. Links that open a new tab or a maps app say so.

## Visual
- Contrast at least 4.5:1 for text and 3:1 for UI components and focus rings.
- Meaning never depends on colour alone (e.g. open/closed also has text).
- No horizontal scrolling at 320 px width. Usable at 200 % zoom.
- Touch targets at least 44 × 44 px. Animations respect `prefers-reduced-motion`.

## Tests
- Add or update Testing Library tests that find the new UI by role and accessible name.
- If the project has an axe test helper, run it on the changed views.

## Hand-off
End with a short list of what you could not verify automatically (e.g. a real VoiceOver or NVDA pass, zoom in Safari), so a human can check it.
