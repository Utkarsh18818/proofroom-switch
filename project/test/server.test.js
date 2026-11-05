import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../src/server.js';
import {request as httpRequest} from 'node:http';
import {transact} from '../src/store.js';

const fakeGateway={
 async login(email,password){if(email!=='operator@example.test'||password!=='test-password'){const e=new Error('Invalid credentials.');e.status=401;throw e;}return {cookie:'upstream=test-session',user:{id:'authenticated-operator',name:'Operator',email}};},
 async integrations(){return {switchHealthy:true,checks:{database:{healthy:true}},bridges:[]};},
 async connectDiscord(){throw new Error('External Discord calls disabled in tests.');}
};
async function fixture(run,options={}){
 const dir=await mkdtemp(join(tmpdir(),'proofroom-http-'));
 const server=await createApp({stateDir:dir,gateway:fakeGateway,exportDir:join(dir,'exports'),...options});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 let cookie='';
 async function request(path,body,headers={}){
  const response=await fetch(base+path,{...(body?{method:'POST',body:JSON.stringify(body)}:{}),headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers}});
  const set=response.headers.getSetCookie();if(set.length)cookie=set.map(c=>c.split(';')[0]).join('; ');
  return {status:response.status,data:await response.json()};
 }
 try{await run({request,dir,base});}
 finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
}
const login=request=>request('/api/login',{email:'operator@example.test',password:'test-password'});

test('HTTP workspace requires authentication and rejects cross-origin mutations',()=>fixture(async({request})=>{
 assert.equal((await request('/api/state')).status,401);
 assert.equal((await request('/api/login',{email:'wrong',password:'wrong'})).status,401);
 assert.equal((await login(request)).status,200);
 const {state}=(await request('/api/state')).data;
 assert.equal((await request('/api/action',{action:'propose',incidentId:state.id},{Origin:'https://unrelated.example'})).status,403);
 assert.equal((await request('/api/action',{action:'execute',incidentId:state.id})).status,400);
}));

test('HTTP recovery uses authenticated operator identity and verifies actual processing',()=>fixture(async({request})=>{
 await login(request);
 const {state}=(await request('/api/state')).data;
 const action=(name,extra={})=>request('/api/action',{action:name,incidentId:state.id,...extra});
 const proposal=(await action('propose')).data.result;
 assert.equal((await action('approve',{proposalId:proposal.id})).status,400);
 assert.equal((await action('review')).status,200);
 const approved=await action('approve',{proposalId:proposal.id,actor:'forged-identity'});
 assert.equal(approved.data.result.by,'authenticated-operator');
 assert.equal((await action('execute')).status,200);
 assert.equal((await action('verify')).data.result.recovered,false);
 assert.equal((await action('process')).data.result.processed,3);
 assert.equal((await action('verify')).data.result.recovered,true);
 assert.equal((await action('execute')).status,400);
 const exported=await request('/api/export');
 assert.equal(exported.data.environment,'controlled-local-exercise');
 assert.equal(exported.data.state.verification.recovered,true);
 assert.ok(!JSON.stringify(exported.data).includes('test-password'));
 const saved=await request('/api/export',{});
 assert.equal(saved.data.saved,true);
 assert.match(saved.data.file,/exports/);
}));

test('HTTP stale evidence is refused and new exercises preserve prior evidence',()=>fixture(async({request,dir})=>{
 await login(request);
 const {state}=(await request('/api/state')).data;
 const action=(name,extra={})=>request('/api/action',{action:name,incidentId:state.id,...extra});
 const proposal=(await action('propose')).data.result;
 await action('review');
 await transact(dir,s=>{s.worker.generation+=1;s.revision+=1;});
 assert.equal((await action('approve',{proposalId:proposal.id})).status,400);
 assert.equal((await action('new')).status,200);
 assert.equal((await readdir(join(dir,'archive'))).length,1);
 const history=(await request('/api/history')).data.records;
 assert.equal(history[0].id,state.id);
 assert.equal((await action('propose')).status,409);
}));

test('UI static assets return typed content without exposing runtime files',()=>fixture(async({base})=>{
 const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/ProofRoom/);
 const css=await fetch(base+'/style.css');assert.match(css.headers.get('content-type'),/text\/css/);
 assert.equal((await fetch(base+'/runtime/private/server-env.json')).status,404);
 const badHostStatus=await new Promise((resolve,reject)=>{const req=httpRequest(base+'/api/state',{headers:{Host:'untrusted.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();}); assert.equal(badHostStatus,403);
}));


test('HTTPS deployment pins public origin and sets Secure session cookies',()=>fixture(async({base})=>{
 async function publicRequest(path,origin='https://proofroom.example.test',host='proofroom.example.test'){
  return new Promise((resolve,reject)=>{
   const req=httpRequest(base+path,{method:'POST',headers:{Host:host,Origin:origin,'Content-Type':'application/json','X-Forwarded-Proto':'http'}},res=>{
    let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(text)}));
   });req.on('error',reject);req.end(JSON.stringify({email:'operator@example.test',password:'test-password'}));
  });
 }
 const valid=await publicRequest('/api/login');
 assert.equal(valid.status,200);
 assert.match(valid.headers['set-cookie'][0],/; Secure/);
 assert.match(valid.headers['set-cookie'][0],/HttpOnly; SameSite=Strict/);
 assert.equal((await publicRequest('/api/login','http://proofroom.example.test')).status,403);
 assert.equal((await publicRequest('/api/login','https://forged.example','forged.example')).status,403);
 const config=await (await fetch(base+'/api/config')).json();
 assert.deepEqual(config,{gatewayUrl:'https://switch.example.test/',hosted:true});
},{publicOrigin:'https://proofroom.example.test',gatewayPublicUrl:'https://switch.example.test'}));

test('sign-in throttling limits repeated attempts without calling upstream again',()=>fixture(async({request})=>{
 for(let n=0;n<10;n++)assert.equal((await request('/api/login',{email:'wrong',password:'wrong'})).status,401);
 assert.equal((await login(request)).status,429);
}));

test('deployment origins reject insecure or credential-bearing configuration',async()=>{
 await assert.rejects(createApp({publicOrigin:'http://public.example'}),/HTTPS origin/);
 await assert.rejects(createApp({publicOrigin:'https://public.example/path'}),/HTTPS origin/);
 await assert.rejects(createApp({gatewayPublicUrl:'https://user:password@public.example'}),/Gateway public URL/);
});
