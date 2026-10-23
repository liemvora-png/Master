import { authorizeAdmin } from "../../_shared/access.js";
import { jsonResponse } from "../../_shared/content.js";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

async function isAdmin(request, env) {
  const authorization = await authorizeAdmin(request, env);
  return authorization.ok ? null : jsonResponse({ error: authorization.message }, authorization.status);
}

export async function onRequest({ request, env }) {
  const denied = await isAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);
  if (!env.GALLERY) return jsonResponse({ error: "Gallery image storage is not configured." }, 503);

  if (request.method === "POST") {
    let form;
    try {
      form = await request.formData();
    } catch {
      return jsonResponse({ error: "Send an image using the upload form." }, 400);
    }
    const file = form.get("image");
    const altText = form.get("altText");
    const caption = form.get("caption");
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_IMAGE_SIZE) {
      return jsonResponse({ error: "Choose an image up to 8 MB." }, 400);
    }
    const extension = IMAGE_TYPES.get(file.type);
    if (!extension) {
      return jsonResponse({ error: "Use a JPEG, PNG, WebP, or GIF image." }, 400);
    }
    if (typeof altText !== "string" || !altText.trim() || altText.length > 240) {
      return jsonResponse({ error: "Add descriptive alt text (up to 240 characters)." }, 400);
    }
    if (typeof caption !== "string" || caption.length > 300) {
      return jsonResponse({ error: "Caption must be 300 characters or fewer." }, 400);
    }

    const id = crypto.randomUUID();
    const key = `gallery/${id}.${extension}`;
    const imageUrl = `/gallery-images/${id}.${extension}`;
    try {
      await env.GALLERY.put(key, file.stream(), {
        httpMetadata: { contentType: file.type }
      });
      const position = await env.DB.prepare(
        "SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM photo_gallery"
      ).first();
      await env.DB.prepare(
        "INSERT INTO photo_gallery (id, image_url, alt_text, caption, position, active) VALUES (?, ?, ?, ?, ?, 1)"
      ).bind(id, imageUrl, altText.trim(), caption.trim(), position.next_position).run();
      return jsonResponse({ uploaded: true, id, image_url: imageUrl }, 201);
    } catch (error) {
      try {
        await env.GALLERY.delete(key);
      } catch (cleanupError) {
        console.error("Unable to clean up an incomplete gallery upload:", cleanupError);
      }
      console.error("Failed to save gallery image:", error);
      return jsonResponse({ error: "Could not save the gallery image." }, 503);
    }
  }

  if (request.method === "PUT") {
    let input;
    try {
      input = await request.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }
    if (!input || !Array.isArray(input.images) || input.images.length > 200) {
      return jsonResponse({ error: "Check the gallery image list." }, 400);
    }
    const seenIds = new Set();
    for (const image of input.images) {
      if (!image || typeof image.id !== "string" || !/^[\w-]{36}$/.test(image.id)
        || seenIds.has(image.id)
        || typeof image.position !== "number" || !Number.isInteger(image.position)
        || image.position < 1 || image.position > input.images.length
        || typeof image.active !== "boolean"
        || typeof image.alt_text !== "string" || !image.alt_text.trim() || image.alt_text.length > 240
        || typeof image.caption !== "string" || image.caption.length > 300) {
        return jsonResponse({ error: "Each gallery image needs alt text, a valid order, and a visibility setting." }, 400);
      }
      seenIds.add(image.id);
    }
    if (new Set(input.images.map((image) => image.position)).size !== input.images.length) {
      return jsonResponse({ error: "Gallery positions must be unique." }, 400);
    }
    try {
      const current = await env.DB.prepare("SELECT id FROM photo_gallery").all();
      const currentIds = new Set((current.results || []).map((image) => image.id));
      if (currentIds.size !== seenIds.size || [...seenIds].some((id) => !currentIds.has(id))) {
        return jsonResponse({ error: "Reload the gallery before saving because its images changed." }, 409);
      }
      const statements = [env.DB.prepare("UPDATE photo_gallery SET position = position + 1000000")];
      for (const image of input.images) {
        statements.push(env.DB.prepare(
          "UPDATE photo_gallery SET alt_text = ?, caption = ?, position = ?, active = ? WHERE id = ?"
        ).bind(image.alt_text.trim(), image.caption.trim(), image.position, image.active ? 1 : 0, image.id));
      }
      await env.DB.batch(statements);
      return jsonResponse({ saved: true });
    } catch (error) {
      console.error("Failed to update gallery metadata:", error);
      return jsonResponse({ error: "Could not save gallery changes." }, 503);
    }
  }

  if (request.method === "DELETE") {
    const id = new URL(request.url).searchParams.get("id");
    if (typeof id !== "string" || !/^[\w-]{36}$/.test(id)) {
      return jsonResponse({ error: "Choose a valid gallery image." }, 400);
    }
    try {
      const image = await env.DB.prepare(
        "SELECT image_url FROM photo_gallery WHERE id = ?"
      ).bind(id).first();
      if (!image) return jsonResponse({ error: "Gallery image not found." }, 404);
      const filename = image.image_url.split("/").pop();
      if (!/^[\w-]{36}\.(jpg|png|webp|gif)$/.test(filename)) {
        throw new Error("Stored gallery image path is invalid.");
      }
      await env.GALLERY.delete(`gallery/${filename}`);
      await env.DB.prepare("DELETE FROM photo_gallery WHERE id = ?").bind(id).run();
      return jsonResponse({ deleted: true });
    } catch (error) {
      console.error("Failed to delete gallery image:", error);
      return jsonResponse({ error: "Could not delete gallery image." }, 503);
    }
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
}
