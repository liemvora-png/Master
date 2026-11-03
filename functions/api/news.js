import { jsonResponse } from "../_shared/content.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "News storage is not configured." }, 503);

  try {
    const result = await env.DB.prepare(
      "SELECT id, headline, body, source_url, source_name, published_at, position, active " +
      "FROM news_items WHERE active = 1 ORDER BY position"
    ).all();
    return jsonResponse({ news: result.results || [] });
  } catch (error) {
    console.error("Failed to read tech news from D1:", error);
    return jsonResponse({ error: "Tech news is temporarily unavailable." }, 503);
  }
}
