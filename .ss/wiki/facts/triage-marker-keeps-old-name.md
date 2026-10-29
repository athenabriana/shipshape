---
type: fact
title: "The triage sticky comment marker keeps the name maintain-repo"
description: "Renaming the marker would orphan every sticky comment posted before maintain-repo became triage."
paths: ["plugins/ss/skills/triage/scripts/render_digest.py"]
sources: ["spec:triage-act", "commit:8a00213"]
status: current
created: 2026-10-29
updated: 2026-10-29
---

`render_digest.py` finds the comment to edit in place by `<!-- ss:maintain-repo:pr-N -->`,
so the marker stays on the skill's old name after the rename to `triage`.
