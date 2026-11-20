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
      const frame = document.createElement("div");
      frame.className = "gallery-photo-frame";
      const image = document.createElement("img");
      image.alt = photo.alt_text;
      image.loading = "lazy";
      image.width = 1200;
      image.height = 900;
      image.className = "gallery-photo-image";
      frame.append(image);
      figure.append(frame);

      const lowUrl = photo.preview_url || photo.image_url;
      const mediumUrl = photo.medium_url || lowUrl;
      const originalUrl = photo.image_url;

      image.src = lowUrl;
      image.addEventListener("load", () => image.classList.add("is-ready"), { once: true });
      if (lowUrl !== originalUrl) {
        image.addEventListener("error", () => {
          image.src = originalUrl;
        }, { once: true });
      }

      function upgrade(url) {
        if (!url || url === image.src) return;
        const candidate = new Image();
        candidate.width = 1200;
        candidate.height = 900;
        candidate.onload = async () => {
          try {
            if (typeof candidate.decode === "function") await candidate.decode();
          } catch {}
          image.classList.remove("is-ready");
          image.src = url;
          requestAnimationFrame(() => image.classList.add("is-ready"));
          if (url === mediumUrl && originalUrl !== mediumUrl) {
            upgrade(originalUrl);
          }
        };
        candidate.onerror = () => {
          if (url === mediumUrl && originalUrl !== mediumUrl) upgrade(originalUrl);
        };
        candidate.src = url;
      }

      image.addEventListener("load", () => {
        if (mediumUrl !== lowUrl) {
          upgrade(mediumUrl);
        } else if (originalUrl !== lowUrl) {
          upgrade(originalUrl);
        }
        if (mediumUrl !== lowUrl && originalUrl !== mediumUrl) {
          image.srcset = `${mediumUrl} 1440w, ${originalUrl} 2560w`;
          image.sizes = "(min-width: 1200px) 33vw, (min-width: 768px) 50vw, 100vw";
        }
      }, { once: true });
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
