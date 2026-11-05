# Docker-free Switch runtime

Verified local installation on 2026-11-04.
- Official Switch source commit: 12c48336dd37a18c70f3e8ccec0807ada452407d
- Switch Core: 0.31.0
- Python: 3.13.18 in runtime/python
- uv: 0.13.7, official archive SHA-256 verified before running
- Node: 24.15.0
- Existing PostgreSQL 17.11 binaries are reused read-only; a separate cluster is on A:.
- Database: 127.0.0.1:55437; server and built Gateway: http://127.0.0.1:8765
- No Docker, cloud account, paid server, or public inbound port.
- Existing PostgreSQL Windows service and its databases were not changed.

## Run
In PowerShell:
~~~powershell
& A:\FlipTheSwitch\runtime\start.ps1
node A:\FlipTheSwitch\runtime\verify-server.mjs
~~~
Open http://127.0.0.1:8765 in a browser.
The local admin email/password are in runtime/private/server-env.json.
Inspect that file locally when signing in; do not paste or publish its contents.
New random credentials were generated once. No production credentials were reused.

To stop only this project's runtime:
~~~powershell
& A:\FlipTheSwitch\runtime\stop.ps1
~~~
Stop uses PID and executable-path checks and may need execution permissions to
inspect the project process. It does not stop the installed PostgreSQL service.

## Reproduction details
Official source was shallow-cloned under runtime/switch. The locked Python runtime
dependencies were installed with uv sync --no-dev --locked and Python 3.13.
Gateway dependencies/build use npm ci followed by npm run build with A:-based caches.
Windows checkout CRLF broke the catalog reader's strict Markdown frontmatter regex;
five catalog SKILL.md checkout files were normalized to LF without changing their text.
These are local runtime adaptations, not a submitted upstream contribution.

Configuration uses a separate owner and restricted runtime DB role. Switch's
restricted-role checks remain enabled. The server binds to loopback only.
GATEWAY_COOKIE_SECURE=false is used for this loopback HTTP development server;
do not expose this configuration as a public deployment.
Secret material, database files, caches, logs, and source clone are under A:.
Existing OS/app-managed storage is not relocated by these scripts.

## Remaining integration
Discord bot application, token, server ID, linked human account, agent runtime,
and real room handoff still need verification.
Server readiness alone does not demonstrate the completed hackathon workflow.
