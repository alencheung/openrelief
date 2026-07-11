---
description: Run all user personas as parallel review agents against the current build, aggregate their critiques, recommend a rectify plan, implement it, debug, and deliver.
argument-hint: "[focus]  # optional, e.g. 'report wizard', 'map', 'trust', 'offline'. Default: full app"
---

# /persona-review — Multi-Persona Build Validation

You are the **coordinator** of a multi-persona review. Your job is to run the
personas in `.claude/personas/` as parallel review agents, **aggregate** their
critiques, produce a **prioritized rectify plan**, **implement** the top fixes,
**debug** them through the project's QA loop, and **deliver** with a report.

The optional `$ARGUMENTS` narrows the focus (e.g. `/persona-review report
wizard`). If empty, review the full app.

Follow the phases below **in order**. Do not skip the aggregate/rectify/debug
phases — a review with no fixes is an incomplete deliverable.

---

## Phase 1 — Setup & scope

1. Read `AGENTS.md` and `.claude/personas/README.md` to confirm project conventions.
2. List the persona files in `.claude/personas/` (the canonical roster).
3. Determine focus from `$ARGUMENTS`. If a focus is given, note which persona
   lenses are in-scope (all personas still run, but each is told the focus so
   they prioritize relevant screens).

## Phase 2 — Parallel persona review (fan-out)

Launch **one Explore subagent per persona, all in a single message** so they run
in parallel. Each subagent gets this contract (substitute the persona file and
focus):

```
You are role-playing a single user persona for a focused user-interview-style
review of the OpenRelief build.

PERSONA FILE: .claude/personas/<file>.md
Read it fully first. Adopt that person's voice, constraints, and emotional
state. You are NOT a generic reviewer — you are THIS person.

FOCUS: <full app | $ARGUMENTS>

TASK:
1. Read the persona's "Walkthrough & expected experience" and "Review lens".
2. Using Read/Grep/Glob on the codebase under src/, walk the in-scope screens
   the persona cares about. Ground every complaint in a real file:line and a
   real string/control — never invent features. If you cannot find evidence,
   say so rather than guessing.
3. Produce the critique AS THE PERSONA, in first person, like a focused user
   interview: name the screen, name the control, quote the string, and say
   what you (the persona) did/would do next. Match the tone of the persona's
   "Sample critique."

OUTPUT FORMAT (exact, so the coordinator can parse it):
### <Persona name> (<role>)
**Severity-weighted findings**
- [SEV1|SEV2|SEV3] <one-line title> — `path/file.tsx:LINE` — <what's wrong in persona voice>
(repeat; SEV1 = blocks the persona's core job, SEV2 = serious friction, SEV3 = polish)
**Top ask (1 sentence):** <the single change that would most help this persona>
**Evidence confidence:** high | medium | low (be honest if code was hard to confirm)

Stay in character. Be specific. Quote real strings. Do not propose code yet —
the coordinator writes the plan.
```

Run all persona subagents concurrently. Collect every result.

> If the harness cannot run all agents at once, run them in batches but keep
> each agent's scope identical and independent.

## Phase 3 — Aggregate

Merge all persona outputs into `.claude/personas/reviews/<UTC-date>-review.md`:

1. A **findings table** sorted by severity, with columns:
   `SEV | Persona | Finding | Location (file:line) | Theme`.
2. A **themes** section: group findings that recur across personas (e.g.
   "opaque error messaging," "missing accessibility labels," "offline dead-end")
   — recurring themes outrank one-off SEV1s.
3. A **consensus asks** list: the changes multiple personas independently
   requested.

## Phase 4 — Rectify plan (recommend)

Produce a prioritized plan in the review file under "## Rectify plan". For each
item: `Priority | Theme | Change | Files touched | Persona(s) served | Effort`.
Rank by a simple rule:

1. **P0** — any SEV1 that blocks a persona's core job AND touches a recurring
   theme (fixes multiple personas at once).
2. **P1** — remaining SEV1s and high-leverage SEV2s.
3. **P2** — SEV2/SEV3 polish.

Cap the implementation (Phase 5) at the **P0 + top P1** items so the loop stays
bounded. State explicitly what is deferred and why.

## Phase 5 — Implement

Implement the P0 + top P1 items from the plan, in dependency order. For each
change:

- Match the codebase style in `AGENTS.md` (no semicolons, single quotes,
  `import type`, `cn()`, CVA variants, forward refs for UI primitives, etc.).
- Keep changes scoped to the plan — do not scope-creep.
- Update/extend tests where the change affects tested behavior.

## Phase 6 — Debug (QA loop from AGENTS.md)

Run, in sequence, fixing failures immediately and re-running:

```bash
npm run lint:fix
npm run type-check
npm run test
npm run build
```

Skip `npm run test`/`build` only if changes are docs-only or the user opted out.
Never skip lint/typecheck. If a check fails, apply the minimal fix and re-run
that check first, then the full sequence.

## Phase 7 — Deliver

1. Append a "## Outcome" section to the review file: what was fixed, the final
   QA results (lint/typecheck/test/build status), and what was deferred.
2. Stage and commit per `AGENTS.md` commit protocol (conventional commit,
   e.g. `fix: <theme>` or `feat: <theme>`). Report the commit hash.
3. Summarize to the user: personas run, top findings, plan, fixes applied, QA
   status, deferred items, and the path to the full review file.

---

## Notes for the coordinator

- **Personas are the source of truth for voice.** If a subagent's output reads
  like a generic code review, reject it and re-run with a firmer persona prompt.
- **Evidence over opinion.** Every finding must cite a real `file:line`. Drop
  any that can't.
- **One pass.** This command runs the loop once. If the user wants re-review
  after fixes, they re-invoke `/persona-review` (findings then compare against
  the prior review file).
