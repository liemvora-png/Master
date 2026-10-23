import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templates = [
  "home.html",
  "projects.html",
  "accomplishments.html",
  "arrangements.html",
  "services.html",
  "gallery.html",
  "admin.html"
];

test("every page uses the same header navigation order and includes Admin", () => {
  let expectedNavigation;

  for (const templateName of templates) {
    const template = readFileSync(new URL(`../src/templates/${templateName}`, import.meta.url), "utf8");
    const navigation = template.match(/<nav class="site-nav"[^>]*>([\s\S]*?)<\/nav>/);
    assert.ok(navigation, `${templateName} should have the shared navigation`);

    const links = [...navigation[1].matchAll(/<a href="([^"]+)"/g)].map(([, href]) => href);
    if (expectedNavigation) assert.deepEqual(links, expectedNavigation, `${templateName} navigation order`);
    else expectedNavigation = links;

    assert.match(template, /<a class="admin-entry-button" href="\/admin"/, `${templateName} should include Admin`);
  }
});

test("home page welcomes visitors and displays its managed update time", () => {
  const home = readFileSync(new URL("../src/templates/home.html", import.meta.url), "utf8");
  const siteScript = readFileSync(new URL("../public/assets/site.js", import.meta.url), "utf8");

  assert.match(home, /Welcome to my<br><span>portfolio\.<\/span>/);
  assert.match(home, /<time id="home-last-updated">checking…<\/time>/);
  assert.match(siteScript, /updateHomeTimestamp\(updatedAt\)/);
  assert.match(siteScript, /dayLabel = "today"/);
  assert.match(siteScript, /dayLabel = "yesterday"/);
});
