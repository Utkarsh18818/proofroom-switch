(function proofroomApp(){
  let config={gatewayUrl:'http://127.0.0.1:8765',hosted:false};
  let user=null,data=null,integrations=null,page='overview',busy=false,poll=null;
  const $=s=>document.querySelector(s);
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const short=value=>String(value||'').slice(0,8);
  const time=value=>new Date(value).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const date=value=>new Date(value).toLocaleDateString([],{month:'short',day:'numeric'});
  async function api(path,body){
    const response=await fetch('/api/'+path,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    const result=await response.json();
    if(!response.ok){if(response.status===401)showLogin();throw new Error(result.error||'Request failed.');}return result;
  }
  let toastTimer;
  function toast(message,error=false){const element=$('#toast');element.textContent=message;element.className='toast'+(error?' error':'');element.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.hidden=true,5000);}
  function showLogin(){user=null;$('#workspace').hidden=true;$('#login-view').hidden=false;clearInterval(poll);}
  async function openWorkspace(account){
    user=account;$('#login-view').hidden=true;$('#workspace').hidden=false;
    $('#profile-name').textContent=user.name||'Operator';
    await refresh();
    clearInterval(poll);poll=setInterval(()=>{if(!busy&&!document.querySelector('dialog[open]')&&!document.querySelector('#discord-token:focus'))refresh(false);},8000);
  }
  async function refresh(renderPage=true){
    try{
      const previous=data?.state?.events?.length;
      data=await api('state');
      try{integrations=await api('integrations');}catch{integrations={switchHealthy:false,bridges:[]};}
      $('#sidebar-switch').textContent=integrations.switchHealthy?'Connected to Switch':'Switch needs attention';
      $('#integration-dot').hidden=integrations.bridges.some(b=>b.type==='discord');
      $('#last-sync').textContent='Last synced '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      $('#nav-count').textContent=data.state.verification?.recovered?'0':'1';
      if(renderPage||previous!==data.state.events.length)render();
    }catch(error){if(user)toast(error.message,true);}
  }
  function navigate(next){page=next;render();window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});}
  function status(){
    const s=data.state;
    if(s.verification?.recovered)return {label:'Recovery verified',good:true,step:5};
    if(s.execution)return {label:'Verification pending',step:4};
    if(s.approval)return {label:'Approved to recover',step:3};
    if(s.review)return {label:'Awaiting your approval',step:2};
    if(s.proposal)return {label:'Ready for review',step:1};
    return {label:'Investigation open',step:0};
  }
  function pill(label,good=false,neutral=false){return `<span class="status-pill ${good?'good':neutral?'neutral':''}"><span class="tiny-dot"></span>${escape(label)}</span>`;}
  function heading(kicker,title,description,actions=''){return `<section class="page-heading"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></section>`;}
  function nextAction(){
    const s=data.state;
    if(s.verification?.recovered)return {action:'new',title:'A verified recovery.',description:'Every delivery has been processed. Your evidence trail captures the decisions and the outcome.',button:'Start a new exercise',symbol:'✓'};
    if(s.execution&&!data.observation.queued)return {action:'verify',title:'Prove it worked.',description:'The queue has been processed. Run a fresh verification before marking this incident recovered.',button:'Verify recovery',symbol:'◎'};
    if(s.execution)return {action:'process',title:'Check the real outcome.',description:'The worker is resumed. Process the queued deliveries, then independently verify the result.',button:'Process deliveries',symbol:'↗'};
    if(s.approval)return {action:'execute',title:'Ready to recover.',description:'This exact proposal has your approval. Resume the worker; verification comes after execution.',button:'Resume worker',symbol:'↗'};
    if(s.review)return {action:'approve',title:'Your judgment matters.',description:'The local review is complete. Inspect the evidence and approve this specific recovery proposal.',button:'Review & approve',symbol:'◇'};
    if(s.proposal)return {action:'review',title:'A second look.',description:'The diagnostic found a paused worker. Run the local review against the current evidence before approval.',button:'Run local review',symbol:'◈'};
    return {action:'propose',title:'Start with the evidence.',description:'The worker is paused with deliveries waiting. Run the local diagnostic to propose a bounded recovery.',button:'Run local diagnostic',symbol:'⌕'};
  }
  function flow(){
    const current=status().step;
    return `<div class="flow">${['Observe','Review','Approve','Recover','Verify','Resolved'].map((label,i)=>`<div class="flow-step ${i<current?'done':i===current?'current':''}"><span class="step-icon">${i<current?'✓':i+1}</span>${label}</div>`).join('')}</div>`;
  }
  function incidentCard(detail=false){
    const s=data.state,o=data.observation,st=status();
    return `<section class="panel"><div class="panel-header"><h2>${detail?'Current investigation':'Active incident'} <span class="count-badge">${st.good?'resolved':'01'}</span></h2>${pill(st.label,st.good)}</div><div class="incident-summary"><div class="incident-topline"><span class="severity">${st.good?'RESOLVED':'SEV 3'}</span><span>INC-${short(s.id).toUpperCase()}</span><span>·</span><span>Webhook worker</span></div><h2 class="incident-title">${st.good?'Deliveries back on track.':'Webhook deliveries have stalled.'}</h2><p class="incident-description">${st.good?'The worker resumed, the queue was processed, and a fresh verification confirmed recovery.':o.paused?'A paused worker is holding three fixture deliveries. Follow the evidence, review the proposed action, and verify delivery before closing the incident.':o.queued?'The worker has resumed. Process its waiting deliveries and verify the resulting queue state before closing the incident.':'The deliveries have been processed. A fresh verification is still required before declaring recovery.'}</p><div class="incident-meta"><span>◷ Opened ${time(s.createdAt)}</span><span>◇ Controlled local exercise</span><span>↻ Revision ${o.revision}</span></div></div><div class="incident-strip"><div><strong>${o.queued} queued <span>/</span> ${o.delivered} delivered</strong><p>${o.paused?'Worker paused · no delivery progress':o.queued?'Worker resumed · processing pending':'All fixture deliveries processed'}</p></div><div class="queue-blocks" aria-label="${o.queued} queued and ${o.delivered} delivered">${s.deliveries.map(d=>`<span class="queue-block ${d.status==='delivered'?'delivered':''}"></span>`).join('')}</div></div><div class="section-label">RECOVERY WORKFLOW</div>${flow()}<div class="incident-bottom"><div class="avatar-stack"><span class="avatar diagnostic-avatar">D</span><span class="avatar review-avatar">R</span><span class="avatar operator-avatar">O</span><small>Diagnostic · Reviewer · You</small></div>${detail?'<span>Local rehearsal</span>':'<button class="arrow-link" data-nav="incident">Open incident room <span>↗</span></button>'}</div></section>`;
  }
  const eventInfo={
    'incident-created':['◉','Exercise opened','Three fixture deliveries are queued behind a paused worker.','SYSTEM'],
    'recovery-proposed':['⌕','Diagnostic evidence captured','A bounded resume-worker action was proposed from the current state.','LOCAL DIAGNOSTIC'],
    'proposal-reviewed':['◈','Proposal independently checked','The local review matched the proposal against fresh evidence.','LOCAL REVIEW'],
    'operator-approved':['◇','Operator approved the proposal','Approval is bound to this proposal and its evidence snapshot.','SWITCH ACCOUNT'],
    'recovery-executed':['↗','Worker resumed','Recovery executed. Delivery progress still needs verification.','RECOVERY ENGINE'],
    'deliveries-processed':['≡','Queue processed','The fixture worker processed its queued deliveries.','LOCAL WORKER'],
    'verification-failed':['!','Verification did not pass','Recovery is still unconfirmed. Review the remaining queued deliveries.','VERIFICATION'],
    'recovery-verified':['✓','Recovery verified','Fresh evidence confirms every fixture delivery was processed.','VERIFICATION']
  };
  function timeline(full=false){
    const events=full?data.state.events:[...data.state.events].slice(-4);
    return `<section class="panel timeline-panel"><div class="panel-header"><h2>${full?'Evidence timeline':'Recent activity'}</h2>${full?`<span class="mono">${events.length} records</span>`:'<button class="arrow-link" data-nav="evidence">View ledger ↗</button>'}</div><div class="timeline">${events.map(e=>{const info=eventInfo[e.type]||['•',e.type,'Recorded by the local engine.','EVENT'];return `<div class="timeline-item"><span class="timeline-marker">${info[0]}</span><div class="timeline-body"><strong>${info[1]}</strong><time>${time(e.at)}</time><p>${info[2]}</p><span class="event-tag">${info[3]}</span></div></div>`;}).join('')}</div></section>`;
  }
  function decisionCard(){
    const a=nextAction();
    return `<section class="decision-card"><span class="eyebrow">NEXT BEST ACTION</span><div class="decision-symbol">${a.symbol}</div><h2>${a.title}</h2><p>${a.description}</p><button class="button primary wide" data-action="${a.action}" ${busy?'disabled':''}>${a.button}<span>→</span></button><div class="decision-note">Actions affect this local fixture only.</div></section>`;
  }
  function teamCard(){
    const connection=name=>{const agent=integrations?.agents?.find(a=>a.name===name);return agent?.attached&&agent.process==='running'?'Connected':agent?agent.process==='unknown'?'Checking status':agent.process:integrations?.agentStatusAvailable?'Setup pending':'Status unavailable';};
    return `<section class="panel"><div class="panel-header"><h2>Room participants</h2><span class="count-badge">3 roles</span></div><div class="team-list"><div class="team-member"><span class="avatar diagnostic-avatar">D</span><div><strong>Diagnostic</strong><small>Evidence & proposed action</small></div><span class="member-status waiting">${escape(connection('proofroom-diagnostic'))}</span></div><div class="team-member"><span class="avatar review-avatar">R</span><div><strong>Reviewer</strong><small>Independent verification</small></div><span class="member-status waiting">${escape(connection('proofroom-review'))}</span></div><div class="team-member"><span class="avatar operator-avatar">O</span><div><strong>You</strong><small>Approval authority</small></div><span class="member-status">Signed in</span></div></div></section>`;
  }
  function overview(){
    const o=data.observation,s=data.state,st=status();
    return heading('OPERATIONS, WITH CONFIDENCE','Clarity before action.','Your incidents, evidence, and next decisions. All in one place.',`<button class="button secondary" data-export>↓ Export evidence</button><button class="button primary" data-nav="incident">Open incident room <span>↗</span></button>`)+
    `<section class="stats-grid"><div class="stat"><div class="stat-label">Open incidents <span class="stat-symbol">◉</span></div><div class="stat-value">${st.good?'0':'1'}<small> / 1 exercise</small></div><div class="stat-foot ${st.good?'good':''}"><span class="tiny-dot"></span>${st.good?'Recovery verified':'Awaiting verified recovery'}</div></div><div class="stat"><div class="stat-label">Deliveries waiting <span class="stat-symbol">≋</span></div><div class="stat-value">${o.queued.toString().padStart(2,'0')}</div><div class="stat-foot ${!o.queued?'good':''}"><span class="tiny-dot"></span>${o.delivered} of ${o.total} processed</div></div><div class="stat"><div class="stat-label">Decisions pending <span class="stat-symbol">◇</span></div><div class="stat-value">${s.review&&!s.approval?'01':'00'}</div><div class="stat-foot ${s.approval?'good':''}"><span class="tiny-dot"></span>${s.approval?'Proposal approved':s.review?'Your approval is needed':'No approval request yet'}</div></div><div class="stat"><div class="stat-label">Evidence records <span class="stat-symbol">▤</span></div><div class="stat-value">${s.events.length.toString().padStart(2,'0')}</div><div class="stat-foot good"><span class="tiny-dot"></span>Persisted on this computer</div></div></section>
    <div class="content-grid"><div>${incidentCard()}${timeline()}</div><div class="right-stack">${decisionCard()}${teamCard()}</div></div>
    <div class="subsection-heading"><h2>Your workspace, connected.</h2><button class="arrow-link" data-nav="integrations">Manage integrations ↗</button></div><div class="bottom-grid"><div class="mini-card"><span class="mini-icon">⌘</span><div><strong>Switch server</strong><p>${integrations?.switchHealthy?'Connected · all readiness checks healthy':'Unavailable · inspect the local server'}</p></div><a class="arrow-link" href="${escape(config.gatewayUrl)}" target="_blank" rel="noreferrer" aria-label="Open Switch Gateway">↗</a></div><div class="mini-card"><span class="mini-icon">◒</span><div><strong>Discord workspace</strong><p>${integrations?.bridges?.some(b=>b.type==='discord')?'Bridge registered · verify room handoff':'Connect your test server to bring the agents in'}</p></div><button class="arrow-link" data-nav="integrations" aria-label="Configure Discord">↗</button></div></div>`;
  }
  function incident(){
    const s=data.state;
    return heading('THE INCIDENT ROOM','One incident. Shared understanding.','Follow the evidence from first observation to verified recovery.',`<button class="button secondary" data-export>↓ Export evidence</button>`)+`<div class="content-grid"><div>${incidentCard(true)}${s.proposal?`<section class="panel timeline-panel"><div class="panel-header"><h2>Proposed recovery</h2>${pill(s.approval?'Approved':s.review?'Reviewed':'Review pending',!!s.approval)}</div><div class="data-row"><span>Allowed action</span><strong>Resume local worker</strong></div><div class="data-row"><span>Proposal</span><code>${escape(s.proposal.id)}</code></div><div class="data-row"><span>Evidence fingerprint</span><code>${escape(s.proposal.evidenceHash)}</code></div><div class="data-row"><span>Expected outcome</span><code>Processing resumes; verification still required</code></div></section>`:''}${timeline(true)}</div><div class="right-stack">${decisionCard()}${teamCard()}<div class="notice">Local diagnostic and review controls exercise the real recovery engine. They do not impersonate AI responses. Agent connection status is read from Switch; completed work must be verified in the evidence ledger.</div></div></div>`;
  }
  function evidence(){
    const o=data.observation;
    return heading('A TRACEABLE OUTCOME','The evidence speaks.','Observed state and recorded decisions. No assumed success.',`<button class="button primary" data-export>↓ Export JSON</button>`)+
    `<div class="evidence-grid"><div class="evidence-card"><h3>WORKER STATE</h3><strong>${o.paused?'Paused':'Running'}</strong><p>Generation ${o.generation} · revision ${o.revision}</p></div><div class="evidence-card"><h3>DELIVERY PROGRESS</h3><strong>${o.delivered} <small>/ ${o.total}</small></strong><p>${o.queued} deliveries remain in the local queue.</p></div><div class="evidence-card"><h3>VERIFICATION</h3><strong>${data.state.verification?.recovered?'Confirmed':data.state.verification?'Not recovered':'Not run'}</strong><p>${data.state.verification?'Last checked '+time(data.state.verification.at):'A fresh check is required after execution.'}</p></div></div><section class="panel"><div class="panel-header"><h2>Current observation</h2><span class="mono">SHA-256</span></div><div class="data-row"><span>Incident ID</span><code>${escape(data.state.id)}</code></div><div class="data-row"><span>Evidence fingerprint</span><code>${escape(data.evidenceHash)}</code></div><div class="data-row"><span>Source</span><strong>Local worker fixture · persisted state</strong></div></section>${timeline(true)}<div id="archive-region"></div><div class="notice">The ledger is stored locally and can be edited by the filesystem owner. It is an operational evidence trail, not a tamper-proof audit system.</div>`;
  }
  function integrationPage(){
    const healthy=integrations?.switchHealthy,discord=integrations?.bridges?.find(b=>b.type==='discord');
    return heading('BRING YOUR TEAM INTO THE ROOM','Connected by design.','Switch coordinates the room. Discord brings the conversation.')+
    `<div class="integration-grid"><section class="integration-card"><span class="integration-logo">ϟ</span><h2>Switch</h2><p>The shared context layer for your people, agents, and decisions.</p>${pill(healthy?'Connected & healthy':'Needs attention',healthy)}<ul class="check-list">${Object.entries(integrations?.checks||{}).map(([key,value])=>`<li><span>${value.healthy?'✓':'!'}</span>${escape(key.replaceAll('_',' '))}</li>`).join('')}</ul><a class="button secondary" href="${escape(config.gatewayUrl)}" target="_blank" rel="noreferrer">Open Gateway <span>↗</span></a><div class="notice">${config.hosted?'Hosted on AWS with native Switch. Live agents need a controller connected to this server.':'Running directly from source on this computer. No Docker.'}</div></section>
    <section class="integration-card"><span class="integration-logo discord">◒</span><h2>Discord</h2><p>Bring the diagnostic, reviewer, and operator together in a real channel.</p>${pill(discord?'Bridge registered':'Not connected',!!discord,!discord)}
    ${discord?`<p>Connection: ${escape(discord.name)}. Link your Discord identity in Switch, post an ordinary message in the test channel, and then invite the agents.</p><a class="button secondary" href="${escape(config.gatewayUrl)}" target="_blank" rel="noreferrer">Manage in Gateway ↗</a>`:
    `<form id="discord-form" class="integration-form"><label for="discord-token">Bot token</label><input id="discord-token" type="password" autocomplete="off" placeholder="Paste your bot token locally" required><label for="guild-id">Discord server ID</label><input id="guild-id" inputmode="numeric" pattern="[0-9]{15,25}" placeholder="Your dedicated test server ID" required><label class="consent"><input id="discord-consent" type="checkbox" required><span>Connect this bot to my test server. Switch will contact Discord and register commands using the bot’s granted permissions.</span></label><p class="help-text">Tokens are sent to your local Switch server, never written to browser storage or included in evidence exports.</p><button class="button primary wide" type="submit">Connect Discord <span>↗</span></button></form>`}
    </section></div><div class="notice">Create the bot in the <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer"><u>Discord Developer Portal ↗</u></a>. Enable Server Members and Message Content intents. Use the permission checklist in project/switch/DISCORD.md; do not grant Administrator.</div>`;
  }
  function render(){
    if(!data||!user)return;
    document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
    const labels={overview:'Overview',incident:'Incident room',evidence:'Evidence ledger',integrations:'Integrations'};
    $('#breadcrumb').textContent=labels[page];document.title='ProofRoom · '+labels[page];
    $('#main').innerHTML=({overview,incident,evidence,integrations:integrationPage}[page])();
    if(page==='evidence')loadArchive();
  }
  async function loadArchive(){try{const result=await api('history');if(!result.records.length||page!=='evidence')return;$('#archive-region').innerHTML=`<section class="panel timeline-panel"><div class="panel-header"><h2>Previous exercises</h2></div><table class="history-table"><thead><tr><th>Incident</th><th>Opened</th><th>Outcome</th><th>Records</th></tr></thead><tbody>${result.records.map(r=>`<tr><td class="mono">INC-${short(r.id).toUpperCase()}</td><td>${date(r.createdAt)} ${time(r.createdAt)}</td><td>${r.recovered?'Verified recovery':'Archived before recovery'}</td><td>${r.events}</td></tr>`).join('')}</tbody></table></section>`;}catch{}}
  async function confirmAction(action){
    if(action!=='approve'&&action!=='new')return true;
    const dialog=$('#action-dialog'),s=data.state;
    $('#dialog-title').textContent=action==='approve'?'Approve this recovery?':'Start a new exercise?';
    $('#dialog-description').textContent=action==='approve'?'Your signed-in Switch identity will approve only the proposal shown below. If the evidence has changed, execution will be refused.':'The current incident and its evidence will be archived before a fresh local exercise is created.';
    $('#dialog-evidence').textContent=action==='approve'?'Action: resume-worker · Proposal: '+s.proposal.id+' · Queued: '+s.proposal.evidence.queued:'Current incident: '+s.id;
    $('#dialog-confirm').textContent=action==='approve'?'Approve proposal':'Archive & start new';
    dialog.returnValue='';dialog.showModal();
    return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}));
  }
  async function act(action){
    if(busy||!await confirmAction(action))return;
    busy=true;render();
    try{
      const result=await api('action',{action,incidentId:data.state.id,proposalId:data.state.proposal?.id});
      const messages={propose:'Diagnostic evidence captured. Ready for local review.',review:'Review recorded. Your approval is required.',approve:'Proposal approved with your Switch identity.',execute:'Worker resumed. Process deliveries, then verify.',process:'Delivery batch processed. Verify the outcome.',verify:result.result?.recovered?'Recovery verified. Every delivery is processed.':'Verification failed. Recovery remains unconfirmed.',new:'New local exercise created. Previous evidence archived.'};
      toast(messages[action],action==='verify'&&!result.result?.recovered);await refresh();
    }catch(error){toast(error.message,true);}
    finally{busy=false;render();}
  }
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-nav],[data-page]');if(nav)navigate(nav.dataset.nav||nav.dataset.page);
    if(event.target.closest('[data-export]')){api('export',{}).then(result=>toast(config.hosted?'Evidence saved on the server. Use the evidence download to keep a copy.':'Evidence saved on A: in the deliverables folder.')).catch(error=>toast(error.message,true));}
    const action=event.target.closest('[data-action]');if(action)act(action.dataset.action);
  });
  $('#refresh').addEventListener('click',()=>refresh());
  $('#profile').addEventListener('click',async()=>{try{await api('logout',{});showLogin();}catch(error){toast(error.message,true);}});
  $('#login-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;$('#login-error').textContent='';
    try{const result=await api('login',{email:$('#email').value,password:$('#password').value});$('#password').value='';await openWorkspace(result.user);}
    catch(error){$('#login-error').textContent=error.message;}
    finally{button.disabled=false;}
  });
  document.addEventListener('submit',async event=>{
    if(event.target.id!=='discord-form')return;
    event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
    try{await api('discord',{token:$('#discord-token').value,guildId:$('#guild-id').value});$('#discord-token').value='';toast('Discord bridge registered. Link your identity in Switch next.');await refresh();}
    catch(error){toast(error.message,true);}
    finally{button.disabled=false;}
  });
  api('config').then(result=>{
    config=result;
    document.querySelectorAll('[data-gateway-link]').forEach(link=>link.href=config.gatewayUrl);
    if(config.hosted)document.querySelector('[data-environment-label]').textContent='AWS CONTROLLED EXERCISE';
  }).catch(()=>{}).finally(()=>api('session').then(result=>result.user?openWorkspace(result.user):showLogin()).catch(()=>showLogin()));
})();
