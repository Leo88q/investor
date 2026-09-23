import { readFile, writeFile } from "node:fs/promises";
import { loadEnv } from "vite";
import { content } from "../src/content.js";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
let html = await readFile("dist/index.html", "utf8");
import { config, saleReady, sharePerNft } from "../src/config.js";

/**
 * Structured data describes only what is confirmed: the studio, the games that
 * exist, and the NFT offer with its working parameters. Sale availability is
 * taken from the same gate the UI uses, so the markup can never claim a
 * purchase path that is not live. No revenue, player or yield figure appears
 * here, because none of them is confirmed.
 */
function structuredData(lang, base) {
  const url = base ? new URL(lang === "ru" ? "./" : "en.html", base).href : undefined;
  const graph = [
    {
      "@type": "Organization",
      "@id": url ? `${url}#organization` : undefined,
      name: "Leo Games Studio",
      url,
      description: content[lang].metaDescription,
      knowsAbout: content[lang].games.map((game) => game.name),
    },
    {
      "@type": "Product",
      name: `Ecosystem Share NFT (${sharePerNft}% of studio net profit)`,
      description: content[lang].heroBody,
      category: "Digital collectible profit-share contract",
      brand: { "@type": "Brand", name: "Games Watchtower" },
      offers: {
        "@type": "Offer",
        price: config.price,
        priceCurrency: "USDC",
        availability: saleReady
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
        url: saleReady ? config.marketplaceUrl : url,
        inventoryLevel: { "@type": "QuantitativeValue", value: config.supply },
      },
    },
  ];
  return { "@context": "https://schema.org", "@graph": graph };
}

const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const base = env.VITE_SITE_URL?.replace(/\/?$/, "/");
if (base && !/^https:\/\//.test(base))
  throw new Error("VITE_SITE_URL must be an HTTPS URL");
for (const lang of ["ru", "en"]) {
  let localized = html
    .replace('<html lang="ru">', `<html lang="${lang}">`)
    .replace(
      /<title>.*?<\/title>/,
      `<title>${escape(content[lang].metaTitle)}</title>`,
    )
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]+/,
      `$1${escape(content[lang].metaDescription)}`,
    )
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]+/,
      `$1${escape(content[lang].metaTitle)}`,
    )
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]+/,
      `$1${escape(content[lang].metaDescription)}`,
    )
    .replace(
      /(<meta\s+property="og:locale"\s+content=")[^"]+/,
      `$1${lang === "ru" ? "ru_RU" : "en_US"}`,
    )
    .replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]+/,
      `$1${escape(content[lang].metaTitle)}`,
    )
    .replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]+/,
      `$1${escape(content[lang].metaDescription)}`,
    )
    .replace(
      '</head>',
      `<script type="application/ld+json">${JSON.stringify(structuredData(lang, base))}</script>\n</head>`,
    );
  if (base) {
    const canonical = new URL(lang === "ru" ? "./" : "en.html", base).href;
    localized = localized
      .replaceAll(
        'content="./og.png"',
        `content="${escape(new URL("og.png", base).href)}"`,
      )
      .replace(
        "</head>",
        `<link rel="canonical" href="${escape(canonical)}" />\n<meta property="og:url" content="${escape(canonical)}" />\n<link rel="alternate" hreflang="ru" href="${escape(base)}" />\n<link rel="alternate" hreflang="en" href="${escape(new URL("en.html", base).href)}" />\n</head>`,
      );
  }
  await writeFile(`dist/${lang === "ru" ? "index" : "en"}.html`, localized);
}
// robots.txt is always written. A missing file makes preview servers answer
// /robots.txt with index.html, which crawlers read as a syntax error; only the
// Sitemap line needs an absolute URL, so it is the one that waits for
// VITE_SITE_URL.
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\n${base ? `Sitemap: ${new URL("sitemap.xml", base).href}\n` : ""}`,
);
if (base) {
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(base)}</loc></url><url><loc>${escape(new URL("en.html", base).href)}</loc></url></urlset>`,
  );
} else
  console.info(
    "SEO: VITE_SITE_URL is unset. Set the public URL for absolute OG, canonical and sitemap URLs; robots.txt is written without the Sitemap line.",
  );
