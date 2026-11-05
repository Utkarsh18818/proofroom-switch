import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createIncident, propose, observe } from '../src/recovery.js';
import { transact, readState } from '../src/store.js';

test('state persists, refuses overwrite, and failed transactions leave prior data intact', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'proofroom-store-'));
  try {
    const initial = await transact(directory, createIncident, { initialize: true });
    await assert.rejects(transact(directory, createIncident, { initialize: true }), /already exists/);
    await assert.rejects(transact(directory, state => { state.worker.paused = false; throw new Error('interrupted'); }), /interrupted/);
    assert.equal((await readState(directory)).worker.paused, true);
    await transact(directory, state => propose(state, 'diagnostic-agent'));
    assert.equal((await readState(directory)).id, initial.id);
    assert.equal(observe(await readState(directory)).queued, 3);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
