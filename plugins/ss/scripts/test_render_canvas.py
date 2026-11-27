#!/usr/bin/env python3
"""
Unit tests for render_canvas.py. They cover the parts that need no Chrome: the plan built
from a canvas folder, the static check, the height probe, the shot names and the contact
sheet page. The `plan` subcommand runs through a subprocess, the way its callers run it.

Usage:
  python3 -m unittest discover -s plugins/ss/scripts -p 'test_*.py' -v
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import render_canvas as rc  # noqa: E402

SCRIPT = Path(__file__).resolve().parent / "render_canvas.py"


class StaticCheck(unittest.TestCase):
    def test_plain_html_is_static(self):
        self.assertTrue(rc.is_static("<main><h1>Projects</h1></main>"))

    def test_template_constructs_are_not_static(self):
        self.assertFalse(rc.is_static("<p>{{ project.name }}</p>"))
        self.assertFalse(rc.is_static("<sc-for each='p in projects'></sc-for>"))
        self.assertFalse(rc.is_static("<dc-import src='card.dc.html'>"))

    def test_css_braces_are_static(self):
        self.assertTrue(rc.is_static("<style>a{color:red}</style>"))


class Plan(unittest.TestCase):
    def test_order_size_fill_and_missing(self):
        canvas = {
            "order": ["home.dc.html", "chat.dc.html", "gone.dc.html"],
            "boards": {
                "home.dc.html": {"w": 1440, "h": 900, "expand": "fill"},
                "chat.dc.html": {"w": 390, "h": 844},
                "gone.dc.html": {"w": 100, "h": 100},
            },
        }
        sources = {"home.dc.html": "<p>home</p>", "chat.dc.html": "<p>{{msg}}</p>"}
        plan = rc.build_plan(canvas, sources)
        self.assertEqual([b["name"] for b in plan["boards"]], ["home", "chat"])
        self.assertTrue(plan["boards"][0]["fill"])
        self.assertFalse(plan["boards"][1]["fill"])
        self.assertEqual(plan["not_static"], ["chat.dc.html"])
        self.assertEqual(plan["missing"], ["gone.dc.html"])

    def test_extra_widths_only_for_fill_boards(self):
        fill = {"w": 1440, "fill": True}
        fixed = {"w": 1440, "fill": False}
        self.assertEqual(rc.widths_of(fill, [390]), [1440, 390])
        self.assertEqual(rc.widths_of(fixed, [390]), [1440])
        self.assertEqual(rc.widths_of({"w": 390, "fill": True}, [390]), [390])

    def test_plan_subcommand(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / "canvas.json").write_text(
                json.dumps({"order": ["a.dc.html"], "boards": {"a.dc.html": {"w": 800, "h": 600}}})
            )
            (folder / "a.dc.html").write_text("<body><p>a</p></body>")
            done = subprocess.run(
                [sys.executable, str(SCRIPT), "plan", tmp], capture_output=True, text=True
            )
            self.assertEqual(done.returncode, 0)
            result = json.loads(done.stdout)
            self.assertEqual(result["boards"][0]["w"], 800)
            self.assertEqual(result["not_static"], [])

    def test_missing_folder_reports_an_error(self):
        done = subprocess.run(
            [sys.executable, str(SCRIPT), "plan", "/nonexistent/ss-canvas"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(done.returncode, 0)
        self.assertTrue(json.loads(done.stdout)["errors"])


class HeightProbe(unittest.TestCase):
    def test_probe_goes_before_body_close(self):
        page = rc.inject_probe("<body><p>x</p></body>")
        self.assertIn("data-ss-h", page)
        self.assertTrue(page.endswith("</body>"))

    def test_probe_appended_without_body(self):
        self.assertTrue(rc.inject_probe("<p>x</p>").endswith("</script>"))

    def test_read_height_takes_the_last_mark(self):
        self.assertEqual(rc.read_height('<body data-ss-h="SS_H=1210">SS_H=1880'), 1880)
        self.assertIsNone(rc.read_height("<body></body>"))


class Names(unittest.TestCase):
    def test_board_name_strips_the_extension(self):
        self.assertEqual(rc.board_name("project.dc.html"), "project")
        self.assertEqual(rc.board_name("page.html"), "page")

    def test_shot_name(self):
        self.assertEqual(rc.shot_name("r2", "project", 390), "r2-project-390.png")
        self.assertEqual(rc.shot_name("", "project", 1440), "project-1440.png")


class ContactSheet(unittest.TestCase):
    def test_every_shot_is_a_labelled_tile(self):
        shots = [
            {"name": "home", "width": 1440, "height": 900, "path": "/tmp/r1-home-1440.png"},
            {"name": "a<b", "width": 390, "height": 1200, "path": "/tmp/r1-ab-390.png"},
        ]
        page = rc.contact_sheet_html(shots, "r1 sheet")
        self.assertEqual(page.count("<figure>"), 2)
        self.assertIn("home · 1440px", page)
        self.assertIn("a&lt;b · 390px", page)
        self.assertIn("file:///tmp/r1-home-1440.png", page)


if __name__ == "__main__":
    unittest.main()
