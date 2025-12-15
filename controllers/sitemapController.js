// controllers/sitemapController.js
import Product from "../models/productModel.js"; // adjust path if needed

// Simple in-memory cache
let cachedXml = null;
let cacheTimestamp = 0;


function urlEntry({ loc, lastmod = null, changefreq = "weekly", priority = 0.8 }) {
  const lastmodTag = lastmod ? `<lastmod>${new Date(lastmod).toISOString().split("T")[0]}</lastmod>` : "";
  return `
  <url>
    <loc>${escapeXml(loc)}</loc>
    ${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function escapeXml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}


export async function buildSitemapXml({ siteUrl }) {

  const staticPages = [
    { path: "/", changefreq: "daily", priority: 1.0 },
    { path: "/about", changefreq: "monthly", priority: 0.7 },
    { path: "/fashion", changefreq: "weekly", priority: 0.9 },
    { path: "/featured", changefreq: "weekly", priority: 0.9 },
    { path: "/electronics", changefreq: "weekly", priority: 0.9 },
    { path: "/beauty", changefreq: "weekly", priority: 0.85 },
    { path: "/sports", changefreq: "weekly", priority: 0.85 },
    { path: "/products", changefreq: "daily", priority: 1.0 },
    { path: "/cart", changefreq: "daily", priority: 0.8 },
    { path: "/my-orders", changefreq: "daily", priority: 0.7 },
    { path: "/login", changefreq: "monthly", priority: 0.5 },
    { path: "/policy", changefreq: "monthly", priority: 0.6 },
  ];

  
  const products = await Product.find({}, "slug updatedAt createdAt").lean().exec();

  
  const items = [];

  for (const p of staticPages) {
    const loc = `${siteUrl.replace(/\/$/, "")}${p.path}`;
    items.push(urlEntry({ loc, changefreq: p.changefreq, priority: p.priority }));
  }

  for (const prod of products) {

    const identifier = prod.slug ? `product/${encodeURIComponent(prod.slug)}` : `product/${prod._id}`;
    const loc = `${siteUrl.replace(/\/$/, "")}/${identifier}`;
    const lastmod = prod.updatedAt ?? prod.createdAt ?? null;
    items.push(urlEntry({ loc, lastmod, changefreq: "weekly", priority: 0.8 }));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</urlset>`;

  return xml;
}



export async function serveSitemap(req, res) {
  try {
    const SITE_URL = ["http://localhost:5173"];
    if (process.env.SITE_URL) {
  SITE_URL = process.env.SITE_URL.split(",");
} else if (process.env.CLIENT_URL) {
  SITE_URL = process.env.CLIENT_URL.split(",");
};
    const CACHE_TTL_MS = process.env.SITEMAP_CACHE_TTL_MS ? Number(process.env.SITEMAP_CACHE_TTL_MS) : 60 * 60 * 1000; // 1h

    const now = Date.now();
    if (cachedXml && now - cacheTimestamp < CACHE_TTL_MS) {
      res.header("Content-Type", "application/xml");
      return res.send(cachedXml);
    }

    const xml = await buildSitemapXml({ siteUrl: SITE_URL });
    cachedXml = xml;
    cacheTimestamp = Date.now();

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("Error generating sitemap:", err?.message || err);
    res.status(500).send("Server error generating sitemap");
  }
}
