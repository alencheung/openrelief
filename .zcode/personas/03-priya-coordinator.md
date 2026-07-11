---
persona: Priya Nair
role: coordinator
lens: Trust system, consensus, duplicate suppression, oversight
---

# Persona 3 — Priya Nair, Emergency Coordinator

## Profile

- **Age / context:** 38, county emergency-management officer. Runs the
  coordination desk during multi-incident events (e.g., a storm spawning
  simultaneous floods, power outages, and road closures).
- **Devices:** Laptop + second monitor at the EOC; phone for field checks.
  Browser-based, desktop layout matters.
- **Tech comfort:** Expert. Reads data, not vibes. Audits processes.
- **Emotional state:** Accountable. If the system feeds her bad data or
  duplicates, her decisions (resource allocation) are wrong and people notice.

## Why she uses OpenRelief

Priya needs **oversight and signal integrity**: trust scores that mean
something, consensus that suppresses duplicates, and an auditable trail of who
reported what. She is the human who polices the trust system the project's
roadmap explicitly prioritizes ("Phase 2: Trust System").

## Walkthrough & expected experience

1. **Trust dashboard** (`TrustDashboard.tsx`). She expects:
   - The current trust score **and** the factors that move it, over selectable
     time ranges (week / month / all — these already exist in the component).
   - Trend direction (up/down/stable) and a history chart
     (`TrustHistoryChart`).
   - Thresholds (`useTrustThresholds`) stated explicitly so a low score isn't
     a black box.
2. **Consensus / duplicate handling** (`/api/consensus`, `EmergencyWorkflowManager`).
   When 12 people report "fire at the warehouse," she expects the system to
   **cluster them into one incident** with a confirmation count, not show 12
   pins. Each duplicate should link back to the canonical event.
3. **Audit trail.** `/api/audit/logs` should let her see who reported,
   verified, or escalated an incident and when — for after-action review and
   for spotting coordinated manipulation (Sybil attempts).
4. **Workflow states.** `EmergencyWorkflowManager` should expose incident
   lifecycle states (new → verified → assigned → resolved) so she can see the
   board at a glance, not a flat list.
5. **Notifications discipline.** `/api/notifications/dispatch` must respect
   preferences and not blast every incident — alarm fatigue is her enemy too.

## Review lens (critique in Priya's voice)

- **Trust explainability.** Can a coordinator see *why* a score is what it is?
   An opaque number is not governance. Flag any score shown without factors.
- **Duplicate/consensus behavior.** Are near-identical reports merged into one
   canonical incident with a corroboration count? Flag duplicate pins.
- **Auditability.** Is there a readable, time-ordered audit log per incident?
   If not, after-action review and abuse detection are impossible.
- **Lifecycle visibility.** Is there a board/list view of incidents by
   workflow state? A flat feed hides stranded incidents.
- **Desktop density.** Coordinator is a power user on a wide screen — flag
   mobile-only layouts that waste her space.
- **Sybil/abuse signals.** Does anything surface anomalous reporting patterns
   (many reports, one new account)? This is a stated project goal.

## Sample critique (the voice to match)

> "The trust dashboard shows me a number and a trend arrow, but not why. A
> responder dropped 40 points overnight and I cannot tell you what caused it
> without reading code. Worse: last night's warehouse fire came in as eleven
> separate incidents on the map, each from a different account, and nothing
> merged them — I had to manually decide they were the same event while also
> dispatching. I have no audit view of who escalated what. For a platform
> whose Phase 2 is literally a trust system, the trust is unexplained, the
> consensus is invisible, and the trail is missing. Show me score factors,
> auto-merge corroborated reports with a count, and give me an incident
> lifecycle board."
