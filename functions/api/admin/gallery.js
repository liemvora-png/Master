import { authorizationBody, authorizeAdmin } from "../../_shared/clerk.js";
import { jsonResponse } from "../../_shared/content.js";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_PREVIEW_SIZE = 20 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"]
]);

function variantFile(form, name, maxSize = 20 * 1024 * 1024) {
  const file = form.get(name);
  return file instanceof File && file.size > 0 && file.size <= maxSize
    && (file.type === "image/webp" || file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/gif")
    ? file
    : null;
}

async function isAdmin(request, env) {
  const authorization = await authorizeAdmin(request, env);
  return authorization.ok ? null : jsonResponse(authorizationBody(authorization), authorization.status);
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
    const preview = form.get("preview");
    const medium = form.get("medium");
    const altText = form.get("altText");
    const caption = form.get("caption");
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_IMAGE_SIZE) {
      return jsonResponse({ error: "Choose an image up to 20 MB." }, 400);
    }
    const extension = IMAGE_TYPES.get(file.type);
    if (!extension) {
      return jsonResponse({ error: "Use a JPEG, PNG, WebP, or GIF image." }, 400);
    }
    if (preview instanceof File && (preview.type !== "image/webp" || preview.size < 1 || preview.size > MAX_PREVIEW_SIZE)) {
      return jsonResponse({ error: "The preview image is invalid." }, 400);
    }
    if (medium instanceof File && (medium.type !== "image/webp" || medium.size < 1 || medium.size > MAX_PREVIEW_SIZE)) {
      return jsonResponse({ error: "The medium image is invalid." }, 400);
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
    const previewKey = preview instanceof File ? `gallery/${id}.low.webp` : null;
    const previewUrl = previewKey ? `/gallery-images/${id}.low.webp` : null;
    const mediumKey = medium instanceof File ? `gallery/${id}.medium.webp` : null;
    const mediumUrl = mediumKey ? `/gallery-images/${id}.medium.webp` : null;
    try {
      await env.GALLERY.put(key, file.stream(), {
        httpMetadata: { contentType: file.type }
      });
      if (previewKey) {
        await env.GALLERY.put(previewKey, preview.stream(), {
          httpMetadata: { contentType: "image/webp" }
        });
      }
      if (mediumKey) {
        await env.GALLERY.put(mediumKey, medium.stream(), {
          httpMetadata: { contentType: "image/webp" }
        });
      }
      const position = await env.DB.prepare(
        "SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM photo_gallery"
      ).first();
      await env.DB.prepare(
        "INSERT INTO photo_gallery (id, image_url, preview_url, medium_url, alt_text, caption, position, active) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
      ).bind(id, imageUrl, previewUrl, mediumUrl, altText.trim(), caption.trim(), position.next_position).run();
      return jsonResponse({ uploaded: true, id, image_url: imageUrl }, 201);
    } catch (error) {
      try {
        await env.GALLERY.delete(key);
        if (previewKey) await env.GALLERY.delete(previewKey);
        if (mediumKey) await env.GALLERY.delete(mediumKey);
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
        "SELECT image_url, preview_url, medium_url FROM photo_gallery WHERE id = ?"
      ).bind(id).first();
      if (!image) return jsonResponse({ error: "Gallery image not found." }, 404);
      const filename = image.image_url.split("/").pop();
      if (!/^[\w-]{36}\.(jpg|png|webp|avif|gif)$/.test(filename)) {
        throw new Error("Stored gallery image path is invalid.");
      }
      const id = filename.replace(/\.[^.]+$/, "");
      await env.GALLERY.delete(`gallery/${filename}`);
      await env.GALLERY.delete(`gallery/${id}.low.webp`);
      await env.GALLERY.delete(`gallery/${id}.medium.webp`);
      await env.DB.prepare("DELETE FROM photo_gallery WHERE id = ?").bind(id).run();
      return jsonResponse({ deleted: true });
    } catch (error) {
      console.error("Failed to delete gallery image:", error);
      return jsonResponse({ error: "Could not delete gallery image." }, 503);
    }
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
}
