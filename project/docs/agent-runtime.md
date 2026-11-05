# Live agent runtime

ProofRoom uses the official headless Switch controller, without Docker or Electron.
The controller's data, provider profile, logs, working directories and temporary
files are under A:/FlipTheSwitch. Existing installed Node, PowerShell, PostgreSQL
and Codex executable files are reused read-only from their installed locations.

## Installed components

- Switch source: 12c48336dd37a18c70f3e8ccec0807ada452407d, Core 0.31.0.
- Official controller now pinned to signed prerelease switch-agent-controller-v0.31.1-dev.311.g63c85ad (upstream heartbeat fix). Original 0.31.0 bundle retained for rollback.
- Current archive SHA256: 3d4179981f13f977e178b476857a62e864ca71c01af1839239b4afc70688ac6d; Ed25519 signature verified with upstream release-2026-10 key.
- Codex CLI: 0.163.0-alpha.10.2; signed into its separate A-drive profile.
- Controller protocol: 2; both managed hosts use Codex and have approval bypass off.

The controller is enrolled as ProofRoom A-drive. Its state and owner-only credential
files are in runtime/controller/data. Provider authentication is in
runtime/private/codex-home. Never publish either directory or include it in a zip.
The local server uses agent_management and a private CONTROLLER_TOKEN_SECRET.
No signing secret or provider token belongs in project documentation or evidence.

## Start and stop

Run A:/FlipTheSwitch/launch.ps1 to start the project services and enrolled controller.
Controller-only commands:

```powershell
& 'A:\FlipTheSwitch\runtime\controller\start.ps1'
& 'A:\FlipTheSwitch\runtime\controller\stop.ps1'
```

Stop the controller before stopping the Switch server or its database. The controller
stop script checks its recorded process and only stops that process and its children.
Automatic controller updates are disabled for this pinned local demo.

## Live scenario

- Dedicated Discord server: ProofRoom Demo; channel: general.
- Discord identity utkarsh04378 was confirmed as the local Switch operator using
  Switch's one-time account-link flow.
- Agents: proofroom-diagnostic and proofroom-review, each with its own A-drive
  working directory. Both may write the shared controlled fixture state.
- Addressing is restricted to the operator, the operator's agents and Switch's
  platform messages in this demo room.
- The definitions were created through the real management API from the project
  template's instructions. A template-run provenance record is not claimed.
- Local UI diagnostic/review buttons remain a separate rehearsal path. They do
  not generate AI messages. Participant connection status is read from Switch.

The observed model-backed diagnostic generated a real proposal and handed it to
the reviewer, which independently inspected the fixture and recorded its review.
Human approval must be made for that proposal in the signed-in ProofRoom UI.
Execution, queue processing and independent verification must still be checked
before calling any exercise recovered.

## Reliability validation and limits

The original 0.31.0 controller dropped healthy sockets after a fixed 10-second idle
timeout. Its official signed prerelease contains the upstream change that allows
three advertised heartbeat intervals. The replacement stayed online with both
agents attached and zero reconnect warnings during a bounded 521-second check.
A real model-backed read-only reply also succeeded; the recovered fixture remained
unchanged. Evidence: A:/FlipTheSwitch/evidence/controller-heartbeat-check.json.
This is a bounded observation, not a long-duration soak test. The runtime uses a
pinned prerelease and should retain its provenance and backup when reproduced.

This Windows demo uses one OS user and cooperative role separation. Agents share
filesystem access to the fixture, so local actor labels and prompts do not prevent
a malicious agent from editing that state. Switch identity and scoped addressing
are real, but they do not turn the fixture into a production security boundary.

## Verified exercise, 2026-11-05

Incident 7b6fefab-9e24-40b0-92c6-3a4188c616d1 completed the real model-backed
proposal, independent review, human UI approval, execution and processing. The
reviewer independently ran inspect and verify: exit 0, recovered=true, revision 2,
paused=false, generation 2, queued=0 and delivered=3/3. The exact proposal,
approval, state and room messages are saved in evidence/live-agent-recovery.json
at the A-drive project root. The older local rehearsal export remains archived.

## Reproduce the controller installation

After the native-server bootstrap, run runtime/controller/install.ps1. It verifies
the pinned archive and official signature, prepares the public release manifest,
and adds the management feature and signing secret to the local private server
configuration if needed. Restart Switch after a feature configuration change.
Source runtime/enter-controller.ps1 before enrolling or running helpers. Account,
room and agent IDs are discovered from the authenticated server rather than
reusing this machine's recorded IDs. See docs/reproduce.md for ordered steps.
