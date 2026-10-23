import assert from "node:assert/strict";
import test from "node:test";
import { authorizeAdmin } from "../functions/_shared/access.js";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

test("requires Cloudflare Access configuration and a signed assertion", async () => {
  assert.deepEqual(
    await authorizeAdmin(new Request("https://example.com"), {}),
    {
      ok: false,
      status: 503,
      message: "Admin authorization is not configured. Replace ACCESS_TEAM_DOMAIN and ACCESS_AUD in wrangler.jsonc."
    }
  );

  const placeholderEnv = {
    ACCESS_TEAM_DOMAIN: "REPLACE_WITH_TEAM.cloudflareaccess.com",
    ACCESS_AUD: "REPLACE_WITH_ACCESS_APPLICATION_AUD_TAG"
  };
  assert.equal((await authorizeAdmin(new Request("https://example.com"), placeholderEnv)).status, 503);

  const env = {
    ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
    ACCESS_AUD: "expected-audience"
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
      iss: "https://team.cloudflareaccess.com",
      aud: "expected-audience",
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
      headers: { "Cf-Access-Jwt-Assertion": token }
    });
    assert.deepEqual(await authorizeAdmin(request, env), { ok: true });

    const tampered = new Request("https://example.com", {
      headers: { "Cf-Access-Jwt-Assertion": `${header}.${payload}.${Buffer.from("bad").toString("base64url")}` }
    });
    assert.equal((await authorizeAdmin(tampered, env)).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
