import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateRecordedRun} from '../src/recovery.js';
const saved=JSON.parse(await readFile(new URL('../../evidence/live-agent-recovery.json',import.meta.url),'utf8'));
test('actual published recording remains readable without rewriting historical evidence',()=>{
 const original=JSON.stringify(saved);
 assert.deepEqual(validateRecordedRun(saved),{status:'recorded',recovered:true});
 assert.equal(JSON.stringify(saved),original);
});
test('recorded success cannot conceal a paused worker, queued delivery or duplicate identity',()=>{
 for(const mutate of [s=>s.worker.paused=true,s=>s.deliveries[0].status='queued',s=>s.deliveries[1].id=s.deliveries[0].id,s=>s.verification.evidence.revision+=1]){
  const copy=structuredClone(saved); mutate(copy.state);
  assert.throws(()=>validateRecordedRun(copy),/inconsistent/);
 }
});
