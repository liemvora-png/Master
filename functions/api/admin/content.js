import { authorizeAdmin } from "../../_shared/clerk.js";
import { jsonResponse, validateContent } from "../../_shared/content.js";
import { buildSiteContentStatements } from "../../_shared/site-storage.js";

export async function onRequestPut({ request, env }) {
  const authorization = await authorizeAdmin(request, env);
  if (!authorization.ok) {
    return jsonResponse({ error: authorization.message }, authorization.status);
  }

  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);
  if (Number(request.headers.get("Content-Length")) > 200000) {
    return jsonResponse({ error: "Content document is too large." }, 413);
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 200000) {
    return jsonResponse({ error: "Content document is too large." }, 413);
  }

  let content;
  try {
    content = JSON.parse(raw);
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const validationError = validateContent(content);
  if (validationError) return jsonResponse({ error: validationError }, 400);

  const updatedAt = new Date().toISOString();
  await env.DB.batch(buildSiteContentStatements(env.DB, content, updatedAt));

  return jsonResponse({ saved: true, updatedAt });
}

export async function onRequest({ request, env }) {
  if (request.method === "PUT") {
    return onRequestPut({ request, env });
  }
  return jsonResponse({ error: "Method not allowed." }, 405);
}
