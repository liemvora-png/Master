import assert from "node:assert/strict";
import test from "node:test";
import { onRequest as availabilityRequest, getAvailableSlots } from "../functions/api/availability.js";
import { onRequest as bookingRequest } from "../functions/api/bookings.js";
import { onRequest as adminGalleryRequest } from "../functions/api/admin/gallery.js";
import { handleAdminBooking, onRequest as adminPortfolioRequest } from "../functions/api/admin/portfolio.js";
import { onRequest as galleryRequest } from "../functions/api/gallery.js";
import { onRequest as servicesRequest } from "../functions/api/services.js";

function availabilityDb({ booked = [] } = {}) {
  return {
    prepare(query) {
      return {
        bind(...values) {
          return {
            async all() {
              if (/FROM availability/.test(query)) {
                const day = Number(values[1]);
                return {
                  results: day === 1
                    ? [{ start_time: "09:00", end_time: "12:00", exception_date: null, is_available: 1 }]
                    : []
                };
              }
              if (/FROM lesson_bookings/.test(query)) return { results: booked };
              return { results: [] };
            }
          };
        }
      };
    }
  };
}

test("availability returns open hourly slots and excludes reserved times", async () => {
  const db = availabilityDb({ booked: [{ lesson_time: "10:00" }] });
  assert.deepEqual(await getAvailableSlots(db, "2026-10-26"), [
    { time: "09:00" },
    { time: "11:00" }
  ]);
});

test("availability validates dates and returns no slots for closed days", async () => {
  const invalid = await availabilityRequest({
    request: new Request("https://example.com/api/availability?date=2026-02-30"),
    env: { DB: availabilityDb() }
  });
  assert.equal(invalid.status, 400);

  const closed = await availabilityRequest({
    request: new Request("https://example.com/api/availability?date=2026-10-27"),
    env: { DB: availabilityDb() }
  });
  assert.equal(closed.status, 200);
  assert.deepEqual((await closed.json()).slots, []);
});

test("booking is saved pending before the email is sent and email text is escaped", async () => {
  const events = [];
  const db = {
    prepare(query) {
      return {
        bind(...values) {
          return {
            async all() {
              if (/FROM availability/.test(query)) {
                return { results: [{ start_time: "09:00", end_time: "11:00", exception_date: null, is_available: 1 }] };
              }
              return { results: [] };
            },
            async run() {
              events.push({ type: "saved", query, values });
              return { success: true };
            }
          };
        }
      };
    }
  };
  const response = await bookingRequest({
    request: new Request("https://example.com/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "<Alex>",
        email: "alex@example.com",
        date: "2026-10-26",
        time: "09:00",
        note: "Please call <me>"
      })
    }),
    env: {
      DB: db,
      BOOKING_EMAIL_TO: "owner@gmail.com",
      BOOKING_EMAIL_FROM: "lessons@example.com",
      BOOKING_EMAIL: {
        async send(message) {
          events.push({ type: "email", message });
          throw new Error("Email unavailable");
        }
      }
    }
  });

  assert.equal(response.status, 202);
  assert.equal((await response.json()).saved, true);
  assert.deepEqual(events.map((event) => event.type), ["saved", "email"]);
  assert.match(events[0].query, /'pending'/);
  assert.match(events[1].message.text, /&lt;Alex&gt;/);
  assert.match(events[1].message.text, /Please call &lt;me&gt;/);
});

test("booking rejects a slot that is not open", async () => {
  const response = await bookingRequest({
    request: new Request("https://example.com/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alex",
        email: "alex@example.com",
        date: "2026-10-27",
        time: "10:00",
        note: ""
      })
    }),
    env: { DB: availabilityDb() }
  });
  assert.equal(response.status, 409);
});

test("service and gallery APIs only expose active public content", async () => {
  const db = {
    prepare(query) {
      return {
        async all() {
          if (/FROM services/.test(query)) return { results: [{ id: "piano", title: "Piano", active: 1 }] };
          if (/FROM test_prep_options/.test(query)) return { results: [{ service_id: "tutoring", test_name: "SAT", subject: "Math" }] };
          if (/FROM photo_gallery/.test(query)) return { results: [{ id: "photo1", image_url: "/gallery-images/abc.jpg", alt_text: "A view", caption: "" }] };
          return { results: [] };
        }
      };
    }
  };
  const services = await servicesRequest({
    request: new Request("https://example.com/api/services"),
    env: { DB: db }
  });
  assert.deepEqual((await services.json()).services[0].title, "Piano");

  const gallery = await galleryRequest({
    request: new Request("https://example.com/api/gallery"),
    env: { DB: db }
  });
  assert.deepEqual((await gallery.json()).images[0].alt_text, "A view");
});

test("portfolio, gallery, and booking admin APIs require Cloudflare Access", async () => {
  const env = {
    ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
    ACCESS_AUD: "expected-audience",
    DB: {
      prepare() {
        throw new Error("Database must not be accessed before authorization.");
      }
    }
  };
  const request = (url, method = "GET") => new Request(url, { method });
  const portfolio = await adminPortfolioRequest({
    request: request("https://example.com/api/admin/portfolio"),
    env
  });
  const gallery = await adminGalleryRequest({
    request: request("https://example.com/api/admin/gallery"),
    env
  });
  const booking = await handleAdminBooking(
    request("https://example.com/api/admin/bookings/booking-id", "DELETE"),
    env,
    "/api/admin/bookings/booking-id"
  );

  assert.equal(portfolio.status, 401);
  assert.equal(gallery.status, 401);
  assert.equal(booking.status, 401);
});
