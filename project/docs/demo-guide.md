# ProofRoom — demo recording script

Suggested length: about 3 minutes. This is an editorial target, not a verified
submission-form limit. Record to A:/FlipTheSwitch/deliverables/proofroom-demo.mp4.
No video has been recorded by the assistant. The browser capture tool cannot save
frames to A: and exposes no video recorder.

## Record a walkthrough of the verified run

Say clearly that you are showing a completed run. Do not make old messages look
like new execution. The saved incident is
7b6fefab-9e24-40b0-92c6-3a4188c616d1.

| Time | Show | Suggested narration |
| --- | --- | --- |
| 0:00–0:20 | ProofRoom Overview, recovered state | “ProofRoom helps a person and two coding agents recover a stalled local worker. Every decision has evidence, and a successful action still needs verification.” |
| 0:20–0:45 | Incident room: proposal and evidence hash | “This run started with a paused worker and three queued deliveries. The diagnostic agent inspected persisted state and proposed one allowed action: resume the worker.” |
| 0:45–1:25 | Actual Switch/Discord thread from the saved run | “Switch carries the shared conversation, the diagnostic agent’s evidence and its handoff. The second agent independently checked the incident and recorded a matching review.” |
| 1:25–1:50 | Evidence ledger: reviewed proposal and operator-approved event | “I approved this exact proposal in the signed-in UI. Approval is tied to the proposal and its evidence fingerprint. Changed evidence and repeated execution are refused.” |
| 1:50–2:15 | Worker-resumed, deliveries-processed and verification events; metrics | “The diagnostic agent passed the gate, resumed the worker and processed the queue. The reviewer independently ran inspect and verify: three delivered, zero queued, recovered true.” |
| 2:15–2:40 | Architecture diagram and connected participants | “Switch provides identity, scoped addressing, shared history and agent-to-agent handoff. The standalone recovery CLI remains useful for tests; the live collaboration depends on Switch.” |
| 2:40–3:00 | Export evidence confirmation and limitations | “This is a controlled persisted fixture, not a production outage. Shared filesystem access remains a trust limit. The source, transcript and results make the outcome inspectable.” |

Use the actual final reviewer reply at message sequence 28 and the actual handoff
at sequence 19. Supplemental read-only controller-check reply is sequence 30.
The canonical transcript is evidence/live-agent-recovery.json at the project root.

## If recording a new live run instead

1. Start recording before the failure/queue view. Keep login and token pages out.
2. Use Archive & start new in ProofRoom; this preserves the completed run.
3. From an A-drive terminal, source runtime/enter-controller.ps1 and run
   node A:/FlipTheSwitch/runtime/controller/api.mjs request-diagnosis.
4. Show actual room replies. Wait for the independent reviewer to record review.
5. Personally inspect and approve the exact proposal in the UI.
6. Run api.mjs request-execution. Show the agent's execution and reviewer result.
7. Run api.mjs snapshot only after the reviewer has confirmed the outcome.
8. Export evidence. Stop recording only after the resolved metrics are visible.

Do not use the local diagnostic/review buttons to imply that those buttons called
LLMs. They are a separate deterministic rehearsal path.

## Before sharing a recording

- Set the recorder's output folder to A: before recording; no C-drive recording
  cache or temporary output should be used for this project.
- Close token/settings tabs, notifications and unrelated conversations.
- Capture legible UI and actual room history; hide the private runtime folders.
- Check video playback, text readability and audio. Do not claim voice dictation
  or a Wispr scorecard unless genuine usage evidence exists.
- Upload only after choosing a destination and checking that judges can open it.
