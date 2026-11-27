# Decision sheet: several decisions in one inline form

A _decision sheet_ is one inline form in the chat where each decision is a block: a short
context paragraph, then the question with its options. The person reads the facts right
above each choice, answers them all, and presses **Continue** once. This page says when to
use one, how to build and parse it, how a work session sends one, and what to do when the
visual tool is missing. It ends with a complete example to copy.

## When to use one

- **Two or more decisions at once.** One sheet holds them all, so the person decides them
  together, each with its own facts.
- **One decision whose context needs more than a line.** The paragraph above the question
  carries what a dialog's question line cannot.

Use the question tool (`AskUserQuestion`) instead in two cases:

- **A single simple pick**, whose facts fit in the question and the option descriptions.
- **A merge ask, always.** A merge is Athena's word in this chat, so it keeps one shape:
  the question tool, by the merge rule in `<plugin-root>/hooks/operating-context.md`. A
  sheet never carries a merge, a force-push or a deploy.

A decision sheet replaces writing a Claude Docs doc and then asking separately. A doc stays
the form for text the person will keep or edit, by
`<plugin-root>/references/show-for-review.md`. When the decision rests on something the
person has to see, show that first, then the sheet.

## Build the block

Every decision is one block, in this order:

1. **Context.** Two or three lines in plain words: the facts this choice needs and what
   each pick changes. Nothing else.
2. **Question.** Asked as a question from you, not a field label: "Where should the status
   view live?", not "Surface:".
3. **Options.** Two to four. The recommended pick comes first, and its subtitle says so
   ("Recommended: ..."). Each subtitle says what that pick does or costs.
4. **Other**, optional, when a reasonable answer is missing from the list.

After the last block comes one notes textarea, then **Skip** and **Continue**. The header
reads "[subject] details", where the subject is the thing being decided: "Status view
details".

Draw it with the desktop app's inline visual tool, following its `elicitation` guidance:

1. Load the tools with `ToolSearch` when they are deferred.
2. Call `mcp__visualize__read_me` with `modules: ["elicitation"]`, once per session.
3. Call `mcp__visualize__show_widget` with the form.

Vary the input format by the options, as that guidance says: cards for options with a
subtitle, plain pills for short labels (with "(Recommended)" in the first pill's label,
since a pill has no subtitle), a date input for a date. Give each option a `data-value`
that is its id, so the answer comes back clean. Put the context paragraph inside the
block's `.elicit-group`, above the `.elicit-question` label.

## Write the context lines

The context follows `<plugin-root>/references/voice.md` and
`<plugin-root>/references/doc-style.md`:

- **Plain words, short sentences.** The facts the choice rests on, in the order the person
  needs them.
- **Say what each pick changes**, when the option subtitles cannot hold it.
- **Name each thing once**, plain name first, then its identifier in code font when it has
  one.
- **No recommendation in the context.** The recommendation lives in the first option's
  subtitle, so the person reads the facts before your lean.

## Read the answer

The answer arrives as the person's next message, on one line:

```
Status view details — Status surface: pane · Packaging: ss-pane · Notes: start read-only
```

1. **Split it.** Take what follows the header, split on `·`, and split each part at its
   first `: `. Each label is the block's `data-name` in sentence case (`status_surface`
   becomes `Status surface`).
2. **Map each value back.** A value is the option's `data-value`, or the person's own
   words when they picked **Other**. A long note may come as `(N chars — see below)`, with
   the full text under `--- Full content ---`.
3. **Act on what came back.** Each picked value is the person's decision for that block. A
   block missing from the line is still open: ask it again on its own, through the
   question tool.

When the person presses **Skip**, the message reads
`(Skipped the form — proceed with defaults or ask me in plain text)`. A skip decides
nothing: take no recommended pick as chosen. Say in one line which decisions are still
open and what waits on them.

When an **Other** answer or the note is a question, answer it in plain text. Keep the
answers the person gave, and do not draw the same sheet again: ask only what the
explanation left open, once they reply.

## Send it from a work session

A work session has no chat with Athena, so it does not draw the sheet. It sends the sheet's
content to the orchestrator as one `ss.ask` JSON in the `SendMessage`, by
`<plugin-root>/references/front-contract.md`, then ends the turn. The orchestrator draws
the sheet in its own chat, and the assistant does the same when an orchestrator passes the
sheet on to it. The context, the questions, the options and the pick are drawn word for
word, translated only into Athena's language.

The JSON is `ss.ask` version 1 with `sections`, one per decision:

```json
{
  "type": "ss.ask",
  "v": 1,
  "id": "status-view",
  "subject": "Status view",
  "sections": [
    {
      "id": "status_surface",
      "header": "Surface",
      "context": "Desktop shows each session's own status, but nothing shows every front at once. A mod pane stays beside the chat and reaches the other sessions. An inline status card works today but scrolls away.",
      "question": "Where should the status view live?",
      "options": [
        {
          "id": "pane",
          "label": "Mod pane",
          "description": "Recommended: pinned beside the chat, live. Early-access API.",
          "recommended": true
        },
        {
          "id": "card",
          "label": "Inline status card",
          "description": "Works today, no build. A snapshot that scrolls away."
        }
      ],
      "other": true
    },
    {
      "id": "packaging",
      "header": "Packaging",
      "context": "The mod API is early access and changes between releases. In its own plugin, a break cannot unload any ss skill.",
      "question": "How should the pane ship?",
      "options": [
        { "id": "ss-pane", "label": "Own plugin", "recommended": true },
        { "id": "inside-ss", "label": "Inside ss" }
      ]
    }
  ],
  "notes": true
}
```

- **`sections`**: one object per decision, in the order to ask them, the highest stakes
  first. Its `id` becomes the block's `data-name`, so the answer line names it.
- **`context`**: the two or three lines drawn above the question.
- **`options`**: the recommended one first, with `"recommended": true`.
- **`other`** and **`notes`**: `true` adds the **Other** choice to a block, or the notes
  textarea to the sheet.
- **No `authority`.** An `ss.ask` with `"authority": "merge"` is a single question, never
  a section of a sheet.

The orchestrator sends the answer back as Athena's answer line, quoted as it arrived, and
the work session reads it by "Read the answer" above.

## When the visual tool is missing

When `mcp__visualize__show_widget` is not there, ask the same decisions through
`AskUserQuestion`, at most four per call, the highest stakes first. Put each block's
context at the start of its `question`, then the question itself, so the dialog still
carries the facts. The recommended pick stays first, with "(Recommended)" in its label.
More than four decisions go in a second call after the first is answered.

## Example sheet

A sheet with two decisions and a notes field. Copy it whole into
`mcp__visualize__show_widget`, then change the subject, the blocks and the options.

```html
<h2 class="sr-only">
  A form with two decisions about the status view, each with its context, and a notes field.
</h2>
<form class="elicit">
  <div class="elicit-header">
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path
        d="M11.586 2a1.5 1.5 0 0 1 1.06.44l2.914 2.914a1.5 1.5 0 0 1 .44 1.06V16.5a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.492-1.347L4 16.5v-13A1.5 1.5 0 0 1 5.5 2zM5.5 3a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V7h-2.5A1.5 1.5 0 0 1 11 5.5V3zm7.04 10.304a.5.5 0 0 1 .92.392c-.295.69-.871 1.304-1.66 1.304-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.233-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696l.034-.067a.5.5 0 0 1 .886.067c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696m0-4a.5.5 0 0 1 .92.392c-.295.69-.871 1.304-1.66 1.304-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.233-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696l.034-.067a.5.5 0 0 1 .886.067c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696M12 5.5a.5.5 0 0 0 .5.5h2.293L12 3.207z"
      />
    </svg>
    <span>Status view details</span>
  </div>
  <div class="elicit-body">
    <div class="elicit-group">
      <p style="margin:0 0 8px; font-size:13px; line-height:1.6; color:var(--text-secondary)">
        Desktop shows each session's own status, but nothing shows every front at once. A mod pane
        stays beside the chat and reaches the other sessions. An inline status card works today but
        scrolls away.
      </p>
      <label class="elicit-question">Where should the status view live?</label>
      <div class="elicit-pills" data-name="status_surface" data-multi="false">
        <button
          type="button"
          class="elicit-pill"
          data-value="pane"
          style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:180px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"
        >
          <i class="ti ti-layout-sidebar-right" style="font-size:20px" aria-hidden="true"></i>
          <span
            ><span style="font-size:13px; font-weight:500">Mod pane</span><br /><span
              style="font-size:11px; color:var(--text-muted)"
              >Recommended: pinned, live</span
            ></span
          >
        </button>
        <button
          type="button"
          class="elicit-pill"
          data-value="card"
          style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:180px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"
        >
          <i class="ti ti-message-2" style="font-size:20px" aria-hidden="true"></i>
          <span
            ><span style="font-size:13px; font-weight:500">Inline status card</span><br /><span
              style="font-size:11px; color:var(--text-muted)"
              >Works today, scrolls away</span
            ></span
          >
        </button>
        <button type="button" class="elicit-pill" data-value="Other" data-other>Other</button>
      </div>
      <input
        type="text"
        class="elicit-other"
        data-for="status_surface"
        placeholder="Where would you put it?"
        hidden
      />
    </div>
    <div class="elicit-group">
      <p style="margin:0 0 8px; font-size:13px; line-height:1.6; color:var(--text-secondary)">
        The mod API is early access and changes between releases. In its own plugin, a break cannot
        unload any ss skill.
      </p>
      <label class="elicit-question">How should the pane ship?</label>
      <div class="elicit-pills" data-name="packaging" data-multi="false">
        <button type="button" class="elicit-pill" data-value="ss-pane">
          Own plugin (Recommended)
        </button>
        <button type="button" class="elicit-pill" data-value="inside-ss">Inside ss</button>
      </div>
    </div>
    <div class="elicit-group">
      <label class="elicit-question">Anything I should know before I start?</label>
      <textarea class="elicit-textarea" data-name="notes" placeholder="Optional"></textarea>
    </div>
  </div>
  <div class="elicit-footer">
    <button type="button" class="elicit-skip">Skip</button>
    <button type="button" class="elicit-submit">Continue</button>
  </div>
</form>
```

Its answer line reads, for example:

```
Status view details — Status surface: pane · Packaging: ss-pane · Notes: start read-only
```
