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
    assert.match(template, /<button class="menu-toggle"/, `${templateName} should include the always-visible menu button`);
    assert.match(template, /aria-controls="site-navigation"/);
  }
});

test("desktop breakpoint exposes full navigation and hides the burger", () => {
  const styles = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
  const script = readFileSync(new URL("../public/assets/site.js", import.meta.url), "utf8");

  assert.match(styles, /@media \(min-width: 1100px\)[\s\S]*\.menu-toggle\s*\{\s*display:\s*none;/);
  assert.match(styles, /@media \(min-width: 1100px\)[\s\S]*\.site-header > \.site-nav[\s\S]*display:\s*flex/);
  assert.match(script, /min-width: 1100px/);
});

test("burger button keeps identical dimensions and never recolors", () => {
  const styles = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

  assert.match(
    styles,
    /\.menu-toggle\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/,
    "the burger button should declare an explicit 44px square box"
  );
  assert.ok(
    !/\.menu-toggle(?::hover|:active)[^{]*\{/.test(styles),
    "the burger button should not recolor on hover or press"
  );
  assert.ok(
    (styles.match(/\.menu-toggle-line\s*\{[^}]*height:/g) || []).length === 1,
    "there should be exactly one burger line size rule so all lines share the same weight"
  );
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

test("admin page passes the Clerk key to the browser SDK", () => {
  const admin = readFileSync(new URL("../src/templates/admin.html", import.meta.url), "utf8");
  assert.match(admin, /defer[\s\S]*crossorigin="anonymous"/);
  assert.match(admin, /data-clerk-publishable-key="__CLERK_PUBLISHABLE_KEY_ATTR__"/);
  assert.match(admin, /src="https:\/\/cdn\.jsdelivr\.net\/npm\/@clerk\/clerk-js@6\/dist\/clerk\.browser\.js"/);
  assert.match(admin, /src="https:\/\/cdn\.jsdelivr\.net\/npm\/@clerk\/ui@1\/dist\/ui\.browser\.js"/);
});
