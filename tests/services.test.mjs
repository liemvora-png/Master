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

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function createClerkToken() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  );
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  publicKey.kid = "portfolio-test-key";
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", kid: publicKey.kid }));
  const payload = encodeBase64Url(JSON.stringify({
    iss: "https://clerk.example.com",
    sub: "user_test",
    exp: Math.floor(Date.now() / 1000) + 60
  }));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  );
  return {
    publicKey,
    token: `${signingInput}.${Buffer.from(signature).toString("base64url")}`
  };
}

test("availability returns open hourly slots and excludes reserved times", async () => {
  const db = availabilityDb({ booked: [{ lesson_time: "10:00" }] });
  assert.deepEqual(await getAvailableSlots(db, "2026-10-26"), [
    { time: "09:00" },
    { time: "11:00" }
  ]);
});

test("admin availability round-trips D1 integer flags through the editor save", async () => {
  const { publicKey, token } = await createClerkToken();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [publicKey] }), {
    headers: { "Content-Type": "application/json" }
  });
  const savedStatements = [];
  const db = {
    prepare(query) {
      const all = async () => {
        if (/FROM services/.test(query)) {
          return { results: ["photography", "piano", "tutoring"].map((id) => ({
            id, title: id, description: "", price: null, position: 1, active: 1
          })) };
        }
        if (/FROM availability/.test(query)) {
          return { results: [
            { id: "weekly", day_of_week: 1, start_time: "09:00", end_time: "10:00", exception_date: null, is_available: 1 },
            { id: "blocked", day_of_week: 2, start_time: "09:00", end_time: "10:00", exception_date: null, is_available: 0 }
          ] };
        }
        return { results: [] };
      };
      return {
        all,
        bind(...values) {
          return {
            query,
            values,
            async all() {
              return all();
            }
          };
        }
      };
    },
    async batch(statements) {
      savedStatements.push(...statements);
    }
  };
  const env = {
    DB: db,
    CLERK_ISSUER: "https://clerk.example.com",
    CLERK_JWKS_URL: "https://clerk.example.com/.well-known/jwks.json",
    CLERK_ADMIN_USER_ID: "user_test"
  };
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const loaded = await adminPortfolioRequest({
      request: new Request("https://example.com/api/admin/portfolio", { headers }),
      env
    });
    assert.equal(loaded.status, 200);
    const portfolio = await loaded.json();
    assert.deepEqual(portfolio.availability.map((entry) => entry.is_available), [true, false]);

    const saved = await adminPortfolioRequest({
      request: new Request("https://example.com/api/admin/portfolio", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          services: ["photography", "piano", "tutoring"].map((id) => ({
            id, title: id, description: "", price: null
          })),
          testPrepOptions: [],
          availability: portfolio.availability
        })
      }),
      env
    });
    assert.equal(saved.status, 200);
    const availabilityInserts = savedStatements.filter((statement) => /INSERT INTO availability/.test(statement.query));
    assert.deepEqual(availabilityInserts.map((statement) => statement.values[5]), [1, 0]);
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("portfolio, gallery, and booking admin APIs require Clerk authentication", async () => {
  const env = {
    CLERK_ISSUER: "https://clerk.example.com",
    CLERK_JWKS_URL: "https://clerk.example.com/.well-known/jwks.json",
    CLERK_ADMIN_USER_ID: "user_test",
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
