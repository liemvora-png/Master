const PAGE_NAMES = ["projects", "accomplishments", "arrangements"];
const PAGE_FILES = new Set(["index.html", "accomplishments.html", "arrangements.html"]);

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
      && isText(item.description, 500)
      && (item.instrument === undefined || item.instrument === "" || isText(item.instrument, 120))
      && (item.url === undefined || item.url === "" || isLink(item.url));
  });
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
    if (!isRecord(page)
      || !isText(page.metaTitle, 160)
      || !isText(page.metaDescription, 300)
      || !isText(page.eyebrow, 120)
      || !isText(page.title, 160)
      || !isText(page.titleAccent, 160)
      || !isText(page.description, 500)
      || !isText(page.sectionTitle, 120)
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
