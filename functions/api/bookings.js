import { jsonResponse } from "../_shared/content.js";
import { getAvailableSlots } from "./availability.js";

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function emailText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function onRequest({ request, env }) {
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
  if (note.length > 1000) return jsonResponse({ error: "Note must be 1,000 characters or fewer." }, 400);
  if (!isDate(date) || !isTime(time) || date < new Date().toISOString().slice(0, 10)) {
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
  const createdAt = new Date().toISOString();
  try {
    await env.DB.prepare(
      "INSERT INTO lesson_bookings " +
      "(id, service_id, name, email, note, lesson_date, lesson_time, status, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)"
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
