import { authorizeAdmin } from "../functions/_shared/access.js";
import { jsonResponse } from "../functions/_shared/content.js";
import { onRequest as adminContent } from "../functions/api/admin/content.js";
import { onRequest as publicContent } from "../functions/api/content.js";

const PAGE_ROUTES = new Map([
  ["/", "home"],
  ["/index.html", "home"],
  ["/projects", "projects"],
  ["/projects.html", "projects"],
  ["/accomplishments", "accomplishments"],
  ["/accomplishments.html", "accomplishments"],
  ["/arrangements", "arrangements"],
  ["/arrangements.html", "arrangements"]
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

      if (pathname.startsWith("/api/")) return notFoundResponse();

      if (isAdminPage) {
        const authorization = await authorizeAdmin(request, env);
        if (!authorization.ok) {
          return jsonResponse({ error: authorization.message }, authorization.status);
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        return adminPageResponse(templates.admin, request);
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

      return env.ASSETS.fetch(request);
    }
  };
}
