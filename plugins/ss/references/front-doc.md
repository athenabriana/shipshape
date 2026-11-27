# The front doc

A _front_ is the work one orchestrator runs for Athena, from the first request to the last
landed PR. Its memory has exactly one home, picked when it opens and kept until it lands:
a private Claude Docs doc (a _doc front_), or a local folder of the same shape when the
Docs connector is missing (a _file front_). Nothing about a front lives in any repo.

This page covers the name, the tabs and their template, who reads and writes the front, how
the orchestrator keeps it cheap, the pointer that finds it again after a compaction, the
file front, the Docs outage and its merge, and the rules every front keeps.

## Who reads and writes it

- **`/ss:clarify` creates it**, doc or file front, when `/ss:orchestrate` opens the front,
  and writes its opening sections: the goal, the acceptance criteria, what is out of
  scope, and the opening decisions in the Log. It is the only skill that creates a Claude
  Docs doc.
- **The orchestrator keeps it up to date** and creates no doc: the running state (repos,
  work sessions, waiting on Athena, merge authorizations, next), the Log and the Notes,
  through the Docs tools for a doc front and with `Write` and `Edit` for a file front.
- **Work sessions never open it.** Their brief stands alone and their reports come back
  through the relay, so none spends turns loading the Docs tools or acts on a stale tab.
- **Athena** may edit a doc front by hand on claude.ai. The orchestrator's `sinceRev` read
  picks those edits up.

## The name

The doc's title is `ss front · <slug>`, with `<slug>` from
`<plugin-root>/scripts/front_name.py`. The prefix is how a listing finds every doc front.
When the front lands, the orchestrator renames the doc to `ss front · <slug> (landed)`,
so a listing tells open from landed without a read.

A file front's folder is `~/.ss/fronts/<slug>/`, and its landed mark is the `State:` line.

### Pick a slug no home holds

Before opening a front, read the slugs both homes already hold, and pass them to the
script:

1. With the Docs tools present, list the artifacts with the `Artifact` tool's `list`
   action (`limit: 200`), and keep every title that starts with `ss front · `. Strip the
   prefix and any ` (landed)` to get the slug.
2. Run the script with those slugs:

   ```bash
   python3 <plugin-root>/scripts/front_name.py "<title or slug>" --taken <slug> <slug> ...
   ```

   It also checks `~/.ss/fronts/` and `~/.ss/outage/` by itself. It prints
   `{slug, base, suffixed, name, cut, collision}`: a slug taken in either home comes back
   with a suffix (`-2`, `-3`). Use the `slug` it prints.

## The tabs

Three tabs, so a reread costs one short tab and not the whole history:

| tab          | holds                                                                                                        | read when                         | size                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------- | ---------------------------------------------- |
| Now (`a0`)   | goal, acceptance criteria, out of scope, repos, work sessions, waiting on Athena, merge authorizations, next | every compaction                  | under about 120 lines: closed rows move to Log |
| Log (`a1`)   | dated decisions with Athena's words, closed work sessions, landed PRs                                        | only by a `search` read on a word | grows; never reread whole                      |
| Notes (`a2`) | reports, research, anything too long for a message                                                           | when a step names it              | grows                                          |

`a0`, `a1` and `a2` are the tabs' `order` values, so the tray shows Now first.

### The Now template

The Now tab and `NOW.md` share this shape. `front_store.py create` writes it for a file
front; `/ss:clarify` writes the same text into a new doc's Now tab, by "Open a doc front".

```markdown
# ss front · <slug>

State: open · orchestrator <session id> · opened <date>

## Goal

<one paragraph, Athena's words>

## Acceptance criteria

- WHEN <...> THEN <...>

## Out of scope

- <a hard line, or an idea parked for later>

## Repos

| repo | base | branch | PR  | CI  |
| ---- | ---- | ------ | --- | --- |

## Work sessions

| name | session id | task | state | last report (one line) |
| ---- | ---------- | ---- | ----- | ---------------------- |

## Waiting on Athena

- <question, asked on <date>>

## Merge authorizations

- PR <url>: "<Athena's words>" (given in this chat; never passed down)

## Next

<one or two lines>
```

### The Log and Notes tabs

- **Log** starts with one line, `# ss front · <slug> · log`. Every entry is appended at the
  end and starts with its date: a decision with Athena's words quoted, a work session that
  closed, a PR that landed, a merge after an outage.
- **Notes** holds one `##` section per report, research note or screenshot, titled with its
  date and subject. A file front keeps one file per note under `notes/`.

## Open a doc front

`/ss:clarify` runs this and the next section, by "The front doc, when `/ss:orchestrate`
calls" in its `SKILL.md`. Load the Docs tools first: call `ToolSearch` with `select:` and
the bare tool names `read`, `batch`, `update` and `guide` as the server lists them, or
load the `anthropic-skills:docs` skill. The server's name differs per account, so name the
bare tool, never a full name from another machine. Before the first write, call `guide`
with `topic.instructions` and `topic.tabs`, and follow them for the payload shapes.

1. Create the doc in one `batch` at birth, titled `ss front · <slug>`, with the three tabs
   placed `a0` (Now), `a1` (Log) and `a2` (Notes). Fill Now from the template, Log with its
   first line, and leave Notes with a heading.
2. Show it to Athena with the `Artifact` tool's `open` action and the doc's link.
3. Record the pointer:

   ```bash
   python3 <plugin-root>/scripts/front_pointer.py set <slug> doc "<doc link> · Now body <body id>"
   ```

4. Keep the doc private. Never share it and never change its sharing: Athena shares it
   herself if she wants to.

## Open a file front

When `ToolSearch` finds no Docs tools, say so in one line and open a file front:

1. Create the folder:

   ```bash
   python3 <plugin-root>/scripts/front_store.py create <slug> --orchestrator <this session id>
   ```

   It writes `NOW.md` from the template, `LOG.md` with its first line, and `notes/`, and
   refuses a slug that already has a folder.

2. The first time this orchestrator opens a file front, check the user settings
   (`~/.claude/settings.json`) for `~/.ss` under `permissions.additionalDirectories`. When it
   is missing, offer to add it once, through `AskUserQuestion`, so every session reads the
   folder without a prompt. On a no, ask no second time.
3. Record the pointer with the folder's path:

   ```bash
   python3 <plugin-root>/scripts/front_pointer.py set <slug> file ~/.ss/fronts/<slug>
   ```

A file front maps onto the doc front one to one:

| doc front                 | file front, `~/.ss/fronts/<slug>/`                                          |
| ------------------------- | --------------------------------------------------------------------------- |
| Now tab                   | `NOW.md`, same template, same 120-line cap                                  |
| Log tab                   | `LOG.md`, appended; read with `Grep`, never whole                           |
| Notes tab                 | `notes/`, one file per report or screenshot                                 |
| title `ss front · <slug>` | folder name `<slug>`                                                        |
| renamed `(landed)`        | `front_store.py land <slug>`: `State: landed` in `NOW.md`; the folder stays |
| `sinceRev` reads          | a `Read` of `NOW.md`; Athena's hand edits show as they are                  |

A file front never moves to a doc, and no Docs outage ever applies to it.

## Keep it cheap

- **Read only what changed.** At the start of a turn that touches a doc front, read the Now
  tab with `{"kind":"view","sinceRev":<last rev>}`: it returns only what changed since the
  rev this session last saw, Athena's hand edits included. A file front is one `Read` of
  `NOW.md`.
- **Never reread between your own writes.** Each write's ack carries the new rev, and that
  is the new state.
- **Write one section per call**, never the whole tab.
- **Keep Now under about 120 lines.** A closed row (a work session that ended, a PR that
  landed, a question Athena answered) moves to Log in the same turn it closes.
- **Search the Log, never reread it.** Use a `search` read on a word in a doc front, and
  `Grep` on `LOG.md` in a file front.

## After a compaction: the pointer

The orchestrator loses the front's location and its last rev with its context. The pointer
file keeps the location:

```
~/.ss/front-of/<session id>
slug=<slug>
home=doc            # or: file
where=<doc link and Now tab body id>   # or: <the front folder's path>
```

`front_pointer.py` keys it on `CLAUDE_CODE_SESSION_ID`, writes it with `set` once at open,
and removes it with `clear` when the front lands. The SessionStart hook runs on every
compaction with the same session id, reads the pointer, and adds one line naming the
front's slug and where to read it. The orchestrator's first step after a compaction is that
one read: a Docs `read` of the Now tab whole for a doc front, a `Read` of `NOW.md` for a file
front. The pointer holds a location, never the front's state.

| command                                          | what it does                             |
| ------------------------------------------------ | ---------------------------------------- |
| `front_pointer.py set <slug> <home> <where>`     | write the pointer once, at open          |
| `front_pointer.py get`                           | print it as JSON, or `{"pointer": null}` |
| `front_pointer.py clear`                         | remove it when the front lands           |
| `front_pointer.py outage start <dir> <base-rev>` | mark a doc front in a Docs outage        |
| `front_pointer.py outage end`                    | remove the outage mark after the merge   |

## A Docs outage on a doc front

This is the one sanctioned exception to one home per front. It applies only to a front
whose `home=` is `doc`, only while the Docs tools fail, and it ends at the merge. A file
front never has an outage, and no front opens during one: with no connector, a new front
opens as a file front.

### Detect it

The outage starts the first time a Docs call fails twice in a row, or when `ToolSearch` no
longer finds the Docs tools. Then, in the same turn:

1. Tell Athena in one line that the Docs tools are down and the front continues in a local
   folder until they are back.
2. Save the Now tab as this session last knew it (its last read, or the ack of its last
   write) to a scratch file, and open the outage folder with that rev:

   ```bash
   python3 <plugin-root>/scripts/front_store.py outage-init <slug> <saved Now file> <rev>
   python3 <plugin-root>/scripts/front_pointer.py outage start ~/.ss/outage/<slug>/ <rev>
   ```

3. From then on, write only under `~/.ss/outage/<slug>/`.

The folder sits apart from `~/.ss/fronts/`, so a file-front listing never mistakes it for a
front:

- `BASE.md`: the Now tab as this session last knew it, with its rev on the first line.
  Written once, never edited. It is the merge base.
- `NOW.md`: starts as a copy of the base. Write here during the outage, same template and
  cap.
- `LOG.md`: only the Log lines written during the outage, appended.
- `notes/`: reports and screenshots written during the outage.

### During the outage

Every turn starts with a `ToolSearch` check for the Docs `read` tool. The merge runs on the
first turn it finds the tools and a read succeeds. After a compaction in this state, the
hook's line names the outage folder and says to check for the tools on each turn.

### Merge back

`front_merge.py` does the deterministic part; the orchestrator does the reads, the writes
and the questions.

1. Read the doc's Now tab whole, as it stands now, and save it to a scratch file
   (`theirs`). Athena may have edited the doc on claude.ai during the outage.
2. Run the merge:

   ```bash
   python3 <plugin-root>/scripts/front_merge.py ~/.ss/outage/<slug>/BASE.md ~/.ss/outage/<slug>/NOW.md <theirs file> \
     --log ~/.ss/outage/<slug>/LOG.md --start <outage start> --end <now> --notes ~/.ss/outage/<slug>/notes
   ```

   It splits each text into `##` sections, compares them three ways, and compares the Repos
   and Work sessions tables row by row, keyed on the first column. It prints one item per
   section or row, with `take` set to `same`, `ours`, `theirs`, `conflict` or `ask`.

3. Act on each item:

   | `take`     | what the orchestrator does                                                       |
   | ---------- | -------------------------------------------------------------------------------- |
   | `same`     | nothing                                                                          |
   | `ours`     | write the outage version to that section or row of the doc                       |
   | `theirs`   | leave the doc's version                                                          |
   | `conflict` | ask Athena; write nothing to that section until she answers                      |
   | `ask`      | Merge authorizations changed on the doc side: ask Athena, never take it as given |

4. Ask about every `conflict` and `ask` item through `AskUserQuestion`, up to 4 per call,
   each question carrying the doc's text and the outage text inside it. The options are:
   keep the doc's, keep the outage's, or keep both (the doc's first). The rest of the merge
   does not wait for the answers.
5. For Merge authorizations, every line in `ours_added` came from Athena's own turn in this
   chat and lands. A change on the doc side is always a question, because an authorization
   counts only from her own turn in the chat.
6. Append `log_append` to the end of the Log tab: it opens with the line
   `Written during the Docs outage, <start> to <end>`. Log never conflicts, since both sides
   only append.
7. Add each file in `notes` as its own section in the Notes tab.
8. When every question is answered, write a Log line with the result of the merge, then
   close the outage:

   ```bash
   python3 <plugin-root>/scripts/front_pointer.py outage end
   python3 <plugin-root>/scripts/front_store.py outage-close <slug>
   ```

   `outage-close` renames the folder to `~/.ss/outage/<slug>.merged-<date>/`. Nothing
   deletes it: deleting it is Athena's call.

## Land a front

When the last PR of the front has landed and nothing waits on Athena:

1. Move the open rows of Now to Log, and write a closing line under Next.
2. Mark it landed: rename the doc to `ss front · <slug> (landed)` with `update`, or run
   `front_store.py land <slug>` for a file front.
3. Clear the pointer with `front_pointer.py clear`.

Deleting a doc or a folder is Athena's call.

## Rules every front keeps

- The goal and every decision quote Athena exactly.
- A merge authorization enters a front only from Athena's own turn in the orchestrator's
  chat, her words quoted in Merge authorizations.
- No front holds a secret, token or credential. A step that meets one writes where to find
  it, never its value.
- A front has one home: the pointer's `home=` line, set once at open. No session writes the
  other kind for that slug, except the outage folder of a doc front, which lives only until
  its merge.
- A front doc stays private. No session shares one or changes its sharing.
