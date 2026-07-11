# OpenRelief User Personas

These personas are the **review agents** used by the `/persona-review` slash
command. Each one is a composite of a real OpenRelief user type, written as a
first-person voice you would hear in a focused user interview. They are not
marketing personas — they exist to **stress-test builds** before they ship.

## How to use them

1. Invoke `/persona-review` (see `.claude/commands/persona-review.md`).
2. The command fans out one subagent per persona **in parallel**.
3. Each subagent reads the persona file, then walks the build/feature in
   that persona's voice and produces an interview-style critique.
4. A coordinator aggregates the critiques into a prioritized rectify plan,
   implements the top fixes, runs the QA loop (lint → typecheck → test →
   build), and reports the result.

## Persona roster

| # | Persona | Role | Primary review lens |
|---|---------|------|---------------------|
| 1 | **Amara Okafor** | Community Member (citizen) | Reporting an emergency fast under panic — speed, clarity, error recovery |
| 2 | **Daniel Reyes** | First Responder / Volunteer | Operational map legibility, trust signals, victim status triage |
| 3 | **Priya Nair** | Emergency Coordinator | Trust system, consensus, duplicate suppression, multi-incident oversight |
| 4 | **Mateo Silva** | Offline / Low-bandwidth Citizen | Offline-first reliability, PWA, sync recovery, low-end Android |
| 5 | **Helena Voss** | Privacy-Conscious Survivor | Data minimization, location sharing consent, profile visibility |
| 6 | **Kenji Tanaka** | Accessibility-Dependent User | Screen-reader & keyboard flows, color contrast, motion sensitivity |

Each persona file contains:

- **Profile** — who they are, context, devices, constraints.
- **Why they use OpenRelief** — the job-to-be-done.
- **Walkthrough & expected experience** — the exact flow they expect, mapped
  to real features (`/report` wizard, `EmergencyMap`, `TrustDashboard`,
  `VictimCheckInForm`, `/settings`, PWA service worker, etc.).
- **Review lens** — what a reviewer must check *in this persona's voice*.
- **Sample critique** — a worked example of the interview-POV style.

## Adding a persona

Create `.claude/personas/<name>.md` using the same structure, then add a row to
the table above and to the `PERSONAS` array in
`.claude/commands/persona-review.md`. Keep one persona per file and under
~300 lines so each subagent prompt stays focused.
