import { authorizationBody, authorizeAdmin } from "../functions/_shared/clerk.js";
import { jsonResponse } from "../functions/_shared/content.js";
import { onRequest as adminContent } from "../functions/api/admin/content.js";
import { handleAdminBooking, onRequest as adminPortfolio } from "../functions/api/admin/portfolio.js";
import { onRequest as adminGallery } from "../functions/api/admin/gallery.js";
import { onRequest as adminNews } from "../functions/api/admin/news.js";
import { onRequest as availabilityApi } from "../functions/api/availability.js";
import { onRequest as bookingApi } from "../functions/api/bookings.js";
import { onRequest as galleryApi } from "../functions/api/gallery.js";
import { onRequest as newsApi } from "../functions/api/news.js";
import { onRequest as publicContent } from "../functions/api/content.js";
import { readSiteContent } from "../functions/_shared/site-storage.js";
import { onRequest as servicesApi } from "../functions/api/services.js";

const PAGE_ROUTES = new Map([
  ["/", "home"],
  ["/index.html", "home"],
  ["/projects", "projects"],
  ["/projects.html", "projects"],
  ["/accomplishments", "accomplishments"],
  ["/accomplishments.html", "accomplishments"],
  ["/arrangements", "arrangements"],
  ["/arrangements.html", "arrangements"],
  ["/services", "services"],
  ["/services.html", "services"],
  ["/gallery", "gallery"],
  ["/gallery.html", "gallery"]
]);

const DEFAULT_CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsubGllbXZvcmEuY2Mk";

function stampTime(value) {
  if (typeof value !== "string" || !value) return null;
  const iso = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value.replace(" ", "T")}Z`;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : time;
}

// Server-rendered default for the home stamp: the real last revision
// (last admin edit vs newest notice, whichever is later), so the page is
// never stuck on a loading string when JS is off or slow.
async function issuedStampValue(env) {
  if (!env.DB) return "awaiting programme data";
  let best = null;
  try {
    const site = await readSiteContent(env.DB);
    best = stampTime(site && site.updatedAt);
  } catch {
    best = null;
  }
  try {
    const row = await env.DB.prepare(
      "SELECT published_at FROM news_items WHERE active = 1 ORDER BY published_at DESC LIMIT 1"
    ).first();
    const newest = stampTime(row && row.published_at);
    if (newest !== null && (best === null || newest > best)) best = newest;
  } catch {
    /* news table may be missing; the site stamp still answers */
  }
  if (best === null) return "awaiting programme data";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(best));
}

function notFoundResponse() {
  return new Response("Not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

function pageResponse(template, request) {
  return new Response(request.method === "HEAD" ? null : template, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}

function adminPageResponse(template, request) {
  return new Response(request.method === "HEAD" ? null : template, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function createWorker(templates) {
  return {
    async fetch(request, env, context) {
      const { pathname } = new URL(request.url);
      const isAdminPage = pathname === "/admin" || pathname === "/admin.html";

      if (pathname === "/api/content") {
        return publicContent({ request, env, context });
      }

      if (pathname === "/api/admin/content") {
        return adminContent({ request, env, context });
      }

      if (pathname === "/api/services") return servicesApi({ request, env, context });
      if (pathname === "/api/gallery") return galleryApi({ request, env, context });
      if (pathname === "/api/availability") return availabilityApi({ request, env, context });
      if (pathname === "/api/bookings") return bookingApi({ request, env, context });
      if (pathname === "/api/admin/portfolio") return adminPortfolio({ request, env, context });
      if (pathname === "/api/admin/gallery") return adminGallery({ request, env, context });
      if (pathname === "/api/news") return newsApi({ request, env, context });
      if (pathname === "/api/admin/news") return adminNews({ request, env, context });
      if (pathname.startsWith("/api/admin/bookings/")) {
        return handleAdminBooking(request, env, pathname);
      }

      if (pathname.startsWith("/api/")) return notFoundResponse();

      if (isAdminPage) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        const publishableKey = env.CLERK_PUBLISHABLE_KEY || DEFAULT_CLERK_PUBLISHABLE_KEY;
        return adminPageResponse(
          templates.admin.replace(
            "__CLERK_PUBLISHABLE_KEY__",
            JSON.stringify(publishableKey)
          ).replace("__CLERK_PUBLISHABLE_KEY_ATTR__", publishableKey),
          request
        );
      }

      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        const authorization = await authorizeAdmin(request, env);
        if (!authorization.ok) {
          return jsonResponse(authorizationBody(authorization), authorization.status);
        }
        return notFoundResponse();
      }

      const page = PAGE_ROUTES.get(pathname);
      if (page) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        let template = templates[page];
        if (page === "home") {
          template = template.replace("__HOME_ISSUED__", await issuedStampValue(env));
        }
        return pageResponse(template, request);
      }

      if (pathname.startsWith("/gallery-images/")) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        const filename = pathname.slice("/gallery-images/".length);
        if (!/^[\w-]{36}(?:\.(?:low|medium)\.webp|\.(?:jpg|png|webp|avif|gif))$/.test(filename) || !env.GALLERY) {
          return notFoundResponse();
        }
        const object = await env.GALLERY.get(`gallery/${filename}`);
        if (!object) return notFoundResponse();
        return new Response(request.method === "HEAD" ? null : object.body, {
          headers: {
            "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff"
          }
        });
      }

      return env.ASSETS.fetch(request);
    }
  };
}
