/**
 * Render /epk to a print-ready PDF.
 *
 * Uses headless Chrome's --print-to-pdf, which honours the @media print rules
 * and the `@page { size: A4; margin: 0 }` declaration in globals.css. The
 * output is a paginated A4 document with the dark palette intact, not a
 * screenshot of a web page.
 *
 * Run:  npm run epk:pdf
 *
 * Requires a running server. Start one first:
 *   npm run dev                 -> http://localhost:3000
 *   npm run build && npm start  -> http://localhost:3000  (recommended, no dev overlay)
 *
 * Options (env vars):
 *   EPK_URL         full page URL       (default http://localhost:3000/epk)
 *   EPK_OUT         output file         (default public/noah-hill-epk.pdf)
 *   EPK_TIMEOUT_MS  give up after this  (default 180000)
 *   CHROME_PATH     browser executable  (default: auto-detected)
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/**
 * ?print=1 makes /epk serve smaller, softer images. Chrome re-encodes every
 * printed image losslessly, so serving the full-size ones would multiply the
 * PDF's weight for detail no one can see at print size.
 */
function withPrintFlag(raw) {
  const u = new URL(raw);
  u.searchParams.set("print", "1");
  return u.toString();
}
const PAGE_URL = withPrintFlag(process.env.EPK_URL || "http://localhost:3000/epk");
const OUT = path.resolve(ROOT, process.env.EPK_OUT || "public/noah-hill-epk.pdf");
const TIMEOUT_MS = Number(process.env.EPK_TIMEOUT_MS || 180_000);

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findBrowser() {
  for (const p of CANDIDATES) {
    try { if (existsSync(p)) return p; } catch { /* unreadable path */ }
  }
  return null;
}

async function waitForServer(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(750);
  }
  throw new Error(
    `No server responded at ${new URL(url).origin} within ${timeoutMs / 1000}s.\n` +
      "Start one first:  npm run dev   (or)   npm run build && npm start",
  );
}

/**
 * Next generates optimized images on first request. On a cold cache that is
 * slower than Chrome's virtual-time budget, and the press photos render as
 * broken boxes in the PDF. Fetch every /_next/image URL the page references
 * first so they are all served from cache during the print pass.
 */
async function warmImages(pageUrl) {
  const origin = new URL(pageUrl).origin;
  const html = await (await fetch(pageUrl)).text();

  // The URLs turn up in plain attributes, in the preload link's imageSrcSet and
  // inside React's escaped flight payload, so scan the text rather than parse
  // attributes.
  const urls = new Set();
  for (const m of html.matchAll(/\/_next\/image\?[^"'\\\s>]+/g)) {
    urls.add(origin + m[0].replace(/&amp;/g, "&"));
  }

  const results = await Promise.all(
    [...urls].map((u) => fetch(u).then((r) => r.ok).catch(() => false)),
  );
  return { total: urls.size, ok: results.filter(Boolean).length };
}

async function main() {
  const browser = findBrowser();
  if (!browser) {
    throw new Error(
      "Could not find Chrome or Edge.\n" +
        "Set CHROME_PATH to the browser executable and re-run, e.g.\n" +
        '  CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npm run epk:pdf',
    );
  }

  console.log(`. browser  ${browser}`);
  console.log(`. page     ${PAGE_URL}`);
  console.log(". waiting for the server");
  await waitForServer(PAGE_URL);

  const warm = await warmImages(PAGE_URL);
  console.log(`. warmed ${warm.ok}/${warm.total} optimized images`);

  mkdirSync(path.dirname(OUT), { recursive: true });

  // A throwaway profile outside the project: .next/cache gets wiped by builds
  // while Chrome still holds it open.
  const profile = path.join(os.tmpdir(), `epk-pdf-${process.pid}`);

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${profile}`,
    "--no-pdf-header-footer",
    "--generate-pdf-document-outline",
    // Remote cover art and press photos need time to decode before capture.
    "--virtual-time-budget=25000",
    "--run-all-compositor-stages-before-draw",
    `--print-to-pdf=${OUT}`,
    PAGE_URL,
  ];

  console.log(". rendering");
  const code = await new Promise((resolve, reject) => {
    const child = spawn(browser, args, { stdio: ["ignore", "inherit", "pipe"] });
    let stderr = "";
    const kill = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Chrome did not finish within ${TIMEOUT_MS / 1000}s.`));
    }, TIMEOUT_MS);
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => { clearTimeout(kill); reject(err); });
    child.on("close", (c) => {
      clearTimeout(kill);
      // Chrome is noisy on stderr even on success; surface it only on failure.
      if (c !== 0 && stderr) console.error(stderr);
      resolve(c);
    });
  });

  try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }

  if (code !== 0 || !existsSync(OUT)) {
    throw new Error(`Failed to render the PDF (exit ${code}).`);
  }

  const mb = (statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`\nOK  ${path.relative(ROOT, OUT)}  (${mb} MB)`);
  console.log("    Served at /noah-hill-epk.pdf. The download buttons on /epk appear automatically.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n${err.message}`);
    process.exit(1);
  });
