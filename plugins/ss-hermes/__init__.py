"""Ship Shape (ss) for Hermes.

Registers every ``skills/<name>/SKILL.md`` as ``ss:<name>`` and freezes the operating frame,
plus the line that resolves ``<plugin-root>``, into each new session's prompt.
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent
FRAME_ID = "ss.operating-frame"
# Hermes caps one section at 4000 characters.
FRAME_MAX = 4000


def _frontmatter_description(skill_md: Path) -> str:
    """The `description:` line of a SKILL.md, or "" when it has none."""
    text = skill_md.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return ""
    for line in text.split("\n---", 1)[0].splitlines()[1:]:
        if line.startswith("description:"):
            return line.partition(":")[2].strip().strip('"')
    return ""


def _frame() -> str:
    try:
        frame = (ROOT / "frame.md").read_text(encoding="utf-8").strip()
    except OSError:
        frame = ""
    root_line = (
        f"- **The ss plugin lives at `{ROOT.as_posix()}`.** Where an ss document writes "
        "`<plugin-root>`, use that path as it stands."
    )
    text = f"{frame}\n{root_line}" if frame else root_line
    if len(text) > FRAME_MAX:
        logger.warning("ss: operating frame is %d chars, trimmed to %d", len(text), FRAME_MAX)
        text = text[:FRAME_MAX]
    return text


def register(ctx) -> None:
    for skill_md in sorted((ROOT / "skills").glob("*/SKILL.md")):
        name = skill_md.parent.name
        try:
            ctx.register_skill(name, skill_md, description=_frontmatter_description(skill_md))
        except (ValueError, FileNotFoundError) as exc:
            logger.warning("ss: skill %s not registered: %s", name, exc)

    ctx.register_system_prompt_section(FRAME_ID, _frame(), max_chars=FRAME_MAX)
