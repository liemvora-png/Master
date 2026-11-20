import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const galleryScript = readFileSync(new URL("../public/assets/gallery.js", import.meta.url), "utf8");

function blockFor(selector) {
  const pattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`);
  const match = styles.match(pattern);
  assert.ok(match, `${selector} should have a CSS rule`);
  return match[1];
}

test("gallery photos are never dimmed or blurred", () => {
  for (const selector of [".gallery-photo-frame", ".gallery-photo-image"]) {
    const block = blockFor(selector);
    assert.doesNotMatch(block, /opacity\s*:/, `${selector} must not set opacity`);
    assert.doesNotMatch(block, /filter\s*:/, `${selector} must not set a filter`);
  }
});

test("the gallery image is visible as soon as it has a source", () => {
  const block = blockFor(".gallery-photo-image");
  assert.match(block, /object-fit:\s*cover/);
  assert.match(styles, /\.gallery-photo-image:not\(\[src\]\)\s*\{[^}]*visibility:\s*hidden/);
});

test("gallery images climb from low quality to full quality in place", () => {
  assert.doesNotMatch(galleryScript, /\bsrcset\b/, "gallery upgrades must not hand candidate selection to the browser");
  assert.match(galleryScript, /const previewUrl = photo\.preview_url \|\| originalUrl/);
  assert.match(galleryScript, /const mediumUrl = photo\.medium_url \|\| previewUrl/);
  assert.match(galleryScript, /image\.src = previewUrl/);
  assert.match(galleryScript, /preload\(url, isFinal \? undefined : "low"\)/);
  assert.match(galleryScript, /\(\) => advance\(\)/, "a failed tier must keep climbing to the original");
});

test("a failed tier does not strand the photo on a lower quality", () => {
  // Every reachable tier must be followed by an advance() on both paths, so a
  // missing medium variant still lets the original load.
  const climb = galleryScript.match(/function advance\(\) \{[\s\S]*?\n {2}\}/);
  assert.ok(climb, "expected the upgrade loop to be inspectable");
  assert.match(climb[0], /if \(url === undefined\) return/);
  const calls = (climb[0].match(/advance\(\)/g) || []).length;
  assert.ok(calls >= 3, `expected both success and failure paths to climb, found ${calls} calls`);
});