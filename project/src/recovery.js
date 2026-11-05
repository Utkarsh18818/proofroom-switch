import { createHash, randomUUID } from 'node:crypto';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = message => { throw new Error(message); };
export const now = () => new Date().toISOString();
export function createIncident() {
  return {
    schemaVersion: 1, id: randomUUID(), revision: 0, createdAt: now(),
    worker: { paused: true, generation: 1 },
    deliveries: Array.from({ length: 3 }, (_, i) => ({ id: 'delivery-' + (i + 1), status: 'queued' })),
    proposal: null, review: null, approval: null, execution: null, verification: null,
    events: [{ type: 'incident-created', at: now() }]
  };
}
export function observe(state) {
  return {
    incidentId: state.id, revision: state.revision,
    paused: state.worker.paused, generation: state.worker.generation,
    queued: state.deliveries.filter(d => d.status === 'queued').length,
    delivered: state.deliveries.filter(d => d.status === 'delivered').length,
    total: state.deliveries.length
  };
}
export function fingerprint(state) { return hash(observe(state)); }
function record(state, type, details = {}) { state.events.push({ type, at: now(), ...details }); }
function ensureProposal(state) { if (!state.proposal) fail('No recovery proposal exists.'); }
function ensureFresh(state) {
  ensureProposal(state);
  if (state.proposal.evidenceHash !== fingerprint(state)) fail('Evidence changed; collect and review a new proposal.');
}
export function propose(state, actor) {
  if (!actor) fail('An actor is required.');
  if (state.execution) fail('Recovery already executed for this incident.');
  const evidence = observe(state);
  if (!evidence.paused || evidence.queued === 0) fail('The evidence does not support resuming a paused worker with queued deliveries.');
  state.proposal = {
    id: randomUUID(), action: 'resume-worker', incidentId: state.id,
    evidence, evidenceHash: fingerprint(state), by: actor, at: now(),
    reason: 'Worker is paused while deliveries remain queued.',
    expectedOutcome: 'Worker accepts processing; delivery progress must be checked separately.'
  };
  state.review = null; state.approval = null;
  record(state, 'recovery-proposed', { proposalId: state.proposal.id, by: actor });
  return state.proposal;
}
export function review(state, actor) {
  ensureFresh(state);
  if (!actor || actor === state.proposal.by) fail('Review must name a different actor from the proposer.');
  state.review = { proposalId: state.proposal.id, evidenceHash: state.proposal.evidenceHash, by: actor, at: now() };
  state.approval = null;
  record(state, 'proposal-reviewed', { proposalId: state.proposal.id, by: actor });
  return state.review;
}
export function approve(state, actor, proposalId) {
  ensureFresh(state);
  if (proposalId !== state.proposal.id) fail('Approval does not match the current proposal.');
  if (!state.review || state.review.proposalId !== proposalId) fail('A review is required before approval.');
  if (!actor || [state.proposal.by, state.review.by].includes(actor)) fail('Approval must name a separate operator.');
  state.approval = { proposalId, evidenceHash: state.proposal.evidenceHash, by: actor, at: now() };
  record(state, 'operator-approved', { proposalId, by: actor });
  return state.approval;
}
export function execute(state) {
  if (state.execution) fail('Recovery already executed; approval cannot be replayed.');
  ensureFresh(state);
  if (!state.approval || !state.review ||
      state.approval.proposalId !== state.proposal.id ||
      state.review.proposalId !== state.proposal.id ||
      state.approval.evidenceHash !== state.proposal.evidenceHash ||
      state.review.evidenceHash !== state.proposal.evidenceHash) fail('Matching review and operator approval are required.');
  if (state.proposal.action !== 'resume-worker') fail('Action is not allowed.');
  state.worker.paused = false; state.worker.generation += 1; state.revision += 1;
  state.execution = { proposalId: state.proposal.id, at: now(), revision: state.revision };
  record(state, 'recovery-executed', { proposalId: state.proposal.id });
  return state.execution;
}
export function processBatch(state) {
  if (state.worker.paused) return { processed: 0, reason: 'Worker is paused.' };
  const pending = state.deliveries.filter(d => d.status === 'queued');
  for (const item of pending) { item.status = 'delivered'; item.deliveredAt = now(); }
  if (pending.length) { state.revision += 1; record(state, 'deliveries-processed', { count: pending.length }); }
  return { processed: pending.length };
}
export function verify(state) {
  if (!state.execution) fail('No executed recovery to verify.');
  const evidence = observe(state);
  const recovered = !evidence.paused && evidence.queued === 0 &&
    evidence.total > 0 && evidence.delivered === evidence.total;
  state.verification = { recovered, at: now(), evidence };
  record(state, recovered ? 'recovery-verified' : 'verification-failed', { evidence });
  return state.verification;
}
