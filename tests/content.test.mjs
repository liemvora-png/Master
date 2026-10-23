import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateContent } from "../functions/_shared/content.js";

const validContent = {
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
      metaDescription: "Projects description",
      eyebrow: "Independent projects",
      title: "A few things,",
      titleAccent: "made thoughtfully.",
      description: "A site of projects.",
      sectionTitle: "My projects",
      items: [{ name: "SKYWARD", description: "Aircraft design.", category: "AEROSPACE", url: "https://example.com" }]
    },
    accomplishments: {
      metaTitle: "Accomplishments",
      metaDescription: "Accomplishments description",
      eyebrow: "Highlights",
      title: "Built through",
      titleAccent: "practice and play.",
      description: "Selected milestones.",
      sectionTitle: "Accomplishments",
      items: [{ name: "Piano competition", detail: "3rd place" }]
    },
    arrangements: {
      metaTitle: "Arrangements",
      metaDescription: "Arrangements description",
      eyebrow: "Music",
      title: "Sheet music",
      titleAccent: "arrangements.",
      description: "For musicians.",
      sectionTitle: "Arrangements",
      items: [{ name: "Theme", description: "A short piece.", instrument: "Piano", url: "/scores/theme.pdf" }]
    }
  },
  footer: { label: "LIEM VORA", note: "MADE WITH CARE", year: "2026" }
};

test("accepts valid site content", () => {
  assert.equal(validateContent(validContent), null);
});

test("migration seed matches the supported content model", () => {
  const migration = readFileSync(new URL("../migrations/0001_site_content.sql", import.meta.url), "utf8");
  for (const table of ["pages", "blocks", "nav_items", "site_settings"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /INSERT OR IGNORE INTO pages/);
  assert.match(migration, /INSERT OR IGNORE INTO blocks/);
  assert.match(migration, /INSERT OR IGNORE INTO nav_items/);
  assert.match(migration, /INSERT OR IGNORE INTO site_settings/);
  assert.match(migration, /'projects', 'index'/);
  assert.match(migration, /'accomplishments', 5, 'accomplishment'/);
  assert.match(migration, /'Arrangements', 'arrangements\.html', 'arrangements', 3/);
});

test("rejects unsafe project URLs", () => {
  const content = structuredClone(validContent);
  content.pages.projects.items[0].url = "javascript:alert(1)";
  assert.match(validateContent(content), /projects page/);
});

test("rejects duplicate navigation targets", () => {
  const content = structuredClone(validContent);
  content.navigation[1].page = "projects";
  assert.match(validateContent(content), /Navigation entries/);
});

test("rejects malformed content and oversized item collections", () => {
  assert.match(validateContent(null), /brand, navigation, pages, and footer/);
  const content = structuredClone(validContent);
  content.pages.arrangements.items = Array.from({ length: 101 }, (_, index) => ({
    name: `Piece ${index}`,
    description: "Description"
  }));
  assert.match(validateContent(content), /arrangements page/);
});

test("allows optional arrangement details to be left blank", () => {
  const content = structuredClone(validContent);
  content.pages.arrangements.items[0].instrument = "";
  content.pages.arrangements.items[0].url = "";
  assert.equal(validateContent(content), null);
});
