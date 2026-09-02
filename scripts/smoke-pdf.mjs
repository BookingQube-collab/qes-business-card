/**
 * Smoke checks for the PDF bulk-import pipeline (no browser canvas required).
 * - public worker file present and matches installed pdfjs-dist
 * - file-type helpers
 * - pdfjs can open a minimal PDF (worker disabled; Node-safe)
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Minimal valid one-page PDF (blank page, no fonts).
const MINI_PDF = Buffer.from(
  `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 150] >>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer<< /Size 4 /Root 1 0 R >>
startxref
195
%%EOF`,
  "utf8",
);

const pkg = require("pdfjs-dist/package.json");
const workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const publicWorker = join(root, "public", "pdf.worker.min.mjs");

assert(
  existsSync(publicWorker),
  `Missing ${publicWorker} — run npm run postinstall`,
);
const a = createHash("sha256").update(readFileSync(workerSrc)).digest("hex");
const b = createHash("sha256")
  .update(readFileSync(publicWorker))
  .digest("hex");
assert(
  a === b,
  "public/pdf.worker.min.mjs does not match installed pdfjs-dist worker",
);
assert(
  statSync(publicWorker).size > 100_000,
  "public worker looks too small",
);

console.log(`[smoke:pdf] pdfjs-dist@${pkg.version}`);
console.log(
  `[smoke:pdf] public worker OK (${statSync(publicWorker).size} bytes)`,
);

function isPdfFile(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type === "application/pdf" ||
    type === "application/x-pdf" ||
    name.endsWith(".pdf")
  );
}
function isImageFile(file) {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "");
}

assert(isPdfFile({ name: "cards.PDF", type: "" }), "isPdfFile should accept .PDF");
assert(
  isPdfFile({ name: "x", type: "application/pdf" }),
  "isPdfFile should accept MIME",
);
assert(
  !isPdfFile({ name: "x.png", type: "image/png" }),
  "isPdfFile should reject images",
);
assert(isImageFile({ name: "a.JPG", type: "" }), "isImageFile should accept .JPG");
assert(
  isImageFile({ name: "a", type: "image/webp" }),
  "isImageFile should accept MIME",
);
assert(
  isPdfFile({ name: "scan", type: "application/x-pdf" }),
  "isPdfFile should accept application/x-pdf",
);
assert(
  isImageFile({ name: "card.heic", type: "" }),
  "isImageFile should accept .heic by extension",
);

function snapshotFileList(list) {
  if (!list || list.length === 0) return [];
  return Array.from(list);
}
const fakeList = {
  length: 2,
  0: { name: "a.jpg", type: "image/jpeg" },
  1: { name: "b.pdf", type: "application/pdf" },
  *[Symbol.iterator]() {
    for (let i = 0; i < this.length; i++) yield this[i];
  },
};
const snapped = snapshotFileList(fakeList);
fakeList.length = 0; // simulate live FileList clear after input reset
assert(snapped.length === 2, "snapshotFileList must copy before FileList clears");
assert(snapped[0].name === "a.jpg", "snapshot keeps first file");
console.log("[smoke:pdf] file-type helpers OK");

const legacyPath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
const pdfjs = await import(pathToFileURL(legacyPath).href);
const doc = await pdfjs.getDocument({
  data: new Uint8Array(MINI_PDF),
  disableWorker: true,
  isEvalSupported: false,
  useSystemFonts: true,
}).promise;
assert(doc.numPages === 1, `expected 1 page, got ${doc.numPages}`);
await doc.destroy();
console.log("[smoke:pdf] legacy getDocument (disableWorker) OK");

// Document the broken pattern that previously shipped (relative to lib/).
const broken = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  pathToFileURL(join(root, "lib", "pdf-pages.ts")).href,
);
assert(
  !existsSync(fileURLToPath(broken)),
  "expected old import.meta.url worker path to be missing",
);
console.log(
  "[smoke:pdf] confirmed old worker URL would 404:",
  broken.pathname,
);

console.log("[smoke:pdf] all checks passed");
