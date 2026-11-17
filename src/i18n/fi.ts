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
  search: {
    or: "tai",
    label: "Osoite tai paikka",
    hint: "Esimerkiksi Mannerheimintie 1, Helsinki.",
    privacy: "Kirjoittamasi teksti lähetetään Digitransitin paikkahakuun. Sijaintiasi ei lähetetä.",
    suggestions: {
      one: "1 ehdotus.",
      other: "{count} ehdotusta.",
    },
    chooseFromList: "Valitse paikka ehdotuksista.",
    noMatches:
      "Paikkoja ei löytynyt. Tarkista kirjoitusasu tai kokeile lähellä olevaa katua tai kuntaa.",
    error: "Osoitehaku ei toimi juuri nyt. Yritä uudelleen tai käytä sijaintiasi.",
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
    headingPlace: "Lähimmät apteekit: {place}",
    distance: "{distance} linnuntietä",
    phone: "Puhelin:",
    call: "Soita: {name}, {phone}",
    map: "Näytä Google Mapsissa",
    mapLabel: "Näytä Google Mapsissa: {name} (avautuu uuteen välilehteen)",
    checkHours:
      "Tarkista aukioloajat apteekista ennen kuin lähdet. Luettelosta voi puuttua apteekkeja.",
    distanceNote: "Etäisyydet on mitattu linnuntietä. Todellinen matka on pidempi.",
  },
  footer: {
    source:
      "Apteekkitietojen lähde: Lääkealan turvallisuus- ja kehittämiskeskus Fimea / {codeServer}",
    codeServer: "THL Koodistopalvelu",
    updated: "Apteekkitiedot päivitetty {date}.",
  },
};

export default fi;
