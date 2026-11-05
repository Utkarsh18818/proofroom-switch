import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,join,extname,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {createIncident,observe,fingerprint,propose,review,approve,execute,processBatch,verify} from './recovery.js';
import {readState,transact} from './store.js';
import {Gateway} from './gateway.js';
const sourceRoot=dirname(fileURLToPath(import.meta.url));
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const json=(res,status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));};
async function body(req) {
  let text=''; for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>12000)throw new HttpError(413,'Request too large.');}
  try{return JSON.parse(text||'{}');}catch{throw new HttpError(400,'Invalid JSON request.');}
}
export async function createApp({stateDir=process.env.PROOFROOM_STATE_DIR||resolve(sourceRoot,'../.state'),gateway=new Gateway(process.env.SWITCH_GATEWAY_URL||undefined),publicDir=resolve(sourceRoot,'../web'),exportDir=process.env.PROOFROOM_EXPORT_DIR||resolve(sourceRoot,'../../deliverables'),publicOrigin=process.env.PROOFROOM_PUBLIC_ORIGIN||null,gatewayPublicUrl=process.env.PROOFROOM_GATEWAY_PUBLIC_URL||'http://127.0.0.1:8765'}={}) {
  const publicUrl=publicOrigin?new URL(publicOrigin):null;
  if(publicUrl && (publicUrl.protocol!=='https:' || publicUrl.username || publicUrl.password || publicUrl.pathname!=='/' || publicUrl.search || publicUrl.hash))throw new Error('PROOFROOM_PUBLIC_ORIGIN must be an HTTPS origin.');
  const gatewayUrl=new URL(gatewayPublicUrl);
  if(gatewayUrl.username || gatewayUrl.password || !(gatewayUrl.protocol==='https:' || (gatewayUrl.protocol==='http:' && ['127.0.0.1','localhost'].includes(gatewayUrl.hostname))))throw new Error('Gateway public URL must use HTTPS or local loopback.');
  const secureCookie=publicUrl?'; Secure':'';
  const loginAttempts=new Map();
  try{await readState(stateDir);}catch(error){if(error.code!=='ENOENT')throw error;await transact(stateDir,createIncident,{initialize:true});}
  const sessions=new Map();
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const port=server.address().port;
      const allowedHosts=['127.0.0.1:'+port,'localhost:'+port,...(publicUrl?[publicUrl.host]:[])];
      if(!allowedHosts.includes(req.headers.host))throw new HttpError(403,'Unknown host.');
      const origin=publicUrl && req.headers.host===publicUrl.host?publicUrl.origin:'http://'+req.headers.host;
      const path=new URL(req.url,origin).pathname;
      if(req.method==='POST' && req.headers.origin!==origin)throw new HttpError(403,'Request origin is not allowed.');
      const sessionId=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('proofroom_session='))?.slice(18);
      let session=sessions.get(sessionId);
      if(session && session.expires<Date.now()){sessions.delete(sessionId);session=null;}
      if(path==='/api/config'&&req.method==='GET')return json(res,200,{gatewayUrl:gatewayUrl.href,hosted:!!publicUrl});
      if(path==='/api/login'&&req.method==='POST'){
        const now=Date.now();
        for(const [id,value] of sessions)if(value.expires<now)sessions.delete(id);
        for(const [id,value] of loginAttempts)if(value.reset<now)loginAttempts.delete(id);
        // The listener is loopback-only. Caddy replaces client-supplied forwarding headers.
        const client=publicUrl?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').pop().trim():req.socket.remoteAddress;
        const attempt=loginAttempts.get(client)||{count:0,reset:now+60000};
        if(attempt.count>=10 || loginAttempts.size>=10000)throw new HttpError(429,'Too many sign-in attempts. Try again in one minute.');
        attempt.count+=1;loginAttempts.set(client,attempt);
        const input=await body(req);
        const login=await gateway.login(input.email,input.password);
        const token=randomBytes(32).toString('hex');
        sessions.set(token,{...login,expires:Date.now()+3600000});
        return json(res,200,{user:login.user},{'Set-Cookie':'proofroom_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600'+secureCookie});
      }
      if(path==='/api/session'&&req.method==='GET')return json(res,200,{user:session?.user||null});
      if(path.startsWith('/api/')){
        if(!session)throw new HttpError(401,'Sign in with your Switch account.');
        if(path==='/api/logout'&&req.method==='POST'){sessions.delete(sessionId);return json(res,200,{ok:true},{'Set-Cookie':'proofroom_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+secureCookie});}
        if(path==='/api/state'&&req.method==='GET'){
          const state=await readState(stateDir);
          return json(res,200,{state,observation:observe(state),evidenceHash:fingerprint(state),operator:session.user});
        }
        if(path==='/api/integrations'&&req.method==='GET')return json(res,200,await gateway.integrations(session.cookie));
        if(path==='/api/discord'&&req.method==='POST'){
          const input=await body(req);
          return json(res,200,await gateway.connectDiscord(session.cookie,input));
        }
        if(path==='/api/export'&&req.method==='POST'){
          await mkdir(exportDir,{recursive:true});
          const current=await readState(stateDir);
          const target=join(exportDir,'proofroom-'+current.id+'-'+Date.now()+'.json');
          await writeFile(target,JSON.stringify({exportedAt:new Date().toISOString(),environment:'controlled-local-exercise',state:current},null,2)+'\n',{flag:'wx'});
          return json(res,200,{saved:true,file:target});
        }
        if(path==='/api/export'&&req.method==='GET')return json(res,200,{exportedAt:new Date().toISOString(),environment:'controlled-local-exercise',state:await readState(stateDir)},{'Content-Disposition':'attachment; filename="proofroom-evidence.json"'});
        if(path==='/api/history'&&req.method==='GET'){
          const archive=join(stateDir,'archive');let names=[];try{names=await readdir(archive);}catch(e){if(e.code!=='ENOENT')throw e;}
          const records=await Promise.all(names.filter(n=>n.endsWith('.json')).map(async n=>{const s=JSON.parse(await readFile(join(archive,n),'utf8'));return {id:s.id,createdAt:s.createdAt,recovered:!!s.verification?.recovered,events:s.events.length};}));
          return json(res,200,{records:records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});
        }
        if(path==='/api/action'&&req.method==='POST'){
          const input=await body(req);
          const result=await transact(stateDir,async state=>{
            if(input.incidentId!==state.id)throw new HttpError(409,'This incident changed. Refresh and review the current evidence.');
            switch(input.action){
              case 'propose':return propose(state,'local-diagnostic');
              case 'review':return review(state,'local-reviewer');
              case 'approve':return approve(state,session.user.id,input.proposalId);
              case 'execute':return execute(state);
              case 'process':return processBatch(state);
              case 'verify':return verify(state);
              case 'new':{
                const archive=join(stateDir,'archive');await mkdir(archive,{recursive:true});
                await writeFile(join(archive,state.id+'.json'),JSON.stringify(state,null,2)+'\n',{flag:'wx'});
                const replacement=createIncident();Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,replacement);
                return {id:state.id};
              }
              default:throw new HttpError(400,'Unknown recovery action.');
            }
          });
          return json(res,200,{result});
        }
        throw new HttpError(404,'Endpoint not found.');
      }
      if(req.method!=='GET'&&req.method!=='HEAD')throw new HttpError(405,'Method not allowed.');
      const staticFiles={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/fonts/display.woff2':'fonts/display.woff2','/favicon.svg':'favicon.svg'};
      if(!staticFiles[path])throw new HttpError(404,'Page not found.');
      const data=await readFile(join(publicDir,staticFiles[path]));
      const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml'};
      res.writeHead(200,{'Content-Type':types[extname(staticFiles[path])],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){json(res,error.status||((error.message||'').includes('lock')?409:400),{error:error.message||'Request failed.'});}
  });
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const server=await createApp();
  server.listen(Number(process.env.PROOFROOM_PORT||4173),'127.0.0.1',()=>console.log('ProofRoom: http://127.0.0.1:'+server.address().port));
}
