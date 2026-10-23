const PAGE_FILES = new Set(["index.html", "accomplishments.html", "arrangements.html"]);

function setText(target, value) {
  if (target && typeof value === "string") target.textContent = value;
}

function safeHref(value) {
  if (typeof value !== "string") return null;
  if (PAGE_FILES.has(value) || (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"))) {
    return value;
  }

  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function showContentStatus(message) {
  let status = document.querySelector(".content-status");
  if (!status) {
    status = document.createElement("p");
    status.className = "content-status";
    status.setAttribute("role", "status");
    document.querySelector("main")?.prepend(status);
  }
  status.textContent = message;
}

function updatePageHeading(page) {
  const title = document.querySelector("h1");
  if (!title) return;

  const accent = title.querySelector("span");
  const lineBreak = title.querySelector("br");
  if (accent && lineBreak) {
    const nodes = [...title.childNodes];
    const textNode = nodes.find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = page.title;
    setText(accent, page.titleAccent);
  }

  const eyebrow = document.querySelector(".eyebrow");
  if (eyebrow) {
    const dot = eyebrow.querySelector(".status-dot");
    eyebrow.replaceChildren();
    if (dot) eyebrow.append(dot);
    eyebrow.append(document.createTextNode(page.eyebrow));
  }
  setText(document.querySelector(".intro-copy"), page.description);
  setText(document.querySelector(".section-heading h2"), page.sectionTitle);
  document.title = page.metaTitle;

  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = page.metaDescription;
}

function updateNavigation(content, currentPage) {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  nav.replaceChildren();
  for (const item of content.navigation) {
    const link = document.createElement("a");
    link.href = safeHref(item.href) || "#";
    link.textContent = item.label;
    if (item.page === currentPage) link.setAttribute("aria-current", "page");
    nav.append(link);
  }
}

function renderProjects(items, labels) {
  const list = document.querySelector(".project-list");
  if (!list) return;
  list.replaceChildren();

  items.forEach((item, index) => {
    const project = document.createElement("a");
    project.className = "project";
    project.href = safeHref(item.url) || "#";
    project.setAttribute("aria-label", `Visit ${item.name}, ${item.description}`);

    const number = document.createElement("span");
    number.className = "project-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const info = document.createElement("span");
    info.className = "project-info";
    const name = document.createElement("span");
    name.className = "project-name";
    name.textContent = item.name;
    const description = document.createElement("span");
    description.className = "project-description";
    description.textContent = item.description;
    info.append(name, description);

    const category = document.createElement("span");
    category.className = "project-category";
    category.textContent = item.category;
    const linkLabel = document.createElement("span");
    linkLabel.className = "project-link";
    linkLabel.append(document.createTextNode(`${labels.projectLink} `));
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    linkLabel.append(arrow);

    project.append(number, info, category, linkLabel);
    list.append(project);
  });
}

function renderAccomplishments(items) {
  const list = document.querySelector(".accomplishment-list");
  if (!list) return;
  list.replaceChildren();

  items.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "accomplishment";
    const number = document.createElement("span");
    number.className = "accomplishment-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "accomplishment-name";
    name.textContent = item.name;
    const detail = document.createElement("span");
    detail.className = "accomplishment-detail";
    detail.textContent = item.detail;
    row.append(number, name, detail);
    list.append(row);
  });
}

function renderArrangements(items, labels) {
  const list = document.querySelector("[data-arrangements-list]");
  if (!list) return;
  list.replaceChildren();

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = labels.emptyArrangements;
    list.append(empty);
    return;
  }

  const rows = document.createElement("ul");
  rows.className = "accomplishment-list";
  items.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "accomplishment arrangement";
    const number = document.createElement("span");
    number.className = "accomplishment-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const details = document.createElement("span");
    details.className = "project-info";
    const name = document.createElement("span");
    name.className = "accomplishment-name";
    name.textContent = item.name;
    const description = document.createElement("span");
    description.className = "project-description";
    description.textContent = item.description || "";
    details.append(name, description);
    row.append(number, details);

    if (item.instrument) {
      const instrument = document.createElement("span");
      instrument.className = "accomplishment-detail";
      instrument.textContent = item.instrument;
      row.append(instrument);
    }
    if (item.url) {
      const href = safeHref(item.url);
      if (href) {
        const link = document.createElement("a");
        link.className = "project-link";
        link.href = href;
        link.textContent = `${labels.arrangementLink} ↗`;
        row.append(link);
      }
    }
    rows.append(row);
  });
  list.append(rows);
}

async function loadManagedContent() {
  const currentPage = document.body.dataset.page;
  try {
    const response = await fetch("/api/content", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Content request returned ${response.status}.`);
    const { content } = await response.json();
    const page = content.pages[currentPage];
    if (!page) throw new Error(`No managed content found for ${currentPage}.`);

    updateNavigation(content, currentPage);
    updatePageHeading(page);
    const wordmark = document.querySelector(".wordmark");
    if (wordmark) {
      const dot = wordmark.querySelector("span");
      wordmark.replaceChildren(document.createTextNode(content.brand));
      if (dot) {
        dot.textContent = ".";
        wordmark.append(dot);
      }
    }
    setText(document.querySelector(".site-footer > span:first-child"), content.footer.label);
    const footerNote = document.querySelector(".site-footer > span:last-child");
    if (footerNote) {
      footerNote.replaceChildren(document.createTextNode(`${content.footer.note} `));
      const dot = document.createElement("span");
      dot.className = "footer-dot";
      dot.setAttribute("aria-hidden", "true");
      dot.textContent = "·";
      footerNote.append(dot, document.createTextNode(` ${content.footer.year}`));
    }

    if (currentPage === "projects") {
      renderProjects(page.items, content.labels);
      setText(document.querySelector(".project-count"), `${String(page.items.length).padStart(2, "0")} PROJECTS`);
    } else if (currentPage === "accomplishments") {
      renderAccomplishments(page.items);
      setText(document.querySelector(".project-count"), `${String(page.items.length).padStart(2, "0")} HIGHLIGHTS`);
    } else if (currentPage === "arrangements") {
      renderArrangements(page.items, content.labels);
      setText(document.querySelector(".project-count"), page.items.length
        ? `${String(page.items.length).padStart(2, "0")} ARRANGEMENTS`
        : "IN PROGRESS");
    }
  } catch (error) {
    console.error("Unable to load live site content:", error);
    showContentStatus("Live content is unavailable; showing the saved page instead.");
  }
}

loadManagedContent();
