import { jsonResponse } from "../_shared/content.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "News storage is not configured." }, 503);

  try {
    const result = await env.DB.prepare(
      "SELECT id, headline, body, source_url, source_name, published_at, position, active " +
      "FROM news_items WHERE active = 1"
    ).all();

    // Newest first so the site always leads with the latest D1 entries;
    // position only breaks ties within the same timestamp.
    const news = (result.results || []).sort((a, b) => {
      const at = Date.parse(a.published_at);
      const bt = Date.parse(b.published_at);
      if (Number.isNaN(at) || Number.isNaN(bt)) {
        return (Number.isNaN(at) - Number.isNaN(bt)) || a.position - b.position;
      }
      return bt - at || a.position - b.position;
    });
    return jsonResponse({ news });
  } catch (error) {
    console.error("Failed to read tech news from D1:", error);
    return jsonResponse({ error: "Tech news is temporarily unavailable." }, 503);
  }
}
