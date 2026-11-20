import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ALT_LENGTH,
  MAX_BATCH,
  MAX_IMAGE_SIZE,
  MAX_INPUT_BYTES,
  REENCODE_INPUT_BYTES,
  TARGET_LONG_EDGE,
  PREVIEW_LONG_EDGE,
  PREVIEW_QUALITY,
  MEDIUM_LONG_EDGE,
  MEDIUM_QUALITY,
  altTextFromFilename,
  describeFileRejection,
  describeItemRejection,
  formatSize,
  isSameFile,
  needsReEncode,
  processedName
} from "../public/assets/gallery-upload.js";

function photo(name, size = 1024, type = "image/jpeg", lastModified = 1700000000000) {
  return { name, size, type, lastModified };
}

test("alt text is prefilled from the photo file name", () => {
  assert.equal(altTextFromFilename("IMG_2026-05-12.jpg"), "IMG 2026 05 12");
  assert.equal(altTextFromFilename("harbour.fog.png"), "harbour fog");
  assert.equal(altTextFromFilename(".jpg"), "Photo");
  assert.equal(altTextFromFilename("x".repeat(400)).length, MAX_ALT_LENGTH);
});

test("input files are refused on type, emptiness, and Cloudflare's upload cap", () => {
  assert.match(
    describeFileRejection(photo("scan.jpg", MAX_INPUT_BYTES + 5 * 1024 * 1024)),
    /is 95\.0 MB, over the 90\.0 MB upload limit/
  );
  assert.match(
    describeFileRejection(photo("loop.gif", MAX_IMAGE_SIZE + 1024 * 1024, "image/gif")),
    /GIFs upload as-is, up to 20\.0 MB/
  );
  assert.match(describeFileRejection(photo("notes.pdf", 1024, "application/pdf")), /notes\.pdf is not a JPEG, PNG, WebP, AVIF, or GIF image/);
  assert.match(describeFileRejection(photo("raw.nef", 1024, "image/x-nikon-nef")), /not a JPEG, PNG, WebP, AVIF, or GIF image/);
  assert.match(describeFileRejection(photo("empty.png", 0, "image/png")), /is empty/);
  assert.equal(describeFileRejection(photo("full-res.jpg", 60 * 1024 * 1024)), "");
  assert.equal(describeFileRejection(photo("ok.avif", MAX_IMAGE_SIZE, "image/avif")), "");
});

test("big photos re-encode in the browser, GIFs and smaller files pass through", () => {
  assert.equal(needsReEncode(photo("export.jpg", REENCODE_INPUT_BYTES + 1)), true);
  assert.equal(needsReEncode(photo("medium.jpg", REENCODE_INPUT_BYTES)), false);
  assert.equal(needsReEncode(photo("small.png", 3 * 1024 * 1024, "image/png")), false);
  assert.equal(needsReEncode(photo("animation.gif", 8 * 1024 * 1024, "image/gif")), false);
  assert.equal(processedName("IMG_2026-05-12.png", "image/webp"), "IMG_2026-05-12.webp");
  assert.equal(processedName("street.jpg", "image/jpeg"), "street.jpg");
  assert.equal(processedName(".png", "image/webp"), "photo.webp");
});

test("a full batch and duplicate photos are refused", () => {
  assert.match(describeFileRejection(photo("late.jpg"), MAX_BATCH), /Only 20 photos upload at a time/);
  const first = photo("same.jpg");
  assert.match(describeFileRejection(photo("same.jpg"), 1, [first]), /same\.jpg is already staged/);
  assert.equal(describeFileRejection(photo("same.jpg", 2048), 1, [first]), "");
  assert.ok(isSameFile(first, photo("same.jpg")));
});

test("a staged photo without alt text cannot upload", () => {
  assert.match(describeItemRejection({ file: photo("dawn.jpg"), altText: "   ", caption: "" }), /needs alt text/);
  assert.equal(
    describeItemRejection({ file: photo("dawn.jpg"), altText: "Dawn over the river", caption: "Kerala" }),
    ""
  );
});

test("file sizes read the way the queue shows them", () => {
  assert.equal(formatSize(512), "512 bytes");
  assert.equal(formatSize(2048), "2 KB");
  assert.equal(formatSize(MAX_IMAGE_SIZE), "20.0 MB");
});

test("progressive preview dimensions are intentionally smaller than the original quality tier", () => {
  assert.equal(PREVIEW_LONG_EDGE, 32);
  assert.equal(PREVIEW_QUALITY, 0.38);
  assert.equal(MEDIUM_LONG_EDGE, 1920);
  assert.equal(MEDIUM_QUALITY, 0.86);
  assert.ok(MEDIUM_LONG_EDGE < TARGET_LONG_EDGE);
  assert.ok(MEDIUM_QUALITY < 1);
});
