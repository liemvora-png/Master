const CLOCK_SKEW_SECONDS = 60;
const CONFIGURATION_MESSAGE = "Admin authorization is not configured. Set CLERK_ISSUER, CLERK_JWKS_URL, and CLERK_ADMIN_USER_ID (or CLERK_ADMIN_USER_IDS) in wrangler.jsonc.";

let cachedKeys;
let cachedKeysAt = 0;
let cachedJwksUrl;

function decodeBase64UrlBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJsonSegment(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64UrlBytes(value)));
}

function normalizeIssuer(value) {
  return value.replace(/^https?:\/\//, "https://").replace(/\/$/, "");
}

function isConfigured(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed !== "" && !trimmed.startsWith("REPLACE_");
}

function adminUserIds(env) {
  const raw = `${env.CLERK_ADMIN_USER_ID || ""},${env.CLERK_ADMIN_USER_IDS || ""}`;
  return [...new Set(
    raw.split(/[\s,]+/)
      .map((id) => id.trim())
      .filter((id) => id !== "" && !id.startsWith("REPLACE_"))
  )];
}

function problem(status, reason, message, observed) {
  const result = { ok: false, status, reason, message };
  if (observed) result.observed = observed;
  return result;
}

function deny(status, reason, message, observed) {
  console.warn(`Clerk admin denied (${reason})${observed ? `: ${JSON.stringify(observed)}` : ""}`);
  return problem(status, reason, message, observed);
}

export function authorizationBody(authorization) {
  const body = { error: authorization.message };
  if (authorization.reason) body.reason = authorization.reason;
  if (authorization.observed) body.observed = authorization.observed;
  return body;
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
  if (!isConfigured(env.CLERK_ISSUER) || !isConfigured(env.CLERK_JWKS_URL) || adminUserIds(env).length === 0) {
    return problem(503, "not_configured", CONFIGURATION_MESSAGE);
  }

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return problem(401, "missing_token", "Clerk authentication is required.");
  if (token.length > 16384) return problem(401, "malformed_token", "Clerk token is too large.");

  const parts = token.split(".");
  if (parts.length !== 3) return problem(401, "malformed_token", "Invalid Clerk token.");

  let header;
  let claims;
  try {
    header = decodeJsonSegment(parts[0]);
    claims = decodeJsonSegment(parts[1]);
  } catch {
    return problem(401, "malformed_token", "Invalid Clerk token.");
  }

  if (header.alg !== "RS256" || !header.kid) {
    return problem(401, "malformed_token", "Clerk token uses an unsupported algorithm.");
  }

  const now = Math.floor(Date.now() / 1000);

  // Verify the signature before reading any claim back to the caller, so the
  // diagnostics can only ever describe a token Clerk actually signed.
  try {
    const jwk = (await getSigningKeys(env.CLERK_JWKS_URL)).find((key) => key.kid === header.kid);
    if (!jwk) return problem(401, "unknown_key", "Unknown Clerk signing key.");

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const validSignature = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodeBase64UrlBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    if (!validSignature) return problem(401, "bad_signature", "Invalid Clerk token signature.");
  } catch (error) {
    console.error("Clerk verification failed:", error);
    return problem(401, "verification_failed", "Unable to verify Clerk authentication.");
  }

  const issuer = normalizeIssuer(env.CLERK_ISSUER.trim());
  if (claims.iss !== issuer) {
    return deny(403, "issuer_mismatch",
      `Your Clerk sign-in was issued by ${claims.iss || "an unknown Clerk domain"}, but this site trusts ${issuer}. Sign out and sign in again on this site.`,
      { issuer: claims.iss ?? null });
  }

  if (!adminUserIds(env).includes(claims.sub)) {
    return deny(403, "user_not_allowed",
      `Clerk account ${claims.sub} is not an admin for this site. Add it to CLERK_ADMIN_USER_IDS in wrangler.jsonc and redeploy.`,
      { userId: claims.sub ?? null });
  }

  if (!Number.isFinite(claims.exp) || claims.exp <= now) {
    return problem(401, "expired", "Your Clerk session token has expired. Reload the admin page and try again.");
  }

  if (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + CLOCK_SKEW_SECONDS)) {
    return problem(401, "not_yet_valid", "Your Clerk session token is not valid yet. Reload the admin page and try again.");
  }

  return { ok: true, userId: claims.sub };
}
