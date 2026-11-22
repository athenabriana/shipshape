---
type: fact
title: "A trigger counts distinct valid entries, not the raw list"
description: "A count that fires an action counts each valid entry once, so a duplicate or a stray entry never fires it."
paths: ["plugins/ss/scripts/validate_wiki.py"]
sources: ["commit:07fdb4f"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a trigger counts a raw list instead of its distinct valid entries"
---

- commit:07fdb4f: [validate_wiki.py](/entities/module/validate-wiki.md) fired
  `repeated_corrections` on `len(sources)`, so a duplicated or a `spec:` source counted as
  an occurrence; it now counts the distinct `pr:` and `commit:` sources, and 285addc made
  the listed `sources` the same set, in the same occurrence.
