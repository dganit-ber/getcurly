/**
 * Copy the zxing reader binary into `public/`.
 *
 * Left to itself zxing-wasm fetches its `.wasm` from a CDN at runtime. The
 * barcode path is the one thing in the app that resolves entirely on the
 * device, so it shouldn't depend on a third party being up — we serve the
 * binary ourselves and point `locateFile` at it (see `lib/barcode.ts`).
 *
 * Runs on postinstall so the copy always matches the installed version rather
 * than whatever was committed months ago.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

// Resolved through the package's own export map, so a version bump that moves
// the file inside `dist/` is followed rather than silently missed.
const source = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
const target = join(process.cwd(), "public", "zxing_reader.wasm");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
