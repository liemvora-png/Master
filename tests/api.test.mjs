import assert from "node:assert/strict";
import test from "node:test";
import { onRequest as contentRequest } from "../functions/api/content.js";
import { onRequest as adminRequest } from "../functions/api/admin/content.js";

test("public content endpoint reads the D1 site record", async () => {
  const pageRows = [
    ["projects", "index"],
    ["accomplishments", "accomplishments"],
    ["arrangements", "arrangements"]
  ].map(([id, slug]) => ({
    id,
    slug,
    title: "Projects",
    meta_title: "Projects",
    meta_description: "Projects description",
    eyebrow: "Portfolio",
    title_accent: "work.",
    description: "Project description",
    section_title: "My projects"
  }));
  const env = {
    DB: {
      prepare(query) {
        if (/FROM pages/.test(query)) {
          return { all: async () => ({ results: pageRows }) };
        }
        if (/FROM blocks/.test(query)) {
          return {
            all: async () => ({
              results: [{
                page_id: "projects",
                type: "project",
                position: 1,
                content: JSON.stringify({ name: "Example", description: "Example project", category: "WEB", url: "https://example.com" })
              }]
            })
          };
        }
        if (/FROM nav_items/.test(query)) {
          return {
            all: async () => ({
              results: [{ label: "Projects", href: "index.html", page_slug: "index", position: 1 }]
            })
          };
        }
        return {
          bind(id) {
            assert.equal(id, "site");
            return {
              first: async () => ({
                brand: "LIEM VORA",
                labels_json: JSON.stringify({ projectLink: "Visit website" }),
                footer_json: JSON.stringify({ label: "LIEM VORA", note: "MADE WITH CARE", year: "2026" }),
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
  assert.deepEqual((await response.json()), {
    updatedAt: "2026-10-23T00:00:00.000Z",
    content: {
      brand: "LIEM VORA",
      navigation: [{ label: "Projects", href: "index.html", page: "projects" }],
      labels: { projectLink: "Visit website" },
      pages: {
        projects: {
          metaTitle: "Projects",
          metaDescription: "Projects description",
          eyebrow: "Portfolio",
          title: "Projects",
          titleAccent: "work.",
          description: "Project description",
          sectionTitle: "My projects",
          items: [{ name: "Example", description: "Example project", category: "WEB", url: "https://example.com" }]
        },
        accomplishments: {
          metaTitle: "Projects",
          metaDescription: "Projects description",
          eyebrow: "Portfolio",
          title: "Projects",
          titleAccent: "work.",
          description: "Project description",
          sectionTitle: "My projects",
          items: []
        },
        arrangements: {
          metaTitle: "Projects",
          metaDescription: "Projects description",
          eyebrow: "Portfolio",
          title: "Projects",
          titleAccent: "work.",
          description: "Project description",
          sectionTitle: "My projects",
          items: []
        }
      },
      footer: { label: "LIEM VORA", note: "MADE WITH CARE", year: "2026" }
    }
  });
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

test("Worker serves private page templates and falls back to public assets", async () => {
  const { createWorker } = await import("../src/worker-handler.js");
  const worker = createWorker({
    index: "<html>home template</html>",
    accomplishments: "<html>accomplishment template</html>",
    arrangements: "<html>arrangement template</html>",
    admin: "<html>private editor</html>"
  });
  const calls = [];
  const env = {
    DB: {
      prepare() {
        return {
          bind() {
            return {
              first: async () => null
            };
          },
          all: async () => ({ results: [] })
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
  assert.equal(apiResponse.status, 503);

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
  assert.match(pageResponse.headers.get("Content-Type"), /text\/html/);
  assert.equal(await pageResponse.text(), "<html>accomplishment template</html>");

  const homeResponse = await worker.fetch(
    new Request("https://www.liemvora.cc/"),
    env,
    {}
  );
  assert.equal(await homeResponse.text(), "<html>home template</html>");

  const adminResponse = await worker.fetch(
    new Request("https://www.liemvora.cc/admin"),
    env,
    {}
  );
  assert.equal(adminResponse.status, 503);

  const staticResponse = await worker.fetch(
    new Request("https://www.liemvora.cc/assets/site.js"),
    env,
    {}
  );
  assert.equal(await staticResponse.text(), "static page");
  assert.deepEqual(calls, ["/assets/site.js"]);
});

test("Worker handler does not construct Responses at module load", async () => {
  const originalResponse = globalThis.Response;
  globalThis.Response = new Proxy(originalResponse, {
    construct() {
      throw new Error("Response construction must be deferred until a request.");
    }
  });

  try {
    await import("../src/worker-handler.js?module-scope-check");
  } finally {
    globalThis.Response = originalResponse;
  }
});
