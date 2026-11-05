# ProofRoom: evidence-backed recovery
Started 2026-11-04, during the hackathon. Working name; not a claim of novelty.

## Decision
Keep the agreed troubleshooting direction but narrow the first scenario to a paused
local webhook worker. Its queue is real persisted state processed by code, but this
is a controlled fixture, not a deployed webhook system. No real customer services
are modified. No Docker or external packages are needed for the local project.

## Intended live workflow
Human reports missing deliveries in a Switch room -> diagnostic agent reads local
evidence -> review agent independently checks it -> human authorizes a named proposal
-> diagnostic agent executes the allowed recovery -> worker processes the queue ->
fresh verification and handoff are shared in the room.

Switch provides the shared conversation and agent handoff. Local files provide the
observable fixture and proposal state; they do not impersonate a Switch server.
A local test pass is not proof that Switch integration works.

## Local components
CLI -> locked transaction -> incident state -> evidence/proposal/review/approval gate.
All persisted state uses an explicitly selected A:-based directory.
The one allowed recovery is resume-worker. Execution consumes a proposal once.
A hash binds approval to observed state; changed evidence requires a new proposal.
Execution and successful recovery are separate: delivery progress must be observed.

## Boundaries
Actor names in this prototype are labels, not authenticated identities. The
interactive approval command discourages unattended approval but is NOT a security
boundary against another process or an agent with terminal/filesystem access.
The final integration must validate the human sender through Switch, or keep
operator approval in a genuinely separate operator-controlled environment.
State files/event history are editable by their owner; this is not a tamper-proof ledger.
No claim of automatic authenticated Switch approval may be made before that work.
Locking serializes writes; an interrupted process can leave a lock for manual inspection.
The current fixture is single-incident, single-machine; no distributed consensus needed.

## Competitive test
The demo must show a rejected stale proposal and a successful verified recovery.
This proves a concrete behavior beyond a scripted conversation.
We still need to demonstrate actual Switch handoff and human approval end to end.

## Dependencies
User requested no Docker. Current official Console local-server route requires
Docker. An existing Switch server is supported; its address/access is still needed,
or a verified source-based Docker-free setup must be investigated. Do not replace
Switch with a mock or claim the local CLI alone qualifies.

## References
- https://docs.switchagents.ai/switch-rooms/getting-started
- https://docs.switchagents.ai/switch-rooms/deploy
- https://github.com/sandbox-quantum/switch/blob/main/docs/TEMPLATES.md

## Implemented result — November 5, 2026

The original live workflow is now exercised: two real Codex agents collaborated
through Switch and Discord, the person approved the reviewed proposal in the
signed-in local UI, and the reviewer independently verified 3/3 processed fixture
deliveries. The Docker-free source runtime is installed on A:. Earlier dependency
notes describe the initial planning state; docs/agent-runtime.md records the current
implementation and its shared-filesystem limitation. No external production
webhook delivery, globally novel invention or tamper-proof isolation is claimed.
