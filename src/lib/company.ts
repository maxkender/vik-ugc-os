/** Mentions légales (pages publiques). SIREN facultatif : masqué tant qu'il est vide. */
export const COMPANY = {
  name: "Vik Studios SAS",
  address: "30 boulevard de Sébastopol, 75004 Paris, France",
  siren: "",
  email: "support@vikstudios.com",
};
export const companyLine = () => `${COMPANY.name} · ${COMPANY.address}${COMPANY.siren ? ` · SIREN ${COMPANY.siren}` : ""} · ${COMPANY.email}`;
