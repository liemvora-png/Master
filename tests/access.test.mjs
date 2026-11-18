import assert from "node:assert/strict";
import test from "node:test";
import { authorizationBody, authorizeAdmin } from "../functions/_shared/clerk.js";

const ISSUER = "https://clerk.example.com";
const JWKS_URL = "https://clerk.example.com/.well-known/jwks.json";
const BASE_ENV = {
  CLERK_ISSUER: ISSUER,
  CLERK_JWKS_URL: JWKS_URL,
  CLERK_ADMIN_USER_ID: "user_test"
};

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

const keyPair = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"]
);
const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
publicKey.kid = "test-key";

// Each test file runs in its own process, so serving the signing keys globally
// keeps every case offline and shares the module's JWKS cache.
globalThis.fetch = async (url) => {
  if (url !== JWKS_URL) throw new Error(`Unexpected fetch of ${url}`);
  return new Response(JSON.stringify({ keys: [publicKey] }), {
    headers: { "Content-Type": "application/json" }
  });
};

async function signedRequest(claims, { kid = publicKey.kid, signature = null } = {}) {
  const header = encode({ alg: "RS256", kid });
  const payload = encode(claims);
  const signingInput = `${header}.${payload}`;
  const signed = signature ?? Buffer.from(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  )).toString("base64url");
  return new Request("https://example.com", {
    headers: { Authorization: `Bearer ${signingInput}.${signed}` }
  });
}

function currentClaims(overrides = {}) {
  return {
    iss: ISSUER,
    sub: "user_test",
    exp: Math.floor(Date.now() / 1000) + 60,
    ...overrides
  };
}

test("requires Clerk configuration", async () => {
  const placeholderEnv = {
    CLERK_ISSUER: "REPLACE_WITH_CLERK_ISSUER",
    CLERK_JWKS_URL: "REPLACE_WITH_CLERK_JWKS_URL",
    CLERK_ADMIN_USER_ID: "REPLACE_WITH_CLERK_ADMIN_USER_ID"
  };

  for (const env of [{}, placeholderEnv, { ...BASE_ENV, CLERK_ADMIN_USER_ID: "" }]) {
    const result = await authorizeAdmin(new Request("https://example.com"), env);
    assert.equal(result.status, 503);
    assert.equal(result.reason, "not_configured");
    assert.match(result.message, /CLERK_ADMIN_USER_IDS/);
  }
});

test("rejects unsigned and malformed tokens", async () => {
  assert.equal((await authorizeAdmin(new Request("https://example.com"), BASE_ENV)).reason, "missing_token");
  assert.equal((await authorizeAdmin(bearer("not-a-jwt"), BASE_ENV)).reason, "malformed_token");
  assert.equal((await authorizeAdmin(bearer("a.b"), BASE_ENV)).reason, "malformed_token");
  assert.equal((await authorizeAdmin(bearer("not base64.at.all"), BASE_ENV)).reason, "malformed_token");

  const unsigned = `${encode({ alg: "HS256", kid: "test-key" })}.${encode(currentClaims())}.AAAA`;
  assert.equal((await authorizeAdmin(bearer(unsigned), BASE_ENV)).reason, "malformed_token");
});

test("accepts the configured admin's signed session token", async () => {
  assert.deepEqual(
    await authorizeAdmin(await signedRequest(currentClaims()), BASE_ENV),
    { ok: true, userId: "user_test" }
  );
});

test("names the Clerk account that is not an allowed admin", async () => {
  const result = await authorizeAdmin(await signedRequest(currentClaims({ sub: "user_intruder" })), BASE_ENV);
  assert.equal(result.status, 403);
  assert.equal(result.reason, "user_not_allowed");
  assert.match(result.message, /user_intruder/);
  assert.deepEqual(result.observed, { userId: "user_intruder" });
  assert.deepEqual(authorizationBody(result), {
    error: result.message,
    reason: "user_not_allowed",
    observed: { userId: "user_intruder" }
  });
});

test("accepts any account listed in CLERK_ADMIN_USER_IDS", async () => {
  const env = {
    CLERK_ISSUER: ISSUER,
    CLERK_JWKS_URL: JWKS_URL,
    CLERK_ADMIN_USER_IDS: "user_one, user_two"
  };
  assert.deepEqual(
    await authorizeAdmin(await signedRequest(currentClaims({ sub: "user_two" })), env),
    { ok: true, userId: "user_two" }
  );
  assert.equal((await authorizeAdmin(await signedRequest(currentClaims({ sub: "user_three" })), env)).status, 403);
});

test("explains a sign-in issued by another Clerk domain", async () => {
  const result = await authorizeAdmin(
    await signedRequest(currentClaims({ iss: "https://clerk.deltag.tech" })),
    BASE_ENV
  );
  assert.equal(result.status, 403);
  assert.equal(result.reason, "issuer_mismatch");
  assert.match(result.message, /clerk\.deltag\.tech/);
  assert.match(result.message, /clerk\.example\.com/);
});

test("rejects expired session tokens", async () => {
  const result = await authorizeAdmin(await signedRequest(currentClaims({ exp: Math.floor(Date.now() / 1000) - 5 })), BASE_ENV);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "expired");
});

test("tolerates a few seconds of clock skew on nbf", async () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal((await authorizeAdmin(await signedRequest(currentClaims({ nbf: now + 30 })), BASE_ENV)).ok, true);

  const result = await authorizeAdmin(await signedRequest(currentClaims({ nbf: now + 3600 })), BASE_ENV);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "not_yet_valid");
});

test("verifies the signature before reporting claim problems", async () => {
  const claims = currentClaims({ iss: "https://clerk.deltag.tech", sub: "user_intruder" });
  const tampered = await signedRequest(claims, { signature: Buffer.from("bad").toString("base64url") });
  const result = await authorizeAdmin(tampered, BASE_ENV);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "bad_signature");

  const rotated = await authorizeAdmin(await signedRequest(claims, { kid: "ins_rotated" }), BASE_ENV);
  assert.equal(rotated.status, 401);
  assert.equal(rotated.reason, "unknown_key");
});

test("decodes claims that contain non-ASCII characters", async () => {
  const claims = currentClaims();
  claims["https://clerk.example.com/display_name"] = "Liem Vora";
  assert.equal((await authorizeAdmin(await signedRequest(claims), BASE_ENV)).ok, true);
});

function bearer(token) {
  return new Request("https://example.com", { headers: { Authorization: `Bearer ${token}` } });
}
