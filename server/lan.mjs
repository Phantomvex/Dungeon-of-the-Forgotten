import express from 'express';
import { ExpressPeerServer } from 'peer';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const port = Number(process.env.PORT || 9000);
const app = express();
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
if (!existsSync(`${dist}/index.html`)) {
  throw new Error('The production build is missing. Build the game before starting the LAN server.');
}
const secure = Boolean(process.env.TLS_KEY && process.env.TLS_CERT);
const server = secure
  ? createHttpsServer({ key: readFileSync(process.env.TLS_KEY), cert: readFileSync(process.env.TLS_CERT) }, app)
  : createHttpServer(app);

// Room codes are explicit invitations. Peer discovery and public peer lists stay disabled.
app.use('/peerjs', ExpressPeerServer(server, { path: '/', allow_discovery: false, concurrent_limit: 32 }));
app.use(express.static(dist, { etag: true, maxAge: 0 }));
server.listen(port, '0.0.0.0', () => {
  const scheme = secure ? 'https' : 'http';
  console.info(`Game and LAN signaling are listening on ${scheme}://localhost:${port}`);
  for (const addresses of Object.values(networkInterfaces())) for (const address of addresses || []) {
    if (!address.internal && address.family === 'IPv4') console.info(`LAN game: ${scheme}://${address.address}:${port} | Signaling: ${scheme}://${address.address}:${port}/peerjs`);
  }
  if (!secure) console.info('For phones and browsers requiring secure WebRTC, set TLS_KEY and TLS_CERT to a certificate trusted by both devices.');
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));