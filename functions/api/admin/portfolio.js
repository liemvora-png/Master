import { authorizeAdmin } from "../../_shared/clerk.js";
import { jsonResponse } from "../../_shared/content.js";

function isText(value, maxLength, allowEmpty = false) {
  return typeof value === "string"
    && value.length <= maxLength
    && (allowEmpty || value.trim().length > 0);
}

function isTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function readPortfolio(db) {
  const [services, subjects, gallery, availability, bookings] = await Promise.all([
    db.prepare("SELECT id, title, description, price, position, active FROM services ORDER BY position").all(),
    db.prepare("SELECT id, service_id, test_name, subject, position FROM test_prep_options ORDER BY test_name, position").all(),
    db.prepare("SELECT id, image_url, alt_text, caption, position, active FROM photo_gallery ORDER BY position").all(),
    db.prepare("SELECT id, day_of_week, start_time, end_time, exception_date, is_available FROM availability ORDER BY day_of_week, exception_date, start_time").all(),
    db.prepare(
      "SELECT id, service_id, name, email, note, lesson_date, lesson_time, status, created_at " +
      "FROM lesson_bookings ORDER BY created_at DESC LIMIT 200"
    ).all()
  ]);
  return {
    services: services.results || [],
    testPrepOptions: subjects.results || [],
    gallery: gallery.results || [],
    availability: (availability.results || []).map((row) => ({
      ...row,
      is_available: row.is_available === 1
    })),
    bookings: bookings.results || []
  };
}

function validatePortfolio(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || !Array.isArray(input.services) || input.services.length !== 3
    || !Array.isArray(input.testPrepOptions) || input.testPrepOptions.length > 100
    || !Array.isArray(input.availability) || input.availability.length > 100) {
    return "Check services, test-prep subjects, and availability.";
  }

  const serviceIds = new Set(["photography", "piano", "viola"]);
  const seenServices = new Set();
  for (const [index, service] of input.services.entries()) {
    if (!service || !serviceIds.has(service.id) || seenServices.has(service.id)
      || !isText(service.title, 120)
      || !isText(service.description, 1000, true)
      || (service.price !== null && service.price !== "" && !isText(service.price, 80))) {
      return `Check the title, description, and optional price for service ${index + 1}.`;
    }
    seenServices.add(service.id);
  }

  const subjects = new Set();
  for (const [index, option] of input.testPrepOptions.entries()) {
    if (!option || option.service_id !== "tutoring"
      || !["SAT", "AP"].includes(option.test_name)
      || !isText(option.subject, 120)) {
      return `Check tutoring subject ${index + 1}; choose SAT or AP and enter a subject.`;
    }
    const uniqueKey = `${option.test_name}:${option.subject.trim().toLowerCase()}`;
    if (subjects.has(uniqueKey)) return `Remove the duplicate ${option.test_name} subject "${option.subject}".`;
    subjects.add(uniqueKey);
  }

  for (const [index, row] of input.availability.entries()) {
    if (!row || !Number.isInteger(row.day_of_week) || row.day_of_week < 0 || row.day_of_week > 6
      || !isTime(row.start_time) || !isTime(row.end_time) || row.start_time >= row.end_time
      || (row.exception_date !== null && row.exception_date !== "" && !isDate(row.exception_date))
      || (row.is_available !== undefined && typeof row.is_available !== "boolean")) {
      return `Check availability entry ${index + 1}; choose a weekday, valid times, and optional exception date.`;
    }
  }
  return null;
}

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
      "INSERT INTO availability (id, day_of_week, start_time, end_time, exception_date, is_available) " +
      "VALUES (?, ?, ?, ?, ?, ?)"
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

export async function onRequest({ request, env }) {
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

export async function handleAdminBooking(request, env, pathname) {
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
    const result = await env.DB.prepare("UPDATE lesson_bookings SET status = ? WHERE id = ?")
      .bind(input.status, id).run();
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
