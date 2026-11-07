"""Native Render startup. Fresh cloud credentials; local secrets are never copied."""
import asyncio, os, re
from pathlib import Path
from urllib.parse import urlsplit,unquote
import asyncpg
base=Path.cwd()
u=urlsplit(os.environ["RENDER_DATABASE_URL"])
os.environ.update(DB_HOST=u.hostname, DB_PORT=str(u.port or 5432), DB_NAME=u.path.lstrip("/"), DB_OWNER_USER=unquote(u.username), DB_OWNER_PASSWORD=unquote(u.password), DB_USER="proofroom_runtime", DB_SSL_MODE="require", DB_REQUIRE_RESTRICTED_ROLE="true", ID_SERVER_NAME="proofroom.render", SECRET_KEYS="render1:"+os.environ["SWITCH_SECRET_MATERIAL"], SERVER_HOST="0.0.0.0", SERVER_PORT=os.environ.get("PORT","10000"), GATEWAY_COOKIE_SECURE="true", GATEWAY_SIGNUP_ENABLED="false", TELEMETRY_ENABLED="false", THIRD_PARTY_AVATARS_ENABLED="false", GATEWAY_UI_DIR=str(base/".render/switch/gateway/dist"), MEDIA_DIR="/tmp/proofroom-media", COLLABORATION_CALLBACK_HOST="127.0.0.1", COLLABORATION_CALLBACK_PORT="8766", FEATURE_FLAGS_ENABLED="agent_management")
url=os.environ["RENDER_EXTERNAL_URL"]
os.environ.update(GATEWAY_PUBLIC_URL=url, FRONTEND_BASE_URL=url)
async def setup():
    password=os.environ["DB_PASSWORD"]
    if not re.fullmatch(r"[A-Za-z0-9+/=_-]{32,}",password): raise RuntimeError("Use a Render-generated runtime database password")
    c=await asyncpg.connect(host=u.hostname,port=u.port or 5432,database=u.path.lstrip("/"),user=unquote(u.username),password=unquote(u.password),ssl="require")
    try:
        if not await c.fetchval("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='proofroom_runtime')"):
            await c.execute("CREATE ROLE proofroom_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '"+password+"'")
        else:
            # Do not rotate or broaden an existing role during an ordinary restart.
            ok=await asyncpg.connect(host=u.hostname,port=u.port or 5432,database=u.path.lstrip("/"),user="proofroom_runtime",password=password,ssl="require")
            await ok.close()
    finally: await c.close()
asyncio.run(setup())
os.chdir(base/".render/switch")
os.execv(str(base/".render/switch/core/.venv/bin/python"),["python","-m","switch_core.main"])
