import { jsonResponse } from "../_shared/content.js";

const LESSON_MINUTES = 60;

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function minutes(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function timeString(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export async function getAvailableSlots(db, date) {
  const dateValue = new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = dateValue.getUTCDay();
  const result = await db.prepare(
    "SELECT start_time, end_time, exception_date, is_available FROM availability " +
    "WHERE exception_date = ? OR (exception_date IS NULL AND day_of_week = ?) " +
    "ORDER BY exception_date, start_time"
  ).bind(date, dayOfWeek).all();
  const rows = result.results || [];
  const exceptionRows = rows.filter((row) => row.exception_date === date);
  const windows = (exceptionRows.length ? exceptionRows : rows.filter((row) => row.exception_date === null))
    .filter((row) => row.is_available !== 0);
  const bookingResult = await db.prepare(
    "SELECT lesson_time FROM lesson_bookings WHERE lesson_date = ? AND status <> 'cancelled'"
  ).bind(date).all();
  const bookedTimes = new Set((bookingResult.results || []).map((row) => row.lesson_time));
  const available = new Set();

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

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!env.DB) return jsonResponse({ error: "Content storage is not configured." }, 503);

  const date = new URL(request.url).searchParams.get("date");
  if (!isDate(date)) return jsonResponse({ error: "Choose a valid date." }, 400);
  if (date < new Date().toISOString().slice(0, 10)) {
    return jsonResponse({ date, slots: [] });
  }

  try {
    return jsonResponse({ date, slots: await getAvailableSlots(env.DB, date) });
  } catch (error) {
    console.error("Failed to read lesson availability from D1:", error);
    return jsonResponse({ error: "Availability is temporarily unavailable." }, 503);
  }
}
