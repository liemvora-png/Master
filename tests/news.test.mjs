import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("home page carries a hidden news section linking to the digest", () => {
  const home = readFileSync(new URL("../src/templates/home.html", import.meta.url), "utf8");

  assert.match(home, /<section class="home-news"[^>]*hidden[^>]*aria-labelledby="home-news-title"/);
  assert.match(home, /<h2 id="home-news-title">Latest news<\/h2>/);
  assert.match(home, /<a class="news-all-link" href="\/news"/);
  assert.match(home, /<ul class="home-news-list" id="home-news-list">/);
});

test("site script renders the newest digest items on the home page", () => {
  const siteScript = readFileSync(new URL("../public/assets/site.js", import.meta.url), "utf8");

  assert.match(siteScript, /async function loadHomeNews\(\)/);
  assert.match(siteScript, /document\.body\.dataset\.page !== "home"/);
  assert.match(siteScript, /fetch\("\/news\/"/);
  assert.match(siteScript, /new DOMParser\(\)\.parseFromString/);
  assert.match(siteScript, /querySelectorAll\("main article"\)/);
  assert.match(siteScript, /safeHref\(sourceEl\?\.getAttribute\("href"\)/);
  assert.match(siteScript, /section\.hidden = false;/);
  assert.match(siteScript, /loadHomeNews\(\);/);
});

test("news rows are styled with the shared theme tokens", () => {
  const styles = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

  assert.match(styles, /\.home-news-item\s*\{[^}]*border-bottom: 1px solid var\(--line\)/);
  assert.match(styles, /\.home-news-time\s*\{[^}]*font-family: var\(--mono\)/);
  assert.match(styles, /\.home-news-title\s*\{[^}]*font-family: var\(--serif\)/);
});
