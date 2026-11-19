// Staged multi-photo uploader for the admin gallery. Limits mirror functions/api/admin/gallery.js.

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
export const MAX_BATCH = 20;
export const MAX_ALT_LENGTH = 240;
export const MAX_CAPTION_LENGTH = 300;

export const ACCEPTED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
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

export function describeFileRejection(file, stagedCount = 0, stagedFiles = []) {
  if (!file) return "That file could not be read.";
  if (!ACCEPTED_TYPES.has(file.type)) return `${file.name} is not a JPEG, PNG, WebP, or GIF image.`;
  if (!file.size) return `${file.name} is empty.`;
  if (file.size > MAX_IMAGE_SIZE) {
    return `${file.name} is ${formatSize(file.size)}, over the 8 MB limit.`;
  }
  if (stagedCount >= MAX_BATCH) return `Only ${MAX_BATCH} photos upload at a time.`;
  if (stagedFiles.some((staged) => isSameFile(staged, file))) return `${file.name} is already staged.`;
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
let activeUploader;
let documentDragHandlers = false;

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

export function createUploader({ upload, setStatus, onUploaded }) {
  // A manager re-render rebuilds this block, so the queue is carried across renders.
  const stage = activeStage ?? [];
  activeStage = stage;

  let uploading = false;

  const dropzone = element("div", "gallery-dropzone");
  const fileField = fileLabel("Photos");
  dropzone.append(
    fileField.wrapper,
    element("p", "editor-help", `Drag photos here or choose files. JPEG, PNG, WebP, and GIF, 8 MB each, up to ${MAX_BATCH} at a time.`)
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
    const stagedFiles = stage.map((item) => item.file);
    const rejections = [];
    for (const file of files) {
      const problem = describeFileRejection(file, stage.length, stagedFiles);
      if (problem) {
        rejections.push(problem);
        continue;
      }
      stagedFiles.push(file);
      stage.push({
        file,
        altText: altTextFromFilename(file.name),
        caption: "",
        previewUrl: URL.createObjectURL(file)
      });
    }
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

  activeUploader = { dropzone, addFiles };

  if (!documentDragHandlers) {
    documentDragHandlers = true;
    let dragDepth = 0;
    const highlight = (on) => {
      if (activeUploader) activeUploader.dropzone.classList.toggle("is-dragging", on);
    };
    document.addEventListener("dragenter", (event) => {
      if (!carriesFiles(event) || !activeUploader) return;
      dragDepth += 1;
      highlight(true);
    });
    document.addEventListener("dragover", (event) => {
      if (!carriesFiles(event) || !activeUploader) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    document.addEventListener("dragleave", () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) highlight(false);
    });
    document.addEventListener("drop", (event) => {
      if (!carriesFiles(event) || !activeUploader) return;
      event.preventDefault();
      dragDepth = 0;
      highlight(false);
      activeUploader.addFiles(event.dataTransfer.files);
    });
  }

  renderStage();
  return root;
}
