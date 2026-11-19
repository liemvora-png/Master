import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ALT_LENGTH,
  MAX_BATCH,
  MAX_IMAGE_SIZE,
  altTextFromFilename,
  describeFileRejection,
  describeItemRejection,
  formatSize,
  isSameFile
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

test("oversized, unsupported, and empty files are refused before uploading", () => {
  assert.match(describeFileRejection(photo("big.jpg", MAX_IMAGE_SIZE + 600 * 1024)), /is 8\.6 MB, over the 8 MB limit/);
  assert.match(describeFileRejection(photo("notes.pdf", 1024, "application/pdf")), /notes\.pdf is not a JPEG, PNG, WebP, or GIF image/);
  assert.match(describeFileRejection(photo("empty.png", 0, "image/png")), /is empty/);
  assert.equal(describeFileRejection(photo("ok.webp", MAX_IMAGE_SIZE, "image/webp")), "");
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
  assert.equal(formatSize(MAX_IMAGE_SIZE), "8.0 MB");
});
