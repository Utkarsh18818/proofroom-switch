# Post-event evidence hardening - November 14, 2026

These changes follow the November 7 deadline. They are separate from the submitted
November 5 run and source snapshot. No new cloud agent execution, real-service
integration, prize eligibility or performance gain is claimed.

## Fixed observations

1. Aggregate-only approval hashes accepted replacement delivery IDs with unchanged
counts. Version 2 hashes bind observations plus sorted delivery IDs, statuses and
delivery timestamps. Older proposals need new evidence, review and approval.
2. A saved recovered flag could outlive the state it described. Verification now
binds an evidence hash. Read-time verificationStatus withdraws success when state
changes; the original record remains inspectable. Legacy live results need recheck.
3. Public recordings were accepted by success flag alone. Validation now checks
actual worker state, delivery uniqueness/status, execution and the saved verification
observation. Inconsistent recordings return HTTP 503. Historical bytes are preserved.

UI refresh compares evidence hashes and verification status even with unchanged
event counts. These are cooperative checks, not protection against a filesystem
owner who can alter all records or code.

## Verification

Baseline: 19 passing tests. Two added regressions failed on original source:
same-count replacement was accepted and duplicates were certified. After fixes,
26 tests pass using temporary JSON storage, actual HTTP, CLI and original recorded
evidence. Authentication uses a labeled test gateway, not a fresh Switch agent run.

The original public reviewer deployment loaded after Render wake-up on November 14.
This branch is not deployed; the submitted version and evidence remain separate.

## Next milestone

A real-service adapter, independently privileged execution broker, and fresh native
Switch agent run with an actual operator approval. Never synthesize a human approval
for unattended execution. These remain future work, not completed features.
