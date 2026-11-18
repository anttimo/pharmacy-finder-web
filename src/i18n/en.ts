// Source dictionary. fi.ts is typed against this shape, so a missing key fails typecheck.
// Objects with `one` / `other` are plural forms, chosen with Intl.PluralRules (see translate.ts).
const en = {
  app: {
    title: "Find the nearest pharmacy",
    intro: "Find the pharmacies closest to you by using your location or entering an address.",
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
  },
  search: {
    // Between the location button and the search field.
    or: "or",
    label: "Address or place",
    hint: "For example Mannerheimintie 1, Helsinki.",
    privacy: "What you type is sent to the Digitransit place search.",
    // Announced in the live region when suggestions arrive.
    suggestions: {
      one: "1 suggestion.",
      other: "{count} suggestions.",
    },
    // After leaving the field with text that wasn't chosen from the suggestions.
    chooseFromList: "Choose a place from the suggestions.",
    // Enter or leaving the field with one letter: suggestions start at two.
    tooShort: "Type at least two letters, then choose a place from the suggestions.",
    noMatches: "No places found. Check the spelling, or try a street or town nearby.",
    error: "Address search isn't working right now. Try again, or use your location.",
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
    // {place} is the place the user chose, e.g. "Nihtisilta, Espoo".
    headingPlace: "Pharmacies near {place}",
    distance: "{distance} in a straight line",
    phone: "Phone:",
    // Accessible name of the phone link. Must contain {phone}, the visible link text.
    call: "Call {name}, {phone}",
    map: "Show on Google Maps",
    // Accessible name of the map link. Must start with the visible results.map text.
    mapLabel: "Show on Google Maps: {name} (opens in a new tab)",
    checkHours: "Check opening hours with the pharmacy before you go.",
    distanceNote: "Distances are measured in a straight line.",
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
