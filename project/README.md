# ProofRoom
Evidence-backed incident recovery for a Switch room. Started November 4, 2026.

## Current state
The local product is implemented: responsive UI, real Switch account login,
recovery workflow, evidence ledger, authenticated-account approval, archived
exercises, A:-based JSON exports, and Discord connection form.
The real Docker-free Switch server and official Gateway run locally.
**Live Discord integration and a real model-backed diagnostic/reviewer recovery passed on November 5.**
The operator personally approved the reviewed proposal in the signed-in UI; agents
resumed the fixture, processed 3/3 deliveries and independently verified recovery.
See docs/agent-runtime.md for runtime setup and evidence. The periodic controller
reconnect issue was resolved with an official signed prerelease and checked for
521 seconds with no reconnect warnings; a longer soak has not been performed.
The controlled worker fixture is not a real production webhook outage.

## Run on Windows
Requires existing Node.js 22+; tested with 24.15.0. Local project has no npm dependencies.
The native Switch runtime is already prepared under A:/FlipTheSwitch/runtime.
No Docker is used.

~~~powershell
& A:\FlipTheSwitch\launch.ps1
~~~

- Product UI: http://127.0.0.1:4173
- Official Switch Gateway: http://127.0.0.1:8765
- Sign in using the locally generated Switch account.
- Credentials are in runtime/private/server-env.json. Do not publish this file.

The operator can inspect, propose, review, approve, execute, process, and verify.
Local diagnostic/review controls run deterministic fixture checks and are labelled
accordingly; they are separate from the real managed Codex agents.
Integrations shows the Discord connection and live participant status. For a new
setup, see switch/DISCORD.md and docs/agent-runtime.md.

## Verify
~~~powershell
. A:\FlipTheSwitch\project\enter.ps1
node --test --test-concurrency=1
node A:\FlipTheSwitch\runtime\verify-server.mjs
~~~
Eighteen automated tests cover recovery, persistence, CLI behavior, and HTTP trust
boundaries. Browser testing completed the entire local recovery flow and checked
mobile overflow at 390px.

## CLI
~~~powershell
. A:\FlipTheSwitch\project\enter.ps1
node src/cli.js inspect
node src/cli.js timeline
~~~
For a fresh independent CLI exercise, use a new --state directory on A: with init,
propose --actor diagnostic-agent, review --actor review-agent, interactive approve
--actor operator --proposal ID, execute, work, and verify. Pass the same --state
directory to every command. Init refuses to overwrite an incident.
Do not rerun already consumed proposals. Do not use the CLI to bypass an operator decision.

## Design and limits
docs/architecture.md describes implemented components and their boundaries.
docs/demo-guide.md gives the local demo and remaining live-demo requirements.
switch/SETUP.md describes provisioning; runtime/README.md covers native deployment.

The UI gets approval identity from an authenticated Switch account rather than a
client-supplied name. Shared filesystem access and knowledge of the operator password
remain outside this cooperative demo's security boundary. This is not a hardened
production execution broker or tamper-proof ledger.

The UI, source, state, archives, caches, logs, and exported artifacts stay on A:.
Existing OS/Codex-managed storage is outside the project's control.
Source project excludes .state/, tokens, .env, and runtime credentials.
No blog or social campaign has been started; these remain the final phase.
