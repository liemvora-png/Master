const editor = document.querySelector("#content-editor");
const tabs = document.querySelector("#editor-tabs");
const status = document.querySelector("#editor-status");
const saveButton = document.querySelector("#save-content");
const reloadButton = document.querySelector("#reload-content");

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "site", label: "Site settings" },
  { id: "projects", label: "Projects" },
  { id: "accomplishments", label: "Accomplishments" },
  { id: "arrangements", label: "Arrangements" },
  { id: "services", label: "Services page" },
  { id: "gallery", label: "Gallery page" }
];

const PAGE_FIELDS = [
  ["eyebrow", "Small label"],
  ["title", "Heading"],
  ["titleAccent", "Heading accent"],
  ["description", "Short introduction"],
  ["sectionTitle", "List heading"],
  ["metaTitle", "Browser title"],
  ["metaDescription", "Search description"]
];
const HOME_FIELDS = [
  ["title", "Home title"],
  ["metaTitle", "Browser title"],
  ["metaDescription", "Search description"]
];

let content;
let activeSection = "site";
let dirty = false;
let previewFrame;

function setStatus(message, state = "") {
  status.textContent = message;
  status.dataset.state = state;
}

function markDirty(message = "Unsaved changes.") {
  dirty = true;
  saveButton.disabled = false;
  setStatus(message, "pending");
}

function makeField({ label, value, path, multiline = false, type = "text", options }) {
  const wrapper = document.createElement("label");
  wrapper.className = "content-field";

  const caption = document.createElement("span");
  caption.textContent = label;

  let control;
  if (options) {
    control = document.createElement("select");
    for (const option of options) {
      const choice = document.createElement("option");
      choice.value = option.value;
      choice.textContent = option.label;
      control.append(choice);
    }
  } else {
    control = document.createElement(multiline ? "textarea" : "input");
    if (multiline) control.rows = 3;
    else control.type = type;
    control.maxLength = 2048;
  }

  control.value = value;
  control.dataset.path = JSON.stringify(path);
  wrapper.append(caption, control);
  return wrapper;
}

function makeButton(label, action, path, className = "editor-button editor-button-secondary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.action = action;
  button.dataset.path = JSON.stringify(path);
  button.textContent = label;
  return button;
}

function renderTabs() {
  tabs.replaceChildren();
  for (const section of SECTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = `tab-${section.id}`;
    button.className = "editor-tab";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "content-panel");
    button.setAttribute("aria-selected", String(activeSection === section.id));
    button.tabIndex = activeSection === section.id ? 0 : -1;
    button.dataset.section = section.id;

    const label = document.createElement("span");
    label.textContent = section.label;
    button.append(label);

    if (section.id !== "site" && content) {
      const count = document.createElement("span");
      count.className = "editor-tab-count";
      count.textContent = String(content.pages[section.id].items.length);
      button.append(count);
    }
    tabs.append(button);
  }
}

function makePanelHeading(title, description) {
  const heading = document.createElement("div");
  heading.className = "editor-panel-heading";
  const titleElement = document.createElement("h3");
  titleElement.textContent = title;
  const help = document.createElement("p");
  help.textContent = description;
  heading.append(titleElement, help);
  return heading;
}

function renderSiteSettings() {
  editor.append(makePanelHeading(
    "Site settings",
    "Update the shared brand, footer, and links shown across every page."
  ));

  const settings = document.createElement("div");
  settings.className = "editor-settings-grid";
  settings.append(
    makeField({ label: "Site name", value: content.brand, path: ["brand"] }),
    makeField({ label: "Footer name", value: content.footer.label, path: ["footer", "label"] }),
    makeField({ label: "Footer note", value: content.footer.note, path: ["footer", "note"] }),
    makeField({ label: "Footer year", value: content.footer.year, path: ["footer", "year"] }),
    makeField({
      label: "Project link label",
      value: content.labels.projectLink,
      path: ["labels", "projectLink"]
    }),
    makeField({
      label: "Arrangement link label",
      value: content.labels.arrangementLink,
      path: ["labels", "arrangementLink"]
    }),
    makeField({
      label: "Empty arrangements message",
      value: content.labels.emptyArrangements,
      path: ["labels", "emptyArrangements"],
      multiline: true
    })
  );
  editor.append(settings);

  const navigation = document.createElement("section");
  navigation.className = "editor-collection";
  navigation.append(makePanelHeading(
    "Navigation",
    "Choose the label, destination, and order of the links in your site header."
  ));
  renderItems(navigation, content.navigation, ["navigation"], "navigation");
  editor.append(navigation);
}

function renderPage(sectionId) {
  const page = content.pages[sectionId];
  const isHome = sectionId === "home";
  const isStaticPage = ["home", "services", "gallery"].includes(sectionId);
  const isProjects = sectionId === "projects";
  const isAccomplishments = sectionId === "accomplishments";
  const sectionTitle = sectionId === "services" ? "Services page"
    : sectionId === "gallery" ? "Gallery page"
      : page.sectionTitle;
  const section = document.createElement("section");
  section.className = "editor-page";
  section.append(makePanelHeading(
    isHome ? "Home page" : sectionTitle,
    isHome
      ? "Set the title and search text for your home page."
      : `Edit this page's text and manage its ${isProjects ? "projects" : isAccomplishments ? "highlights" : "arrangements"}.`
  ));

  const pageCopy = document.createElement("details");
  pageCopy.className = "editor-page-copy";
  const summary = document.createElement("summary");
  summary.textContent = "Page text and search settings";
  pageCopy.append(summary);

  const fields = document.createElement("div");
  fields.className = "editor-settings-grid";
  for (const [key, label] of (isHome ? HOME_FIELDS : PAGE_FIELDS)) {
    fields.append(makeField({
      label,
      value: page[key],
      path: ["pages", sectionId, key],
      multiline: ["description", "metaDescription"].includes(key)
    }));
  }
  pageCopy.append(fields);
  section.append(pageCopy);

  const itemLabel = isHome ? "Home"
    : isProjects ? "Projects"
      : isAccomplishments ? "Highlights"
        : sectionId === "services" ? "Services"
          : sectionId === "gallery" ? "Gallery" : "Arrangements";
  if (!isStaticPage) {
    const description = document.createElement("p");
    description.className = "editor-collection-intro";
    description.textContent = `${page.items.length} ${page.items.length === 1 ? "entry" : "entries"}. Add, edit, or reorder the items displayed on this page.`;
    section.append(description);
    renderItems(section, page.items, ["pages", sectionId, "items"], sectionId);
  }
  editor.append(section);

  const preview = document.createElement("aside");
  preview.className = "editor-preview";
  preview.setAttribute("aria-label", `${itemLabel} preview`);
  renderPreview(preview, page, sectionId);
  editor.append(preview);
}

function renderPreview(container, page, sectionId) {
  const label = document.createElement("p");
  label.className = "editor-preview-label";
  label.textContent = "RESPONSIVE SITE PREVIEW";
  previewFrame = document.createElement("iframe");
  previewFrame.className = "editor-preview-frame";
  previewFrame.title = `${sectionId} page preview`;
  previewFrame.loading = "eager";
  const frame = previewFrame;
  previewFrame.srcdoc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${window.location.origin}/"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@400;500&display=swap" rel="stylesheet"><link rel="stylesheet" href="/styles.css"><style>html,body{min-width:320px}body{min-height:100vh}</style></head><body><div id="site-preview"></div></body></html>`;
  previewFrame.addEventListener("load", () => {
    if (previewFrame === frame) refreshPreviewFrame(sectionId);
  });
  container.append(label, previewFrame);
  refreshPreviewFrame(sectionId);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderPreviewMarkup(page, sectionId) {
  const navigation = content.navigation.map((item) => (
    `<a href="${escapeHtml(safePreviewHref(item.href))}"${item.page === sectionId ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`
  )).join("");
  const adminLink = ["home", "projects"].includes(sectionId)
    ? '<a class="admin-entry-button" href="/admin">Admin <span aria-hidden="true">↗</span></a>'
    : "";
  const eyebrow = page.eyebrow
    ? `<p class="eyebrow"><span class="status-dot" aria-hidden="true"></span> ${escapeHtml(page.eyebrow)}</p>`
    : "";
  const heading = `<h1 id="page-title">${escapeHtml(page.title)}${page.titleAccent ? `<br><span>${escapeHtml(page.titleAccent)}</span>` : ""}</h1>`;
  const description = page.description ? `<p class="intro-copy">${escapeHtml(page.description)}</p>` : "";
  let section = "";

  if (sectionId === "projects") {
    const projects = page.items.length
      ? page.items.map((item, index) => `<a class="project" href="${escapeHtml(safePreviewHref(item.url))}" aria-label="Visit ${escapeHtml(item.name)}, ${escapeHtml(item.description)}"><span class="project-number">${String(index + 1).padStart(2, "0")}</span><span class="project-info"><span class="project-name">${escapeHtml(item.name)}</span><span class="project-description">${escapeHtml(item.description)}</span></span><span class="project-category">${escapeHtml(item.category)}</span><span class="project-link">${escapeHtml(content.labels.projectLink)} <span aria-hidden="true">↗</span></span></a>`).join("")
      : '<p class="empty-state">Projects will be added here.</p>';
    section = `<section class="projects" aria-labelledby="projects-title"><div class="section-heading"><h2 id="projects-title">${escapeHtml(page.sectionTitle)}</h2><span class="project-count">${String(page.items.length).padStart(2, "0")} PROJECTS</span></div><div class="project-list">${projects}</div></section>`;
  } else if (sectionId === "accomplishments") {
    const items = page.items.length
      ? page.items.map((item, index) => `<li class="accomplishment"><span class="accomplishment-number">${String(index + 1).padStart(2, "0")}</span><span class="accomplishment-name">${escapeHtml(item.name)}</span><span class="accomplishment-detail">${escapeHtml(item.detail)}</span></li>`).join("")
      : '<li class="empty-state">Accomplishments will be added here.</li>';
    section = `<section aria-labelledby="accomplishments-title"><div class="section-heading"><h2 id="accomplishments-title">${escapeHtml(page.sectionTitle)}</h2><span class="project-count">${String(page.items.length).padStart(2, "0")} HIGHLIGHTS</span></div><ul class="accomplishment-list">${items}</ul></section>`;
  } else if (sectionId === "arrangements") {
    const items = page.items.length
      ? page.items.map((item, index) => {
        const metadata = [
          item.instrument ? `<span class="accomplishment-detail">${escapeHtml(item.instrument)}</span>` : "",
          item.date ? `<time class="accomplishment-detail arrangement-date" datetime="${escapeHtml(item.date)}">${escapeHtml(new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }))}</time>` : ""
        ].filter(Boolean).join("");
        const link = item.url && safePreviewHref(item.url)
          ? `<a class="project-link" href="${escapeHtml(safePreviewHref(item.url))}">${escapeHtml(content.labels.arrangementLink)} ↗</a>`
          : "";
        return `<li class="accomplishment arrangement"><span class="accomplishment-number">${String(index + 1).padStart(2, "0")}</span><span class="project-info"><span class="accomplishment-name">${escapeHtml(item.name)}</span><span class="project-description">${escapeHtml(item.description)}</span></span>${metadata ? `<span class="arrangement-meta">${metadata}</span>` : ""}${link}</li>`;
      }).join("")
      : `<p class="empty-state">${escapeHtml(content.labels.emptyArrangements)}</p>`;
    section = `<section aria-labelledby="arrangements-title"><div class="section-heading"><h2 id="arrangements-title">${escapeHtml(page.sectionTitle)}</h2><span class="project-count">${page.items.length ? `${String(page.items.length).padStart(2, "0")} ARRANGEMENTS` : "IN PROGRESS"}</span></div>${page.items.length ? `<ul class="accomplishment-list">${items}</ul>` : items}</section>`;
  } else if (sectionId === "services") {
    section = '<section class="services-section"><p class="empty-state">Service details are edited in the Services &amp; bookings panel.</p></section>';
  } else if (sectionId === "gallery") {
    section = '<section><p class="empty-state">Gallery images are edited in the Services &amp; bookings panel.</p></section>';
  }

  return `<header class="site-header"><a class="wordmark" href="/" aria-label="Liem Vora home"><span class="wordmark-symbol" aria-hidden="true">δ</span><span class="wordmark-name">${escapeHtml(content.brand)}</span></a><nav class="site-nav" aria-label="Main navigation">${navigation}</nav>${adminLink}</header><main id="main"><section class="intro${sectionId === "home" ? " home-intro" : ""}" aria-labelledby="page-title">${eyebrow}${heading}${description}</section>${section}</main><footer class="site-footer"><span>${escapeHtml(content.footer.label)}</span><span>${escapeHtml(content.footer.note)} <span class="footer-dot" aria-hidden="true">·</span> ${escapeHtml(content.footer.year)}</span></footer>`;
}

function safePreviewHref(value) {
  if (typeof value !== "string") return "#";
  if (["index.html", "projects.html", "accomplishments.html", "arrangements.html"].includes(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  try {
    return new URL(value).protocol === "https:" ? value : "#";
  } catch {
    return "#";
  }
}

function refreshPreviewFrame(sectionId) {
  const previewRoot = previewFrame?.contentDocument?.querySelector("#site-preview");
  if (!previewRoot || !content) return;
  previewRoot.innerHTML = renderPreviewMarkup(content.pages[sectionId], sectionId);
}

function renderItems(container, items, path, sectionId) {
  const list = document.createElement("div");
  list.className = "editor-item-list";

  items.forEach((item, index) => {
    const itemPath = [...path, index];
    const card = document.createElement("article");
    card.className = "editor-item-card";

    const top = document.createElement("div");
    top.className = "editor-item-top";
    const title = document.createElement("h4");
    title.textContent = item.name || item.label || `New ${sectionId} entry`;
    const order = document.createElement("span");
    order.className = "editor-item-order";
    order.textContent = String(index + 1).padStart(2, "0");
    top.append(title, order);

    const fields = document.createElement("div");
    fields.className = "editor-item-fields";
    const keys = sectionId === "navigation"
      ? ["label", "href", "page"]
      : sectionId === "projects"
        ? ["name", "description", "category", "url"]
        : sectionId === "accomplishments"
          ? ["name", "detail"]
          : ["name", "date", "description", "instrument", "url"];

    for (const key of keys) {
      const options = key === "page"
        ? SECTIONS.filter((section) => section.id !== "site").map((section) => ({
          value: section.id,
          label: section.label
        }))
        : null;
      const labels = {
        name: "Title",
        description: "Description",
        category: "Category",
        detail: "Detail",
        date: "Date",
        instrument: "Instrument",
        url: "Link",
        href: "Destination",
        label: "Link label",
        page: "Page"
      };
      if (sectionId === "arrangements" && key === "description") {
        labels.description = "Description (optional)";
      }
      fields.append(makeField({
        label: labels[key],
        value: item[key] ?? "",
        path: [...itemPath, key],
        multiline: ["description", "detail"].includes(key),
        type: key === "date" ? "date" : "text",
        options
      }));
    }
    card.append(top, fields);

    const actions = document.createElement("div");
    actions.className = "editor-item-actions";
    const moveUp = makeButton("Move up", "move-up", itemPath);
    const moveDown = makeButton("Move down", "move-down", itemPath);
    moveUp.disabled = index === 0;
    moveDown.disabled = index === items.length - 1;
    actions.append(moveUp, moveDown, makeButton("Remove", "remove", itemPath, "editor-button editor-button-danger"));
    card.append(actions);
    list.append(card);
  });

  container.append(list);
  const addLabel = sectionId === "navigation"
    ? "Add navigation link"
    : sectionId === "projects"
      ? "Add project"
      : sectionId === "accomplishments"
        ? "Add highlight"
        : "Add arrangement";
  container.append(makeButton(addLabel, "add", path, "editor-button editor-button-add"));
}

function renderEditor() {
  renderTabs();
  editor.replaceChildren();
  editor.id = "content-panel";
  editor.setAttribute("role", "tabpanel");
  editor.setAttribute("aria-labelledby", `tab-${activeSection}`);
  if (activeSection === "site") renderSiteSettings();
  else renderPage(activeSection);
}

function getAtPath(path) {
  return path.reduce((value, key) => value[key], content);
}

function setAtPath(path, value) {
  const key = path.pop();
  getAtPath(path)[key] = value;
}

function newArrayItem(path) {
  if (path[0] === "navigation") return { label: "", href: "/", page: "projects" };
  if (path[0] !== "pages" || path[2] !== "items") return null;
  if (path[1] === "projects") return { name: "", description: "", category: "", url: "" };
  if (path[1] === "accomplishments") return { name: "", detail: "" };
  if (path[1] === "arrangements") return { name: "", date: "", description: "", instrument: "", url: "" };
  return null;
}

function updatePreview() {
  if (activeSection !== "site") {
    refreshPreviewFrame(activeSection);
  }
  const activeTab = tabs.querySelector('[aria-selected="true"]');
  const count = activeTab?.querySelector(".editor-tab-count");
  if (count && activeSection !== "site") {
    count.textContent = String(content.pages[activeSection].items.length);
  }
}

async function loadContent() {
  setStatus("Loading your site content…");
  reloadButton.disabled = true;
  saveButton.disabled = true;
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
    setStatus(`All changes are saved. Last updated ${new Date(result.updatedAt).toLocaleString()}.`, "success");
  } catch (error) {
    setStatus(`Could not load content: ${error.message}`, "error");
  } finally {
    reloadButton.disabled = false;
  }
}

async function saveContent() {
  saveButton.disabled = true;
  reloadButton.disabled = true;
  setStatus("Saving your changes…");
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
    setStatus(`Changes saved successfully at ${new Date(result.updatedAt).toLocaleString()}.`, "success");
  } catch (error) {
    setStatus(`Could not save changes: ${error.message}`, "error");
  } finally {
    saveButton.disabled = !dirty;
    reloadButton.disabled = false;
  }
}

tabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-section]");
  if (!button || !content) return;
  activeSection = button.dataset.section;
  renderEditor();
});

tabs.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const buttons = [...tabs.querySelectorAll("[role='tab']")];
  const current = buttons.findIndex((button) => button.dataset.section === activeSection);
  const next = event.key === "Home" ? 0
    : event.key === "End" ? buttons.length - 1
      : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
  activeSection = buttons[next].dataset.section;
  renderEditor();
  tabs.querySelector(`[data-section="${activeSection}"]`).focus();
});

editor.addEventListener("input", (event) => {
  const control = event.target.closest("[data-path]");
  if (!control || !content) return;
  setAtPath(JSON.parse(control.dataset.path), control.value);
  markDirty();
  updatePreview();
});

editor.addEventListener("change", (event) => {
  const control = event.target.closest("select[data-path]");
  if (!control || !content) return;
  setAtPath(JSON.parse(control.dataset.path), control.value);
  markDirty();
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
  } else if (button.dataset.action === "move-up" || button.dataset.action === "move-down") {
    const index = path.pop();
    const items = getAtPath(path);
    const offset = button.dataset.action === "move-up" ? -1 : 1;
    const destination = index + offset;
    if (destination < 0 || destination >= items.length) return;
    [items[index], items[destination]] = [items[destination], items[index]];
  }
  renderEditor();
  markDirty("Unsaved changes. Save to publish them to your site.");
});

reloadButton.addEventListener("click", () => {
  if (dirty && !window.confirm("Discard your unsaved changes and reload the saved content?")) return;
  loadContent();
});
saveButton.addEventListener("click", saveContent);

loadContent();
