import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";

const publicRoutes = ["/"];

const privateRoutes = [
  "/dashboard",
  "/budget",
  "/history",
  "/sync",
  "/insights",
  "/settings",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function getSiteOrigin(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const candidate = value.trim().includes("://")
    ? value.trim()
    : `https://${value.trim()}`;
  const url = new URL(candidate);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("VITE_SITE_URL must use HTTPS outside localhost.");
  }
  return url.origin;
}

function seoPlugin(
  siteOrigin: string | undefined,
  production: boolean,
): Plugin {
  return {
    name: "budgetbox-production-seo",
    transformIndexHtml(html) {
      if (!siteOrigin) {
        return html.replace(
          "<!-- budgetbox:seo -->",
          production
            ? '<meta name="robots" content="noindex, nofollow" />'
            : "",
        );
      }

      const encodedOrigin = siteOrigin
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;");
      const structuredData = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "BudgetBox",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        description:
          "An offline-first personal budgeting workspace for monthly budgets, spending insights, and cross-device sync.",
        url: siteOrigin,
      }).replaceAll("<", "\\u003c");
      const tags = [
        `<link rel="canonical" href="${encodedOrigin}/" />`,
        `<meta property="og:url" content="${encodedOrigin}/" />`,
        `<meta property="og:image" content="${encodedOrigin}/og-image.svg" />`,
        `<meta name="twitter:image" content="${encodedOrigin}/og-image.svg" />`,
        `<script type="application/ld+json">${structuredData}</script>`,
      ].join("\n    ");
      return html.replace("<!-- budgetbox:seo -->", tags);
    },
    generateBundle() {
      const robots = siteOrigin
        ? [
            "User-agent: *",
            "Allow: /",
            ...privateRoutes.map((route) => `Disallow: ${route}`),
            "Disallow: /api/",
            `Sitemap: ${siteOrigin}/sitemap.xml`,
            "",
          ].join("\n")
        : "User-agent: *\nDisallow: /\n";
      const sitemap = siteOrigin
        ? [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...publicRoutes.map(
              (route) =>
                `  <url><loc>${siteOrigin}${route}</loc><changefreq>monthly</changefreq></url>`,
            ),
            "</urlset>",
            "",
          ].join("\n")
        : '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: sitemap,
      });
    },
  };
}

function offlineShellPlugin(): Plugin {
  return {
    name: "budgetbox-offline-shell",
    apply: "build",
    generateBundle(_options, bundle) {
      const appAssets = Object.keys(bundle)
        .filter(
          (file) =>
            file !== "sw.js" &&
            /\.(?:js|css|svg|webmanifest|png|jpe?g|webp|woff2?)$/i.test(file),
        )
        .map((file) => `/${file}`);
      const shellAssets = [
        "/",
        "/index.html",
        "/favicon.svg",
        "/manifest.webmanifest",
        "/og-image.svg",
        ...appAssets,
      ];
      const precache = [...new Set(shellAssets)];
      const contentHash = createHash("sha256").update(precache.join("\n"));
      const indexAsset = bundle["index.html"];
      if (indexAsset?.type === "asset") {
        contentHash.update(String(indexAsset.source));
      }
      for (const file of [
        "favicon.svg",
        "manifest.webmanifest",
        "og-image.svg",
      ]) {
        contentHash.update(
          readFileSync(path.resolve(__dirname, "public", file)),
        );
      }
      const cacheId = contentHash.digest("hex").slice(0, 12);
      const releaseId = Date.now();
      const serviceWorker = `const CACHE_NAME = "budgetbox-shell-${releaseId}-${cacheId}";
const PRECACHE_URLS = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const versions = keys
        .filter((key) => key.startsWith("budgetbox-shell-"))
        .sort()
        .reverse();
      return Promise.all(versions.slice(2).map((key) => caches.delete(key)));
    }).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
`;
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: serviceWorker,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteOrigin = getSiteOrigin(
    env.VITE_SITE_URL?.trim() ||
      process.env.VITE_SITE_URL?.trim() ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
  );
  return {
    plugins: [
      react(),
      seoPlugin(siteOrigin, mode === "production"),
      offlineShellPlugin(),
    ],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes("/node_modules/recharts/") ||
              id.includes("/node_modules/d3-")
            )
              return "charts";
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/") ||
              id.includes("/node_modules/scheduler/")
            )
              return "framework";
          },
        },
      },
    },
  };
});
