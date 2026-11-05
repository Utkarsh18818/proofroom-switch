import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
const root = 'A:/FlipTheSwitch/runtime/private';
mkdirSync(root, {recursive:true});
if (existsSync(root+'/server-env.json')) throw new Error('Configuration already exists; refusing to rotate secrets.');
const secret = () => randomBytes(32).toString('hex');
const ownerPassword = secret();
const runtimePassword = secret();
const config = {
 DB_HOST:'127.0.0.1', DB_PORT:'55437', DB_NAME:'proofroom_switch',
 DB_USER:'proofroom_app', DB_PASSWORD:runtimePassword,
 DB_OWNER_USER:'proofroom_owner', DB_OWNER_PASSWORD:ownerPassword,
 ID_SERVER_NAME:'proofroom.local', AGENT_REGISTRATION_TOKEN:secret(),
 SECRET_KEYS:'local1:'+secret(),
 GATEWAY_ADMIN_EMAIL:'operator@proofroom.local', GATEWAY_ADMIN_PASSWORD:secret(),
 SERVER_HOST:'127.0.0.1', SERVER_PORT:'8765',
 COLLABORATION_CALLBACK_HOST:'127.0.0.1', COLLABORATION_CALLBACK_PORT:'8766',
 GATEWAY_COOKIE_SECURE:'false', GATEWAY_SIGNUP_ENABLED:'false',
 GATEWAY_PUBLIC_URL:'http://127.0.0.1:8765',
 FRONTEND_BASE_URL:'http://127.0.0.1:8765',
 TELEMETRY_ENABLED:'false', THIRD_PARTY_AVATARS_ENABLED:'false',
 MEDIA_DIR:'A:/FlipTheSwitch/runtime/media',
 FEATURE_FLAGS_ENABLED:''
};
writeFileSync(root+'/server-env.json', JSON.stringify(config,null,2)+'\n', {flag:'wx'});
writeFileSync(root+'/pg-password.txt', ownerPassword+'\n', {flag:'wx'});
writeFileSync(root+'/init-database.sql', "CREATE ROLE proofroom_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '"+runtimePassword+"';\nCREATE DATABASE proofroom_switch OWNER proofroom_owner;\n", {flag:'wx'});
console.log('Generated new local credentials on A:; values not printed.');
