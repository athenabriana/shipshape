#!/usr/bin/env python3
"""
Renders a Design canvas's artboards to screenshots with headless Chrome, for the canvas
target of /ss:ui-critique (`skills/ui-critique/references/canvas-target.md` is the
recipe). The canvas page itself needs a claude.ai sign-in, so the artboards are read with
the Artifact tool into a local folder first, and this script renders that folder.

The folder holds the board list (`canvas.json`, with `order` and `boards`, each board
keyed by its file and carrying `w`, `h` and an optional `expand`) and one `.dc.html` file
per artboard. A board with `expand: "fill"` is a page whose height follows its content:
its `h` must equal the page height at `w`, so the script measures it.

Subcommands, each printing JSON on stdout:

  plan     the boards in order, with their size, whether they fill, and whether they
           are static. A board that uses `{{holes}}`, `<sc-for>` or `<dc-import>` only
           renders inside the canvas, so it is listed under `not_static` and skipped.
  measure  the page height of each fill board at its width, and at every extra width
           (`--widths 390`), beside the `h` the board list declares. `stale` lists the
           boards whose declared `h` differs from the measured one.
  shoot    a screenshot of every static board at its width, at its measured height when
           it fills, and of every fill board at each extra width. Files are named
           `<prefix>-<board>-<width>.png`, and `shots.json` beside them lists each one.
  sheet    a contact sheet: every shot of a `shots.json` laid out as labelled tiles on one
           page, rendered to one PNG per `--per-sheet` boards.

The Chrome binary comes from `--chrome`, else the first of google-chrome, chromium,
chromium-browser and chrome on PATH. A board Chrome fails to render goes in `errors`; the
script always exits 0.

Usage:
  python3 render_canvas.py plan    CANVAS_DIR
  python3 render_canvas.py measure CANVAS_DIR --widths 390
  python3 render_canvas.py shoot   CANVAS_DIR OUT_DIR --prefix r1 --widths 390
  python3 render_canvas.py sheet   OUT_DIR/shots.json --out OUT_DIR/r1-sheet --per-sheet 12
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

NOT_STATIC = re.compile(r"\{\{[^}]*\}\}|<sc-for\b|<dc-import\b")
HEIGHT_MARK = re.compile(r"SS_H=(\d+)")
PROBE = (
    "<script>window.addEventListener('load',function(){document.body.setAttribute("
    "'data-ss-h','SS_H='+Math.ceil(document.documentElement.scrollHeight))})</script>"
)
CHROMES = ("google-chrome", "chromium", "chromium-browser", "chrome")
DEFAULT_HEIGHT = 1500


def is_static(source: str) -> bool:
    """A board renders outside the canvas only when it has no template constructs."""
    return NOT_STATIC.search(source) is None


def build_plan(canvas: dict, sources: dict[str, str]) -> dict:
    """The boards in canvas order, each with its size, fill flag and static flag."""
    boards = canvas.get("boards", {})
    order = canvas.get("order") or list(boards)
    plan, not_static, missing = [], [], []
    for key in order:
        board = boards.get(key)
        if board is None or key not in sources:
            missing.append(key)
            continue
        static = is_static(sources[key])
        entry = {
            "board": key,
            "name": board_name(key),
            "w": int(board.get("w", 0)),
            "h": int(board.get("h", 0)),
            "fill": board.get("expand") == "fill",
            "static": static,
        }
        plan.append(entry)
        if not static:
            not_static.append(key)
    return {"boards": plan, "not_static": not_static, "missing": missing}


def board_name(key: str) -> str:
    for suffix in (".dc.html", ".html"):
        if key.endswith(suffix):
            return key[: -len(suffix)]
    return key


def inject_probe(source: str) -> str:
    """Add the script that writes the page height into the DOM Chrome dumps."""
    if "</body>" in source:
        return source.replace("</body>", PROBE + "</body>", 1)
    return source + PROBE


def read_height(dom: str) -> int | None:
    found = HEIGHT_MARK.findall(dom)
    return int(found[-1]) if found else None


def shot_name(prefix: str, name: str, width: int) -> str:
    return f"{prefix}-{name}-{width}.png" if prefix else f"{name}-{width}.png"


def contact_sheet_html(shots: list[dict], title: str) -> str:
    """One page of labelled tiles, each a shot scaled to the tile width."""
    tiles = []
    for shot in shots:
        label = html.escape(f"{shot['name']} · {shot['width']}px")
        src = html.escape(Path(shot["path"]).resolve().as_uri(), quote=True)
        tiles.append(
            f'<figure><img src="{src}" alt="{label}"><figcaption>{label}</figcaption></figure>'
        )
    return (
        "<!doctype html><meta charset=utf-8><title>"
        + html.escape(title)
        + "</title><style>body{margin:0;padding:16px;background:#e9e9ec;font:12px/1.3 "
        "system-ui,sans-serif;color:#1d1d22}main{display:grid;grid-template-columns:"
        "repeat(4,300px);gap:16px;align-items:start}figure{margin:0;background:#fff;"
        "padding:6px;border:1px solid #c9c9cf}img{display:block;width:100%;height:auto}"
        "figcaption{padding-top:6px}</style><main>" + "".join(tiles) + "</main>"
    )


def find_chrome(explicit: str | None) -> str | None:
    if explicit:
        return explicit
    for name in CHROMES:
        path = shutil.which(name)
        if path:
            return path
    return None


def chrome(binary: str, args: list[str]) -> subprocess.CompletedProcess:
    base = [binary, "--headless=new", "--disable-gpu", "--hide-scrollbars"]
    base.append("--virtual-time-budget=4000")
    return subprocess.run(base + args, capture_output=True, text=True, timeout=120)


def measure_height(binary: str, page: Path, width: int) -> int | None:
    probe = page.with_name(f"__ss_measure_{page.name}")
    probe.write_text(inject_probe(page.read_text(encoding="utf-8")), encoding="utf-8")
    try:
        done = chrome(binary, [f"--window-size={width},600", "--dump-dom", probe.as_uri()])
        return read_height(done.stdout)
    finally:
        probe.unlink(missing_ok=True)


def screenshot(binary: str, url: str, out: Path, width: int, height: int) -> bool:
    chrome(binary, [f"--window-size={width},{height}", f"--screenshot={out}", url])
    return out.exists() and out.stat().st_size > 0


def load_canvas(folder: Path) -> tuple[dict, dict[str, str]]:
    canvas = json.loads((folder / "canvas.json").read_text(encoding="utf-8"))
    sources = {}
    for key in canvas.get("boards", {}):
        page = folder / key
        if page.is_file():
            sources[key] = page.read_text(encoding="utf-8")
    return canvas, sources


def widths_of(entry: dict, extra: list[int]) -> list[int]:
    widths = [entry["w"]]
    if entry["fill"]:
        widths += [w for w in extra if w != entry["w"]]
    return widths


def cmd_plan(args) -> dict:
    canvas, sources = load_canvas(Path(args.canvas_dir))
    return build_plan(canvas, sources)


def cmd_measure(args, binary: str) -> dict:
    folder = Path(args.canvas_dir)
    plan = build_plan(*load_canvas(folder))
    heights, stale, errors = [], [], []
    for entry in plan["boards"]:
        if not (entry["fill"] and entry["static"]):
            continue
        for width in widths_of(entry, args.widths):
            measured = measure_height(binary, folder / entry["board"], width)
            if measured is None:
                errors.append(f"{entry['board']} at {width}px: no height came back")
                continue
            heights.append({"board": entry["board"], "width": width, "height": measured})
            if width == entry["w"] and measured != entry["h"]:
                stale.append({"board": entry["board"], "declared": entry["h"], "measured": measured})
    return {"heights": heights, "stale": stale, "not_static": plan["not_static"], "errors": errors}


def cmd_shoot(args, binary: str) -> dict:
    folder, out = Path(args.canvas_dir), Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    plan = build_plan(*load_canvas(folder))
    shots, errors = [], []
    for entry in plan["boards"]:
        if not entry["static"]:
            continue
        page = folder / entry["board"]
        for width in widths_of(entry, args.widths):
            height = entry["h"] if width == entry["w"] else 0
            if entry["fill"]:
                height = measure_height(binary, page, width) or height
            height = height or DEFAULT_HEIGHT
            target = out / shot_name(args.prefix, entry["name"], width)
            if screenshot(binary, page.resolve().as_uri(), target, width, height):
                shots.append({"name": entry["name"], "width": width, "height": height, "path": str(target)})
            else:
                errors.append(f"{entry['board']} at {width}px: Chrome wrote no screenshot")
    result = {"shots": shots, "not_static": plan["not_static"], "missing": plan["missing"], "errors": errors}
    (out / "shots.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def cmd_sheet(args, binary: str) -> dict:
    shots = json.loads(Path(args.shots).read_text(encoding="utf-8"))["shots"]
    stem = Path(args.out)
    stem.parent.mkdir(parents=True, exist_ok=True)
    sheets, errors = [], []
    per = max(1, args.per_sheet)
    for index in range(0, len(shots), per):
        chunk = shots[index : index + per]
        number = index // per + 1
        page = stem.with_name(f"{stem.name}-{number}.html")
        page.write_text(contact_sheet_html(chunk, f"{stem.name} {number}"), encoding="utf-8")
        rows = (len(chunk) + 3) // 4
        target = stem.with_name(f"{stem.name}-{number}.png")
        height = 32 + rows * max(320, max(int(s["height"] * 300 / max(s["width"], 1)) + 40 for s in chunk))
        if screenshot(binary, page.resolve().as_uri(), target, 1300, height):
            sheets.append(str(target))
        else:
            errors.append(f"sheet {number}: Chrome wrote no screenshot")
    return {"sheets": sheets, "errors": errors}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--chrome", help="path to the Chrome binary")
    sub = parser.add_subparsers(dest="command", required=True)
    plan = sub.add_parser("plan")
    plan.add_argument("canvas_dir")
    measure = sub.add_parser("measure")
    measure.add_argument("canvas_dir")
    measure.add_argument("--widths", type=int, nargs="*", default=[390])
    shoot = sub.add_parser("shoot")
    shoot.add_argument("canvas_dir")
    shoot.add_argument("out_dir")
    shoot.add_argument("--prefix", default="")
    shoot.add_argument("--widths", type=int, nargs="*", default=[390])
    sheet = sub.add_parser("sheet")
    sheet.add_argument("shots")
    sheet.add_argument("--out", required=True)
    sheet.add_argument("--per-sheet", type=int, default=12)
    args = parser.parse_args(argv)

    try:
        if args.command == "plan":
            result = cmd_plan(args)
        else:
            binary = find_chrome(args.chrome)
            if binary is None:
                result = {"errors": ["no Chrome binary found; pass --chrome"]}
            else:
                handler = {"measure": cmd_measure, "shoot": cmd_shoot, "sheet": cmd_sheet}[args.command]
                result = handler(args, binary)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        result = {"errors": [str(error)]}
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
