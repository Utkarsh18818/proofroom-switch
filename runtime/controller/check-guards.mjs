import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='A:/FlipTheSwitch',helper=root+'/runtime/controller/api.mjs';
const fingerprint=()=>createHash('sha256').update(readFileSync(root+'/project/.state/incident.json')).digest('hex');
const before=fingerprint();
for(const [command,expected] of [['request-execution','Proposal has already executed'],['request-diagnosis','Current exercise is already recovered']]){
 const result=spawnSync(process.execPath,[helper,command],{encoding:'utf8',env:process.env,windowsHide:true});
 assert.equal(result.status,1,command+' must refuse the completed exercise');assert.ok(result.stderr.includes(expected),command+' must explain its refusal');
 assert.equal(fingerprint(),before,command+' must leave evidence unchanged');
 console.log('PASS '+command+' refuses replay without changing the fixture.');
}
