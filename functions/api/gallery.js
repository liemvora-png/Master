import { jsonResponse } from "../_shared/content.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);

  try {
    const result = await env.DB.prepare(
      "SELECT id, image_url, alt_text, caption, position FROM photo_gallery " +
      "WHERE active = 1 ORDER BY position"
    ).all();
    return jsonResponse({ images: result.results || [] });
  } catch (error) {
    console.error("Failed to read photography gallery from D1:", error);
    return jsonResponse({ error: "The photography gallery is temporarily unavailable." }, 503);
  }
}
