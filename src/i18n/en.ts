// Source dictionary. fi.ts is typed against this shape, so a missing key fails typecheck.
// Objects with `one` / `other` are plural forms, chosen with Intl.PluralRules (see translate.ts).
const en = {
  app: {
    title: "Nearest pharmacy",
    intro: "Find the pharmacies closest to you.",
  },
  language: {
    label: "Language",
    names: {
      fi: "Suomi",
      en: "English",
    },
  },
  locate: {
    button: "Use my location",
    privacy:
      "We ask for your location only when you tap the button. It stays on your device: the nearest pharmacies are found in your browser.",
  },
  status: {
    locating: "Finding your location…",
    loading: "Looking for nearby pharmacies…",
    found: {
      one: "Showing the nearest pharmacy.",
      other: "Showing the {count} nearest pharmacies.",
    },
    denied: "Location access is turned off.",
    locationError: "We couldn't get your location.",
    networkError: "We couldn't load pharmacy information.",
  },
  denied: {
    body: "To use your location, allow location access for this site in your browser settings, then tap “Use my location” again.",
  },
  error: {
    locationBody: "Check that location services are on, then try again.",
    networkBody: "Check your internet connection, then try again.",
    retry: "Try again",
  },
  results: {
    heading: "Pharmacies near you",
    distance: "{distance} in a straight line",
    phone: "Phone:",
    // Accessible name of the phone link. Must contain {phone}, the visible link text.
    call: "Call {name}, {phone}",
    checkHours:
      "Check opening hours with the pharmacy before you go. This list may not include every pharmacy.",
    distanceNote: "Distances are measured in a straight line. The route there is longer.",
  },
  footer: {
    // {codeServer} is replaced by a link with the footer.codeServer text.
    source: "Pharmacy data source: Finnish Medicines Agency (Fimea) / {codeServer}",
    codeServer: "THL CodeServer (Kanta Services)",
    // {date} is replaced by the date the list was generated, e.g. "16 November 2026".
    updated: "Pharmacy data updated {date}.",
  },
} as const;

export default en;
