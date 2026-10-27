import assert from "node:assert/strict";
import test from "node:test";
import { authorizeAdmin } from "../functions/_shared/clerk.js";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

test("requires Clerk configuration and a signed session token", async () => {
  assert.deepEqual(
    await authorizeAdmin(new Request("https://example.com"), {}),
    {
      ok: false,
      status: 503,
      message: "Admin authorization is not configured. Set CLERK_ISSUER, CLERK_JWKS_URL, and CLERK_ADMIN_USER_ID in wrangler.jsonc."
    }
  );

  const placeholderEnv = {
    CLERK_ISSUER: "REPLACE_WITH_CLERK_ISSUER",
    CLERK_JWKS_URL: "REPLACE_WITH_CLERK_JWKS_URL",
    CLERK_ADMIN_USER_ID: "REPLACE_WITH_CLERK_ADMIN_USER_ID"
  };
  assert.equal((await authorizeAdmin(new Request("https://example.com"), placeholderEnv)).status, 503);

  const env = {
    CLERK_ISSUER: "https://clerk.example.com",
    CLERK_JWKS_URL: "https://clerk.example.com/.well-known/jwks.json",
    CLERK_ADMIN_USER_ID: "user_test"
  };
  assert.equal((await authorizeAdmin(new Request("https://example.com"), env)).status, 401);

  const keyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  );
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  publicKey.kid = "test-key";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [publicKey] }), {
    headers: { "Content-Type": "application/json" }
  });

  try {
    const header = encode({ alg: "RS256", kid: "test-key" });
    const payload = encode({
      iss: "https://clerk.example.com",
      sub: "user_test",
      exp: Math.floor(Date.now() / 1000) + 60
    });
    const signingInput = `${header}.${payload}`;
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      keyPair.privateKey,
      new TextEncoder().encode(signingInput)
    );
    const token = `${signingInput}.${Buffer.from(signature).toString("base64url")}`;
    const request = new Request("https://example.com", {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.deepEqual(await authorizeAdmin(request, env), { ok: true, userId: "user_test" });

    const tampered = new Request("https://example.com", {
      headers: { Authorization: `Bearer ${header}.${payload}.${Buffer.from("bad").toString("base64url")}` }
    });
    assert.equal((await authorizeAdmin(tampered, env)).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
