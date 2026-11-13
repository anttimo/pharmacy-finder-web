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
      "We ask for your location only when you tap the button. An approximate location (about 100 m) is sent to the OpenStreetMap search service.",
  },
  status: {
    locating: "Finding your location…",
    loading: "Looking for nearby pharmacies…",
    found: {
      one: "{count} pharmacy found within {radius}.",
      other: "{count} pharmacies found within {radius}.",
    },
    empty: "No pharmacies found within {radius}.",
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
  empty: {
    body: "The map data may be missing some pharmacies. You can try again later.",
  },
  results: {
    heading: "Pharmacies near you",
    unnamed: "Pharmacy",
    distance: "{distance} in a straight line",
    openingHours: "Opening hours:",
    checkHours:
      "Check opening hours with the pharmacy before you go. This list may not include every pharmacy.",
    distanceNote: "Distances are measured in a straight line. The route there is longer.",
    attribution: "© OpenStreetMap contributors",
  },
} as const;

export default en;
