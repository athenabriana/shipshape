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
const MAX_SVG_BYTES = 5 * 1024 * 1024;

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
  const match = (pattern: string, fallback: string): string => {
    try {
      const listed = execFileSync("fc-list", [":", "family"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const dejavu = {
        "sans-serif": "DejaVu Sans",
        serif: "DejaVu Serif",
        monospace: "DejaVu Sans Mono",
      }[pattern];
      if (dejavu && listed.split("\n").some((l) => l.split(",").includes(dejavu))) return dejavu;
      return (
        execFileSync("fc-match", ["-f", "%{family[0]}", pattern], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim() || fallback
      );
    } catch {
      return fallback;
    }
  };
  const mac = process.platform === "darwin";
  return {
    sansSerifFamily: match("sans-serif", mac ? "Helvetica" : "Arial"),
    serifFamily: match("serif", "Times New Roman"),
    monospaceFamily: match("monospace", mac ? "Menlo" : "Courier New"),
  };
}

let families: ReturnType<typeof systemFamilies> | undefined;

/** Renders SVG markup to a PNG in `dir` and returns its path. Throws on markup it cannot render. */
export function renderSvg(svg: string, dir: string): string {
  if (Buffer.byteLength(svg, "utf8") > MAX_SVG_BYTES) {
    throw new Error("svg too large (max 5MB)");
  }
  const options = {
    background: "white",
    font: {
      loadSystemFonts: true,
      ...(families ??= systemFamilies()),
      defaultFontFamily: families.sansSerifFamily,
    },
  };
  const probe = new Resvg(svg, options);
  const longest = Math.max(probe.width, probe.height, 1);
  // Phones show small SVGs blurry, so render at twice the size, within Telegram's limit.
  const zoom = Math.min(2, MAX_SIDE / longest);
  const png = new Resvg(svg, { ...options, fitTo: { mode: "zoom" as const, value: zoom } })
    .render()
    .asPng();

  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${Date.now()}-${randomBytes(4).toString("hex")}.png`);
  writeFileSync(path, png);
  return path;
}
