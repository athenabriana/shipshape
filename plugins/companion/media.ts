/**
 * SVG to PNG, so a diagram or chart the session draws shows inline in Telegram.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * Telegram shows PNG and JPEG inline but sends an SVG as a bare file. The companion
 * session is read only and cannot write files, so the reply tool takes SVG markup
 * directly and this module renders it into the inbox folder, the one place under the
 * state folder the reply tool may send from.
 */

import { Resvg } from "@resvg/resvg-js";
import { execFileSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

/** Telegram refuses a photo whose sides add up to more than 10000 pixels. */
const MAX_SIDE = 4000;
/** Telegram refuses a photo whose sides differ by more than this factor. */
const MAX_RATIO = 20;
/** Telegram's photo limit; a larger PNG goes out as a document. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_SVG_BYTES = 5 * 1024 * 1024;

const DEJAVU: Record<string, string> = {
  "sans-serif": "DejaVu Sans",
  serif: "DejaVu Serif",
  monospace: "DejaVu Sans Mono",
};

function run(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

/**
 * The renderer maps `sans-serif`, `serif` and `monospace` to fixed names that a machine may
 * not have, and then falls back to whatever font it finds first. So ask fontconfig what
 * the system uses (Linux), and use the platform's usual faces elsewhere. DejaVu goes first
 * where it exists: it covers symbols like ✓ and →, so a label stays in one face.
 */
function systemFamilies(): {
  sansSerifFamily: string;
  serifFamily: string;
  monospaceFamily: string;
} {
  const installed = new Set(
    run("fc-list", [":", "family"])
      .split(/[\n,]/)
      .map((f) => f.trim()),
  );
  const match = (pattern: string, fallback: string): string => {
    if (installed.has(DEJAVU[pattern])) return DEJAVU[pattern];
    return run("fc-match", ["-f", "%{family[0]}", pattern]).trim() || fallback;
  };
  const mac = process.platform === "darwin";
  return {
    sansSerifFamily: match("sans-serif", mac ? "Helvetica" : "Arial"),
    serifFamily: match("serif", "Times New Roman"),
    monospaceFamily: match("monospace", mac ? "Menlo" : "Courier New"),
  };
}

let families: ReturnType<typeof systemFamilies> | undefined;

/** How far back the scanner looks for the element an href belongs to. */
const TAG_LOOKBACK = 4096;

/**
 * Every outside reference in the document: href values, CSS url() targets and @import
 * targets. One pass over the text, so a hostile document cannot make it slow; a reference
 * left unterminated refuses the drawing. An href on an <a> link is skipped: a PNG cannot be
 * clicked, and the renderer never loads it.
 */
function outsideReferences(svg: string): string[] {
  const refs: string[] = [];
  // The last "<" before the current match, and the next one after it: each indexOf
  // only ever moves forward, so finding an href's element costs one pass in total.
  let tagStart = -1;
  let nextLt = svg.indexOf("<");
  const start = /\bhref\s*=\s*(["'])|url\(\s*(["']?)|@import\s+(["']?)/gi;
  for (let m = start.exec(svg); m; m = start.exec(svg)) {
    const from = start.lastIndex;
    const quote = m[1] ?? m[2] ?? m[3] ?? "";
    let end: number;
    if (quote) end = svg.indexOf(quote, from);
    else if (m[2] !== undefined) end = svg.indexOf(")", from);
    else {
      const stop = /[;\s]/g;
      stop.lastIndex = from;
      end = stop.exec(svg)?.index ?? -1;
    }
    if (end < 0) throw new Error("svg has an unterminated reference");
    start.lastIndex = end + 1;
    if (m[1]) {
      while (nextLt !== -1 && nextLt < m.index) {
        tagStart = nextLt;
        nextLt = svg.indexOf("<", nextLt + 1);
      }
      const tag =
        tagStart >= 0 && m.index - tagStart <= TAG_LOOKBACK
          ? /^<\s*(?:[\w-]+:)?([\w-]+)/.exec(svg.slice(tagStart, tagStart + 64))
          : null;
      if (tag?.[1].toLowerCase() === "a") continue;
    }
    refs.push(svg.slice(from, end).trim());
  }
  return refs;
}

/**
 * Makes model-written SVG safe and parseable. Any reference to something outside the
 * document (an href, a CSS url() or an @import that is not inline data or a #fragment)
 * refuses the drawing, so it can never pull a file from this machine into the picture.
 * Scanning the raw text this way does not depend on how the element is spelled or nested.
 * Adds the SVG namespace when the root lacks it, since the renderer finds no root without it.
 */
export function prepareSvg(svg: string): string {
  const outside = outsideReferences(svg).find((ref) => !/^(data:|#)/i.test(ref));
  if (outside !== undefined) {
    throw new Error(
      `svg refers to "${outside.slice(0, 80)}"; only inline data: images and #fragments are allowed`,
    );
  }
  if (!/<svg\b[^>]*\bxmlns\s*=/i.test(svg)) {
    return svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return svg;
}

/** Renders SVG markup to a PNG in `dir` and returns its path. Throws on markup it cannot render. */
export function renderSvg(svg: string, dir: string): string {
  if (Buffer.byteLength(svg, "utf8") > MAX_SVG_BYTES) {
    throw new Error("svg too large (max 5MB)");
  }
  const fonts = (families ??= systemFamilies());
  const options = {
    background: "white",
    font: { loadSystemFonts: true, ...fonts, defaultFontFamily: fonts.sansSerifFamily },
  };
  const markup = prepareSvg(svg);
  const probe = new Resvg(markup, options);
  const longest = Math.max(probe.width, probe.height, 1);
  const shortest = Math.max(Math.min(probe.width, probe.height), 1e-9);
  if (longest / shortest > MAX_RATIO) {
    throw new Error(
      `svg is ${Math.round(probe.width)}x${Math.round(probe.height)}; Telegram shows a photo only up to ${MAX_RATIO}:1, so draw it less wide or tall`,
    );
  }
  // Phones show small SVGs blurry, so render at twice the size, within Telegram's limit.
  const zoom = Math.min(2, MAX_SIDE / longest);
  const png = new Resvg(markup, { ...options, fitTo: { mode: "zoom" as const, value: zoom } })
    .render()
    .asPng();

  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, `${Date.now()}-${randomBytes(4).toString("hex")}.png`);
  writeFileSync(path, png, { mode: 0o600 });
  return path;
}
