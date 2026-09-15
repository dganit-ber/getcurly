#!/usr/bin/env node
// Regenerates inventory.txt: every page and component with its line count, a
// tree of every file in the project, and a tree of what renders what.
//
// Run on demand — `node scripts/inventory.mjs`. Deliberately not wired to a
// hook: regenerating on every edit churns inventory.txt on every save.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

const buildTree = (paths, base, valueFor = lineCount) => {
  const tree = {};
  for (const path of paths) {
    const parts = relative(base, path).split("/");
    let node = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) node[part] = valueFor(path);
      else node = node[part] ??= {};
    });
  }
  return tree;
};

/**
 * Every file in the project, from git — which means .gitignore is honoured for
 * free (no node_modules, no .next, no .env.local) while files that are new and
 * not yet committed still show up. The alternative, walking the tree with a
 * hand-maintained ignore list, drifts out of step with .gitignore.
 */
const projectFiles = () =>
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .map((rel) => join(root, rel))
    .filter((path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false; // listed but deleted from the working tree
      }
    });

/** Counting newlines in a gif is meaningless, so binaries report size instead. */
const TEXT_EXT = /\.(ts|tsx|js|mjs|cjs|json|css|scss|md|sql|txt|ya?ml|html|svg|sh|example)$/i;

/** Extensionless dotfiles (.gitignore, .npmrc) are config, and config is text. */
const TEXT_FILE = (path) => {
  const name = basename(path);
  return TEXT_EXT.test(name) || (name.startsWith(".") && !name.slice(1).includes("."));
};

const measure = (path) => {
  if (TEXT_FILE(path)) return lineCount(path);
  const kb = statSync(path).size / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}M` : `${Math.round(kb)}K`;
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
      return [(branch + key).padEnd(46) + String(value).padStart(6)];
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

const allFiles = projectFiles();
const textLines = allFiles
  .filter(TEXT_FILE)
  .reduce((sum, path) => sum + lineCount(path), 0);

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
  "ALL FILES",
  "",
  ...renderFileTree(buildTree(allFiles, root, measure)),
  "",
  `${allFiles.length} files · ${textLines.toLocaleString()} lines of text`,
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
