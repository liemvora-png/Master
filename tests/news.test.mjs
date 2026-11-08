import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { onRequest as newsRequest } from "../functions/api/news.js";

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
  assert.match(siteScript, /fetch\("\/api\/news"[^)]*\)/);
  assert.match(siteScript, /items\.length = Math\.min\(items\.length, HOME_NEWS_LIMIT\)/);
  assert.match(siteScript, /section\.hidden = false;/);
  assert.match(siteScript, /loadHomeNews\(\);/);
});

test("news rows are styled with the shared theme tokens", () => {
  const styles = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

  assert.match(styles, /\.home-news-item\s*\{[^}]*border-bottom: 1px solid var\(--line\)/);
  assert.match(styles, /\.home-news-time\s*\{[^}]*font-family: var\(--mono\)/);
  assert.match(styles, /\.home-news-title\s*\{[^}]*font-family: var\(--serif\)/);
});

test("news API returns the newest D1 items first regardless of position", async () => {
  const rows = [
    { id: "older-top", published_at: "2026-11-07T16:30-06:00", position: 1 },
    { id: "newest", published_at: "2026-11-08T08:30-06:00", position: 4 },
    { id: "tie-b", published_at: "2026-11-08T08:30-06:00", position: 5 },
    { id: "older", published_at: "2026-11-06T17:10-06:00", position: 7 }
  ];
  const env = {
    DB: {
      prepare(query) {
        assert.match(query, /FROM news_items WHERE active = 1/);
        return { all: async () => ({ results: rows }) };
      }
    }
  };

  const response = await newsRequest({
    request: new Request("https://example.com/api/news"),
    env
  });

  assert.equal(response.status, 200);
  const { news } = await response.json();
  assert.deepEqual(news.map((item) => item.id), ["newest", "tie-b", "older-top", "older"]);
});
