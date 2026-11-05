# Current live status — 2026-11-05

The Docker-free server, Discord bridge, confirmed operator identity and two managed Codex agents are working. A real diagnostic/reviewer handoff, human UI approval, local queue recovery and independent verification passed. See ../docs/agent-runtime.md and A:/FlipTheSwitch/evidence/live-agent-recovery.json.

The older checklist below documents setup intent; the live definitions were created through management API, so a template-run provenance record is not claimed. The controlled fixture remains cooperative, with shared filesystem access.

## Update: native server available
Switch and Gateway now run at http://127.0.0.1:8765 without Docker. All readiness checks pass. Use the native runtime; no external server is required. Discord integration remains pending.

# Live Switch integration checklist

## Current status
Draft template prepared against the current documented v1 language.
It has passed the real Switch server validator with no errors or warnings. It has NOT yet been provisioned or exercised in a live Discord room.
Local kernel tests run without Docker. The user explicitly requested no Docker.

## Server dependency
The official local Console server route requires Docker. Use an existing Switch
server instead if one is available: Console -> Add a server -> Connect to an
existing server. Its Gateway/API addresses and an account are required.
Do not paste passwords or tokens into chat or commit them.
A source-based setup is now running and verified. See A:/FlipTheSwitch/runtime/README.md. The Discord connection is pending; see DISCORD.md.

## Before using the template
1. Source A:/FlipTheSwitch/project/enter.ps1 in the human terminal.
2. Initialize a fresh local incident with node src/cli.js init.
3. Ensure Console uses this computer and an authenticated provider.
4. Ensure provider/Console-managed working storage complies with the A:-only
   project requirement. Do not start agents with default C:-based directories.
5. Create the two agent working directories on A: if needed.
6. Import proofroom.template.yaml using the current Console template workflow;
   run its real validation and correct any errors before creation.
7. Verify that both agents' effective working directories are on A:.
8. Verify the linked human messaging identity and owner-agents addressing.

## End-to-end exercise (not yet performed)
- Human reports queued deliveries in the Switch room.
- Diagnostic agent collects evidence and proposes the bounded resume action.
- Review agent independently checks evidence and records its review.
- Human reads the exact proposal and approves it in a separate terminal.
- Diagnostic agent executes, processes the queue, and requests independent verification.
- Reviewer verifies that every fixture delivery is processed.
- Record actual room messages and the local event timeline.

## Approval boundary that must be resolved
The current interactive terminal check and different actor labels are not strong
identity/security controls. Agents with the same filesystem access could change
the local state. Treat the present exercise as cooperative and controlled.
For stronger enforcement, the executor must receive an authenticated Switch human
message for the specific proposal and reject agent senders, or the approval
authority must run under a separate operator-controlled identity/environment.
Do not represent prompt instructions as an enforced security boundary.

## Required evidence before claiming completion
A real Switch room, actual agent handoff, human decision, successful local
verification, and documented identity/permission limitations.
A mock transcript or the local CLI alone does not satisfy this checklist.

References:
- https://docs.switchagents.ai/switch-rooms/getting-started
- https://docs.switchagents.ai/switch-rooms/deploy
- https://github.com/sandbox-quantum/switch/blob/main/docs/TEMPLATES.md
