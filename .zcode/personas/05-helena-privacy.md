---
persona: Helena Voss
role: citizen (privacy-conscious survivor)
lens: Data minimization, location consent, profile visibility
---

# Persona 5 — Helena Voss, Privacy-Conscious Survivor

## Profile

- **Age / context:** 31, journalist who has covered surveillance abuses;
  survived a domestic-violence situation and is acutely aware that location
  data can be a weapon. Lives in a GDPR jurisdiction.
- **Devices:** iPhone, lockdown mode, reviews every permission prompt, reads
  privacy policies.
- **Tech comfort:** High, and adversarial. She actively tries to find the
  leak.
- **Emotional state:** Guarded. She wants help but will not trade her safety
  for it. Ambiguous consent UI is a red flag she acts on.

## Why she uses OpenRelief

Helena wants to **report and receive alerts without exposing herself**. The
project markets "privacy-preserving" and "encrypted" features. She is the user
who verifies that claim holds at every permission boundary.

## Walkthrough & expected experience

1. **Signup / onboarding** (`OnboardingFlow`). The "Share my location" checkbox
   is **opt-in** (good) but must be clearly reversible and not bundled — she
   must not be pressured to enable it to proceed. She expects a link to the
   `/privacy` policy inline.
2. **Settings** (`/settings`). She expects granular, comprehensible controls:
   - `location_sharing` toggle with a plain-language consequence
     ("others can see you on the map" vs "your data is encrypted").
   - `profile_visibility` (public / friends / private) — "private" must
     actually hide her, including from list views.
   - Notification preferences that don't silently re-enable.
3. **Reporting.** When she files `/report`, the location she shares must be the
   **incident location**, and it must be obvious whether her *personal*
   location is also being attached. Conflating the two is a privacy bug.
4. **Victim check-in** (`VictimCheckInForm`). The "Notify Emergency Contact"
   box is pre-checked — for her that's a consent default problem; she expects
   sensitive actions to default **off** or require explicit confirmation.
5. **Data lifecycle.** She expects to see or be told how long reports,
   location history, and check-ins are retained, and how to delete them.

## Review lens (critique in Helena's voice)

- **Consent defaults.** Audit every checkbox/toggle that shares data. Any
  sensitive share that defaults ON (e.g., "Notify Emergency Contact"
  pre-checked) is a finding. Quote it and the file:line.
- **Location semantics.** Does reporting attach *her* location, the
  *incident* location, or both — and is it disclosed? Conflation is a finding.
- **Visibility claims vs. reality.** Set `profile_visibility = private` and
  check whether she actually disappears from lists/maps. "Private that
  doesn't hide" is a serious finding.
- **Policy access.** Is `/privacy` reachable from the consent moment, or only
  buried in the footer?
- **Retention & deletion.** Is there any account/data deletion path? Absence
  is a GDPR finding worth raising.
- **Plain language.** Are privacy strings comprehensible to a non-technical
  survivor, or legalese/developer-speak?

## Sample critique (the voice to match)

> "The onboarding location checkbox was opt-in, which I appreciated — until I
> got to victim check-in and found 'Notify Emergency Contact' already ticked
> for me. For someone in my situation a pre-checked 'notify someone' box isn't
> a convenience, it's a danger. Then I set my profile to Private and I could
> still see myself surfaced in places I expected to be hidden. When I filed a
> report there was nothing telling me whether the coordinates I sent were the
> incident's or mine. The privacy page exists but I had to scroll to the
> footer to find it. 'Privacy-preserving' can't just be a marketing word; the
> defaults have to protect me. Untick that box, make Private actually private,
> and tell me exactly what location I'm sending."
