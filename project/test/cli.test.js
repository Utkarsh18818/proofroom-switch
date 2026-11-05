import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cli = new URL('../src/cli.js', import.meta.url);
test('CLI persists evidence, refuses premature execution and piped operator approval', async () => {
  const statePath = await mkdtemp(join(tmpdir(), 'proofroom-cli-'));
  function run(command, ...args) {
    return spawnSync(process.execPath, [fileURLToPath(cli), command, '--state', statePath, ...args], { encoding: 'utf8', env: process.env, input: '' });
  }
  try {
    assert.equal(run('init').status, 0);
    assert.equal(JSON.parse(run('inspect').stdout).queued, 3);
    assert.equal(run('init').status, 1);
    assert.equal(run('execute').status, 1);
    const proposed = run('propose', '--actor', 'diagnostic-agent');
    assert.equal(proposed.status, 0, proposed.stderr);
    const proposal = JSON.parse(proposed.stdout);
    assert.equal(run('review', '--actor', 'review-agent').status, 0);
    const approval = run('approve', '--actor', 'operator', '--proposal', proposal.id);
    assert.equal(approval.status, 1);
    assert.match(approval.stderr, /interactive terminal/);
    assert.equal(run('execute').status, 1);
    assert.equal(JSON.parse(run('inspect').stdout).paused, true);
    assert.equal(run('unknown').status, 1);
  } finally { await rm(statePath, { recursive: true, force: true }); }
});
