const PAGE_FILES = new Set(["index.html", "projects.html", "accomplishments.html", "arrangements.html"]);

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
  } else {
    setText(title, `${page.title}${page.titleAccent}`);
  }

  const eyebrow = document.querySelector(".eyebrow");
  if (eyebrow) {
    eyebrow.hidden = !page.eyebrow;
    const dot = eyebrow.querySelector(".status-dot");
    eyebrow.replaceChildren();
    if (dot) eyebrow.append(dot);
    eyebrow.append(document.createTextNode(page.eyebrow));
  }
  setText(document.querySelector(".intro-copy"), page.description);
  if (!["services", "gallery"].includes(document.body.dataset.page)) {
    setText(document.querySelector(".section-heading h2"), page.sectionTitle);
  }
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

function updateHomeTimestamp(updatedAt) {
  const timestamp = document.querySelector("#home-last-updated");
  if (!timestamp) return;

  const value = typeof updatedAt === "string" ? updatedAt : "";
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    ? value
    : value.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  if (!value || Number.isNaN(date.getTime())) {
    timestamp.textContent = "time unavailable";
    return;
  }

  const now = new Date();
  const calendarDay = (day) => Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  const daysAgo = Math.round((calendarDay(now) - calendarDay(date)) / 86400000);
  let dayLabel;
  if (daysAgo === 0) {
    dayLabel = "today";
  } else if (daysAgo === 1) {
    dayLabel = "yesterday";
  } else if (daysAgo > 1 && daysAgo < 7) {
    dayLabel = `${daysAgo} days ago`;
  } else {
    dayLabel = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" })
    }).format(date);
  }

  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
  timestamp.dateTime = date.toISOString();
  timestamp.textContent = `${dayLabel} at ${timeLabel}`;
}

function renderProjects(items, labels) {
  const list = document.querySelector(".project-list");
  if (!list) return;
  list.replaceChildren();

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Projects will be added here.";
    list.append(empty);
    return;
  }

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

  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Accomplishments will be added here.";
    list.append(empty);
    return;
  }

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

    if (item.instrument || item.date) {
      const metadata = document.createElement("span");
      metadata.className = "arrangement-meta";
      if (item.instrument) {
        const instrument = document.createElement("span");
        instrument.className = "accomplishment-detail";
        instrument.textContent = item.instrument;
        metadata.append(instrument);
      }
      if (item.date) {
        const date = document.createElement("time");
        date.className = "accomplishment-detail arrangement-date";
        date.dateTime = item.date;
        const parsedDate = new Date(`${item.date}T00:00:00`);
        date.textContent = parsedDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
        metadata.append(date);
      }
      row.append(metadata);
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
    const { content, updatedAt } = await response.json();
    const page = content.pages[currentPage];
    if (currentPage && !page) throw new Error(`No managed content found for ${currentPage}.`);

    updateNavigation(content, currentPage);
    if (!currentPage) return;
    if (currentPage === "home") updateHomeTimestamp(updatedAt);
    else updatePageHeading(page);
    setText(document.querySelector(".wordmark-name"), content.brand);
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
    if (currentPage === "home") updateHomeTimestamp(null);
    showContentStatus("Live content is unavailable; showing the saved page instead.");
  }
}

const HOME_NEWS_LIMIT = 3;

function formatNewsDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function renderHomeNewsRow(item) {
  const row = document.createElement("li");
  row.className = "home-news-item";

  const when = document.createElement("span");
  when.className = "home-news-time";
  const stamp = item.published_at || "";
  if (stamp && !Number.isNaN(new Date(stamp).getTime())) {
    const time = document.createElement("time");
    time.dateTime = stamp;
    time.textContent = formatNewsDate(stamp);
    when.append(time);
  } else {
    when.textContent = "";
  }

  const info = document.createElement("span");
  info.className = "home-news-info";
  const title = document.createElement("span");
  title.className = "home-news-title";
  title.textContent = item.headline || "Untitled";
  info.append(title);

  row.append(when, info);

  const sourceHref = safeHref(item.source_url || "");
  if (sourceHref) {
    const source = document.createElement("a");
    source.className = "project-link home-news-source";
    source.href = sourceHref;
    source.textContent = `${item.source_name || "Source"} ↗`;
    row.append(source);
  }

  return row;
}

async function loadHomeNews() {
  if (document.body.dataset.page !== "home") return;
  const section = document.querySelector(".home-news");
  const list = document.querySelector("#home-news-list");
  if (!section || !list) return;

  try {
    const response = await fetch("/api/news?limit=1", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`News request returned ${response.status}.`);
    const { news } = await response.json();
    const items = Array.isArray(news) ? news : [];
    if (items.length === 0) throw new Error("No news items available.");

    // Render the newest item immediately so the digest appears fast,
    // then stream in the rest one at a time.
    list.replaceChildren();
    list.append(renderHomeNewsRow(items[0]));
    section.hidden = false;

    let loaded = 1;
    while (loaded < HOME_NEWS_LIMIT) {
      const next = await fetch(`/api/news?limit=1&offset=${loaded}`, {
        headers: { Accept: "application/json" }
      });
      if (!next.ok) break;
      const nextData = await next.json();
      const nextItems = Array.isArray(nextData.news) ? nextData.news : [];
      if (nextItems.length === 0) break;
      list.append(renderHomeNewsRow(nextItems[0]));
      loaded += 1;
    }
  } catch (error) {
    console.error("Unable to load the news digest:", error);
    section.hidden = true;
  }
}

const THEME_COLORS = window.THEME_COLORS || { light: "#f4f1e9", dark: "#171717" };

function currentTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function storedTheme() {
  try {
    const value = localStorage.getItem("theme");
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function updateThemeToggle(theme) {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  const isDark = theme === "dark";
  button.setAttribute("aria-pressed", String(isDark));
  button.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
  const icon = button.querySelector(".theme-toggle-icon");
  if (icon) icon.textContent = isDark ? "☀" : "☾";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[theme];
  updateThemeToggle(theme);
}

function initThemeToggle() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;

  const theme = currentTheme();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[theme];
  updateThemeToggle(theme);

  button.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore storage errors */
    }
    applyTheme(next);
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = (event) => {
    if (storedTheme()) return;
    applyTheme(event.matches ? "dark" : "light");
  };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onSystemChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(onSystemChange);
  }
}

function initMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  if (!toggle || !nav) return;
  const fullHeader = window.matchMedia("(min-width: 1100px)");

  const syncHeaderMode = () => {
    if (fullHeader.matches) {
      toggle.classList.remove("is-active");
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("nav-open");
      nav.setAttribute("aria-hidden", "false");
      nav.inert = false;
    } else {
      setMenuOpen(false);
    }
  };

  const positionDesktopMenu = () => {
    if (fullHeader.matches) {
      nav.style.right = "";
      nav.style.top = "";
      return;
    }
    if (window.matchMedia("(max-width: 700px)").matches) {
      nav.style.right = "";
      nav.style.top = "";
      return;
    }
    const header = toggle.closest(".site-header");
    const headerRect = header.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    nav.style.right = `${Math.max(0, headerRect.right - toggleRect.right)}px`;
    nav.style.top = `${toggleRect.bottom - headerRect.top}px`;
  };

  const setMenuOpen = (open) => {
    toggle.classList.toggle("is-active", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("nav-open", open);
    nav.setAttribute("aria-hidden", String(!open));
    nav.inert = !open;
    if (open) positionDesktopMenu();
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setMenuOpen(open);
    if (open) {
      const firstLink = nav.querySelector("a[href]");
      if (firstLink) firstLink.focus();
    }
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (toggle.getAttribute("aria-expanded") !== "true") return;

    if (event.key === "Escape") {
      setMenuOpen(false);
      toggle.focus();
      return;
    }

    if (event.key === "Tab") {
      const focusable = [...nav.querySelectorAll("a[href]")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!nav.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  });

  document.addEventListener("click", (event) => {
    if (
      toggle.getAttribute("aria-expanded") === "true"
      && !event.target.closest(".site-header")
    ) {
      setMenuOpen(false);
    }
  });
  if (typeof fullHeader.addEventListener === "function") {
    fullHeader.addEventListener("change", syncHeaderMode);
  } else if (typeof fullHeader.addListener === "function") {
    fullHeader.addListener(syncHeaderMode);
  }
  window.addEventListener("resize", positionDesktopMenu);
  syncHeaderMode();
}

initThemeToggle();
initMobileMenu();
loadManagedContent();
loadHomeNews();
