# Discord setup — user action

The Docker-free Switch server is now available at http://127.0.0.1:8765.
No public tunnel is needed: Switch opens an outbound connection to Discord.

Use a dedicated Discord test server you control.
1. Open https://discord.com/developers/applications and create an application.
2. In Bot, enable Server Members Intent and Message Content Intent; save changes.
3. Obtain the bot token. If Discord requires resetting it, perform that action
   yourself in the portal. Never send the token in chat.
4. In OAuth2 URL Generator, choose bot and applications.commands.
5. Select the official Switch permissions: View Channels, Send Messages,
   Send Messages in Threads, Manage Webhooks, Manage Channels, Manage Roles,
   Read Message History, Attach Files. Add Reactions supports work-status signals.
   Do not grant Administrator.
6. Open the generated invite URL and authorize it for the test server yourself.
7. Enable Developer Mode in Discord; copy the test server's ID.
8. Copy A:/FlipTheSwitch/runtime/private/discord.example.json to discord.json
   in the same private directory and fill token/server ID locally, or use the
   local Gateway's messaging-app form directly.
9. Tell the assistant only that the local file is ready. Do not paste its contents.

The official permission list permits room/channel provisioning and per-agent
webhooks. Use a test server with no unrelated private conversations.
Connecting the bridge will contact Discord and may register commands; it should be
performed only after the user authorizes that specific connection.

After connection, link the human Discord account to the local Switch user.
Post an ordinary message in the chosen channel before trying invite commands;
that first message creates the Switch room.
Then validate live human-to-agent and agent-to-agent handoff.

Official source:
https://docs.switchagents.ai/switch-rooms/deploy/messaging-apps/discord
