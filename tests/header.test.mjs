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

test("public pages lead with the title and ship no kicker line", () => {
  for (const templateName of ["projects.html", "accomplishments.html", "arrangements.html", "services.html", "gallery.html"]) {
    const template = readFileSync(new URL(`../src/templates/${templateName}`, import.meta.url), "utf8");
    assert.doesNotMatch(template, /class="eyebrow"/, `${templateName} should not ship an eyebrow kicker`);
    assert.match(template, /class="intro"[^>]*>\s*<h1/, `${templateName} should open its intro with the title`);
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
    /\.menu-toggle\s*\{[^}]*width:\s*40px;[^}]*height:\s*40px;/,
    "the burger button should declare an explicit square box matching the theme-toggle's 40px size"
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
  const handler = readFileSync(new URL("../src/worker-handler.js", import.meta.url), "utf8");

  assert.match(home, /class="masthead-note">Projects, photography, arrangements, and services/);
  // The stamp ships a server-rendered real default, never a stuck loading string.
  assert.match(home, /<time id="home-last-updated">__HOME_ISSUED__<\/time>/);
  assert.match(handler, /__HOME_ISSUED__/);
  assert.match(handler, /awaiting programme data/);
  // The stamp is the later of the last admin edit and the newest notice.
  assert.match(siteScript, /applyHomeStamp\(\)/);
  assert.match(siteScript, /dayLabel = "today"/);
  assert.match(siteScript, /dayLabel = "yesterday"/);
});

test("navigation is reachable in the shipped markup; only JS adds menu state", () => {
  for (const templateName of templates) {
    const template = readFileSync(new URL(`../src/templates/${templateName}`, import.meta.url), "utf8");
    assert.doesNotMatch(template, /<nav class="site-nav"[^>]*inert/, `${templateName} nav must not ship inert`);
    assert.doesNotMatch(template, /<nav class="site-nav"[^>]*aria-hidden/, `${templateName} nav must not ship aria-hidden`);
  }
});

test("home fold starts folded and only ever adds information", () => {
  const home = readFileSync(new URL("../src/templates/home.html", import.meta.url), "utf8");
  const homeScript = readFileSync(new URL("../public/assets/home.js", import.meta.url), "utf8");

  // The markup ships the full programme (no-JS sees all); JS folds at load and
  // the control then only ever adds (world states: "Full programme" / "At a glance").
  assert.match(home, /data-works-fold aria-expanded="false" aria-controls="works-list">Full programme<\/button>/);
  assert.match(home, /<ul class="works-list" id="works-list" data-fold="full">/);
  assert.match(homeScript, /localStorage\.getItem\("works-fold"\) !== "full"/);
  assert.match(homeScript, /glance \? "Full programme" : "At a glance"/);
  assert.doesNotMatch(homeScript, /foldBtn\.setAttribute\("aria-label"/, "the fold's accessible name must contain its visible text (WCAG 2.5.3)");
});

test("running-order entries name real artifacts and home uses one bounded news call", () => {
  const home = readFileSync(new URL("../src/templates/home.html", import.meta.url), "utf8");
  const siteScript = readFileSync(new URL("../public/assets/site.js", import.meta.url), "utf8");
  const homeScript = readFileSync(new URL("../public/assets/home.js", import.meta.url), "utf8");

  for (const key of ["projects", "arrangements", "gallery", "accomplishments"]) {
    assert.ok(home.includes(`data-entry-artifact="${key}"`), `home should carry an artifact slot for ${key}`);
  }
  assert.match(siteScript, /\/api\/news\?limit=\$\{HOME_NEWS_LIMIT\}/);
  assert.doesNotMatch(siteScript, /\/api\/news\?limit=1&offset=/, "no serial news waterfall");
  assert.doesNotMatch(homeScript, /fetch\("\/api\/news"/, "home.js must not fetch news a second time");
});

test("mobile chrome keeps 44px touch targets", () => {
  const styles = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
  const mobile = styles.match(/@media \(max-width: 700px\)[\s\S]*?\.intro/);
  assert.ok(mobile, "mobile block should exist");
  assert.match(mobile[0], /\.menu-toggle\s*\{[^}]*width:\s*44px;/);
  assert.match(mobile[0], /\.admin-entry-button\s*\{[^}]*min-height:\s*44px;/);
  assert.match(mobile[0], /\.theme-toggle\s*\{[^}]*min-height:\s*44px;/);
});

test("admin page passes the Clerk key to the browser SDK", () => {
  const admin = readFileSync(new URL("../src/templates/admin.html", import.meta.url), "utf8");
  assert.match(admin, /defer[\s\S]*crossorigin="anonymous"/);
  assert.match(admin, /data-clerk-publishable-key="__CLERK_PUBLISHABLE_KEY_ATTR__"/);
  assert.match(admin, /src="https:\/\/cdn\.jsdelivr\.net\/npm\/@clerk\/clerk-js@6\/dist\/clerk\.browser\.js"/);
  assert.match(admin, /src="https:\/\/cdn\.jsdelivr\.net\/npm\/@clerk\/ui@1\/dist\/ui\.browser\.js"/);
});
