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
// Versioned evidence binds exact deliveries, not just aggregate counts.
export function fingerprint(state) {
  return hash({version: 2, observation: observe(state), deliveries: state.deliveries.map(d =>
    ({id: d.id, status: d.status, deliveredAt: d.deliveredAt ?? null})).sort((a,b) =>
      String(a.id).localeCompare(String(b.id)))});
}
function validDeliveries(state) {
  return state.deliveries.every(d => typeof d.id === 'string' && d.id.length > 0 &&
    ['queued','delivered'].includes(d.status)) &&
    new Set(state.deliveries.map(d => d.id)).size === state.deliveries.length;
}
export function verificationStatus(state) {
  if (!state.verification) return {status: 'not-run', recovered: false};
  if (!state.verification.evidenceHash) return {status: 'unbound', recovered: false};
  if (state.verification.evidenceHash !== fingerprint(state) || !validDeliveries(state))
    return {status: 'stale', recovered: false};
  const evidence = observe(state);
  return {status: 'current', recovered: state.verification.recovered === true &&
    !evidence.paused && evidence.queued === 0 && evidence.total > 0 &&
    evidence.delivered === evidence.total};
}
// Compatibility for historical recordings: compare the actual saved observation;
// never upgrade an older recording into a newly executed/version-2 verification.
export function validateRecordedRun(saved) {
  const state = saved?.state;
  if (state?.schemaVersion !== 1 || !Array.isArray(state.deliveries) ||
      !Array.isArray(state.events) || !state.worker || !state.execution ||
      !state.verification?.recovered || !validDeliveries(state))
    throw new Error('Verified demo evidence is inconsistent.');
  const observation = observe(state);
  if (observation.paused || observation.queued !== 0 || observation.total === 0 ||
      observation.delivered !== observation.total ||
      Object.entries(observation).some(([key,value]) => state.verification.evidence?.[key] !== value) ||
      (state.verification.evidenceHash && verificationStatus(state).status !== 'current'))
    throw new Error('Verified demo evidence is inconsistent.');
  return {status: 'recorded', recovered: true};
}
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
  if (!validDeliveries(state)) fail('Delivery identities or statuses are invalid.');
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
    evidence.total > 0 && evidence.delivered === evidence.total && validDeliveries(state);
  state.verification = { recovered, at: now(), evidence, evidenceHash: fingerprint(state) };
  record(state, recovered ? 'recovery-verified' : 'verification-failed', { evidence });
  return state.verification;
}
