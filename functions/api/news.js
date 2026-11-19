import { jsonResponse } from "../_shared/content.js";

function parseLimit(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 100);
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "News storage is not configured." }, 503);

  // Load the most recent items first, one page at a time, so the site never
  // has to download the whole digest before showing anything.
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"), 50);
  const offset = Number.parseInt(url.searchParams.get("offset"), 10) || 0;

  try {
    const result = await env.DB.prepare(
      "SELECT id, headline, body, source_url, source_name, published_at, position, active " +
      "FROM news_items WHERE active = 1 " +
      "ORDER BY published_at DESC, position ASC " +
      "LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();

    const news = result.results || [];
    return jsonResponse({ news, hasMore: news.length === limit });
  } catch (error) {
    console.error("Failed to read tech news from D1:", error);
    return jsonResponse({ error: "Tech news is temporarily unavailable." }, 503);
  }
}
