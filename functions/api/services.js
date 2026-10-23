import { jsonResponse } from "../_shared/content.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);

  try {
    const [services, options] = await Promise.all([
      env.DB.prepare(
        "SELECT id, title, description, price, position FROM services WHERE active = 1 ORDER BY position"
      ).all(),
      env.DB.prepare(
        "SELECT service_id, test_name, subject, position FROM test_prep_options ORDER BY test_name, position"
      ).all()
    ]);
    return jsonResponse({
      services: services.results || [],
      testPrepOptions: options.results || []
    });
  } catch (error) {
    console.error("Failed to read services from D1:", error);
    return jsonResponse({ error: "Services are temporarily unavailable." }, 503);
  }
}
