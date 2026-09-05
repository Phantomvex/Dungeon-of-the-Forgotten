# Play Together

## Room Codes

1. Open the same game version on two devices. For the default room service, keep both devices connected to the internet. Using the same Wi-Fi usually makes the direct connection simpler.
2. Choose **Play Together**, select an owned hero, and enter a display name.
3. One player chooses **Create Party** and shares the six-character code.
4. The other player enters that code and chooses **Join**.
5. Select a dungeon unlocked in both saves. Both players ready up, then the host starts the quest.

The host runs the shared world. The guest sends controls over a reliable WebRTC data channel and receives world snapshots. You see each other, fight the same enemies, open the same chests, and receive shared currency and XP in your own saves. Either player can pause. Both must finish or skip the boss dialogue before combat begins. The host advances floors. Stand near a downed companion and Interact to revive them; if both heroes fall, the run ends.

Rooms are limited to two players. Keep the host's tab open and active. Host migration, joining a quest already in progress, automatic reconnect, and public matchmaking are not implemented. A disconnected quest pauses, and each player can end it while keeping their last confirmed progression.

## Network Limits

The default uses PeerJS's public signaling service to exchange connection details. Gameplay is sent over WebRTC, not simulated locally in two unrelated games. Depending on NAT and the browser's ICE configuration, WebRTC may establish a direct connection or use a relay. A room code is an invitation, not an account password.

Browsers cannot scan a Wi-Fi network or reliably establish that another browser is on the same router. This game does not claim automatic LAN discovery. Some guest networks isolate devices from each other, and some firewalls block WebRTC. The UI displays real connection errors and timeouts rather than pretending a connection succeeded.

Play with people you trust. This is peer-hosted family co-op, not an anti-cheat-protected competitive server. The host is authoritative, and account progression remains local.

## Optional Offline LAN Server

`server/lan.mjs` serves the production game and a private PeerServer on one machine. Install the project dependencies and create the production build first. Then start it with `node server/lan.mjs`.

The script prints the machine's LAN game URL and its signaling URL, usually `http://YOUR-LAN-IP:9000/peerjs`. Allow this port through the host computer's firewall. Both devices must open the LAN game URL and enter the same signaling URL under **Advanced: use your own LAN signaling server** before creating or joining a room.

For phones and browsers that require a secure context, provide `TLS_KEY` and `TLS_CERT` environment variables pointing to PEM files for a certificate trusted by both devices. This starts HTTPS/WSS. An HTTPS game page cannot connect to an insecure HTTP signaling endpoint. The optional `PORT` environment variable changes the default port of 9000.

With the game hosted locally, a trusted HTTPS setup, and the local signaling URL selected, public signaling and STUN servers are not required. Devices still need to be allowed to communicate over the LAN. Certificate creation, trust installation, and router/firewall configuration are your responsibility; the game cannot bypass browser security.

## Verification Status

The frontend production build is verified. The supplied environment does not provide two browsers or devices, so actual WebRTC connectivity, LAN-server startup, touch behavior, and live co-op latency still need a two-device playtest.