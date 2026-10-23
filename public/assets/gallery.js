const galleryGrid = document.querySelector("#gallery-grid");

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
    for (const photo of result.images) {
      const figure = document.createElement("figure");
      figure.className = "gallery-photo";
      const image = document.createElement("img");
      image.src = photo.image_url;
      image.alt = photo.alt_text;
      image.loading = "lazy";
      figure.append(image);
      if (photo.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = photo.caption;
        figure.append(caption);
      }
      galleryGrid.append(figure);
    }
  })
  .catch((error) => {
    galleryGrid.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = error.message;
    galleryGrid.append(message);
  });
