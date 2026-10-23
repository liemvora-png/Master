import { jsonResponse } from "../_shared/content.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);

  const result = await env.DB
    .prepare("SELECT content_json, updated_at FROM site_content WHERE id = ?")
    .bind("site")
    .first();

  if (!result) return jsonResponse({ error: "Site content has not been initialized." }, 503);

  return jsonResponse({
    content: JSON.parse(result.content_json),
    updatedAt: result.updated_at
  });
}

export async function onRequest({ request, env }) {
  if (request.method === "GET") return onRequestGet({ env });
  return jsonResponse({ error: "Use the public read endpoint or the protected admin endpoint." }, 405);
}
