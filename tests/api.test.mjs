import assert from "node:assert/strict";
import test from "node:test";
import { onRequest as contentRequest } from "../functions/api/content.js";
import { onRequest as adminRequest } from "../functions/api/admin/content.js";

test("public content endpoint reads the D1 site record", async () => {
  const content = { brand: "LIEM VORA" };
  const env = {
    DB: {
      prepare(query) {
        assert.match(query, /SELECT content_json, updated_at/);
        return {
          bind(id) {
            assert.equal(id, "site");
            return {
              first: async () => ({
                content_json: JSON.stringify(content),
                updated_at: "2026-10-23T00:00:00.000Z"
              })
            };
          }
        };
      }
    }
  };
  const response = await contentRequest({
    request: new Request("https://example.com/api/content"),
    env
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual((await response.json()).content, content);
});

test("content API rejects unsupported methods and unauthenticated edits", async () => {
  const env = {};
  const unsupportedRead = await contentRequest({
    request: new Request("https://example.com/api/content", { method: "POST" }),
    env
  });
  assert.equal(unsupportedRead.status, 405);

  const unsupportedAdmin = await adminRequest({
    request: new Request("https://example.com/api/admin/content"),
    env
  });
  assert.equal(unsupportedAdmin.status, 405);

  const unauthenticatedWrite = await adminRequest({
    request: new Request("https://example.com/api/admin/content", {
      method: "PUT",
      body: "{}"
    }),
    env: {
      ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
      ACCESS_AUD: "expected-audience"
    }
  });
  assert.equal(unauthenticatedWrite.status, 401);
});

test("Worker routes APIs and falls back to static assets", async () => {
  const { default: worker } = await import("../functions/worker.js");
  const calls = [];
  const env = {
    DB: {
      prepare() {
        return {
          bind() {
            return {
              first: async () => ({
                content_json: JSON.stringify({ brand: "LIEM VORA" }),
                updated_at: "2026-10-23T00:00:00.000Z"
              })
            };
          }
        };
      }
    },
    ASSETS: {
      fetch(request) {
        calls.push(new URL(request.url).pathname);
        return new Response("static page");
      }
    }
  };

  const apiResponse = await worker.fetch(
    new Request("https://www.liemvora.cc/api/content"),
    env,
    {}
  );
  assert.equal(apiResponse.status, 200);
  assert.deepEqual((await apiResponse.json()).content, { brand: "LIEM VORA" });

  const unknownApi = await worker.fetch(
    new Request("https://www.liemvora.cc/api/unknown"),
    env,
    {}
  );
  assert.equal(unknownApi.status, 404);

  const pageResponse = await worker.fetch(
    new Request("https://www.liemvora.cc/accomplishments.html"),
    env,
    {}
  );
  assert.equal(await pageResponse.text(), "static page");
  assert.deepEqual(calls, ["/accomplishments.html"]);
});
