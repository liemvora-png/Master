var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.js
import home from "./a2a4f176b76a0145aea11d806d4fa818e3d9cbd5-home.html";
import accomplishments from "./5b58c12537e2dc7bb6571f928e8f2025c7a3de0e-accomplishments.html";
import admin from "./c24f930eb07dd73f909f4556d08b861bffcbde95-admin.html";
import arrangements from "./20f05186fb4881eae88645332d5c481cf8d45c53-arrangements.html";
import gallery from "./515a8c2a7e9dddb1a8bf34dc40c4723df0a3f5f9-gallery.html";
import projects from "./8b0566989175a22b100b8e1ee13e8a7ff0e03dee-projects.html";
import services from "./22717b8dc231af3d45930b4cda21de4c813fe4fb-services.html";

// functions/_shared/clerk.js
var cachedKeys;
var cachedKeysAt = 0;
var cachedJwksUrl;
function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}
__name(decodeBase64Url, "decodeBase64Url");
function normalizeIssuer(value) {
  return value.replace(/^https?:\/\//, "https://").replace(/\/$/, "");
}
__name(normalizeIssuer, "normalizeIssuer");
async function getSigningKeys(url) {
  if (cachedKeys && cachedJwksUrl === url && Date.now() - cachedKeysAt < 3e5) {
    return cachedKeys;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load Clerk signing keys.");
  const body = await response.json();
  if (!Array.isArray(body.keys)) throw new Error("Clerk returned invalid signing keys.");
  cachedKeys = body.keys;
  cachedKeysAt = Date.now();
  cachedJwksUrl = url;
  return cachedKeys;
}
__name(getSigningKeys, "getSigningKeys");
async function authorizeAdmin(request, env) {
  if (!env.CLERK_ISSUER || !env.CLERK_JWKS_URL || !env.CLERK_ADMIN_USER_ID || env.CLERK_ISSUER.startsWith("REPLACE_") || env.CLERK_JWKS_URL.startsWith("REPLACE_") || env.CLERK_ADMIN_USER_ID.startsWith("REPLACE_")) {
    return {
      ok: false,
      status: 503,
      message: "Admin authorization is not configured. Set CLERK_ISSUER, CLERK_JWKS_URL, and CLERK_ADMIN_USER_ID in wrangler.jsonc."
    };
  }
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, message: "Clerk authentication is required." };
  if (token.length > 16384) return { ok: false, status: 401, message: "Clerk token is too large." };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, status: 401, message: "Invalid Clerk token." };
  try {
    const decode = /* @__PURE__ */ __name((part) => JSON.parse(decodeBase64Url(part)), "decode");
    const header = decode(parts[0]);
    const claims = decode(parts[1]);
    const issuer = normalizeIssuer(env.CLERK_ISSUER);
    const now = Math.floor(Date.now() / 1e3);
    if (header.alg !== "RS256" || !header.kid || claims.iss !== issuer || claims.sub !== env.CLERK_ADMIN_USER_ID || !Number.isFinite(claims.exp) || claims.exp <= now || claims.nbf !== void 0 && (!Number.isFinite(claims.nbf) || claims.nbf > now)) {
      return { ok: false, status: 403, message: "Clerk token is invalid or not authorized for this admin." };
    }
    const jwk = (await getSigningKeys(env.CLERK_JWKS_URL)).find((key2) => key2.kid === header.kid);
    if (!jwk) return { ok: false, status: 401, message: "Unknown Clerk signing key." };
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signature = Uint8Array.from(
      decodeBase64Url(parts[2]),
      (character) => character.charCodeAt(0)
    );
    const validSignature = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    return validSignature ? { ok: true, userId: claims.sub } : { ok: false, status: 401, message: "Invalid Clerk token signature." };
  } catch (error) {
    console.error("Clerk verification failed:", error);
    return { ok: false, status: 401, message: "Unable to verify Clerk authentication." };
  }
}
__name(authorizeAdmin, "authorizeAdmin");

// functions/_shared/content.js
var PAGE_NAMES = ["home", "projects", "accomplishments", "arrangements", "services", "gallery"];
var PAGE_FILES = /* @__PURE__ */ new Set([
  "index.html",
  "projects.html",
  "accomplishments.html",
  "arrangements.html",
  "services.html",
  "gallery.html"
]);
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
__name(isRecord, "isRecord");
function isText(value, maxLength = 500) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}
__name(isText, "isText");
function isLink(value, allowPageLinks = false) {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (allowPageLinks && PAGE_FILES.has(value)) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
__name(isLink, "isLink");
function validItems(pageName, items) {
  if (!Array.isArray(items) || items.length > 100) return false;
  if (pageName === "home") return items.length === 0;
  if (pageName === "services" || pageName === "gallery") return items.length === 0;
  return items.every((item) => {
    if (!isRecord(item)) return false;
    if (pageName === "projects") {
      return isText(item.name, 120) && isText(item.description, 500) && isText(item.category, 80) && isLink(item.url);
    }
    if (pageName === "accomplishments") {
      return isText(item.name, 240) && isText(item.detail, 120);
    }
    return isText(item.name, 160) && (item.description === void 0 || item.description === "" || isText(item.description, 500)) && (item.instrument === void 0 || item.instrument === "" || isText(item.instrument, 120)) && (item.url === void 0 || item.url === "" || isLink(item.url)) && (item.date === void 0 || item.date === "" || isDate(item.date));
  });
}
__name(validItems, "validItems");
function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
__name(isDate, "isDate");
function validateArrangements(items) {
  if (!Array.isArray(items) || items.length > 100) {
    return "Check the fields and items for the arrangements page.";
  }
  for (const [index, item] of items.entries()) {
    const entry = `Arrangement ${index + 1}`;
    if (!isRecord(item)) return `${entry} must be a valid entry.`;
    if (!isText(item.name, 160)) return `${entry} needs a title (up to 160 characters).`;
    if (item.description !== void 0 && item.description !== "" && !isText(item.description, 500)) {
      return `${entry} description must be 500 characters or fewer.`;
    }
    if (item.instrument !== void 0 && item.instrument !== "" && !isText(item.instrument, 120)) {
      return `${entry} instrument must be 120 characters or fewer.`;
    }
    if (item.url !== void 0 && item.url !== "" && !isLink(item.url)) {
      return `${entry} link must be an HTTPS URL or a site-relative path.`;
    }
    if (item.date !== void 0 && item.date !== "" && !isDate(item.date)) {
      return `${entry} date must be a valid date.`;
    }
  }
  return null;
}
__name(validateArrangements, "validateArrangements");
function validateContent(content) {
  if (!isRecord(content) || !isText(content.brand, 80) || !Array.isArray(content.navigation) || content.navigation.length > 10 || !isRecord(content.pages) || !isRecord(content.labels) || !isText(content.labels.projectLink, 80) || !isText(content.labels.arrangementLink, 80) || !isText(content.labels.emptyArrangements, 240) || !isRecord(content.footer) || !isText(content.footer.label, 80) || !isText(content.footer.note, 120) || !isText(content.footer.year, 8)) {
    return "Check the brand, navigation, pages, and footer fields.";
  }
  const seenPages = /* @__PURE__ */ new Set();
  for (const item of content.navigation) {
    if (!isRecord(item) || !isText(item.label, 80) || !PAGE_NAMES.includes(item.page) || !isLink(item.href, true) || seenPages.has(item.page)) {
      return "Navigation entries need a label, safe link, and unique page.";
    }
    seenPages.add(item.page);
  }
  for (const pageName of PAGE_NAMES) {
    const page = content.pages[pageName];
    const isHome = pageName === "home";
    const isCollectionPage = pageName === "services" || pageName === "gallery";
    if (pageName === "arrangements" && isRecord(page)) {
      const arrangementsError = validateArrangements(page.items);
      if (arrangementsError) return arrangementsError;
    }
    if (!isRecord(page) || !isText(page.metaTitle, 160) || !isText(page.metaDescription, 300) || !isText(page.title, 160) || !isHome && !isText(page.eyebrow, 120) || isHome && page.eyebrow !== "" || !isHome && !isCollectionPage && !isText(page.titleAccent, 160) || (isHome || isCollectionPage) && page.titleAccent !== "" || !isHome && !isText(page.description, 500) || isHome && page.description !== "" || !isHome && !isCollectionPage && !isText(page.sectionTitle, 120) || (isHome || isCollectionPage) && page.sectionTitle !== "" || !validItems(pageName, page.items)) {
      return `Check the fields and items for the ${pageName} page.`;
    }
  }
  return null;
}
__name(validateContent, "validateContent");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(jsonResponse, "jsonResponse");

// functions/_shared/site-storage.js
var PAGE_SLUGS = {
  home: "home",
  projects: "projects",
  accomplishments: "accomplishments",
  arrangements: "arrangements",
  services: "services",
  gallery: "gallery"
};
var BLOCK_TYPES = {
  home: null,
  projects: "project",
  accomplishments: "accomplishment",
  arrangements: "arrangement",
  services: null,
  gallery: null
};
function rows(result) {
  return result?.results || [];
}
__name(rows, "rows");
async function readSiteContent(db) {
  const [pageResult, blockResult, navigationResult, settings] = await Promise.all([
    db.prepare(
      "SELECT id, slug, title, meta_title, meta_description, eyebrow, title_accent, description, section_title FROM pages ORDER BY slug"
    ).all(),
    db.prepare(
      "SELECT page_id, position, type, content FROM blocks ORDER BY page_id, position"
    ).all(),
    db.prepare(
      "SELECT label, href, page_slug, position FROM nav_items ORDER BY position"
    ).all(),
    db.prepare(
      "SELECT brand, labels_json, footer_json, updated_at FROM site_settings WHERE id = ?"
    ).bind("site").first()
  ]);
  if (!settings) return null;
  const content = {
    brand: settings.brand,
    navigation: rows(navigationResult).map((item) => ({
      label: item.label,
      href: item.href,
      page: Object.keys(PAGE_SLUGS).find((key) => PAGE_SLUGS[key] === item.page_slug)
    })),
    labels: JSON.parse(settings.labels_json),
    pages: {},
    footer: JSON.parse(settings.footer_json)
  };
  for (const page of rows(pageResult)) {
    const pageKey = page.id;
    if (!PAGE_SLUGS[pageKey] || PAGE_SLUGS[pageKey] !== page.slug) {
      throw new Error(`Unexpected page record: ${page.id} (${page.slug}).`);
    }
    content.pages[pageKey] = {
      metaTitle: page.meta_title,
      metaDescription: page.meta_description,
      eyebrow: page.eyebrow,
      title: page.title,
      titleAccent: page.title_accent,
      description: page.description,
      sectionTitle: page.section_title,
      items: []
    };
  }
  for (const block of rows(blockResult)) {
    const page = content.pages[block.page_id];
    if (!page || !BLOCK_TYPES[block.page_id] || block.type !== BLOCK_TYPES[block.page_id]) {
      throw new Error(`Unexpected content block for page ${block.page_id}.`);
    }
    page.items.push(JSON.parse(block.content));
  }
  for (const pageKey of Object.keys(PAGE_SLUGS)) {
    if (!content.pages[pageKey]) {
      throw new Error(`Missing page record: ${pageKey}.`);
    }
  }
  return {
    content,
    updatedAt: settings.updated_at
  };
}
__name(readSiteContent, "readSiteContent");
function buildSiteContentStatements(db, content, updatedAt) {
  const statements = [
    db.prepare("DELETE FROM blocks"),
    db.prepare("DELETE FROM nav_items"),
    db.prepare("DELETE FROM pages")
  ];
  statements.push(
    db.prepare(
      "INSERT INTO site_settings (id, brand, labels_json, footer_json, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET brand = excluded.brand, labels_json = excluded.labels_json, footer_json = excluded.footer_json, updated_at = excluded.updated_at"
    ).bind(
      "site",
      content.brand,
      JSON.stringify(content.labels),
      JSON.stringify(content.footer),
      updatedAt
    )
  );
  for (const [pageKey, slug] of Object.entries(PAGE_SLUGS)) {
    const page = content.pages[pageKey];
    statements.push(
      db.prepare(
        "INSERT INTO pages (id, slug, title, meta_title, meta_description, eyebrow, title_accent, description, section_title, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        pageKey,
        slug,
        page.title,
        page.metaTitle,
        page.metaDescription,
        page.eyebrow,
        page.titleAccent,
        page.description,
        page.sectionTitle,
        updatedAt
      )
    );
    page.items.forEach((item, index) => {
      statements.push(
        db.prepare(
          "INSERT INTO blocks (page_id, position, type, content) VALUES (?, ?, ?, ?)"
        ).bind(pageKey, index + 1, BLOCK_TYPES[pageKey], JSON.stringify(item))
      );
    });
  }
  content.navigation.forEach((item, index) => {
    statements.push(
      db.prepare(
        "INSERT INTO nav_items (label, href, page_slug, position) VALUES (?, ?, ?, ?)"
      ).bind(item.label, item.href, PAGE_SLUGS[item.page], index + 1)
    );
  });
  return statements;
}
__name(buildSiteContentStatements, "buildSiteContentStatements");

// functions/api/admin/content.js
async function onRequestPut({ request, env }) {
  const authorization = await authorizeAdmin(request, env);
  if (!authorization.ok) {
    return jsonResponse({ error: authorization.message }, authorization.status);
  }
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);
  if (Number(request.headers.get("Content-Length")) > 2e5) {
    return jsonResponse({ error: "Content document is too large." }, 413);
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 2e5) {
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
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await env.DB.batch(buildSiteContentStatements(env.DB, content, updatedAt));
  return jsonResponse({ saved: true, updatedAt });
}
__name(onRequestPut, "onRequestPut");
async function onRequest({ request, env }) {
  if (request.method === "PUT") {
    return onRequestPut({ request, env });
  }
  return jsonResponse({ error: "Method not allowed." }, 405);
}
__name(onRequest, "onRequest");

// functions/api/admin/portfolio.js
function isText2(value, maxLength, allowEmpty = false) {
  return typeof value === "string" && value.length <= maxLength && (allowEmpty || value.trim().length > 0);
}
__name(isText2, "isText");
function isTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
__name(isTime, "isTime");
function isDate2(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
__name(isDate2, "isDate");
async function readPortfolio(db) {
  const [services2, subjects, gallery2, availability, bookings] = await Promise.all([
    db.prepare("SELECT id, title, description, price, position, active FROM services ORDER BY position").all(),
    db.prepare("SELECT id, service_id, test_name, subject, position FROM test_prep_options ORDER BY test_name, position").all(),
    db.prepare("SELECT id, image_url, alt_text, caption, position, active FROM photo_gallery ORDER BY position").all(),
    db.prepare("SELECT id, day_of_week, start_time, end_time, exception_date, is_available FROM availability ORDER BY day_of_week, exception_date, start_time").all(),
    db.prepare(
      "SELECT id, service_id, name, email, note, lesson_date, lesson_time, status, created_at FROM lesson_bookings ORDER BY created_at DESC LIMIT 200"
    ).all()
  ]);
  return {
    services: services2.results || [],
    testPrepOptions: subjects.results || [],
    gallery: gallery2.results || [],
    availability: (availability.results || []).map((row) => ({
      ...row,
      is_available: row.is_available === 1
    })),
    bookings: bookings.results || []
  };
}
__name(readPortfolio, "readPortfolio");
function validatePortfolio(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Array.isArray(input.services) || input.services.length !== 3 || !Array.isArray(input.testPrepOptions) || input.testPrepOptions.length > 100 || !Array.isArray(input.availability) || input.availability.length > 100) {
    return "Check services, test-prep subjects, and availability.";
  }
  const serviceIds = /* @__PURE__ */ new Set(["photography", "piano", "viola"]);
  const seenServices = /* @__PURE__ */ new Set();
  for (const [index, service] of input.services.entries()) {
    if (!service || !serviceIds.has(service.id) || seenServices.has(service.id) || !isText2(service.title, 120) || !isText2(service.description, 1e3, true) || service.price !== null && service.price !== "" && !isText2(service.price, 80)) {
      return `Check the title, description, and optional price for service ${index + 1}.`;
    }
    seenServices.add(service.id);
  }
  const subjects = /* @__PURE__ */ new Set();
  for (const [index, option] of input.testPrepOptions.entries()) {
    if (!option || option.service_id !== "tutoring" || !["SAT", "AP"].includes(option.test_name) || !isText2(option.subject, 120)) {
      return `Check tutoring subject ${index + 1}; choose SAT or AP and enter a subject.`;
    }
    const uniqueKey = `${option.test_name}:${option.subject.trim().toLowerCase()}`;
    if (subjects.has(uniqueKey)) return `Remove the duplicate ${option.test_name} subject "${option.subject}".`;
    subjects.add(uniqueKey);
  }
  for (const [index, row] of input.availability.entries()) {
    if (!row || !Number.isInteger(row.day_of_week) || row.day_of_week < 0 || row.day_of_week > 6 || !isTime(row.start_time) || !isTime(row.end_time) || row.start_time >= row.end_time || row.exception_date !== null && row.exception_date !== "" && !isDate2(row.exception_date) || row.is_available !== void 0 && typeof row.is_available !== "boolean") {
      return `Check availability entry ${index + 1}; choose a weekday, valid times, and optional exception date.`;
    }
  }
  return null;
}
__name(validatePortfolio, "validatePortfolio");
function portfolioStatements(db, input) {
  const statements = [];
  for (const service of input.services) {
    statements.push(db.prepare(
      "UPDATE services SET title = ?, description = ?, price = ?, active = ? WHERE id = ?"
    ).bind(
      service.title.trim(),
      service.description.trim(),
      service.price || null,
      service.active === false || service.active === 0 ? 0 : 1,
      service.id
    ));
  }
  statements.push(db.prepare("DELETE FROM test_prep_options"));
  input.testPrepOptions.forEach((option, index) => {
    statements.push(db.prepare(
      "INSERT INTO test_prep_options (service_id, test_name, subject, position) VALUES ('tutoring', ?, ?, ?)"
    ).bind(option.test_name, option.subject.trim(), index + 1));
  });
  statements.push(db.prepare("DELETE FROM availability"));
  input.availability.forEach((row) => {
    statements.push(db.prepare(
      "INSERT INTO availability (id, day_of_week, start_time, end_time, exception_date, is_available) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      crypto.randomUUID(),
      row.day_of_week,
      row.start_time,
      row.end_time,
      row.exception_date || null,
      row.is_available === false ? 0 : 1
    ));
  });
  return statements;
}
__name(portfolioStatements, "portfolioStatements");
async function onRequest2({ request, env }) {
  const authorization = await authorizeAdmin(request, env);
  if (!authorization.ok) return jsonResponse({ error: authorization.message }, authorization.status);
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);
  if (request.method === "GET") {
    try {
      return jsonResponse(await readPortfolio(env.DB));
    } catch (error) {
      console.error("Failed to read admin service data:", error);
      return jsonResponse({ error: "Could not load service and booking data." }, 503);
    }
  }
  if (request.method !== "PUT") return jsonResponse({ error: "Method not allowed." }, 405);
  let input;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  const validationError = validatePortfolio(input);
  if (validationError) return jsonResponse({ error: validationError }, 400);
  try {
    await env.DB.batch(portfolioStatements(env.DB, input));
    return jsonResponse({ saved: true });
  } catch (error) {
    console.error("Failed to save admin service data:", error);
    return jsonResponse({ error: "Could not save service settings." }, 503);
  }
}
__name(onRequest2, "onRequest");
async function handleAdminBooking(request, env, pathname) {
  const authorization = await authorizeAdmin(request, env);
  if (!authorization.ok) return jsonResponse({ error: authorization.message }, authorization.status);
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);
  const id = pathname.slice("/api/admin/bookings/".length);
  if (!/^[\w-]{1,80}$/.test(id)) return jsonResponse({ error: "Booking not found." }, 404);
  if (request.method === "DELETE") {
    try {
      const result = await env.DB.prepare("DELETE FROM lesson_bookings WHERE id = ?").bind(id).run();
      if (result.meta?.changes === 0) return jsonResponse({ error: "Booking not found." }, 404);
      return jsonResponse({ deleted: true });
    } catch (error) {
      console.error("Failed to delete booking:", error);
      return jsonResponse({ error: "Could not delete booking." }, 503);
    }
  }
  if (request.method !== "PUT") return jsonResponse({ error: "Method not allowed." }, 405);
  let input;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  if (!input || !["pending", "confirmed", "cancelled"].includes(input.status)) {
    return jsonResponse({ error: "Choose pending, confirmed, or cancelled." }, 400);
  }
  try {
    const result = await env.DB.prepare("UPDATE lesson_bookings SET status = ? WHERE id = ?").bind(input.status, id).run();
    if (result.meta?.changes === 0) return jsonResponse({ error: "Booking not found." }, 404);
    return jsonResponse({ updated: true });
  } catch (error) {
    if (/unique|constraint/i.test(error instanceof Error ? error.message : "")) {
      return jsonResponse({ error: "This slot is already booked; this request cannot be confirmed." }, 409);
    }
    console.error("Failed to update booking status:", error);
    return jsonResponse({ error: "Could not update booking status." }, 503);
  }
}
__name(handleAdminBooking, "handleAdminBooking");

// functions/api/admin/gallery.js
var MAX_IMAGE_SIZE = 8 * 1024 * 1024;
var IMAGE_TYPES = /* @__PURE__ */ new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);
async function isAdmin(request, env) {
  const authorization = await authorizeAdmin(request, env);
  return authorization.ok ? null : jsonResponse({ error: authorization.message }, authorization.status);
}
__name(isAdmin, "isAdmin");
async function onRequest3({ request, env }) {
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
    const seenIds = /* @__PURE__ */ new Set();
    for (const image of input.images) {
      if (!image || typeof image.id !== "string" || !/^[\w-]{36}$/.test(image.id) || seenIds.has(image.id) || typeof image.position !== "number" || !Number.isInteger(image.position) || image.position < 1 || image.position > input.images.length || typeof image.active !== "boolean" || typeof image.alt_text !== "string" || !image.alt_text.trim() || image.alt_text.length > 240 || typeof image.caption !== "string" || image.caption.length > 300) {
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
__name(onRequest3, "onRequest");

// functions/api/availability.js
var LESSON_MINUTES = 60;
function isDate3(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
__name(isDate3, "isDate");
function minutes(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
__name(minutes, "minutes");
function timeString(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
__name(timeString, "timeString");
async function getAvailableSlots(db, date) {
  const dateValue = /* @__PURE__ */ new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = dateValue.getUTCDay();
  const result = await db.prepare(
    "SELECT start_time, end_time, exception_date, is_available FROM availability WHERE exception_date = ? OR (exception_date IS NULL AND day_of_week = ?) ORDER BY exception_date, start_time"
  ).bind(date, dayOfWeek).all();
  const rows2 = result.results || [];
  const exceptionRows = rows2.filter((row) => row.exception_date === date);
  const windows = (exceptionRows.length ? exceptionRows : rows2.filter((row) => row.exception_date === null)).filter((row) => row.is_available !== 0);
  const bookingResult = await db.prepare(
    "SELECT lesson_time FROM lesson_bookings WHERE lesson_date = ? AND status <> 'cancelled'"
  ).bind(date).all();
  const bookedTimes = new Set((bookingResult.results || []).map((row) => row.lesson_time));
  const available = /* @__PURE__ */ new Set();
  for (const window of windows) {
    const start = minutes(window.start_time);
    const end = minutes(window.end_time);
    if (start === null || end === null || end <= start) continue;
    for (let slot = start; slot + LESSON_MINUTES <= end; slot += LESSON_MINUTES) {
      const time = timeString(slot);
      if (!bookedTimes.has(time)) available.add(time);
    }
  }
  return [...available].sort().map((time) => ({ time }));
}
__name(getAvailableSlots, "getAvailableSlots");
async function onRequest4({ request, env }) {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);
  const date = new URL(request.url).searchParams.get("date");
  if (!isDate3(date)) return jsonResponse({ error: "Choose a valid date." }, 400);
  if (date < (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) {
    return jsonResponse({ date, slots: [] });
  }
  try {
    return jsonResponse({ date, slots: await getAvailableSlots(env.DB, date) });
  } catch (error) {
    console.error("Failed to read lesson availability from D1:", error);
    return jsonResponse({ error: "Availability is temporarily unavailable." }, 503);
  }
}
__name(onRequest4, "onRequest");

// functions/api/bookings.js
function isDate4(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
__name(isDate4, "isDate");
function isTime2(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
__name(isTime2, "isTime");
function emailText(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(emailText, "emailText");
async function onRequest5({ request, env }) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "Booking storage is not configured." }, 503);
  let input;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonResponse({ error: "Enter your booking details." }, 400);
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const note = typeof input.note === "string" ? input.note.trim() : "";
  const serviceId = ["piano", "viola"].includes(input.service) ? input.service : "piano";
  const date = input.date;
  const time = input.time;
  if (!name || name.length > 120 || /[\r\n]/.test(name)) {
    return jsonResponse({ error: "Enter a name of 120 characters or fewer." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || /[\r\n]/.test(email)) {
    return jsonResponse({ error: "Enter a valid email address." }, 400);
  }
  if (note.length > 1e3) return jsonResponse({ error: "Note must be 1,000 characters or fewer." }, 400);
  if (!isDate4(date) || !isTime2(time) || date < (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) {
    return jsonResponse({ error: "Choose a valid future date and available time." }, 400);
  }
  try {
    const slots = await getAvailableSlots(env.DB, date);
    if (!slots.some((slot) => slot.time === time)) {
      return jsonResponse({ error: "That time is no longer available. Choose another time." }, 409);
    }
  } catch (error) {
    console.error("Failed to check lesson availability:", error);
    return jsonResponse({ error: "Availability is temporarily unavailable." }, 503);
  }
  const id = crypto.randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    await env.DB.prepare(
      "INSERT INTO lesson_bookings (id, service_id, name, email, note, lesson_date, lesson_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)"
    ).bind(id, serviceId, name, email, note, date, time, createdAt).run();
  } catch (error) {
    if (/unique|constraint/i.test(error instanceof Error ? error.message : "")) {
      return jsonResponse({ error: "That time was just booked. Choose another time." }, 409);
    }
    console.error("Failed to save lesson booking:", error);
    return jsonResponse({ error: "Could not save your booking request. Please try again." }, 503);
  }
  if (!env.BOOKING_EMAIL || !env.BOOKING_EMAIL_TO || !env.BOOKING_EMAIL_FROM) {
    console.error("Booking saved, but email notification settings are not configured.");
    return jsonResponse({
      saved: true,
      status: "pending",
      emailSent: false,
      message: "Your request was saved, but email notifications are not configured yet."
    }, 202);
  }
  const serviceLabel = serviceId === "viola" ? "Private viola lessons" : "Private piano lessons";
  try {
    await env.BOOKING_EMAIL.send({
      to: env.BOOKING_EMAIL_TO,
      from: env.BOOKING_EMAIL_FROM,
      replyTo: email,
      subject: `New private ${serviceId} lesson request`,
      text: [
        `New private ${serviceId} lesson request`,
        "",
        `Service: ${emailText(serviceLabel)}`,
        `Name: ${emailText(name)}`,
        `Email: ${emailText(email)}`,
        `Date: ${emailText(date)}`,
        `Time: ${emailText(time)}`,
        `Note: ${emailText(note) || "(none)"}`
      ].join("\n")
    });
    return jsonResponse({ saved: true, status: "pending", emailSent: true }, 201);
  } catch (error) {
    console.error("Booking saved, but email notification failed:", error);
    return jsonResponse({
      saved: true,
      status: "pending",
      emailSent: false,
      message: "Your request was saved, but the email notification could not be sent."
    }, 202);
  }
}
__name(onRequest5, "onRequest");

// functions/api/gallery.js
async function onRequest6({ request, env }) {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);
  try {
    const result = await env.DB.prepare(
      "SELECT id, image_url, alt_text, caption, position FROM photo_gallery WHERE active = 1 ORDER BY position"
    ).all();
    return jsonResponse({ images: result.results || [] });
  } catch (error) {
    console.error("Failed to read photography gallery from D1:", error);
    return jsonResponse({ error: "The photography gallery is temporarily unavailable." }, 503);
  }
}
__name(onRequest6, "onRequest");

// functions/api/content.js
async function onRequestGet({ env }) {
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);
  let site;
  try {
    site = await readSiteContent(env.DB);
  } catch (error) {
    console.error("Failed to read managed site content from D1:", error);
    const details = error instanceof Error ? error.message : "";
    if (details.includes("Unexpected page record: projects (index)") || details.includes("Missing page record: home")) {
      return jsonResponse({
        error: "The database has the previous site layout. Apply migrations/0002_home_projects_empty_accomplishments.sql to the portfolio-content database bound as DB."
      }, 503);
    }
    if (details.includes("Missing page record: services") || details.includes("Missing page record: gallery")) {
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
__name(onRequestGet, "onRequestGet");
async function onRequest7({ request, env }) {
  if (request.method === "GET") return onRequestGet({ env });
  return jsonResponse({ error: "Use the public read endpoint or the protected admin endpoint." }, 405);
}
__name(onRequest7, "onRequest");

// functions/api/services.js
async function onRequest8({ request, env }) {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);
  try {
    const [services2, options] = await Promise.all([
      env.DB.prepare(
        "SELECT id, title, description, price, position FROM services WHERE active = 1 ORDER BY position"
      ).all(),
      env.DB.prepare(
        "SELECT service_id, test_name, subject, position FROM test_prep_options ORDER BY test_name, position"
      ).all()
    ]);
    return jsonResponse({
      services: services2.results || [],
      testPrepOptions: options.results || []
    });
  } catch (error) {
    console.error("Failed to read services from D1:", error);
    return jsonResponse({ error: "Services are temporarily unavailable." }, 503);
  }
}
__name(onRequest8, "onRequest");

// src/worker-handler.js
var PAGE_ROUTES = /* @__PURE__ */ new Map([
  ["/", "home"],
  ["/index.html", "home"],
  ["/projects", "projects"],
  ["/projects.html", "projects"],
  ["/accomplishments", "accomplishments"],
  ["/accomplishments.html", "accomplishments"],
  ["/arrangements", "arrangements"],
  ["/arrangements.html", "arrangements"],
  ["/services", "services"],
  ["/services.html", "services"],
  ["/gallery", "gallery"],
  ["/gallery.html", "gallery"]
]);
var DEFAULT_CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsubGllbXZvcmEuY2Mk";
function notFoundResponse() {
  return new Response("Not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
__name(notFoundResponse, "notFoundResponse");
function pageResponse(template, request) {
  return new Response(request.method === "HEAD" ? null : template, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
__name(pageResponse, "pageResponse");
function adminPageResponse(template, request) {
  return new Response(request.method === "HEAD" ? null : template, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
__name(adminPageResponse, "adminPageResponse");
function createWorker(templates) {
  return {
    async fetch(request, env, context) {
      const { pathname } = new URL(request.url);
      const isAdminPage = pathname === "/admin" || pathname === "/admin.html";
      if (pathname === "/api/content") {
        return onRequest7({ request, env, context });
      }
      if (pathname === "/api/admin/content") {
        return onRequest({ request, env, context });
      }
      if (pathname === "/api/services") return onRequest8({ request, env, context });
      if (pathname === "/api/gallery") return onRequest6({ request, env, context });
      if (pathname === "/api/availability") return onRequest4({ request, env, context });
      if (pathname === "/api/bookings") return onRequest5({ request, env, context });
      if (pathname === "/api/admin/portfolio") return onRequest2({ request, env, context });
      if (pathname === "/api/admin/gallery") return onRequest3({ request, env, context });
      if (pathname.startsWith("/api/admin/bookings/")) {
        return handleAdminBooking(request, env, pathname);
      }
      if (pathname.startsWith("/api/")) return notFoundResponse();
      if (isAdminPage) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        const publishableKey = env.CLERK_PUBLISHABLE_KEY || DEFAULT_CLERK_PUBLISHABLE_KEY;
        return adminPageResponse(
          templates.admin.replace(
            "__CLERK_PUBLISHABLE_KEY__",
            JSON.stringify(publishableKey)
          ).replace("__CLERK_PUBLISHABLE_KEY_ATTR__", publishableKey),
          request
        );
      }
      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        const authorization = await authorizeAdmin(request, env);
        if (!authorization.ok) {
          return jsonResponse({ error: authorization.message }, authorization.status);
        }
        return notFoundResponse();
      }
      const page = PAGE_ROUTES.get(pathname);
      if (page) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        return pageResponse(templates[page], request);
      }
      if (pathname.startsWith("/gallery-images/")) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return jsonResponse({ error: "Method not allowed." }, 405);
        }
        const filename = pathname.slice("/gallery-images/".length);
        if (!/^[\w-]{36}\.(jpg|png|webp|gif)$/.test(filename) || !env.GALLERY) {
          return notFoundResponse();
        }
        const object = await env.GALLERY.get(`gallery/${filename}`);
        if (!object) return notFoundResponse();
        return new Response(request.method === "HEAD" ? null : object.body, {
          headers: {
            "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff"
          }
        });
      }
      return env.ASSETS.fetch(request);
    }
  };
}
__name(createWorker, "createWorker");

// src/worker.js
var worker_default = createWorker({ home, projects, accomplishments, arrangements, services, gallery, admin });

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-WT34D9/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-WT34D9/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
