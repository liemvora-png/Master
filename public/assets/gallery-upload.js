// Staged multi-photo uploader for the admin gallery. Limits mirror functions/api/admin/gallery.js.

// Cloudflare rejects request bodies over 100 MB on Free/Pro plans before any
// code runs, and multipart adds overhead, so full-size inputs stop at 90 MB.
export const MAX_INPUT_BYTES = 90 * 1024 * 1024;
// Uploaded payloads (the processed file, or a pass-through photo/GIF) fit this
// cap, which matches the server's MAX_IMAGE_SIZE.
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
// Anything above this is decoded and re-encoded in the browser before upload;
// smaller photos upload untouched at full quality.
export const REENCODE_INPUT_BYTES = 20 * 1024 * 1024;
export const TARGET_LONG_EDGE = 2560;
export const ENCODE_STEPS = [
  { longEdge: TARGET_LONG_EDGE, quality: 0.86 },
  { longEdge: TARGET_LONG_EDGE, quality: 0.75 },
  { longEdge: 1920, quality: 0.75 },
  { longEdge: 1600, quality: 0.7 }
];
export const MAX_BATCH = 20;
export const MAX_ALT_LENGTH = 240;
export const MAX_CAPTION_LENGTH = 300;

export const ACCEPTED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"]
]);

const ACCEPT_ATTRIBUTE = [...ACCEPTED_TYPES.keys()].join(",");

export function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

export function altTextFromFilename(name) {
  const base = String(name ?? "")
    .replace(/\.[^.]*$/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.slice(0, MAX_ALT_LENGTH) || "Photo";
}

export function isSameFile(one, two) {
  return one.name === two.name && one.size === two.size && one.lastModified === two.lastModified;
}

// Staged photos carry the processed file, so duplicate checks compare the
// original file the admin picked, not the re-encoded upload.
export function sourceRef(file) {
  return { name: file.name, size: file.size, lastModified: file.lastModified };
}

// GIFs pass through untouched to keep animation; every other accepted format
// is re-encoded when it is big enough to matter.
export function needsReEncode(file) {
  return file.type !== "image/gif" && file.size > REENCODE_INPUT_BYTES;
}

export function processedName(originalName, mime) {
  const base = String(originalName ?? "").replace(/\.[^.]*$/, "");
  return `${base || "photo"}${mime === "image/webp" ? ".webp" : ".jpg"}`;
}

export function describeFileRejection(file, stagedCount = 0, stagedSources = []) {
  if (!file) return "That file could not be read.";
  if (!ACCEPTED_TYPES.has(file.type)) return `${file.name} is not a JPEG, PNG, WebP, AVIF, or GIF image.`;
  if (!file.size) return `${file.name} is empty.`;
  if (file.type === "image/gif" && file.size > MAX_IMAGE_SIZE) {
    return `${file.name} is ${formatSize(file.size)}. GIFs upload as-is, up to ${formatSize(MAX_IMAGE_SIZE)}.`;
  }
  if (file.size > MAX_INPUT_BYTES) {
    return `${file.name} is ${formatSize(file.size)}, over the ${formatSize(MAX_INPUT_BYTES)} upload limit.`;
  }
  if (stagedCount >= MAX_BATCH) return `Only ${MAX_BATCH} photos upload at a time.`;
  if (stagedSources.some((source) => isSameFile(source, file))) return `${file.name} is already staged.`;
  return "";
}

export function describeItemRejection(item) {
  const alt = String(item.altText ?? "").trim();
  if (!alt) return `${item.file.name} needs alt text.`;
  if (alt.length > MAX_ALT_LENGTH) return `${item.file.name} alt text is longer than ${MAX_ALT_LENGTH} characters.`;
  if (String(item.caption ?? "").length > MAX_CAPTION_LENGTH) {
    return `${item.file.name} caption is longer than ${MAX_CAPTION_LENGTH} characters.`;
  }
  return "";
}

let activeStage;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function textLabel(label, value, maxLength) {
  const wrapper = element("label", "content-field");
  wrapper.append(element("span", "", label));
  const input = document.createElement("input");
  input.maxLength = maxLength;
  input.value = value ?? "";
  wrapper.append(input);
  return { wrapper, input };
}

function fileLabel(label) {
  const wrapper = element("label", "content-field");
  wrapper.append(element("span", "", label));
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ACCEPT_ATTRIBUTE;
  wrapper.append(input);
  return { wrapper, input };
}

function carriesFiles(event) {
  const types = event.dataTransfer && event.dataTransfer.types;
  return Array.from(types || []).includes("Files");
}

async function encodeBitmap(bitmap, step) {
  const maxDim = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, step.longEdge / maxDim);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  for (const [mime, quality] of [["image/webp", step.quality], ["image/jpeg", step.quality]]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
    // Browsers without WebP encoding answer with PNG; treat that as no-WebP.
    if (blob && blob.type === mime) return blob;
  }
  return null;
}

async function prepareFile(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { error: `${file.name}: your browser could not open this image. Export it as JPEG from your photo editor and upload that.` };
  }
  try {
    for (const step of ENCODE_STEPS) {
      const blob = await encodeBitmap(bitmap, step);
      if (!blob) {
        return { error: `${file.name}: your browser could not re-encode this image. Upload a JPEG under ${formatSize(MAX_IMAGE_SIZE)} instead.` };
      }
      if (blob.size <= MAX_IMAGE_SIZE) {
        return { file: new File([blob], processedName(file.name, blob.type), { type: blob.type }) };
      }
    }
    return { error: `${file.name} stayed over ${formatSize(MAX_IMAGE_SIZE)} after compressing. Export a smaller JPEG and upload that.` };
  } finally {
    bitmap.close?.();
  }
}

export function createUploader({ upload, setStatus, onUploaded }) {
  // A manager re-render rebuilds this block, so the queue is carried across renders.
  const stage = activeStage ?? [];
  activeStage = stage;

  let uploading = false;

  const dropzone = element("div", "gallery-dropzone");
  const fileField = fileLabel("Photos");
  dropzone.append(
    fileField.wrapper,
    element("p", "editor-help", `Drag photos here or choose files. JPEG, PNG, WebP, AVIF, and GIF, up to ${formatSize(MAX_INPUT_BYTES)} each. Photos over ${formatSize(REENCODE_INPUT_BYTES)} are resized to ${TARGET_LONG_EDGE} px WebP in your browser before upload, up to ${MAX_BATCH} at a time.`)
  );

  const notices = element("p", "gallery-notices");
  notices.setAttribute("role", "status");
  notices.hidden = true;

  const stageList = element("div", "gallery-stage");

  const uploadButton = element("button", "editor-button", "Upload photo");
  uploadButton.type = "button";
  const clearButton = element("button", "editor-button editor-button-secondary", "Clear queue");
  clearButton.type = "button";
  const actions = element("div", "portfolio-actions");
  actions.append(uploadButton, clearButton);

  const root = element("div", "gallery-uploader");
  root.append(dropzone, notices, stageList, actions);

  function setNotice(message) {
    notices.textContent = message;
    notices.hidden = !message;
  }

  function updateControls() {
    uploadButton.textContent = stage.length > 1 ? `Upload ${stage.length} photos` : "Upload photo";
    uploadButton.disabled = uploading || stage.length === 0;
    clearButton.disabled = uploading || stage.length === 0;
  }

  function removeItem(item) {
    const index = stage.indexOf(item);
    if (index !== -1) stage.splice(index, 1);
    URL.revokeObjectURL(item.previewUrl);
  }

  function renderStage() {
    stageList.replaceChildren();
    if (!stage.length) {
      stageList.append(element("p", "gallery-empty", "Nothing staged. Chosen or dropped photos appear here so you can set alt text before they upload."));
    }
    for (const item of stage) {
      const row = element("article", "gallery-stage-item");
      const preview = element("div", "gallery-stage-preview");
      const image = document.createElement("img");
      image.src = item.previewUrl;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.width = 320;
      image.height = 240;
      preview.append(image);

      const fields = element("div", "gallery-stage-fields");
      fields.append(element("p", "gallery-stage-file", `${item.file.name} · ${formatSize(item.file.size)}`));
      const alt = textLabel("Alt text", item.altText, MAX_ALT_LENGTH);
      alt.input.addEventListener("input", () => { item.altText = alt.input.value; });
      const caption = textLabel("Caption (optional)", item.caption, MAX_CAPTION_LENGTH);
      caption.input.addEventListener("input", () => { item.caption = caption.input.value; });
      const remove = element("button", "editor-button editor-button-danger", "Remove");
      remove.type = "button";
      remove.addEventListener("click", () => {
        removeItem(item);
        renderStage();
      });
      fields.append(alt.wrapper, caption.wrapper, remove);
      row.append(preview, fields);
      stageList.append(row);
    }
    updateControls();
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const stagedSources = stage.map((item) => item.source);
    const rejections = [];
    const accepted = [];
    for (const file of files) {
      const problem = describeFileRejection(file, stage.length + accepted.length, stagedSources);
      if (problem) {
        rejections.push(problem);
        continue;
      }
      stagedSources.push(sourceRef(file));
      accepted.push(file);
    }
    processAndStage(accepted, rejections);
  }

  async function processAndStage(accepted, rejections) {
    if (!accepted.length) {
      finishStaging([], rejections);
      return;
    }
    const staged = [];
    for (const file of accepted) {
      let uploadFile = file;
      if (needsReEncode(file)) {
        setStatus(`Compressing ${file.name} in your browser…`);
        const prepared = await prepareFile(file);
        if (prepared.error) {
          rejections.push(prepared.error);
          continue;
        }
        uploadFile = prepared.file;
      }
      staged.push({
        file: uploadFile,
        source: sourceRef(file),
        altText: altTextFromFilename(file.name),
        caption: "",
        previewUrl: URL.createObjectURL(uploadFile)
      });
    }
    finishStaging(staged, rejections);
  }

  function finishStaging(staged, rejections) {
    stage.push(...staged);
    renderStage();
    if (rejections.length) {
      setNotice(rejections.join(" "));
      setStatus(`${rejections.length} file${rejections.length === 1 ? "" : "s"} not staged.`, "error");
    } else {
      setNotice("");
    }
  }

  async function uploadStaged() {
    if (uploading || !stage.length) return;
    const problems = stage.map((item) => describeItemRejection(item)).filter(Boolean);
    if (problems.length) {
      setNotice(problems.join(" "));
      setStatus("Add alt text to every staged photo before uploading.", "error");
      return;
    }

    uploading = true;
    setNotice("");
    updateControls();
    const batch = stage.slice();
    const failures = [];
    let uploaded = 0;
    for (const [index, item] of batch.entries()) {
      setStatus(`Uploading photo ${index + 1} of ${batch.length}…`);
      const data = new FormData();
      data.set("image", item.file, item.file.name);
      data.set("altText", item.altText.trim());
      data.set("caption", item.caption.trim());
      try {
        await upload(data);
        uploaded += 1;
        removeItem(item);
      } catch (error) {
        failures.push(`${item.file.name}: ${error.message}`);
      }
    }
    uploading = false;
    renderStage();

    if (failures.length) {
      setNotice(failures.join(" "));
      setStatus(
        uploaded
          ? `${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded. The rest stay staged, ready to retry.`
          : "No photos uploaded. They stay staged, ready to retry.",
        "error"
      );
      return;
    }

    setStatus(uploaded === 1 ? "Photo uploaded." : `${uploaded} photos uploaded.`, "success");
    if (onUploaded) await onUploaded();
  }

  uploadButton.addEventListener("click", uploadStaged);
  clearButton.addEventListener("click", () => {
    stage.slice().forEach(removeItem);
    setNotice("");
    renderStage();
  });
  fileField.input.addEventListener("change", () => {
    addFiles(fileField.input.files);
    fileField.input.value = "";
  });

  // Scoped to this block on purpose: the manager now shows one panel at a time,
  // so a document-level handler would swallow drops meant for other panels.
  let dragDepth = 0;
  const setHighlight = (on) => dropzone.classList.toggle("is-dragging", on);
  // The file input accepts drops on its own; adding here too would double-stage.
  const isFileInput = (event) => event.target === fileField.input;

  dropzone.addEventListener("dragenter", (event) => {
    if (!carriesFiles(event) || isFileInput(event)) return;
    dragDepth += 1;
    setHighlight(true);
  });

  dropzone.addEventListener("dragover", (event) => {
    if (!carriesFiles(event) || isFileInput(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });

  dropzone.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) setHighlight(false);
  });

  dropzone.addEventListener("drop", (event) => {
    if (!carriesFiles(event) || isFileInput(event)) return;
    event.preventDefault();
    dragDepth = 0;
    setHighlight(false);
    addFiles(event.dataTransfer.files);
  });

  renderStage();
  return root;
}
