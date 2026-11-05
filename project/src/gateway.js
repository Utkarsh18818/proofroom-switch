export class Gateway {
  constructor(base='http://127.0.0.1:8765') { this.base=base; }
  async request(path, {cookie, method='GET', body}={}) {
    const response=await fetch(this.base+path,{method,signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Origin:this.base,...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
    let data; try {data=await response.json();} catch {data=null;}
    if(!response.ok) { const error=new Error(response.status===401?'Sign in with your Switch account.':'Switch could not complete this request. Check the local Gateway.'); error.status=response.status; throw error; }
    return {data,cookie:response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')};
  }
  async login(email,password) {
    const result=await this.request('/gateway/auth/login',{method:'POST',body:{email,password}});
    if(!result.cookie || !result.data?.id) throw new Error('Switch did not return a valid session.');
    return {cookie:result.cookie,user:{id:result.data.id,name:result.data.name||'Operator',email:result.data.email}};
  }
  async integrations(cookie) {
    const [health,bridges,managed]=await Promise.all([
      fetch(this.base+'/health/ready',{signal:AbortSignal.timeout(5000)}).then(r=>r.json()),
      this.request('/gateway/collaborations',{cookie}),
      this.request('/gateway/management/agents',{cookie}).catch(()=>({data:null}))
    ]);
    return {switchHealthy:health.status==='ready'&&Object.values(health.checks||{}).every(c=>c.healthy),checks:health.checks,
      bridges:(bridges.data||[]).map(b=>({id:b.bridge_id||b.id,name:b.display_name,type:b.bridge_type,status:b.status||'registered'})),
      agentStatusAvailable:Array.isArray(managed.data),
      agents:(managed.data||[]).filter(a=>['proofroom-diagnostic','proofroom-review'].includes(a.name)).map(a=>({id:a.agent_id,name:a.name,provider:a.definition?.provider,desiredState:a.desired_state,process:a.status?.process||'unknown',attached:a.status?.attached===true,directory:a.status?.directory||a.definition?.directory,sessions:a.status?.sessions?.active||0}))};
  }
  async connectDiscord(cookie,{token,guildId}) {
    if(!/^[0-9]{15,25}$/.test(guildId||'') || typeof token!=='string' || token.length<20) throw new Error('Enter a valid bot token and Discord server ID.');
    const result=await this.request('/gateway/collaborations',{cookie,method:'POST',body:{bridge_type:'discord',display_name:'ProofRoom Discord',connection_config:{bot_token:token,guild_id:guildId},set_as_default:true,channel_creation_enabled:true}});
    return {id:result.data.id,name:result.data.display_name};
  }
}
