const galleryGrid = document.querySelector("#gallery-grid");

// Fetch and decode one variant off-DOM. Handing the visible <img> a URL that is
// already decoded means the swap paints complete in a single step instead of
// flashing a half-decoded frame.
//
// src is assigned before decode() so the decoder waits on a real request rather
// than a pending one. Intermediate tiers are fetched at low priority: they exist
// to sharpen the picture, not to gate first paint, while the final tier stays at
// the browser's default so the sharpest variant is not queued behind them.
function preload(url, fetchPriority) {
  const candidate = new Image();
  candidate.decoding = "async";
  if (fetchPriority) candidate.fetchPriority = fetchPriority;
  candidate.src = url;
  return typeof candidate.decode === "function" ? candidate.decode() : Promise.resolve();
}

function showPhoto(photo, index) {
  const figure = document.createElement("figure");
  figure.className = "gallery-photo";
  const frame = document.createElement("div");
  frame.className = "gallery-photo-frame";
  const image = document.createElement("img");
  image.alt = photo.alt_text;
  image.loading = "lazy";
  image.decoding = "async";
  image.width = 1200;
  image.height = 900;
  image.className = "gallery-photo-image";
  // Only the first rows compete with the previews for bandwidth; everything
  // further down should never push those first bytes back.
  if (index > 2) image.fetchPriority = "low";
  frame.append(image);
  figure.append(frame);
  if (photo.caption) {
    const caption = document.createElement("figcaption");
    caption.textContent = photo.caption;
    figure.append(caption);
  }

  const originalUrl = photo.image_url;
  const previewUrl = photo.preview_url || originalUrl;
  const mediumUrl = photo.medium_url || previewUrl;

  // Low to high. Each tier is listed even when its URL repeats an earlier one,
  // because the upgrade loop below steps through positions, not URLs.
  const chain = [
    previewUrl,
    mediumUrl,
    originalUrl
  ];

  // The low tier always paints first. Width descriptors are deliberately absent:
  // they would let the browser pick one candidate and ignore every later src
  // change, which silently defeats the climb.
  image.src = previewUrl;

  galleryGrid.append(figure);

  // Start at the tier after the preview and climb. Reaching the end of the chain
  // simply stops: the highest tier that loaded is the one left on screen.
  let next = 1;
  function advance() {
    const url = chain[next];
    if (url === undefined) return;
    const isFinal = next === chain.length - 1;
    next += 1;
    // Intermediate tiers are preloaded at low priority so they sharpen the
    // picture without competing with the preview or the final variant.
    preload(url, isFinal ? undefined : "low").then(
      () => {
        // Photos saved before their medium tier existed repeat a URL across the
        // chain; reassigning src would make the browser refetch what it has.
        if (url !== image.currentSrc) image.src = url;
        // Climb regardless of which tier this was: if a middle tier failed, the
        // loop still needs to reach the original rather than strand the photo.
        advance();
      },
      // A tier that fails must not strand the photo on a lower one.
      () => advance()
    );
  }

  // Wait until the preview is on screen before spending bandwidth upward, so the
  // low-quality tier is always what paints first.
  if (image.complete && image.naturalWidth > 0) advance();
  else image.addEventListener("load", advance, { once: true });
}

fetch("/api/gallery", { headers: { Accept: "application/json" } })
  .then(async (response) => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load photographs.");
    galleryGrid.replaceChildren();
    if (result.images.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Photographs will be added here.";
      galleryGrid.append(empty);
      return;
    }
    result.images.forEach(showPhoto);
  })
  .catch((error) => {
    galleryGrid.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = error.message;
    galleryGrid.append(message);
  });
