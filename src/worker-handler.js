import { authorizeAdmin } from "../functions/_shared/clerk.js";
import { jsonResponse } from "../functions/_shared/content.js";
import { onRequest as adminContent } from "../functions/api/admin/content.js";
import { handleAdminBooking, onRequest as adminPortfolio } from "../functions/api/admin/portfolio.js";
import { onRequest as adminGallery } from "../functions/api/admin/gallery.js";
import { onRequest as availabilityApi } from "../functions/api/availability.js";
import { onRequest as bookingApi } from "../functions/api/bookings.js";
import { onRequest as galleryApi } from "../functions/api/gallery.js";
import { onRequest as publicContent } from "../functions/api/content.js";
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
      if (pathname.startsWith("/api/admin/bookings/")) {
        return handleAdminBooking(request, env, pathname);
      }

      if (pathname.startsWith("/api/")) return notFoundResponse();

      if (isAdminPage) {
        const authorization = await authorizeAdmin(request, env);
        if (!authorization.ok) {
          return jsonResponse({ error: authorization.message }, authorization.status);
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        return adminPageResponse(
          templates.admin.replace(
            "__CLERK_PUBLISHABLE_KEY__",
            JSON.stringify(env.CLERK_PUBLISHABLE_KEY || "")
          ),
          request
        );
      }

      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        const authorization = await authorizeAdmin(request, env);
        if (!authorization.ok) {
          return jsonResponse({ error: authorization.message }, authorization.status);
        }
        return notFoundResponse();
      }

      const page = PAGE_ROUTES.get(pathname);
      if (page) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        return pageResponse(templates[page], request);
      }

      if (pathname.startsWith("/gallery-images/")) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        const filename = pathname.slice("/gallery-images/".length);
        if (!/^[\w-]{36}\.(jpg|png|webp|gif)$/.test(filename) || !env.GALLERY) {
          return notFoundResponse();
        }
        const object = await env.GALLERY.get(`gallery/${filename}`);
        if (!object) return notFoundResponse();
        return new Response(request.method === "HEAD" ? null : object.body, {
          headers: {
            "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff"
          }
        });
      }

      return env.ASSETS.fetch(request);
    }
  };
}
