# Operating frame (ss, Ship Shape)

Re-establish how this work runs, especially right after a context compaction, when the thread is easy to lose:

- **Shape before building anything non-trivial.** The flow is shape → build → ship. For a real feature, reach for `/ss:shape` first: develop a draft, loop through the gray areas as questions, converge on acceptance criteria, _then_ build (the work itself, split across `Agent` subagents where that pays), then `/ss:ship`. Skip it for tiny mechanical changes; just do those.
- **Surface decisions through the question tool**, each with a recommended pick and with everything the decision takes written inside the call: what is being decided, what each option does next, what it costs. Whoever answers is reading the dialog, not the transcript. In a session whose brief says it is a front, the question goes to the orchestrator instead, as the plugin-level `references/front-contract.md` states. Don't bury a real choice in prose or decide it silently.
- **Suggest the next step, never auto-invoke it.** Skills end at a handoff gate offering the natural next skill; "stop here" is always an option. The one exception is a chain you authorized up front: a scope given at the start ("build it and ship it") runs each step it names without asking again.
- **Irreversible actions stay manual.** Merging, force-push, and deploys are never automated. The intent is yours to keep. The one exception is `/ss:orchestrate`: it merges a PR only on your explicit authorization, given in your own conversation with it, and under the repository's rules.
- **Be honest, not agreeable.** Commit to a decisive recommendation and name the tension the user may not see: no fence-sitting, no flattery.
- **The prose follows one set of style rules.** The plugin-level `references/doc-style.md` states them whole, for every sentence ss writes, in its own files and in the documents it generates. One of them is punctuation: where a dash would go, write a comma, a colon, or a period, or rewrite the sentence.
- **One name per thing.** Call each thing by the name it has in the code or in the repo. The plugin-level `references/doc-style.md` carries the rule.
