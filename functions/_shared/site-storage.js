const PAGE_SLUGS = {
  projects: "index",
  accomplishments: "accomplishments",
  arrangements: "arrangements"
};

const BLOCK_TYPES = {
  projects: "project",
  accomplishments: "accomplishment",
  arrangements: "arrangement"
};

function rows(result) {
  return result?.results || [];
}

export async function readSiteContent(db) {
  const [pageResult, blockResult, navigationResult, settings] = await Promise.all([
    db.prepare(
      "SELECT id, slug, title, meta_title, meta_description, eyebrow, title_accent, " +
      "description, section_title FROM pages ORDER BY slug"
    ).all(),
    db.prepare(
      "SELECT page_id, position, type, content FROM blocks ORDER BY page_id, position"
    ).all(),
    db.prepare(
      "SELECT label, href, page_slug, position FROM nav_items ORDER BY position"
    ).all(),
    db.prepare(
      "SELECT brand, labels_json, footer_json, updated_at FROM site_settings WHERE id = ?"
    ).bind("site").first()
  ]);

  if (!settings) return null;

  const content = {
    brand: settings.brand,
    navigation: rows(navigationResult).map((item) => ({
      label: item.label,
      href: item.href,
      page: Object.keys(PAGE_SLUGS).find((key) => PAGE_SLUGS[key] === item.page_slug)
    })),
    labels: JSON.parse(settings.labels_json),
    pages: {},
    footer: JSON.parse(settings.footer_json)
  };

  for (const page of rows(pageResult)) {
    const pageKey = page.id;
    if (!PAGE_SLUGS[pageKey] || PAGE_SLUGS[pageKey] !== page.slug) {
      throw new Error(`Unexpected page record: ${page.id} (${page.slug}).`);
    }
    content.pages[pageKey] = {
      metaTitle: page.meta_title,
      metaDescription: page.meta_description,
      eyebrow: page.eyebrow,
      title: page.title,
      titleAccent: page.title_accent,
      description: page.description,
      sectionTitle: page.section_title,
      items: []
    };
  }

  for (const block of rows(blockResult)) {
    const page = content.pages[block.page_id];
    if (!page || block.type !== BLOCK_TYPES[block.page_id]) {
      throw new Error(`Unexpected content block for page ${block.page_id}.`);
    }
    page.items.push(JSON.parse(block.content));
  }

  for (const pageKey of Object.keys(PAGE_SLUGS)) {
    if (!content.pages[pageKey]) return null;
  }

  return {
    content,
    updatedAt: settings.updated_at
  };
}

export function buildSiteContentStatements(db, content, updatedAt) {
  const statements = [
    db.prepare("DELETE FROM blocks"),
    db.prepare("DELETE FROM nav_items"),
    db.prepare("DELETE FROM pages")
  ];

  statements.push(
    db.prepare(
      "INSERT INTO site_settings (id, brand, labels_json, footer_json, updated_at) " +
      "VALUES (?, ?, ?, ?, ?) " +
      "ON CONFLICT(id) DO UPDATE SET brand = excluded.brand, labels_json = excluded.labels_json, " +
      "footer_json = excluded.footer_json, updated_at = excluded.updated_at"
    ).bind(
      "site",
      content.brand,
      JSON.stringify(content.labels),
      JSON.stringify(content.footer),
      updatedAt
    )
  );

  for (const [pageKey, slug] of Object.entries(PAGE_SLUGS)) {
    const page = content.pages[pageKey];
    statements.push(
      db.prepare(
        "INSERT INTO pages " +
        "(id, slug, title, meta_title, meta_description, eyebrow, title_accent, description, section_title, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        pageKey,
        slug,
        page.title,
        page.metaTitle,
        page.metaDescription,
        page.eyebrow,
        page.titleAccent,
        page.description,
        page.sectionTitle,
        updatedAt
      )
    );

    page.items.forEach((item, index) => {
      statements.push(
        db.prepare(
          "INSERT INTO blocks (page_id, position, type, content) VALUES (?, ?, ?, ?)"
        ).bind(pageKey, index + 1, BLOCK_TYPES[pageKey], JSON.stringify(item))
      );
    });
  }

  content.navigation.forEach((item, index) => {
    statements.push(
      db.prepare(
        "INSERT INTO nav_items (label, href, page_slug, position) VALUES (?, ?, ?, ?)"
      ).bind(item.label, item.href, PAGE_SLUGS[item.page], index + 1)
    );
  });

  return statements;
}
