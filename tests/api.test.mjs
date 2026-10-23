import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { onRequest as contentRequest } from "../functions/api/content.js";
import { onRequest as adminRequest } from "../functions/api/admin/content.js";

test("public content endpoint reads the D1 site record", async () => {
  const pageRows = [
    ["home", "home"],
    ["projects", "projects"],
    ["accomplishments", "accomplishments"],
    ["arrangements", "arrangements"],
    ["services", "services"],
    ["gallery", "gallery"]
  ].map(([id, slug]) => ({
    id,
    slug,
    title: id === "home" ? "Liem Vora" : "Projects",
    meta_title: "Projects",
    meta_description: "Projects description",
    eyebrow: id === "home" ? "" : "Portfolio",
    title_accent: ["home", "services", "gallery"].includes(id) ? "" : "work.",
    description: id === "home" ? "" : "Project description",
    section_title: ["home", "services", "gallery"].includes(id) ? "" : "My projects"
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
              results: [
                { label: "Home", href: "/", page_slug: "home", position: 1 },
                { label: "Projects", href: "/projects", page_slug: "projects", position: 2 }
              ]
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
      navigation: [
        { label: "Home", href: "/", page: "home" },
        { label: "Projects", href: "/projects", page: "projects" }
      ],
      labels: { projectLink: "Visit website" },
      pages: {
        home: {
          metaTitle: "Projects",
          metaDescription: "Projects description",
          eyebrow: "",
          title: "Liem Vora",
          titleAccent: "",
          description: "",
          sectionTitle: "",
          items: []
        },
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
        },
        services: {
          metaTitle: "Projects",
          metaDescription: "Projects description",
          eyebrow: "Portfolio",
          title: "Projects",
          titleAccent: "",
          description: "Project description",
          sectionTitle: "",
          items: []
        },
        gallery: {
          metaTitle: "Projects",
          metaDescription: "Projects description",
          eyebrow: "Portfolio",
          title: "Projects",
          titleAccent: "",
          description: "Project description",
          sectionTitle: "",
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

test("public content endpoint explains how to fix a missing D1 schema", async () => {
  const originalError = console.error;
  console.error = () => {};

  try {
    const response = await contentRequest({
      request: new Request("https://example.com/api/content"),
      env: {
        DB: {
          prepare() {
            return {
              all: async () => {
                throw new Error("no such table: pages");
              },
              bind() {
                return {
                  first: async () => null
                };
              }
            };
          }
        }
      }
    });

    test("public content endpoint recommends the layout upgrade for an existing D1 database", async () => {
      const originalError = console.error;
      console.error = () => {};
      try {
        const response = await contentRequest({
          request: new Request("https://example.com/api/content"),
          env: {
            DB: {
              prepare(query) {
                if (/FROM pages/.test(query)) {
                  return {
                    all: async () => ({
                      results: [{
                        id: "projects",
                        slug: "index",
                        title: "Projects",
                        meta_title: "Projects",
                        meta_description: "Projects",
                        eyebrow: "Projects",
                        title_accent: "work.",
                        description: "Projects",
                        section_title: "Projects"
                      }]
                    })
                  };
                }
                if (/FROM blocks|FROM nav_items/.test(query)) {
                  return { all: async () => ({ results: [] }) };
                }
                return {
                  bind() {
                    return {
                      first: async () => ({
                        brand: "LIEM VORA",
                        labels_json: "{}",
                        footer_json: "{}",
                        updated_at: "2026-10-23T00:00:00.000Z"
                      })
                    };
                  }
                };
              }
            }
          }
        });

        assert.equal(response.status, 503);
        assert.match(
          (await response.json()).error,
          /migrations\/0002_home_projects_empty_accomplishments\.sql/
        );
      } finally {
        console.error = originalError;
      }
    });

    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /migrations\/0001_site_content\.sql/);
  } finally {
    console.error = originalError;
  }
});

test("Worker serves private page templates and falls back to public assets", async () => {
  const { createWorker } = await import("../src/worker-handler.js");
  const worker = createWorker({
    home: "<html>home template</html>",
    projects: "<html>projects template</html>",
    accomplishments: "<html>accomplishment template</html>",
    arrangements: "<html>arrangement template</html>",
    services: "<html>services template</html>",
    gallery: "<html>gallery template</html>",
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

  const projectsResponse = await worker.fetch(
    new Request("https://www.liemvora.cc/projects"),
    env,
    {}
  );
  assert.equal(await projectsResponse.text(), "<html>projects template</html>");

  const servicesResponse = await worker.fetch(
    new Request("https://www.liemvora.cc/services"),
    env,
    {}
  );
  assert.equal(await servicesResponse.text(), "<html>services template</html>");

  const galleryResponse = await worker.fetch(
    new Request("https://www.liemvora.cc/gallery"),
    env,
    {}
  );
  assert.equal(await galleryResponse.text(), "<html>gallery template</html>");

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

test("admin page provides visual sections and item controls instead of a JSON paste area", () => {
  const template = readFileSync(new URL("../src/templates/admin.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../public/assets/admin.js", import.meta.url), "utf8");

  assert.match(template, /role="tablist"/);
  assert.match(template, /id="save-content"/);
  assert.doesNotMatch(template, /<textarea[^>]*id="content-editor"/);
  assert.doesNotMatch(template, />JSON</);
  assert.match(script, /renderPreview/);
  assert.match(script, /editor-preview-frame/);
  assert.match(script, /href="\/styles\.css"/);
  assert.match(script, /class="project-list"/);
  assert.match(script, /class="accomplishment-list"/);
  assert.match(script, /class="wordmark-symbol"/);
  assert.match(script, /class="wordmark-name"/);
  assert.match(script, /Add project/);
  assert.match(script, /Add highlight/);
  assert.match(script, /Add arrangement/);
  assert.match(script, /Move up/);
  assert.match(script, /Move down/);
});

test("home page links to the protected admin editor", () => {
  const template = readFileSync(new URL("../src/templates/home.html", import.meta.url), "utf8");
  assert.match(template, /<a class="admin-entry-button" href="\/admin">Admin/);
});
