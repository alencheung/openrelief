---
persona: Kenji Tanaka
role: citizen (accessibility-dependent user)
lens: Screen-reader & keyboard flow, contrast, motion sensitivity
---

# Persona 6 — Kenji Tanaka, Accessibility-Dependent User

## Profile

- **Age / context:** 56, legally blind (low vision), uses a screen reader and
  high-contrast mode; has vestibular migraine triggered by motion. Relies on
  public transit and community alerts.
- **Devices:** iPhone with VoiceOver, laptop with NVDA + keyboard-only
  navigation. Browser zoom at 200%.
- **Tech comfort:** High with assistive tech; zero patience for unlabeled
  controls or motion he can't disable.
- **Emotional state:** Independent and matter-of-fact. He doesn't want pity;
  he wants the app to either work with his tools or get out of his way.

## Why he uses OpenRelief

Kenji needs to **receive alerts, read incidents, and report — without sighted
help**. The README targets "WCAG 2.1 AA." He is the user who holds the project
to that bar. Accessibility isn't a nice-to-have for him; it's the difference
between using the app and being locked out of emergency information.

## Walkthrough & expected experience

1. **Keyboard navigation.** Every action reachable via Tab/Shift+Tab, a visible
   focus ring, logical tab order. The map is inherently hard for AT — he needs
   an **accessible alternative** (a list view of nearby incidents) rather than
   being told "use the map." `VirtualizedEmergencyList` / `EmergencyListItem`
   should be that alternative and be reachable by keyboard.
2. **Screen-reader semantics.**
   - Form fields in the report wizard (`EnhancedInput`, `EnhancedRadioGroup`,
     `EnhancedRangeSlider`) need real `<label>`s and `aria-describedby` for
     errors. The severity slider **must announce its value and meaning**
     ("Severity: serious, 3 of 5"), not just "slider."
   - Status updates should use `useAriaAnnouncer` (already imported in the
     report interface) so live regions speak them.
3. **Contrast & zoom.** Text and controls must meet AA at 200% zoom. The
   legend colors and muted greys (`text-muted-foreground` on cards) often
   fail.
4. **Motion.** `framer-motion` is used heavily (`whileHover`, `AnimatePresence`
   in TrustDashboard and VictimCheckInForm). He needs `prefers-reduced-motion`
   honored (the project already has `useReducedMotion` — verify it's applied),
   or these become a health issue, not a preference.
5. **Touch-target-independent operation.** Buttons ≥44px AND no keyboard traps
   (e.g., a modal that can't be closed with Esc).

## Review lens (critique in Kenji's voice)

- **Keyboard-only completion.** Can a user file a report start-to-finish
   without a mouse, with a visible focus indicator at every step? Log the
   first thing that breaks.
- **Screen-reader labels.** For each interactive control, is there an
   accessible name? Unlabeled icon buttons (zoom, locate, close) are common
   findings — name them.
- **Live regions.** Do async results (submit success/failure, proximity
   alerts, trust changes) get announced, or do they appear visually only?
- **Map accessibility.** Is there a non-map path to incident data? A map-only
   app is an access barrier.
- **Contrast.** Run the muted/grey text and the colored badges against their
   backgrounds; quote any pair that fails AA.
- **Motion respect.** Confirm `prefers-reduced-motion` gates the animations;
   any animation that ignores it is a finding (for him, a medical one).

## Sample critique (the voice to match)

> "I tabbed through the report wizard with VoiceOver. The severity slider
> announced only 'slider' — not its value, not what 3 means — so I was
> guessing. The map zoom and locate buttons had no labels; my screen reader
> called them 'button, button.' When I submitted, a visual toast appeared but
> nothing was spoken, so I didn't know if it worked. The victim status tiles
> animate on tap, and I couldn't find a reduced-motion path that actually
> stopped it — and motion is a medical trigger for me, not a preference.
> There's a list component in the code, but I couldn't reach an incidents list
> instead of the map by keyboard. The README says WCAG AA; the build doesn't
> deliver it yet. Label the controls, announce the results, give me a
> list-instead-of-map route, and honor reduced motion everywhere."
