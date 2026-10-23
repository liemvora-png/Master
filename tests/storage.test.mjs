import assert from "node:assert/strict";
import test from "node:test";
import { buildSiteContentStatements } from "../functions/_shared/site-storage.js";

const content = {
  brand: "LIEM VORA",
  navigation: [
    { label: "Projects", href: "index.html", page: "projects" },
    { label: "Accomplishments", href: "accomplishments.html", page: "accomplishments" },
    { label: "Arrangements", href: "arrangements.html", page: "arrangements" }
  ],
  labels: {
    projectLink: "Visit website",
    arrangementLink: "View arrangement",
    emptyArrangements: "Arrangements will be added here."
  },
  pages: {
    projects: {
      metaTitle: "Projects",
      metaDescription: "Projects",
      eyebrow: "Projects",
      title: "Projects",
      titleAccent: "made.",
      description: "Project page",
      sectionTitle: "Projects",
      items: [
        { name: "One", description: "First project", category: "WEB", url: "https://one.example" },
        { name: "Two", description: "Second project", category: "WEB", url: "https://two.example" }
      ]
    },
    accomplishments: {
      metaTitle: "Accomplishments",
      metaDescription: "Accomplishments",
      eyebrow: "Highlights",
      title: "Built",
      titleAccent: "together.",
      description: "Accomplishments page",
      sectionTitle: "Highlights",
      items: [{ name: "Piano", detail: "First place" }]
    },
    arrangements: {
      metaTitle: "Arrangements",
      metaDescription: "Arrangements",
      eyebrow: "Music",
      title: "Sheet music",
      titleAccent: "arrangements.",
      description: "Arrangements page",
      sectionTitle: "Arrangements",
      items: []
    }
  },
  footer: { label: "LIEM VORA", note: "MADE WITH CARE", year: "2026" }
};

test("writes pages, ordered JSON blocks, navigation, and settings", () => {
  const db = {
    prepare(sql) {
      return {
        sql,
        bind(...values) {
          return { sql, values };
        }
      };
    }
  };

  const statements = buildSiteContentStatements(db, content, "2026-10-23T00:00:00.000Z");
  const blocks = statements.filter((statement) => /INSERT INTO blocks/.test(statement.sql));
  const pages = statements.filter((statement) => /INSERT INTO pages/.test(statement.sql));
  const navigation = statements.filter((statement) => /INSERT INTO nav_items/.test(statement.sql));

  assert.equal(statements[0].sql, "DELETE FROM blocks");
  assert.equal(statements[1].sql, "DELETE FROM nav_items");
  assert.equal(statements[2].sql, "DELETE FROM pages");
  assert.equal(pages.length, 3);
  assert.equal(blocks.length, 3);
  assert.equal(navigation.length, 3);
  assert.deepEqual(pages.map(({ values }) => values.slice(0, 2)), [
    ["projects", "index"],
    ["accomplishments", "accomplishments"],
    ["arrangements", "arrangements"]
  ]);
  assert.deepEqual(blocks.map(({ values }) => values.slice(0, 3)), [
    ["projects", 1, "project"],
    ["projects", 2, "project"],
    ["accomplishments", 1, "accomplishment"]
  ]);
  assert.deepEqual(navigation.map(({ values }) => values.slice(0, 3)), [
    ["Projects", "index.html", "index"],
    ["Accomplishments", "accomplishments.html", "accomplishments"],
    ["Arrangements", "arrangements.html", "arrangements"]
  ]);
});
