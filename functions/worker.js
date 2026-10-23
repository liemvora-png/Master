import { onRequest as adminContent } from "./api/admin/content.js";
import { onRequest as publicContent } from "./api/content.js";

const NOT_FOUND = new Response("Not found.", {
  status: 404,
  headers: { "Content-Type": "text/plain; charset=utf-8" }
});

export default {
  async fetch(request, env, context) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/content") {
      return publicContent({ request, env, context });
    }

    if (pathname === "/api/admin/content") {
      return adminContent({ request, env, context });
    }

    if (pathname.startsWith("/api/")) return NOT_FOUND.clone();

    return env.ASSETS.fetch(request);
  }
};
