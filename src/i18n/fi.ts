import type { Messages } from "./translate";

const fi: Messages = {
  app: {
    title: "Lähin apteekki",
    intro: "Löydä lähimmät apteekit.",
  },
  language: {
    label: "Kieli",
    names: {
      fi: "Suomi",
      en: "English",
    },
  },
  locate: {
    button: "Käytä sijaintiani",
    privacy:
      "Kysymme sijaintiasi vain, kun painat painiketta. OpenStreetMapin hakupalveluun lähetetään likimääräinen sijainti (noin 100 m:n tarkkuudella).",
  },
  status: {
    locating: "Haetaan sijaintiasi…",
    loading: "Haetaan lähellä olevia apteekkeja…",
    found: {
      // {radius} is Intl output in the partitive ("2 kilometriä"), so it can't take "säteeltä".
      one: "Löytyi {count} apteekki. Hakusäde {radius}.", // TODO(i18n-review)
      other: "Löytyi {count} apteekkia. Hakusäde {radius}.", // TODO(i18n-review)
    },
    empty: "Apteekkeja ei löytynyt. Hakusäde {radius}.", // TODO(i18n-review)
    denied: "Sijainnin käyttö on estetty.",
    locationError: "Sijaintiasi ei saatu haettua.",
    networkError: "Apteekkitietoja ei saatu ladattua.",
  },
  denied: {
    body: "Jos haluat käyttää sijaintiasi, salli sijainnin käyttö tälle sivustolle selaimen asetuksista ja paina sitten uudelleen ”Käytä sijaintiani”.",
  },
  error: {
    locationBody: "Tarkista, että sijaintipalvelut ovat käytössä, ja yritä uudelleen.",
    networkBody: "Tarkista internetyhteys ja yritä uudelleen.",
    retry: "Yritä uudelleen",
  },
  empty: {
    body: "Karttatiedoista voi puuttua apteekkeja. Voit yrittää myöhemmin uudelleen.",
  },
  results: {
    heading: "Lähellä olevat apteekit",
    unnamed: "Apteekki",
    distance: "{distance} linnuntietä",
    openingHours: "Aukioloajat:",
    checkHours:
      "Tarkista aukioloajat apteekista ennen kuin lähdet. Luettelosta voi puuttua apteekkeja.",
    distanceNote: "Etäisyydet on mitattu linnuntietä. Todellinen matka on pidempi.",
    attribution: "© OpenStreetMapin tekijät",
  },
};

export default fi;
