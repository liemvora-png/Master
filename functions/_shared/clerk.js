let cachedKeys;
let cachedKeysAt = 0;
let cachedJwksUrl;

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}

function normalizeIssuer(value) {
  return value.replace(/^https?:\/\//, "https://").replace(/\/$/, "");
}

async function getSigningKeys(url) {
  if (cachedKeys && cachedJwksUrl === url && Date.now() - cachedKeysAt < 300000) {
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

export async function authorizeAdmin(request, env) {
  if (!env.CLERK_ISSUER || !env.CLERK_JWKS_URL || !env.CLERK_ADMIN_USER_ID
    || env.CLERK_ISSUER.startsWith("REPLACE_")
    || env.CLERK_JWKS_URL.startsWith("REPLACE_")
    || env.CLERK_ADMIN_USER_ID.startsWith("REPLACE_")) {
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
    const decode = (part) => JSON.parse(decodeBase64Url(part));
    const header = decode(parts[0]);
    const claims = decode(parts[1]);
    const issuer = normalizeIssuer(env.CLERK_ISSUER);
    const now = Math.floor(Date.now() / 1000);

    if (header.alg !== "RS256" || !header.kid
      || claims.iss !== issuer
      || claims.sub !== env.CLERK_ADMIN_USER_ID
      || !Number.isFinite(claims.exp)
      || claims.exp <= now
      || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now))) {
      return { ok: false, status: 403, message: "Clerk token is invalid or not authorized for this admin." };
    }

    const jwk = (await getSigningKeys(env.CLERK_JWKS_URL)).find((key) => key.kid === header.kid);
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

    return validSignature
      ? { ok: true, userId: claims.sub }
      : { ok: false, status: 401, message: "Invalid Clerk token signature." };
  } catch (error) {
    console.error("Clerk verification failed:", error);
    return { ok: false, status: 401, message: "Unable to verify Clerk authentication." };
  }
}
