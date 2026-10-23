import { jsonResponse } from "../_shared/content.js";
import { readSiteContent } from "../_shared/site-storage.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);

  let site;
  try {
    site = await readSiteContent(env.DB);
  } catch (error) {
    console.error("Failed to read managed site content from D1:", error);
    const details = error instanceof Error ? error.message : "";
    if (details.includes("Unexpected page record: projects (index)")
      || details.includes("Missing page record: home")) {
      return jsonResponse({
        error: "The database has the previous site layout. Apply migrations/0002_home_projects_empty_accomplishments.sql to the portfolio-content database bound as DB."
      }, 503);
    }
    if (details.includes("Missing page record: services")
      || details.includes("Missing page record: gallery")) {
      return jsonResponse({
        error: "The database is missing the services and gallery pages. Apply migrations/0004_services_gallery_bookings.sql to the portfolio-content database bound as DB."
      }, 503);
    }
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
