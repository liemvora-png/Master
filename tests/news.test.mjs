import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { onRequest as newsRequest } from "../functions/api/news.js";

test("home page carries a hidden news section linking to the digest", () => {
  const home = readFileSync(new URL("../src/templates/home.html", import.meta.url), "utf8");

  assert.match(home, /<section class="home-news"[^>]*hidden[^>]*aria-labelledby="home-news-title"/);
  assert.match(home, /<h2 id="home-news-title">Notices<\/h2>/);
  assert.match(home, /<a class="news-all-link" href="\/news"/);
  assert.match(home, /<ul class="home-news-list" id="home-news-list">/);
});

test("site script renders the newest digest items on the home page", () => {
  const siteScript = readFileSync(new URL("../public/assets/site.js", import.meta.url), "utf8");

  assert.match(siteScript, /async function loadHomeNews\(\)/);
  assert.match(siteScript, /document\.body\.dataset\.page !== "home"/);
  assert.match(siteScript, /fetch\("\/api\/news\?limit=1"/);
  assert.match(siteScript, /HOME_NEWS_LIMIT/);
  assert.match(siteScript, /section\.hidden = false;/);
  assert.match(siteScript, /loadHomeNews\(\);/);
});

test("news rows are styled with the shared theme tokens", () => {
  const styles = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

  assert.match(styles, /\.home-news-item\s*\{[^}]*border-bottom: 1px solid var\(--line\)/);
  assert.match(styles, /\.home-news-time\s*\{[^}]*font-family: var\(--mono\)/);
  assert.match(styles, /\.home-news-title\s*\{[^}]*font-family: var\(--serif\)/);
});

test("news page uses D1 and has no static fallback", () => {
  const page = readFileSync(new URL("../public/news/index.html", import.meta.url), "utf8");

  assert.doesNotMatch(page, /news-static|renderStaticFallback/);
  assert.match(page, /fetch\("\/api\/news\?limit=1"/);
  assert.match(page, /class="menu-toggle"/);
  assert.match(page, /aria-controls="site-navigation"/);
  assert.match(page, /Loading tech news/);
  assert.match(page, /No tech news is available right now/);
  assert.match(page, /Tech news could not be loaded/);
  assert.match(page, /data-news-retry/);
});

test("news API returns the newest D1 items first regardless of position", async () => {
  const rows = [
    { id: "older-top", published_at: "2026-11-07T16:30-06:00", position: 1 },
    { id: "newest", published_at: "2026-11-08T08:30-06:00", position: 4 },
    { id: "tie-b", published_at: "2026-11-08T08:30-06:00", position: 5 },
    { id: "older", published_at: "2026-11-06T17:10-06:00", position: 7 }
  ];
  const sortedRows = [...rows].sort((a, b) => {
    const at = Date.parse(a.published_at);
    const bt = Date.parse(b.published_at);
    return bt - at || a.position - b.position;
  });
  const env = {
    DB: {
      prepare(query) {
        assert.match(query, /FROM news_items WHERE active = 1/);
        assert.match(query, /ORDER BY published_at DESC, position ASC/);
        assert.match(query, /LIMIT \? OFFSET \?/);
        return {
          bind(limit, offset) {
            assert.equal(limit, 50);
            assert.equal(offset, 0);
            return { all: async () => ({ results: sortedRows }) };
          }
        };
      }
    }
  };

  const response = await newsRequest({
    request: new Request("https://example.com/api/news"),
    env
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.news.map((item) => item.id), ["newest", "tie-b", "older-top", "older"]);
  assert.equal(body.hasMore, false);
});

test("news API honours the limit and offset query parameters", async () => {
  const rows = [
    { id: "newest", published_at: "2026-11-08T08:30-06:00", position: 4 },
    { id: "tie-b", published_at: "2026-11-08T08:30-06:00", position: 5 }
  ];
  let captured = {};
  const env = {
    DB: {
      prepare(query) {
        assert.match(query, /ORDER BY published_at DESC, position ASC/);
        return {
          bind(limit, offset) {
            captured = { limit, offset };
            return { all: async () => ({ results: rows }) };
          }
        };
      }
    }
  };

  const response = await newsRequest({
    request: new Request("https://example.com/api/news?limit=2&offset=3"),
    env
  });

  assert.equal(response.status, 200);
  assert.deepEqual(captured, { limit: 2, offset: 3 });
  const body = await response.json();
  assert.equal(body.hasMore, true);
  assert.deepEqual(body.news.map((item) => item.id), ["newest", "tie-b"]);
});

test("news API rejects an invalid limit parameter", async () => {
  const env = {
    DB: {
      prepare() {
        return {
          bind() {
            return { all: async () => ({ results: [] }) };
          }
        };
      }
    }
  };

  const response = await newsRequest({
    request: new Request("https://example.com/api/news?limit=abc"),
    env
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.news.length, 0);
});
