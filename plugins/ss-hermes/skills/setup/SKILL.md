---
name: setup
description: Sets up Ship Shape's Bots on Hermes. Checks the installed plugin, then offers to create the three worker Bots (ss-builder for code, ss-reviewer for the second-opinion judge, ss-scout for reading and research) as Hermes profiles with their models, and reports what exists. Asks before creating anything and never touches an existing profile. Use when the user says "set up ss", "/ss:setup", "create the ss bots", or when another ss skill reports a missing ss-builder, ss-reviewer or ss-scout profile.
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.1.0
---

# Set up ss

## 1. Read what exists

```
hermes plugins list
hermes profile list
hermes auth list
```

Report: is the `ss` plugin enabled, which of the three Bots exist, and which providers are
signed in.

## 2. Propose the Bots

| Bot           | Does                                       | Default model       |
| ------------- | ------------------------------------------ | ------------------- |
| `ss-builder`  | Kanban cards that change code              | `claude-opus-5-5`   |
| `ss-reviewer` | the judge in `ss:review`, a second opinion | `claude-sonnet-5-5` |
| `ss-scout`    | investigation, research, digests           | `claude-sonnet-5-5` |

The reviewer runs a different model from the builder on purpose: a judge on the same model
shares its blind spots. If the person later signs in a second provider, the reviewer is the
first Bot to move there.

Ask with one `clarify` call, recommended choice first:

- create the missing Bots with these models,
- change a model first,
- stop here.

## 3. Create

For each missing Bot, and only for missing ones:

```
hermes profile create <name> --clone --description "<what it does>"
hermes -p <name> config set model.default <model>
```

`--clone` copies config, keys and skills from the active profile, so the Bot can use the same
login and the ss plugin. It leaves messaging channels behind. Never pass `--clone-all` and
never edit an existing profile.

Then confirm each Bot answers on its model:

```
hermes profile list
hermes -p <name> chat -q "Reply with the model you run on, nothing else." --oneshot -Q
```

A Bot that errors here is reported with its error line, not hidden.

## 4. Close

Report what was created, what already existed, and anything that failed with its error line.
Mention that the Bots show up in the Bots tab of the desktop app.
