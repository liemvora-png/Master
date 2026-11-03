import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateContent } from "../functions/_shared/content.js";

const validContent = {
  brand: "LIEM VORA",
  navigation: [
    { label: "Home", href: "/", page: "home" },
    { label: "Projects", href: "/projects", page: "projects" },
    { label: "Accomplishments", href: "accomplishments.html", page: "accomplishments" },
    { label: "Arrangements", href: "arrangements.html", page: "arrangements" },
    { label: "Services", href: "/services", page: "services" }
  ],
  labels: {
    projectLink: "Visit website",
    arrangementLink: "View arrangement",
    emptyArrangements: "Arrangements will be added here."
  },
  pages: {
    home: {
      metaTitle: "Liem Vora",
      metaDescription: "Personal website",
      eyebrow: "",
      title: "Liem Vora",
      titleAccent: "",
      description: "",
      sectionTitle: "",
      items: []
    },
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
    },
    services: {
      metaTitle: "Services",
      metaDescription: "Lessons, tutoring, and photography.",
      eyebrow: "Work together",
      title: "Services",
      titleAccent: "",
      description: "Photography, piano lessons, and tutoring.",
      sectionTitle: "",
      items: []
    },
    gallery: {
      metaTitle: "Photography",
      metaDescription: "Selected photographs.",
      eyebrow: "Selected work",
      title: "Photography",
      titleAccent: "",
      description: "A selection of photographs.",
      sectionTitle: "",
      items: []
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
  assert.match(migration, /'home', 'home'/);
  assert.match(migration, /'projects', 'projects'/);
  assert.match(migration, /'Liem Vora',\s*'["{]/);
  assert.doesNotMatch(migration, /'accomplishments', \d+, 'accomplishment'/);
  assert.match(migration, /'Arrangements', '\/arrangements\.html', 'arrangements', 4/);
  const upgrade = readFileSync(new URL("../migrations/0002_home_projects_empty_accomplishments.sql", import.meta.url), "utf8");
  assert.match(upgrade, /DELETE FROM blocks\s+WHERE page_id = 'accomplishments'/);
  assert.match(upgrade, /UPDATE pages\s+SET slug = 'projects'/);
  const brandingUpgrade = readFileSync(new URL("../migrations/0003_separate_logo_and_site_name.sql", import.meta.url), "utf8");
  assert.match(brandingUpgrade, /SET brand = 'Liem Vora'/);
  assert.match(brandingUpgrade, /AND brand = 'δ'/);
  const servicesMigration = readFileSync(new URL("../migrations/0005_remove_tutoring_add_viola.sql", import.meta.url), "utf8");
  assert.match(servicesMigration, /DELETE FROM services\s+WHERE id = 'tutoring'/);
  assert.match(servicesMigration, /INSERT OR IGNORE INTO services \(id, title, description, price, position, active\)/);
  assert.match(servicesMigration, /'viola'/);
  assert.match(servicesMigration, /UPDATE services\s+SET title = 'Private piano lessons'/);
});

test("rejects unsafe project URLs", () => {
  const content = structuredClone(validContent);
  content.pages.projects.items[0].url = "javascript:alert(1)";
  assert.match(validateContent(content), /projects page/);
});

test("rejects duplicate navigation targets", () => {
  const content = structuredClone(validContent);
  content.navigation[2].page = "projects";
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
  content.pages.arrangements.items[0].description = "";
  content.pages.arrangements.items[0].instrument = "";
  content.pages.arrangements.items[0].url = "";
  assert.equal(validateContent(content), null);
});

test("allows an arrangement to be saved with only its title", () => {
  const content = structuredClone(validContent);
  content.pages.arrangements.items = [{ name: "Sonata" }];
  assert.equal(validateContent(content), null);
});

test("accepts valid optional arrangement dates and rejects invalid dates", () => {
  const content = structuredClone(validContent);
  content.pages.arrangements.items = [{ name: "Sonata", date: "2025-02-28" }];
  assert.equal(validateContent(content), null);

  content.pages.arrangements.items[0].date = "2025-02-30";
  assert.match(validateContent(content), /Arrangement 1 date must be a valid date/);
});

test("identifies the invalid arrangement field when content cannot be saved", () => {
  const content = structuredClone(validContent);
  content.pages.arrangements.items = [{ name: "Sonata", url: "javascript:alert(1)" }];
  assert.match(validateContent(content), /Arrangement 1 link must be an HTTPS URL or a site-relative path/);

  content.pages.arrangements.items = [{ name: "", date: "" }];
  assert.match(validateContent(content), /Arrangement 1 needs a title/);
});

test("requires the home page to remain title-only", () => {
  const content = structuredClone(validContent);
  content.pages.home.items = [{ name: "Unexpected entry" }];
  assert.match(validateContent(content), /home page/);
});
