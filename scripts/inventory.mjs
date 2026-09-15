#!/usr/bin/env node
// Regenerates inventory.txt: every page and component with its line count,
// a tree of where they sit on disk, and a tree of what renders what. Called by
// the PostToolUse hook in .claude/settings.local.json — run it by hand with
// `node scripts/inventory.mjs`.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE_FILES = new Set(["page.tsx", "layout.tsx", "not-found.tsx"]);

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
};

/** Matches `wc -l`: the number of newlines, not the number of text lines. */
const lineCount = (path) => (readFileSync(path, "utf8").match(/\n/g) ?? []).length;

const routeFor = (path) => {
  const rel = relative(join(root, "app"), path);
  if (rel === "page.tsx") return "/";
  if (rel === "layout.tsx" || rel === "not-found.tsx") return basename(rel, ".tsx");
  return `/${dirname(rel)}`;
};

const pages = walk(join(root, "app")).filter((p) => PAGE_FILES.has(basename(p)));
const components = readdirSync(join(root, "components"))
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => join(root, "components", f));

const section = (title, rows) => {
  const sorted = [...rows].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const total = sorted.reduce((sum, r) => sum + r.n, 0);
  return [
    title,
    "",
    ...sorted.map((r) => r.name.padEnd(24) + String(r.n).padStart(4)),
    " ".repeat(19) + "---------",
    String(total).padStart(28),
  ].join("\n");
};

const buildTree = (paths, base) => {
  const tree = {};
  for (const path of paths) {
    const parts = relative(base, path).split("/");
    let node = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) node[part] = lineCount(path);
      else node = node[part] ??= {};
    });
  }
  return tree;
};

const renderFileTree = (node, prefix = "") => {
  const keys = Object.keys(node).sort((a, b) => {
    const aDir = typeof node[a] === "object";
    if (aDir !== (typeof node[b] === "object")) return aDir ? 1 : -1; // files above folders
    return a.localeCompare(b);
  });

  return keys.flatMap((key, i) => {
    const last = i === keys.length - 1;
    const branch = prefix + (last ? "└── " : "├── ");
    const value = node[key];
    if (typeof value !== "object") {
      return [(branch + key).padEnd(34) + String(value).padStart(4)];
    }
    return [
      branch + key + "/",
      ...renderFileTree(value, prefix + (last ? "    " : "│   ")),
    ];
  });
};

// ---------------------------------------------------------------------------
// What renders what
// ---------------------------------------------------------------------------

const componentNames = new Set(components.map((p) => basename(p, ".tsx")));
const fileFor = (name) => join(root, "components", `${name}.tsx`);

/**
 * Components a file actually puts on the screen. Two conditions, because either
 * alone is wrong: imported from "@/components" (so local helpers don't count)
 * AND present as a JSX element (so a type-only import isn't mistaken for a
 * render). The negative lookahead stops `<Header` matching `<HeaderRow`.
 */
const rendersIn = (path) => {
  const src = readFileSync(path, "utf8");
  const imported = new Set();

  // The clause excludes quotes and semicolons so one import can never run on
  // into the next: without that, a leading `import "server-only";` or any
  // non-component import swallows the statement after it and its names are lost.
  const importRe = /import\s+([^;"']*?)\s+from\s+["']([^"']+)["']/g;
  for (const [, clause, source] of src.matchAll(importRe)) {
    if (!source.startsWith("@/components/")) continue;
    for (const part of clause.replace(/[{}]/g, " ").split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && componentNames.has(name)) imported.add(name);
    }
  }

  return [...imported]
    .filter((name) => new RegExp(`<${name}(?![A-Za-z0-9_])`).test(src))
    .sort();
};

const childrenOf = new Map(
  [...pages, ...components].map((path) => [path, rendersIn(path)]),
);

/** Depth-first lines for one component, guarding against import cycles. */
const subtree = (name, trail) => {
  if (trail.includes(name)) return [`${name} ↺`];
  const lines = [name];
  const kids = childrenOf.get(fileFor(name)) ?? [];
  kids.forEach((kid, i) => {
    const last = i === kids.length - 1;
    const [head, ...rest] = subtree(kid, [...trail, name]);
    lines.push((last ? "└── " : "├── ") + head);
    for (const line of rest) lines.push((last ? "    " : "│   ") + line);
  });
  return lines;
};

const treeForPage = (path) => {
  const lines = [routeFor(path)];
  const kids = childrenOf.get(path) ?? [];
  kids.forEach((kid, i) => {
    const last = i === kids.length - 1;
    const [head, ...rest] = subtree(kid, []);
    lines.push((last ? "└── " : "├── ") + head);
    for (const line of rest) lines.push((last ? "    " : "│   ") + line);
  });
  return lines.join("\n");
};

// Reverse index, so an unused component is stated rather than inferred.
const renderedBy = new Map(components.map((p) => [basename(p, ".tsx"), new Set()]));
for (const [path, kids] of childrenOf) {
  const label = pages.includes(path) ? routeFor(path) : basename(path, ".tsx");
  for (const kid of kids) renderedBy.get(kid)?.add(label);
}

const orphans = [...renderedBy]
  .filter(([, parents]) => parents.size === 0)
  .map(([name]) => name)
  .sort();

const out = [
  section(
    "PAGES",
    pages.map((p) => ({ name: routeFor(p), n: lineCount(p) })),
  ),
  "",
  "",
  section(
    "COMPONENTS",
    components.map((p) => ({ name: basename(p, ".tsx"), n: lineCount(p) })),
  ),
  "",
  "",
  "STRUCTURE",
  "",
  "app/",
  ...renderFileTree(buildTree(pages, join(root, "app"))),
  "",
  "components/",
  ...renderFileTree(buildTree(components, join(root, "components"))),
  "",
  "",
  "RENDER TREE",
  "",
  ...pages.flatMap((p) => [treeForPage(p), ""]),
  "",
  "RENDERED BY",
  "",
  ...[...renderedBy]
    .filter(([, parents]) => parents.size > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, parents]) => name.padEnd(24) + [...parents].sort().join(", ")),
  "",
  "",
  "NOT RENDERED ANYWHERE",
  "",
  ...(orphans.length ? orphans : ["(none)"]),
  "",
].join("\n");

writeFileSync(join(root, "inventory.txt"), out, "utf8");
