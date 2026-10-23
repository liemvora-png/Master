import { jsonResponse } from "../_shared/content.js";
import { readSiteContent } from "../_shared/site-storage.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);

  let site;
  try {
    site = await readSiteContent(env.DB);
  } catch (error) {
    console.error("Failed to read managed site content from D1:", error);
    return jsonResponse({
      error: "Could not read site content from D1. Apply migrations/0001_site_content.sql to the portfolio-content database bound as DB."
    }, 503);
  }

  if (!site) return jsonResponse({ error: "Site content has not been initialized." }, 503);
  return jsonResponse(site);
}

export async function onRequest({ request, env }) {
  if (request.method === "GET") return onRequestGet({ env });
  return jsonResponse({ error: "Use the public read endpoint or the protected admin endpoint." }, 405);
}
