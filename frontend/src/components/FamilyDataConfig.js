export const FAMILY_DATA_CONFIG = {
  alapadatok: {
    title: "Alapadatok",
    fields: [
      { label: "Születési dátum", key: "szuletes_datum" },
      { label: "Születési hely", key: "szuletes_hely" },
      { label: "Apa neve", key: "apa_nev" },
      { label: "Anya neve", key: "anya_nev" },
    ],
  },
  keresztelet: {
    title: "Keresztelési adatok",
    fields: [
      { label: "Dátum", key: "keresztelet_datum" },
      { label: "Helyszín", key: "keresztelet_hely" },
      { label: "Keresztapa", key: "keresztapa" },
      { label: "Keresztapa foglalkozása", key: "keresztapa_foglalkozas" },
      { label: "Keresztapa lakhelye", key: "keresztapa_lakhely" },
      { label: "Keresztanya", key: "keresztanya" },
      { label: "Keresztanya foglalkozása", key: "keresztanya_foglalkozas" },
      { label: "Keresztanya lakhelye", key: "keresztanya_lakhely" },
    ],
  },
  hazassag: {
    title: "Házasság / Esküvő",
    fields: [
      { label: "Házastárs", key: "hazastars_nev" },
      { label: "Esküvő ideje", key: "eskuvo_ido" },
      { label: "Esküvő helye", key: "eskuvo_hely" },
      { label: "1. Tanú", key: "tanu1_nev" },
      { label: "1. Tanú foglalkozása", key: "tanu1_foglalkozas" },
      { label: "1. Tanú lakhelye", key: "tanu1_lakhely" },
      { label: "2. Tanú", key: "tanu2_nev" },
      { label: "2. Tanú foglalkozása", key: "tanu2_foglalkozas" },
      { label: "2. Tanú lakhelye", key: "tanu2_lakhely" },
    ],
  },
  halalozas: {
    title: "Halálozási adatok",
    fields: [
      { label: "Dátum", key: "elhalalozas_datum" },
      { label: "Helyszín", key: "elhalalozas_hely" },
      { label: "Halál oka", key: "halal_ok" },
      { label: "Bejelentő", key: "halal_bejelento" },
    ],
  },
  egyeb: {
    title: "Életút és Források",
    fields: [
      { label: "Lakhelyek", key: "lakhely", type: "long_text" },
      { label: "Foglalkozások", key: "foglalkozas", type: "long_text" },
      { label: "Megjegyzés", key: "komment", type: "long_text" },
      { label: "Forrás", key: "forras_url", type: "link" },
    ],
  },
};
