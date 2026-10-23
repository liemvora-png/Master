const PAGE_NAMES = ["home", "projects", "accomplishments", "arrangements", "services", "gallery"];
const PAGE_FILES = new Set([
  "index.html",
  "projects.html",
  "accomplishments.html",
  "arrangements.html",
  "services.html",
  "gallery.html"
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value, maxLength = 500) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isLink(value, allowPageLinks = false) {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (allowPageLinks && PAGE_FILES.has(value)) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validItems(pageName, items) {
  if (!Array.isArray(items) || items.length > 100) return false;
  if (pageName === "home") return items.length === 0;
  if (pageName === "services" || pageName === "gallery") return items.length === 0;

  return items.every((item) => {
    if (!isRecord(item)) return false;

    if (pageName === "projects") {
      return isText(item.name, 120)
        && isText(item.description, 500)
        && isText(item.category, 80)
        && isLink(item.url);
    }

    if (pageName === "accomplishments") {
      return isText(item.name, 240) && isText(item.detail, 120);
    }

    return isText(item.name, 160)
      && (item.description === undefined || item.description === "" || isText(item.description, 500))
      && (item.instrument === undefined || item.instrument === "" || isText(item.instrument, 120))
      && (item.url === undefined || item.url === "" || isLink(item.url))
      && (item.date === undefined || item.date === "" || isDate(item.date));
  });
}

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateArrangements(items) {
  if (!Array.isArray(items) || items.length > 100) {
    return "Check the fields and items for the arrangements page.";
  }

  for (const [index, item] of items.entries()) {
    const entry = `Arrangement ${index + 1}`;
    if (!isRecord(item)) return `${entry} must be a valid entry.`;
    if (!isText(item.name, 160)) return `${entry} needs a title (up to 160 characters).`;
    if (item.description !== undefined && item.description !== "" && !isText(item.description, 500)) {
      return `${entry} description must be 500 characters or fewer.`;
    }
    if (item.instrument !== undefined && item.instrument !== "" && !isText(item.instrument, 120)) {
      return `${entry} instrument must be 120 characters or fewer.`;
    }
    if (item.url !== undefined && item.url !== "" && !isLink(item.url)) {
      return `${entry} link must be an HTTPS URL or a site-relative path.`;
    }
    if (item.date !== undefined && item.date !== "" && !isDate(item.date)) {
      return `${entry} date must be a valid date.`;
    }
  }

  return null;
}

export function validateContent(content) {
  if (!isRecord(content)
    || !isText(content.brand, 80)
    || !Array.isArray(content.navigation)
    || content.navigation.length > 10
    || !isRecord(content.pages)
    || !isRecord(content.labels)
    || !isText(content.labels.projectLink, 80)
    || !isText(content.labels.arrangementLink, 80)
    || !isText(content.labels.emptyArrangements, 240)
    || !isRecord(content.footer)
    || !isText(content.footer.label, 80)
    || !isText(content.footer.note, 120)
    || !isText(content.footer.year, 8)) {
    return "Check the brand, navigation, pages, and footer fields.";
  }

  const seenPages = new Set();
  for (const item of content.navigation) {
    if (!isRecord(item)
      || !isText(item.label, 80)
      || !PAGE_NAMES.includes(item.page)
      || !isLink(item.href, true)
      || seenPages.has(item.page)) {
      return "Navigation entries need a label, safe link, and unique page.";
    }
    seenPages.add(item.page);
  }

  for (const pageName of PAGE_NAMES) {
    const page = content.pages[pageName];
    const isHome = pageName === "home";
    const isCollectionPage = pageName === "services" || pageName === "gallery";
    if (pageName === "arrangements" && isRecord(page)) {
      const arrangementsError = validateArrangements(page.items);
      if (arrangementsError) return arrangementsError;
    }
    if (!isRecord(page)
      || !isText(page.metaTitle, 160)
      || !isText(page.metaDescription, 300)
      || !isText(page.title, 160)
      || (!isHome && !isText(page.eyebrow, 120))
      || (isHome && page.eyebrow !== "")
      || (!isHome && !isCollectionPage && !isText(page.titleAccent, 160))
      || ((isHome || isCollectionPage) && page.titleAccent !== "")
      || (!isHome && !isText(page.description, 500))
      || (isHome && page.description !== "")
      || (!isHome && !isCollectionPage && !isText(page.sectionTitle, 120))
      || ((isHome || isCollectionPage) && page.sectionTitle !== "")
      || !validItems(pageName, page.items)) {
      return `Check the fields and items for the ${pageName} page.`;
    }
  }

  return null;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
