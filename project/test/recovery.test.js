import test from 'node:test';
import assert from 'node:assert/strict';
import { createIncident, observe, propose, review, approve, execute, processBatch, verify } from '../src/recovery.js';

function reviewed() {
  const state = createIncident();
  propose(state, 'diagnostic-agent'); review(state, 'review-agent');
  return state;
}
test('a paused worker cannot process deliveries', () => {
  const state = createIncident();
  assert.equal(processBatch(state).processed, 0);
  assert.equal(observe(state).queued, 3);
});
test('recovery requires review and approval bound to the proposal', () => {
  const state = createIncident();
  propose(state, 'diagnostic-agent');
  assert.throws(() => execute(state), /review and operator approval/);
  assert.throws(() => approve(state, 'operator', state.proposal.id), /review is required/);
  review(state, 'review-agent');
  assert.throws(() => approve(state, 'operator', 'wrong-id'), /does not match/);
  assert.throws(() => execute(state), /review and operator approval/);
});
test('proposer cannot self-review and agents cannot self-approve using the same identity', () => {
  const state = createIncident();
  propose(state, 'diagnostic-agent');
  assert.throws(() => review(state, 'diagnostic-agent'), /different actor/);
  review(state, 'review-agent');
  assert.throws(() => approve(state, 'review-agent', state.proposal.id), /separate operator/);
});
test('stale approval refuses execution without changing worker state', () => {
  const state = reviewed();
  approve(state, 'operator', state.proposal.id);
  state.deliveries.push({ id: 'new-delivery', status: 'queued' }); state.revision += 1;
  assert.throws(() => execute(state), /Evidence changed/);
  assert.equal(state.worker.paused, true);
});
test('executing a recovery does not itself prove deliveries recovered', () => {
  const state = reviewed();
  approve(state, 'operator', state.proposal.id); execute(state);
  assert.equal(verify(state).recovered, false);
  assert.equal(processBatch(state).processed, 3);
  assert.equal(verify(state).recovered, true);
});
test('approval cannot be replayed', () => {
  const state = reviewed();
  approve(state, 'operator', state.proposal.id); execute(state);
  assert.throws(() => execute(state), /cannot be replayed/);
});
test('new proposals invalidate previous reviews and approvals', () => {
  const state = reviewed();
  approve(state, 'operator', state.proposal.id);
  const oldId = state.proposal.id;
  propose(state, 'diagnostic-agent');
  assert.notEqual(state.proposal.id, oldId);
  assert.equal(state.review, null); assert.equal(state.approval, null);
});
test('a healthy worker cannot justify the paused-worker recovery', () => {
  const state = createIncident(); state.worker.paused = false;
  assert.throws(() => propose(state, 'diagnostic-agent'), /does not support/);
});
