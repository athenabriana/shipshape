import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { renderSvg } from "../media.ts";

const dir = mkdtempSync(join(tmpdir(), "companion-media-"));
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

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

test("keeps a large SVG within Telegram's photo limit", () => {
  const path = renderSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="100"/>',
    dir,
  );
  const width = readFileSync(path).readUInt32BE(16);
  expect(width).toBeGreaterThanOrEqual(3999);
  expect(width).toBeLessThanOrEqual(4000);
});

test("throws on markup that is not SVG", () => {
  expect(() => renderSvg("not an svg", dir)).toThrow();
});
