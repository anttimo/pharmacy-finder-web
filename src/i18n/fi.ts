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
      "Kysymme sijaintiasi vain, kun painat painiketta. Sijaintisi ei lähde laitteeltasi: lähimmät apteekit etsitään selaimessasi.",
  },
  status: {
    locating: "Haetaan sijaintiasi…",
    loading: "Haetaan lähellä olevia apteekkeja…",
    found: {
      one: "Näytetään lähin apteekki.",
      other: "Näytetään {count} lähintä apteekkia.",
    },
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
  results: {
    heading: "Lähellä olevat apteekit",
    distance: "{distance} linnuntietä",
    phone: "Puhelin:",
    call: "Soita: {name}, {phone}",
    checkHours:
      "Tarkista aukioloajat apteekista ennen kuin lähdet. Luettelosta voi puuttua apteekkeja.",
    distanceNote: "Etäisyydet on mitattu linnuntietä. Todellinen matka on pidempi.",
  },
  footer: {
    source:
      "Apteekkitietojen lähde: Lääkealan turvallisuus- ja kehittämiskeskus Fimea / THL Koodistopalvelu",
  },
};

export default fi;
