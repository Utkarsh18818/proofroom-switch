import test from 'node:test';
import assert from 'node:assert/strict';
import {Gateway} from '../src/gateway.js';
test('integration status exposes only allowlisted agent fields and tolerates unavailable management',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>({json:async()=>({status:'ready',checks:{database:{healthy:true}}})});
 try{
  const gateway=new Gateway();let managementAvailable=true;
  gateway.request=async path=>{
   if(path.endsWith('/collaborations'))return {data:[{bridge_id:'bridge-1',display_name:'Discord',bridge_type:'discord',status:'active',connection_config:{bot_token:'DO-NOT-EXPOSE'}}]};
   if(!managementAvailable)throw Error('Unavailable');
   return {data:[{agent_id:'agent-1',name:'proofroom-diagnostic',desired_state:'running',definition:{provider:'codex',instructions:'PRIVATE-INSTRUCTIONS'},status:{process:'running',attached:true,sessions:{active:1}},credential:'PRIVATE-CREDENTIAL'},{name:'unrelated-agent'}]};
  };
  const status=await gateway.integrations('session');
  assert.equal(status.bridges[0].id,'bridge-1');assert.equal(status.agents.length,1);assert.equal(status.agents[0].attached,true);
  assert.doesNotMatch(JSON.stringify(status),/DO-NOT-EXPOSE|PRIVATE-INSTRUCTIONS|PRIVATE-CREDENTIAL|unrelated-agent/);
  managementAvailable=false;const unavailable=await gateway.integrations('session');
  assert.equal(unavailable.agentStatusAvailable,false);assert.deepEqual(unavailable.agents,[]);assert.equal(unavailable.switchHealthy,true);
 }finally{globalThis.fetch=originalFetch;}
});
