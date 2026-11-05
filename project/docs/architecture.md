# ProofRoom system design

## Components
~~~mermaid
flowchart LR
  H[Operator browser] -->|Switch account login| U[ProofRoom local server]
  U -->|Session authentication| S[Real Switch Core]
  S --> P[(Isolated PostgreSQL)]
  U -->|Locked transactions| R[Recovery engine]
  R --> E[(Incident state and archive on A:)]
  S <-->|Active bridge| D[Discord room]
  S <-->|Controller protocol| C[Headless controller on A:]
  C --> A[Diagnostic and review Codex agents]
  A -->|CLI evidence and actions| R
~~~

These connections were exercised in the live controlled recovery on November 5.
The original UI-only rehearsal remains available separately. Controller socket
reconnections are a documented reliability issue; no soak-test claim is made.

## State and decision flow
Observed -> Proposed -> Reviewed -> Operator approved -> Executed -> Processed -> Verified.
Execution and verification are separate. A successful action is not proof of recovery.
The action allowlist currently contains only resume-worker for a controlled local fixture.

## Authenticated operator approval
The UI authenticates against the real Switch Gateway. The local application creates
an HttpOnly, SameSite=Strict session and obtains approval identity from the server
session, never from a submitted actor field. Approval names the proposal and
evidence fingerprint. Changed observations cause execution/approval refusal.

This authenticates the account that used the UI; it does not prove a human personally
clicked it or prevent a process with the account password from signing in.
The CLI and local state files remain editable by their filesystem owner. Production
isolation would need separate OS identities and an execution broker. These limits
remain part of the submission explanation.

## HTTP boundary
Loopback-only server. Explicit Host and Origin checks. Static-asset allowlist.
Bounded JSON request bodies. CSP with no external scripts, fonts, or connections.
Discord tokens stay in request memory and are forwarded to the local Switch
integration API. Neither browser storage nor evidence exports contain those tokens.
Switch stores integration credentials in its encrypted database.

## Storage
Incident writes hold a filesystem lock and use a temporary file plus atomic rename.
Concurrent writers fail clearly. Interrupted processes may leave a lock requiring
inspection; do not delete it while an operation is active.
A new exercise archives the previous state before replacement.
Evidence export from the UI writes directly to the A:-based deliverables directory.

## Tested
Missing authentication; wrong credentials; wrong Origin/Host; missing review and
approval; forged actor ignored; changed evidence; replayed execution; verification
before processing; history preservation; static file isolation; persistence.
Browser exercise: login -> local diagnostic -> local review -> operator approval
-> resume worker -> process queue -> verify recovery.
Mobile width 390: measured document width equals client width, without horizontal overflow.

Live exercise: diagnostic CLI inspection and proposal -> independent reviewer
inspection/review -> human UI approval -> diagnostic CLI execute/work -> reviewer
CLI inspect/verify. Persisted result: 3/3 processed, queued=0, recovered=true.
Sanitized room transcript and state: A:/FlipTheSwitch/evidence/live-agent-recovery.json.
