import {createApp} from '../../project/src/server.js';
const origin=process.env.RENDER_EXTERNAL_URL;
if(!origin?.startsWith('https://'))throw new Error('Render HTTPS origin is required.');
const gatewayUrl=process.env.SWITCH_GATEWAY_URL;
if(!gatewayUrl?.startsWith('https://'))throw new Error('A public HTTPS Switch URL is required.');
const app=await createApp({publicOrigin:origin,gatewayPublicUrl:gatewayUrl});
app.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('ProofRoom HTTPS service ready.'));
