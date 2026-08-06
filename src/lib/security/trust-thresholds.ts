/**
 * Shared trust thresholds — single source of truth for client and server.
 *
 * Previously the client store (`src/store/trustStore.ts`) and the server
 * attack-resistance config (`trust-integration-helpers.ts`) defined the
 * "minimum score to dispute" independently (0.5 vs 0.6), so a user could
 * submit a dispute through the UI that the consensus engine would then
 * ignore. This module centralizes that value.
 *
 * Import from here instead of hardcoding a threshold; the readiness harness
 * greps for the old divergent literals to catch regressions.
 */

/** Minimum trust score for a user's vote to count toward consensus. */
export const CONSENSUS_VOTE_THRESHOLD = 0.6

/** Minimum trust score for a user's report to be accepted (not gated by vote). */
export const REPORTING_TRUST_THRESHOLD = 0.3

/** Minimum trust score to confirm an event. */
export const CONFIRM_TRUST_THRESHOLD = 0.4

/** Minimum trust score to dispute an event (kept aligned with the vote threshold). */
export const DISPUTE_TRUST_THRESHOLD = CONSENSUS_VOTE_THRESHOLD
