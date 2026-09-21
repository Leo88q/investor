import { readFile, writeFile } from "node:fs/promises";
import { loadEnv } from "vite";
import { content } from "../src/content.js";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
let html = await readFile("dist/index.html", "utf8");
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
    );
  if (base) {
    const canonical = new URL(lang === "ru" ? "./" : "en.html", base).href;
    localized = localized
      .replace(
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
if (base) {
  await writeFile(
    "dist/robots.txt",
    `User-agent: *\nAllow: /\nSitemap: ${new URL("sitemap.xml", base).href}\n`,
  );
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(base)}</loc></url><url><loc>${escape(new URL("en.html", base).href)}</loc></url></urlset>`,
  );
} else
  console.info(
    "SEO: VITE_SITE_URL is unset. Set the public URL for absolute OG, canonical and sitemap URLs.",
  );
