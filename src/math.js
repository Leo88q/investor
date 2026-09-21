export function calculateShare(profit, supply = 100, poolPercent = 25) {
  const pool = (Math.max(0, Number(profit) || 0) * poolPercent) / 100;
  return { pool, annual: pool / supply, quarterly: pool / supply / 4 };
}
export function getLanguage(search, pathname = "") {
  const requested = new URLSearchParams(search).get("lang");
  if (requested) return requested === "en" ? "en" : "ru";
  return pathname.endsWith("/en.html") ? "en" : "ru";
}
export const money = (value, decimals = 0) =>
  "$" +
  Number(value).toLocaleString("en-US", { maximumFractionDigits: decimals });
