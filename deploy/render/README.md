# Native Render deployment

Uses only Free instances and the existing public repository. No Docker, local tokens, provider profiles or private database state are uploaded.

The Blueprint creates a new Switch server with a restricted runtime database role, a fresh closed-signup operator account, and a separate ProofRoom web service. Local Discord integration and managed-agent configuration are not automatically migrated. The existing real local recovery evidence remains in the repository; a cloud deployment is not evidence of a new live-agent run.

Free Render web services sleep after 15 idle minutes. The product fixture and exports use ephemeral files and reset on restart/redeploy; download evidence before closing an exercise. Switch identities use Free Postgres, which expires after 30 days. The Blueprint disables public database access and all compute plans explicitly use Free. No card, paid disks, workers or paid instances are required.

Create a Blueprint from render.yaml. Check every displayed resource is Free before deploying. Render generates separate secrets for the new cloud account and service; never reuse or upload the local .env or Codex profile. GATEWAY_ADMIN_PASSWORD is the new operator password, available in the Switch service's Environment page. GATEWAY_ADMIN_EMAIL is operator@proofroom.local.

After startup, verify Switch /health/ready and ProofRoom /api/session over HTTPS, sign in, inspect the fixture and export evidence. November 7 validation: native Switch readiness and all component checks pass over public HTTPS. Protected operator sign-in and the separate fresh fixture were inspected. The anonymous reviewer route serves the approved saved local run; all 19 product tests pass, including refusal of public writes. No new cloud live-agent recovery is claimed.
