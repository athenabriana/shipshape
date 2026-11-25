---
name: setup
description: Checks that Ship Shape is ready on Hermes. Confirms the ss plugin is enabled and that the advanced-delegation plugin routes subagents by model (an opus route for the builder, a sonnet route for the reviewer and scout), and offers to install or configure what is missing. Asks before changing anything. Use when the user says "set up ss", "/ss:setup", or when another ss skill reports that the judge ran on the same model or that the sonnet route is missing.
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.2.0
---

# Set up ss

ss runs on the person's own profile, the Bot. It creates no extra profiles. Builder, reviewer
and scout are ephemeral subagents, and the advanced-delegation plugin picks each one's model.

## 1. Read what exists

```
hermes plugins list
hermes delegation config --show
hermes auth list
```

Report in one short table:

- the `ss` plugin: enabled or not;
- `advanced-delegation`: installed and enabled or not;
- the delegation mode: it should be `model_map`;
- the routes: an `opus` route (the default) and a `sonnet` route;
- the signed-in providers.

## 2. Propose what is missing

| Route    | Used by                                         | Model               |
| -------- | ----------------------------------------------- | ------------------- |
| `opus`   | the builder and every task that sets no route   | `claude-opus-5-5`   |
| `sonnet` | the reviewer (the judge in `ss:review`), scouts | `claude-sonnet-5-5` |

The judge runs a different model from the builder on purpose: a judge on the same model shares
its blind spots. If the person later signs in a second provider, the `sonnet` route is the
first one to move there.

If anything is missing, ask with one `clarify` call, recommended choice first: set it up as
shown, change a model first, or stop here. If all of it is in place, say so and stop.

## 3. Set it up

Only the missing parts:

```
hermes plugins install advanced-delegation --enable
hermes config set delegation.backends.model_map.options '[{"name":"opus","description":"Claude Opus 5.5: code changes, hard debugging, design and judgment.","provider":"anthropic","model":"claude-opus-5-5"},{"name":"sonnet","description":"Claude Sonnet 5.5: second-opinion review judge, investigation, research, digests.","provider":"anthropic","model":"claude-sonnet-5-5"}]'
hermes config set delegation.backends.model_map.default opus
hermes config set delegation.backend model_map
hermes delegation config --show
```

Set `options` and `default` one key at a time, never the whole `model_map` object: it also
holds the person's saved presets (`model_map.presets`, `active_preset`), which a write of the
whole object would delete. If the person already has other routes, add the two above and keep
theirs: read the current `options`, merge, then write it back. Never drop a route they made.

## 4. Close

Report what changed and what was already in place. Say that routes apply to new sessions
only, so the current chat keeps its old delegation mode. To undo:
`hermes config set delegation.backend default`.
