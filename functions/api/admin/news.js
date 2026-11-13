import { authorizationBody, authorizeAdmin } from "../../_shared/clerk.js";
import { jsonResponse } from "../../_shared/content.js";

function isValidId(value) {
  return typeof value === "string" && /^[\w-]{3,128}$/.test(value);
}

function isValidHeadline(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 240;
}

function isValidBody(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 2000;
}

function isValidUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isValidSourceName(value) {
  return typeof value === "string" && value.length <= 120;
}

function isValidTimestamp(value) {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function validateNewsItem(item, index) {
  const entry = `News item ${index + 1}`;
  if (!isValidId(item.id)) return `${entry} needs a valid id.`;
  if (!isValidHeadline(item.headline)) return `${entry} needs a headline (up to 240 characters).`;
  if (!isValidBody(item.body)) return `${entry} needs a body (up to 2000 characters).`;
  if (!isValidUrl(item.source_url)) return `${entry} needs an HTTPS source URL.`;
  if (!isValidSourceName(item.source_name)) return `${entry} source name must be 120 characters or fewer.`;
  if (!isValidTimestamp(item.published_at)) return `${entry} needs a valid published date.`;
  if (typeof item.position !== "number" || !Number.isInteger(item.position) || item.position < 1 || item.position > 1000) {
    return `${entry} needs a valid position between 1 and 1000.`;
  }
  if (typeof item.active !== "boolean") return `${entry} needs an active flag.`;
  return null;
}

export async function onRequest({ request, env }) {
  const authorization = await authorizeAdmin(request, env);
  if (!authorization.ok) {
    return jsonResponse(authorizationBody(authorization), authorization.status);
  }
  if (!env.DB) return jsonResponse({ error: "News storage is not configured." }, 503);
  if (request.method !== "PUT") return jsonResponse({ error: "Method not allowed." }, 405);

  let input;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  if (!input || !Array.isArray(input.news) || input.news.length > 1000) {
    return jsonResponse({ error: "Check the news item list." }, 400);
  }

  const seenIds = new Set();
  const seenPositions = new Set();
  for (const [index, item] of input.news.entries()) {
    const error = validateNewsItem(item, index);
    if (error) return jsonResponse({ error }, 400);
    if (seenIds.has(item.id)) return jsonResponse({ error: `Duplicate news id ${item.id}.` }, 400);
    if (seenPositions.has(item.position)) return jsonResponse({ error: `Duplicate position ${item.position}.` }, 400);
    seenIds.add(item.id);
    seenPositions.add(item.position);
  }

  try {
    const statements = [env.DB.prepare("DELETE FROM news_items")];
    for (const item of input.news) {
      statements.push(
        env.DB.prepare(
          "INSERT INTO news_items (id, headline, body, source_url, source_name, published_at, position, active) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          item.id,
          item.headline.trim(),
          item.body.trim(),
          item.source_url,
          item.source_name.trim(),
          item.published_at,
          item.position,
          item.active ? 1 : 0
        )
      );
    }
    await env.DB.batch(statements);
    return jsonResponse({ saved: true });
  } catch (error) {
    console.error("Failed to update tech news in D1:", error);
    return jsonResponse({ error: "Could not save news changes." }, 503);
  }
}
