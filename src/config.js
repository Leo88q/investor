export const config = Object.freeze({
  price: 1000,
  supply: 100,
  poolPercent: 25,
  walletLimit: 10,
  target: 100000,
  saleOpen: import.meta.env.VITE_SALE_OPEN === "true",
  marketplaceUrl: import.meta.env.VITE_MARKETPLACE_URL || "",
  formEndpoint: import.meta.env.VITE_FORM_ENDPOINT || "",
  contactUrl: import.meta.env.VITE_CONTACT_URL || "",
  termsUrl: import.meta.env.VITE_TERMS_URL || "",
  siteUrl: import.meta.env.VITE_SITE_URL || "",
});
export const saleReady =
  config.saleOpen &&
  /^https:\/\//.test(config.marketplaceUrl) &&
  /^https:\/\//.test(config.termsUrl);
