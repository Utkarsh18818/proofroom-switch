import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';

export async function readState(directory) {
  const state = JSON.parse(await readFile(join(resolve(directory), 'incident.json'), 'utf8'));
  if (state.schemaVersion !== 1 || !Array.isArray(state.deliveries) || !Array.isArray(state.events)) throw new Error('Unsupported incident state.');
  return state;
}
export async function transact(directory, callback, { initialize = false } = {}) {
  const root = resolve(directory);
  await mkdir(root, { recursive: true });
  const lock = join(root, '.lock');
  try { await mkdir(lock); } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another operation holds the state lock. If it crashed, inspect before removing .lock.');
    throw error;
  }
  try {
    let state;
    try { state = await readState(root); } catch (error) { if (error.code !== 'ENOENT' || !initialize) throw error; }
    if (initialize && state) throw new Error('Incident already exists; use a new state directory.');
    const result = await callback(state);
    const nextState = initialize ? result : state;
    const path = join(root, 'incident.json');
    const temp = join(dirname(path), 'incident.tmp');
    await writeFile(temp, JSON.stringify(nextState, null, 2) + '\n', 'utf8');
    await rename(temp, path);
    return initialize ? nextState : result;
  } finally { await rm(lock, { recursive: true }); }
}
