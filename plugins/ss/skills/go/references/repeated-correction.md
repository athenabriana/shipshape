# Repeated correction

Step 4 of `/ss:go` (watch for a repeated correction) reads this page when the same class
of correction lands a second time in one session, before asking.

A **correction** is a fix the person asks for on work an agent did here: "no, use X",
"that's wrong, do Y", an edit they undo. Its **class** names the mistake, so a second
occurrence reads as the same one. While the router is on, keep the classes of this
session's corrections in mind.

When the same class lands a second time in one session, ask through the question tool
whether to run the `learn` playbook on it, which picks the layer that holds it: a check, a
review rule (through `/ss:review-setup`) or a project fact.
The question names the class and both occurrences; "Learn it" is the recommended pick,
and "Not now" the other option. Ask once per class, after the current step finishes, and
go on with the task either way.

- **On a yes**, run the `learn` playbook once the current task reaches its endpoint or the
  person says to switch. A check it picks lands on its own branch from the base, never on
  the branch of the task that surfaced it.
- **On a no**, drop the class for the rest of the session.
- **In a work session**, the question goes to the orchestrator like any other, as a
  `Correction repeated:` line naming the class and its occurrences.

Nothing about a correction runs unasked: the router offers, the person decides.
