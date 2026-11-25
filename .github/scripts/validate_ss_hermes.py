#!/usr/bin/env python3
"""CI check for plugins/ss-hermes: the plugin loads, registers every skill and a frame that
fits Hermes's 4000-character limit, and route.py gives the expected route for known facts.

It stubs the Hermes plugin context, so it runs without Hermes installed.
"""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "plugins" / "ss-hermes"
errors: list[str] = []


class Ctx:
    def __init__(self) -> None:
        self.skills: dict[str, Path] = {}
        self.sections: dict[str, str] = {}

    def register_skill(self, name, path, description=""):
        if not Path(path).exists():
            errors.append(f"skill {name}: {path} missing")
        if not description:
            errors.append(f"skill {name}: no description read from frontmatter")
        self.skills[name] = Path(path)

    def register_system_prompt_section(self, id, content, *, position="after_memory", max_chars=4000):
        if len(content) > 4000:
            errors.append(f"section {id}: {len(content)} chars, Hermes allows 4000")
        if "<plugin-root>" not in content:
            errors.append(f"section {id}: does not resolve <plugin-root>")
        self.sections[id] = content


spec = importlib.util.spec_from_file_location("ss_hermes", ROOT / "__init__.py")
if spec is None or spec.loader is None:
    print(f"::error::cannot load {ROOT / '__init__.py'}")
    sys.exit(1)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ctx = Ctx()
module.register(ctx)

expected = {p.parent.name for p in (ROOT / "skills").glob("*/SKILL.md")}
if set(ctx.skills) != expected:
    errors.append(f"registered {sorted(ctx.skills)}, expected {sorted(expected)}")
if len(ctx.sections) != 1:
    errors.append(f"expected one prompt section, got {len(ctx.sections)}")

# Every `<plugin-root>/...` path a skill or role names must exist in the plugin, because the
# plugin is installed alone from this subdirectory.
import re

for md in list(ROOT.rglob("*.md")):
    for rel in re.findall(r"<plugin-root>/([\w./-]+)", md.read_text(encoding="utf-8")):
        rel = rel.rstrip(".")
        if not (ROOT / rel).exists():
            errors.append(f"{md.relative_to(ROOT)}: <plugin-root>/{rel} does not exist")
    if "plugins/ss/" in md.read_text(encoding="utf-8") and md.name != "DESIGN.md":
        errors.append(f"{md.relative_to(ROOT)}: points into plugins/ss, which is not installed with this plugin")
    # The entry skill was renamed from `mode` to `go` in 0.3.0; only DESIGN keeps the history.
    if re.search(r"ss:mode\b|skills/mode\b", md.read_text(encoding="utf-8")) and md.name != "DESIGN.md":
        errors.append(f"{md.relative_to(ROOT)}: names ss:mode, which is ss:go since 0.3.0")

if not (ROOT / "skills" / "go" / "SKILL.md").exists() or (ROOT / "skills" / "mode").exists():
    errors.append("the entry skill must live at skills/go (renamed from skills/mode in 0.3.0)")

cases = [
    (["low", "yes", "no", "good", "1"], "lightweight"),
    (["low", "yes", "no", "some", "2"], "lightweight"),
    (["medium", "yes", "no", "good", "2"], "standard"),
    (["low", "yes", "no", "none", "1"], "standard"),
    (["medium", "yes", "no", "none", "4"], "intensive"),
    (["high", "yes", "no", "good", "1"], "intensive"),
    (["low", "no", "no", "good", "1"], "intensive"),
    (["low", "yes", "yes", "good", "1"], "intensive"),
]
flags = ["--blast-radius", "--reversible", "--data-or-auth", "--coverage", "--files"]
for facts, want in cases:
    argv = [a for pair in zip(flags, facts) for a in pair]
    out = subprocess.run([sys.executable, str(ROOT / "scripts" / "route.py"), *argv],
                         capture_output=True, text=True)
    got = out.stdout.split(":", 1)[0].strip()
    if out.returncode != 0 or got != want:
        errors.append(f"route.py {' '.join(facts)}: got {got or out.stderr.strip()!r}, want {want}")

for e in errors:
    print(f"::error::{e}")
print(f"ss-hermes: {len(ctx.skills)} skills, {len(cases)} route cases, {len(errors)} errors")
sys.exit(1 if errors else 0)
