import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { prepareSvg, renderSvg } from "../media.ts";

const dir = mkdtempSync(join(tmpdir(), "companion-media-"));
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
// A 1x1 red PNG.
const RED_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);

test("renders SVG markup to a PNG at twice its size", () => {
  const path = renderSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="60" height="40" fill="teal"/><text x="4" y="70">hi</text></svg>',
    dir,
  );
  const png = readFileSync(path);
  expect([...png.subarray(0, 4)]).toEqual(PNG_SIGNATURE);
  expect(png.readUInt32BE(16)).toBe(240);
  expect(png.readUInt32BE(20)).toBe(160);
});

test("an SVG without xmlns still renders", () => {
  const path = renderSvg('<svg width="40" height="20"><rect width="40" height="20"/></svg>', dir);
  expect(readFileSync(path).readUInt32BE(16)).toBe(80);
});

test("keeps a large SVG within Telegram's photo size", () => {
  const path = renderSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="1000"/>',
    dir,
  );
  const width = readFileSync(path).readUInt32BE(16);
  expect(width).toBeGreaterThanOrEqual(3999);
  expect(width).toBeLessThanOrEqual(4000);
});

test("refuses a shape Telegram will not show as a photo, before rendering", () => {
  expect(() =>
    renderSvg('<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="100"/>', dir),
  ).toThrow("20:1");
  expect(() =>
    renderSvg('<svg xmlns="http://www.w3.org/2000/svg" width="10000000" height="1"/>', dir),
  ).toThrow("20:1");
});

test("never pulls a local image file into the picture", () => {
  const red = join(dir, "red.png");
  writeFileSync(red, RED_PNG);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="10" height="10"><image xlink:href="${red}" width="10" height="10"/><image href="file://${red}" width="10" height="10"/></svg>`;
  expect(prepareSvg(svg)).not.toContain(red);
  const path = renderSvg(svg, dir);
  // White background, no red: the image was dropped.
  const plain = renderSvg('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>', dir);
  expect(readFileSync(path).equals(readFileSync(plain))).toBe(true);
});

test("keeps inline data images", () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,${RED_PNG.toString("base64")}" width="1" height="1"/></svg>`;
  expect(prepareSvg(svg)).toContain("data:image/png");
});

test("throws on markup that is not SVG", () => {
  expect(() => renderSvg("not an svg", dir)).toThrow();
});
