import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { createIncident, observe, propose, review, approve, execute, processBatch, verify } from './recovery.js';
import { transact, readState } from './store.js';

const [command, ...args] = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf('--' + name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Missing value for --' + name);
  return args[index + 1];
}
try {
  const directory = resolve(option('state', process.env.PROOFROOM_STATE_DIR || '.state'));
  const actor = option('actor');
  let result;
  switch (command) {
    case 'init': result = await transact(directory, () => createIncident(), { initialize: true }); break;
    case 'inspect': result = observe(await readState(directory)); break;
    case 'propose': result = await transact(directory, state => propose(state, actor)); break;
    case 'review': result = await transact(directory, state => review(state, actor)); break;
    case 'approve': {
      if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Operator approval requires an interactive terminal; agents must not invoke it.');
      const proposalId = option('proposal');
      if (!proposalId) throw new Error('--proposal is required.');
      const current = await readState(directory);
      console.error(JSON.stringify(current.proposal, null, 2));
      const prompt = createInterface({ input: process.stdin, output: process.stderr });
      let answer;
      try { answer = await prompt.question('Type the full proposal ID to approve this local demo action: '); }
      finally { prompt.close(); }
      if (answer !== proposalId) throw new Error('Approval cancelled.');
      result = await transact(directory, state => approve(state, actor, proposalId));
      break;
    }
    case 'execute': result = await transact(directory, execute); break;
    case 'work': result = await transact(directory, processBatch); break;
    case 'verify':
      result = await transact(directory, verify);
      if (!result.recovered) process.exitCode = 2;
      break;
    case 'timeline': result = (await readState(directory)).events; break;
    default: throw new Error('Commands: init, inspect, propose, review, approve, execute, work, verify, timeline. Options: --state PATH, --actor NAME, --proposal ID.');
  }
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
