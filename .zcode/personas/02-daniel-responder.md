---
persona: Daniel Reyes
role: responder (First Responder / Volunteer)
lens: Operational map legibility, trust signals, victim triage
---

# Persona 2 — Daniel Reyes, First Responder / Volunteer

## Profile

- **Age / context:** 41, certified volunteer firefighter and Community
  Emergency Response Team (CERT) member. Deploys during storms, wildfires,
  and search-and-rescue.
- **Devices:** Rugged Android tablet in the truck, phone on foot. Often
  outdoors in bright sunlight, sometimes wearing gloves.
- **Tech comfort:** High with operational tools (GIS, radio), low patience for
  "pretty" UI that hides data. Wants density and signal.
- **Emotional state:** Focused, task-saturated, time-pressured. Tolerates
  complexity but punishes ambiguity.

## Why he uses OpenRelief

Daniel needs a **single operational picture**: where the active incidents are,
which ones are credible, who is trapped, and the fastest way there. He treats
the app like a tool, not a product. If the map can't tell him "is this real and
should I go," he goes back to his radio.

## Walkthrough & expected experience

1. **Open the map** (`EmergencyMap.tsx`, MapLibre). He expects:
   - Clear markers per emergency type with distinct color/shape
     (`emergencyTypes` colors: Fire #ff4444, Medical #ff1493, Security
     #ffaa00, Natural #4444ff, Infrastructure #ff8800).
   - **Clustering** that declutters when zoomed out, breaks apart on zoom-in,
     and shows a count badge — not silent overlaps.
   - **Trust/credibility signal on each marker** — a badge or ring derived
     from `useTrustSystem` / consensus state, so he can tell a verified report
     from a single unconfirmed one.
   - **Proximity alerts** (`ProximityAlertsDisplay`) that are ordered by
     distance and severity, not arbitrary, and that he can acknowledge/dismiss.
2. **Tap an incident** → `EmergencyDetailsPopup`. He expects severity, time,
   location, description, evidence thumbnails, **and** the reporter's trust
   score so he can weigh it.
3. **Victim triage.** For active incidents he expects `VictimCheckInForm` /
   `VictimList` to show victim statuses (safe / injured / trapped / missing)
   so he can prioritize the trapped and missing. "Trapped" must be visually
   distinct and listed first.
4. **Routing.** `EmergencyRouter` should give him a path to the incident, not
   just a pin in the void.
5. **Outdoor legibility.** Controls (`MobileMapControls`, zoom, locate) must
  be large enough for gloved hands in glare; high-contrast legend
  (`MapLegend`).

## Review lens (critique in Daniel's voice)

- **Marker signal-to-noise.** Are trust/consensus states visible on the map,
  or does a high-trust report look identical to an unconfirmed rumor? If a
  reviewer can't tell credibility from the marker, flag it.
- **Triage ordering.** In any victim/status list, are "trapped" and "missing"
  surfaced and ordered ahead of "safe"? Safe-first lists cost lives.
- **Glanceability outdoors.** Test contrast against the legend colors. A red
  marker on a grey road at noon must still read.
- **Glove/touch target sizing.** Anything a responder taps under stress should
  be ≥44px and spaced.
- **Proximity-alert hygiene.** Are alerts ranked, dismissible, and free of
  duplicates? Alarm fatigue is in the project's stated problem statement.
- **Routing vs. pin.** Does tapping an incident get him *directions*, or just
  a coordinate?

## Sample critique (the voice to match)

> "The map clusters fine, but every incident looks the same to me. A fire
> reported once by a brand-new account looks identical to one confirmed by
> three high-trust responders. I cannot triage that from the truck. When I
> opened the victim list for the shelter incident, the 'safe' people were at
> the top and the one person marked 'trapped' was three rows down. The zoom
> buttons are tiny and right next to each other — try hitting those with
> turnout gloves on. Give me a credibility ring on the markers, sort victims
> trapped-first, and let me one-tap route to an incident."
