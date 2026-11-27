# The fact layer: one project fact as an approved line

Reached from `SKILL.md`'s layer pick when the lesson is a choice, a trap or a constraint the
code cannot show, and no check can hold it. It proposes one project fact as an exact line,
gets the person's approval, and merges it into the facts file. The contract is
`<plugin-root>/references/project-facts.md`: which file, the filter, the form, and who
writes. Read it once before the first step.

## Steps

The steps run in order. Steps 1 to 5 only read, and the file changes only in step 6.

1. **Find the facts file.** Run the growth check on the repo root:

   ```bash
   python3 <plugin-root>/scripts/check_project_facts.py REPO
   ```

   Its `facts_file` is the file to write, and `null` means none exists yet: create
   `AGENTS.md`. Its `line_count` is the size of the facts section.

2. **Apply the filter.** The fact goes in only when the code cannot show it, it will matter
   again, and getting it wrong is costly. When it fails any of the three, decline it, tell
   the person which test it failed, and stop. A review rule is the review rule
   layer's, through `/ss:review-setup`.

3. **Draft one short line.** State what holds now, in plain words, under 160 characters.
   Leave out status, history, PR numbers, and dates.

4. **Find a line on the same ground.** Read the `## Project facts` section. When a line
   already covers the same ground, the proposal merges the new fact into that line or
   replaces it, and the question quotes both the old line and the new one.

5. **Consolidate past the cap.** When `line_count` is over 60, the first proposal is a
   consolidation: the lines that merge or go, and the shorter section that results. Ask
   that question first, and the new fact after it.

6. **Show where it lands, then ask.** First render the `## Project facts` section as a
   before and after, with the new or merged line marked, as an inline visual
   by `<plugin-root>/references/show-for-review.md`. Then ask one `AskUserQuestion` with
   the exact line quoted in the question, and these options:

   | option  | what it does                                        |
   | ------- | --------------------------------------------------- |
   | Approve | writes the line as quoted (recommended)             |
   | Reword  | takes the person's wording, then asks again with it |
   | Drop    | writes nothing                                      |

   On **Approve**, write the line under `## Project facts`, creating that heading once when
   the file has none. On **Drop**, leave the file as it was.

## In a work session

In a work session of `/ss:orchestrate`, the question in step 6 goes to the orchestrator through
`SendMessage`, as `<plugin-root>/references/front-contract.md` describes: the before and
after as a rendered file in the notes folder, the exact line,
the line it merges with or replaces, and the three options with Approve first. Then end the
turn. Write the line only after the person's yes comes back, on the front's own branch.

## Report

Say in one line what changed: the file, and the line added, merged, or replaced. When the
fact was declined or dropped, say so and why.
