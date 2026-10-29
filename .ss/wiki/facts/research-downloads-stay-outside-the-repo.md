---
type: fact
title: "fetch_images.py trusts the bytes, never the name, and writes outside any repo"
description: "Downloaded pages and images are untrusted: a URL ending in .png can serve HTML or a huge file, and an output folder inside a repo would put them in a commit."
paths: ["plugins/ss/skills/research/scripts/fetch_images.py"]
sources: ["spec:research-skill", "commit:add24e7"]
status: current
created: 2026-10-29
updated: 2026-10-29
---

`fetch_images.py` keeps a file only when its magic bytes say PNG, JPEG, GIF or WebP and it
fits `--max-bytes`. It refuses an `--out` folder that is not empty or has a `.git`
ancestor, and by default writes to a fresh temp folder. Clones go to
`tempfile.gettempdir()/ss-research/<slug>/repos`, since Windows has no `/tmp`.
