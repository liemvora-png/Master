const editor = document.querySelector("#content-editor");
const status = document.querySelector("#editor-status");
const saveButton = document.querySelector("#save-content");
const reloadButton = document.querySelector("#reload-content");

let content;
let dirty = false;

const FIELD_LABELS = {
  metaTitle: "Browser title",
  metaDescription: "Search description",
  titleAccent: "Title accent",
  sectionTitle: "Section heading",
  projectLink: "Project link label",
  arrangementLink: "Arrangement link label",
  emptyArrangements: "Empty arrangements message"
};

function setStatus(message, state = "") {
  status.textContent = message;
  status.dataset.state = state;
}

function humanize(key) {
  return FIELD_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function makeField(label, path, value) {
  const wrapper = document.createElement("label");
  wrapper.className = "content-field";
  const labelText = document.createElement("span");
  labelText.textContent = humanize(label);
  const control = value.length > 100 || /description|emptyArrangements/i.test(label)
    ? document.createElement("textarea")
    : document.createElement("input");

  if (control instanceof HTMLTextAreaElement) control.rows = 3;
  else control.type = "text";
  control.value = value;
  control.maxLength = 2048;
  control.dataset.path = JSON.stringify(path);
  wrapper.append(labelText, control);
  return wrapper;
}

function makeObject(value, label, path, item = false) {
  const group = document.createElement("fieldset");
  group.className = item ? "content-item" : "content-group";
  const legend = document.createElement("legend");
  legend.textContent = label;
  group.append(legend);

  for (const [key, child] of Object.entries(value)) {
    group.append(makeNode(child, key, [...path, key]));
  }
  return group;
}

function makeArray(value, label, path) {
  const group = document.createElement("fieldset");
  group.className = "content-group";
  const legend = document.createElement("legend");
  legend.textContent = humanize(label);
  group.append(legend);

  value.forEach((item, index) => {
    const itemPath = [...path, index];
    const row = document.createElement("div");
    row.className = "content-array-item";
    row.append(makeObject(item, `Entry ${index + 1}`, itemPath, true));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "editor-button editor-button-secondary editor-remove";
    remove.dataset.action = "remove";
    remove.dataset.path = JSON.stringify(itemPath);
    remove.textContent = `Remove ${humanize(label).toLowerCase()} entry`;
    row.append(remove);
    group.append(row);
  });

  const add = document.createElement("button");
  add.type = "button";
  add.className = "editor-button editor-button-secondary editor-add";
  add.dataset.action = "add";
  add.dataset.path = JSON.stringify(path);
  add.textContent = `Add ${humanize(label).toLowerCase()} entry`;
  group.append(add);
  return group;
}

function makeNode(value, label, path) {
  if (Array.isArray(value)) return makeArray(value, label, path);
  if (value !== null && typeof value === "object") return makeObject(value, humanize(label), path);
  if (typeof value === "string") return makeField(label, path, value);
  return document.createTextNode("");
}

function renderEditor() {
  editor.replaceChildren(makeObject(content, "Website content", []));
}

function getAtPath(path) {
  return path.reduce((value, key) => value[key], content);
}

function setAtPath(path, value) {
  const key = path.pop();
  getAtPath(path)[key] = value;
}

function newArrayItem(path) {
  if (path[0] === "navigation") return { label: "", href: "", page: "projects" };
  if (path[0] !== "pages" || path[2] !== "items") return null;
  if (path[1] === "projects") return { name: "", description: "", category: "", url: "" };
  if (path[1] === "accomplishments") return { name: "", detail: "" };
  if (path[1] === "arrangements") return { name: "", description: "", instrument: "", url: "" };
  return null;
}

async function loadContent() {
  setStatus("Loading site content…");
  reloadButton.disabled = true;
  try {
    const response = await fetch("/api/content", {
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
    content = result.content;
    dirty = false;
    renderEditor();
    setStatus(`Loaded. Last saved ${new Date(result.updatedAt).toLocaleString()}.`, "success");
  } catch (error) {
    setStatus(`Could not load content: ${error.message}`, "error");
  } finally {
    reloadButton.disabled = false;
  }
}

async function saveContent() {
  saveButton.disabled = true;
  reloadButton.disabled = true;
  setStatus("Saving changes…");
  try {
    const response = await fetch("/api/admin/content", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify(content)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Save failed (${response.status}).`);
    dirty = false;
    setStatus(`Saved successfully at ${new Date(result.updatedAt).toLocaleString()}.`, "success");
  } catch (error) {
    setStatus(`Could not save content: ${error.message}`, "error");
  } finally {
    saveButton.disabled = false;
    reloadButton.disabled = false;
  }
}

editor.addEventListener("input", (event) => {
  const control = event.target.closest("[data-path]");
  if (!control || !content) return;
  setAtPath(JSON.parse(control.dataset.path), control.value);
  dirty = true;
  setStatus("Unsaved changes.", "pending");
});

editor.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || !content) return;
  const path = JSON.parse(button.dataset.path);
  if (button.dataset.action === "remove") {
    const index = path.pop();
    getAtPath(path).splice(index, 1);
  } else if (button.dataset.action === "add") {
    const item = newArrayItem(path);
    if (!item) return;
    getAtPath(path).push(item);
  }
  dirty = true;
  renderEditor();
  setStatus("Unsaved changes. Complete required fields before saving.", "pending");
});

reloadButton.addEventListener("click", () => {
  if (dirty && !window.confirm("Reload content from the server and discard unsaved edits?")) return;
  loadContent();
});
saveButton.addEventListener("click", saveContent);

loadContent();
