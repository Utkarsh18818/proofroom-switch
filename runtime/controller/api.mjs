import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
async function main(){
const root='A:/FlipTheSwitch';
const base='http://127.0.0.1:8765';
const cfg=JSON.parse(readFileSync(root+'/runtime/private/server-env.json','utf8').replace(/^\uFEFF/,''));
const login=await fetch(base+'/gateway/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({email:cfg.GATEWAY_ADMIN_EMAIL,password:cfg.GATEWAY_ADMIN_PASSWORD})});
if(!login.ok)throw Error('Gateway login failed: '+login.status);
const operator=await login.json();
const headers={Cookie:login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; '),'Content-Type':'application/json',Origin:base};
async function request(path,method='GET',body){
 const response=await fetch(base+'/gateway'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw Error(path+' '+response.status+' '+JSON.stringify(data));return data;
}
const command=process.argv[2]||'status';
const state=()=>JSON.parse(readFileSync(root+'/project/.state/incident.json','utf8'));
async function scenario(){
 const [rooms,controllers,agents]=await Promise.all([request('/rooms'),request('/management/controllers'),request('/management/agents')]);
 const matches=rooms.filter(r=>r.name==='general'&&r.bridge_display_name==='ProofRoom Discord');
 if(matches.length!==1)throw Error('Expected exactly one general room on ProofRoom Discord; connect the dedicated test server and post its setup message first.');
 const controller=controllers.find(c=>c.name==='ProofRoom A-drive');
 if(!controller)throw Error('Enroll the ProofRoom A-drive controller first.');
 return {roomId:matches[0].id,bridgeId:matches[0].bridge_id,controller,agents,diagnostic:agents.find(a=>a.name==='proofroom-diagnostic'),reviewer:agents.find(a=>a.name==='proofroom-review')};
}
const messagePath=id=>'/chats/'+id+'/messages';
function rootMessage(page,incidentId){
 const found=page.messages.find(m=>m.sender?.kind==='human'&&m.body.includes('Please inspect the controlled local fixture now.')&&m.body.includes(incidentId));
 if(!found)throw Error('Diagnostic request root is not in the returned transcript; inspect history before proceeding.');return found;
}
async function send(context,body,{threadRootId}={}){
 if(!context.diagnostic)throw Error('Diagnostic agent is not configured.');
 return request(messagePath(context.roomId),'POST',{requestId:crypto.randomUUID(),body,mentionAgentId:context.diagnostic.agent_id,...(threadRootId?{threadRootId}:{})});
}
if(command==='status'){
 const [flags,controllers,rooms]=await Promise.all([request('/feature-flags'),request('/management/controllers'),request('/rooms')]);console.log(JSON.stringify({flags,controllers,rooms},null,2));
}else if(command==='enroll'){
 const controllers=await request('/management/controllers');
 if(controllers.some(c=>c.name==='ProofRoom A-drive')){console.log('ProofRoom controller already enrolled; no duplicate created.');return;}
 const enrollment=await request('/management/enrollment-codes','POST');
 const manifest=root+'/runtime/controller/release.json';
 const cli=existsSync(manifest)?JSON.parse(readFileSync(manifest,'utf8').replace(/^\uFEFF/,'' )).cliPath:root+'/runtime/controller/package/cli.mjs';
 const result=spawnSync(process.execPath,[cli,'enroll','--server',base,'--code',enrollment.code,'--name','ProofRoom A-drive','--description','Local controlled hackathon fixture; project state on A drive','--data-dir',root+'/runtime/controller/data','--secret-store','file'],{stdio:'inherit',env:process.env,windowsHide:true});
 if(result.error)throw result.error;process.exitCode=result.status??1;
}else if(command==='agents'){
 const context=await scenario();
 const definitions=JSON.parse(readFileSync(root+'/runtime/controller/agent-definitions.json','utf8'));
 for(const source of definitions){
  if(!['proofroom-diagnostic','proofroom-review'].includes(source.name))throw Error('Unexpected agent definition name.');
  const directory=root+'/project/agents/'+(source.name==='proofroom-diagnostic'?'diagnostic':'review');
  mkdirSync(directory,{recursive:true});
  const definition={...source,controller_id:context.controller.id,definition:{...source.definition,directory}};
  let agent=context.agents.find(a=>a.name===definition.name);
  if(agent&&agent.controller_id!==context.controller.id)throw Error('This agent name belongs to a different controller; inspect before changing it.');
  if(!agent){agent=await request('/management/agents','POST',definition);console.log('Created '+definition.name);}
  const id=agent.agent_id||agent.id;if(!id)throw Error('Agent response has no ID.');
  await request('/agents/'+id+'/addressing-policy','PUT',{policy:{rules:[{rooms:[context.roomId],users:[],agents:[],owner:true,owner_agents:true,platform:true}]}});
  await request('/management/agents/'+id,'PATCH',{desired_state:'running'});
  await request('/rooms/'+context.roomId+'/agents','POST',{agent_ids:[id]});
  console.log(JSON.stringify({name:definition.name,id,started:true}));
 }
}else if(command==='agent-status'){
 console.log(JSON.stringify(await request('/management/agents'),null,2));
}else if(command==='request-diagnosis'){
 const context=await scenario(),current=state();
 if(current.verification?.recovered)throw Error('Current exercise is already recovered; use the UI to archive and start a fresh one first.');
 await request('/chats/'+context.roomId+'/members','POST',{userId:operator.id});
 const body='@proofroom-diagnostic Please inspect the controlled local fixture now. Incident '+current.id+'. Collect current evidence, propose only if justified, and hand off to the reviewer for independent review once the proposal is ready. Stop before human approval and execution. Reply through Switch in this thread. This is a project demo test in ProofRoom Demo only.';
 console.log(JSON.stringify(await send(context,body),null,2));
}else if(command==='messages'){
 const context=await scenario();console.log(JSON.stringify(await request(messagePath(context.roomId)),null,2));
}else if(command==='request-execution'){
 const context=await scenario(),current=state();
 if(!current.approval||current.approval.proposalId!==current.proposal?.id||current.approval.by!==operator.id)throw Error('Expected authenticated operator approval is absent; refusing execution request.');
 if(current.execution)throw Error('Proposal has already executed; refusing duplicate execution request.');
 const page=await request(messagePath(context.roomId)),thread=rootMessage(page,current.id);
 const body='@proofroom-diagnostic The operator has approved reviewed proposal '+current.proposal.id+' for incident '+current.id+' in the signed-in ProofRoom UI. Independently inspect saved approval and evidence. If the CLI gate passes, run execute and work against A:/FlipTheSwitch/project/.state. Then hand off independent outcome verification to the reviewer agent in this thread. Do not approve, initialize, or edit state files. Report actual results and any refusal.';
 const sent=await send(context,body,{threadRootId:thread.messageId});console.log(JSON.stringify({approval:current.approval,requestPosted:sent.messages.map(m=>({id:m.messageId,seq:m.seq}))},null,2));
}else if(command==='snapshot'){
 const context=await scenario(),current=state(),page=await request(messagePath(context.roomId)),thread=rootMessage(page,current.id);
 const messages=page.messages.filter(m=>m.seq>=thread.seq);
 const reviewerConfirmation=messages.some(m=>m.sender?.agentId===context.reviewer?.agent_id&&m.threadRootId===thread.messageId&&m.body.includes(current.id)&&/independent verification passed/i.test(m.body)&&/recovered=true/i.test(m.body));
 const evidence={capturedAt:new Date().toISOString(),environment:'controlled-local-exercise',roomId:context.roomId,transcriptHasMore:page.hasMore,liveDiagnosticProposal:current.proposal?.by==='diagnostic-agent'&&messages.some(m=>m.sender?.agentId===context.diagnostic?.agent_id&&m.body.includes(current.proposal.id)),liveIndependentReview:current.review?.by==='review-agent'&&messages.some(m=>m.sender?.agentId===context.reviewer?.agent_id&&m.body.includes(current.proposal.id)),authenticatedHumanApproval:current.approval?.by===operator.id,independentOutcomeReply:reviewerConfirmation,recovered:current.verification?.recovered===true,agents:context.agents.map(a=>({id:a.agent_id,name:a.name,provider:a.definition?.provider,directory:a.definition?.directory,autoApprove:a.definition?.auto_approve,process:a.status?.process,attached:a.status?.attached})),state:current,messages};
 for(const path of [root+'/evidence/live-agent-recovery.json',root+'/deliverables/proofroom-live-'+current.id+'.json'])writeFileSync(path,JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({recovered:evidence.recovered,independentOutcomeReply:reviewerConfirmation,roomMessages:messages.length,proposalId:current.proposal?.id},null,2));
}else if(command==='controller-smoke'){
 const context=await scenario();
 const body='@proofroom-diagnostic Post-upgrade read-only connection check: inspect the existing fixture and report its incident ID, revision, paused flag, queued and delivered counts in one short room reply. Do not initialize, propose, review, approve, execute, process or verify anything; do not change the fixture. This checks the signed controller heartbeat fix only.';
 const sent=await send(context,body);console.log(JSON.stringify({requestMessage:sent.messages[0]?.messageId,incidentId:state().id}));
}else if(command==='link-identity'){
 const username=process.argv[3];if(!username)throw Error('Usage: link-identity YOUR_DISCORD_USERNAME');
 const context=await scenario();
 const identities=await request('/collaborations/'+context.bridgeId+'/users');
 const identity=identities.find(u=>u.external_username===username);
 if(!identity)throw Error('Post an ordinary setup message in the dedicated Discord general channel first.');
 if(identity.claimed_by?.some(c=>c.user_id===operator.id&&c.verified)){console.log('This Discord identity is already verified for the signed-in operator.');return;}
 const linked=await request('/collaborations/'+context.bridgeId+'/identities','POST',{external_user_id:identity.external_user_id,username,expects_confirmation:true});
 console.log('Confirm from YOUR Discord account in the dedicated demo channel. Keep this one-time code private:');
 console.log(linked.link_request?.code?.instructions||'No code returned; inspect the local Gateway.');
}else throw Error('Unknown command');

}
await main().catch(error=>{console.error(error.message);process.exitCode=1;});
