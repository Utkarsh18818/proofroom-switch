# Reproduce ProofRoom on Windows

These are prepared installation steps. The current local setup and live run were
verified; a separate fresh-machine reproduction has not yet been performed.

## Prerequisites and destination

Use an A: drive and extract the reviewed source package into A:/FlipTheSwitch on
a fresh environment. Do not overwrite an existing private runtime or evidence.
Existing Node 24, PowerShell 7, Git and PostgreSQL 17 binaries are required. The
native scripts currently expect standard Windows PostgreSQL/PowerShell locations.
Install those prerequisites from their official sources if absent, with project
storage/caches set to A: before use. The setup is Windows-specific.

All project source, downloads, Python environment, database, controller data,
provider profile, temporary files, caches and outputs live under A:/FlipTheSwitch.
Existing installed executable files may be read from their installed locations;
this does not relocate Windows or unrelated app-managed state.

## Native server and controller

```powershell
& 'A:\FlipTheSwitch\runtime\bootstrap.ps1'
& 'A:\FlipTheSwitch\runtime\controller\install.ps1'
& 'A:\FlipTheSwitch\launch.ps1'
```

Bootstrap prepares the pinned official Switch source, locked dependencies and
isolated local database. Controller install verifies the pinned official archive
and Ed25519 signature, and prepares required management configuration. Launch after
those settings are prepared. No Docker is used.

Open http://127.0.0.1:4173 and sign in with the local Switch account generated in
runtime/private/server-env.json. Keep that file private. Never include it in a repo.

```powershell
. 'A:\FlipTheSwitch\runtime\enter-controller.ps1'
codex.exe login
node A:/FlipTheSwitch/runtime/controller/api.mjs enroll
& 'A:\FlipTheSwitch\runtime\controller\start.ps1'
```

Complete the provider's normal browser login yourself. Its profile is on A:.
Enrollment discovers the signed-in local operator and enrolls this machine. Do not
reuse the old run's account, room or agent IDs; the helper resolves current ones.

## Discord and verified identity

Follow switch/DISCORD.md to create and install a bot only in a dedicated server.
Use Server Members and Message Content intents and the documented non-Administrator
permissions. Connect through ProofRoom Integrations with the token supplied locally.
Use connection name ProofRoom Discord and a general channel. Post an ordinary setup
message there so Switch creates the room and sees your Discord identity.

```powershell
node A:/FlipTheSwitch/runtime/controller/api.mjs link-identity YOUR_DISCORD_USERNAME
```

Confirm the one-time link code from your own Discord account in that channel as the
helper instructs. Keep the code private and complete this before recording a demo.
Then run:

```powershell
node A:/FlipTheSwitch/runtime/controller/api.mjs agents
node A:/FlipTheSwitch/runtime/controller/api.mjs agent-status
```

The two definitions use separate A-drive directories, Codex, approval bypass off,
and addressing restricted to the operator and their agents in the demo room. The
helper resolves its current controller instead of hardcoding a previous machine ID.

## Exercise and validation

Use a fresh exercise in the UI. Run api.mjs request-diagnosis and inspect the real
room conversation. Wait for review, personally approve in the UI, then run
api.mjs request-execution. Wait for the independent reviewer, then run
api.mjs snapshot and export evidence from the UI.

```powershell
. 'A:\FlipTheSwitch\project\enter.ps1'
Set-Location 'A:\FlipTheSwitch\project'
node --test --test-concurrency=1
node A:/FlipTheSwitch/runtime/controller/check-guards.mjs
```

The last command specifically expects a completed exercise. It verifies that helper
requests to diagnose or execute that completed exercise are refused and leave the
fixture bytes unchanged. It is not a fresh-incident test.

For shutdown, stop the controller first, then the native Switch/database:

```powershell
& 'A:\FlipTheSwitch\runtime\controller\stop.ps1'
& 'A:\FlipTheSwitch\runtime\stop.ps1'
```

See agent-runtime.md for provenance and shared-filesystem security limits. The
product UI local diagnostic/review buttons are a separate deterministic rehearsal;
use the managed-agent commands for a live AI collaboration demo.

## Gateway UI overlay

Bootstrap applies runtime/gateway-ui with runtime/apply-gateway-ui.py before the Gateway build. The overlay checks the pinned base revision and every input/output checksum, and refuses conflicting local edits. Both diagram views include +, minus and Fit controls. After rebuilding an already-running installation, restart the project Switch process so its startup asset allowlist loads the new hashed files. Do not reset the database or fixture for a UI update.
