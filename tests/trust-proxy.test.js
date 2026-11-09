/**
 * Trust-Proxy-Tests E-01
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifiziert, dass `app.set('trust proxy', 2)` unter der
 * Render + Cloudflare-Topologie die korrekte Client-IP liefert
 * und nicht durch gefälschte X-Forwarded-For-Einträge manipuliert werden kann.
 *
 * Topologie:   Client → Cloudflare Edge → Render LB → App
 * XFF im App:  "real_client_ip, cloudflare_edge_ip"
 * socket:      render_lb_ip (127.0.0.1 im Test)
 *
 * proxy-addr baut Adresskette:
 *   addrs = [socket, ...XFF_reversed]
 *         = [render_lb, cloudflare_edge, real_client_ip]
 *
 * trust proxy: 2 → req.ip = addrs[2] = real_client_ip  ✓
 * trust proxy: 1 → req.ip = addrs[1] = cloudflare_edge ✗  (Cloudflare-IP, nicht Client)
 * trust proxy: 3 → req.ip = addrs[3] = angreifer-IP    ✗  (Spoof-gefährdet)
 *
 * Spoof-Schutz mit trust proxy: 2:
 *   Cloudflare setzt XFF an seiner Edge neu und verwirft alle upstream-Einträge.
 *   Die zwei rechten Hops sind daher immer Cloudflare-Edge + Render-LB —
 *   kein Angreifer kann dort eine IP einschleusen. Trust:3 wäre gefährdet,
 *   weil der dritte rechte Hop dann aus dem vom Client gesendeten XFF stammt.
 *
 * Testfall-Übersicht:
 *   TP-01  trust proxy: 2 → req.ip = echte Client-IP
 *   TP-02  trust proxy: 2 → Spoof-Eintrag links wird ignoriert
 *   TP-03  trust proxy: 2 → kein XFF → req.ip = socket-IP (Render LB)
 *   TP-04  trust proxy: 1 → req.ip = Cloudflare-IP (zu niedrig, Negativ-Test)
 *   TP-05  trust proxy: 3 → req.ip = gefälschte IP (zu hoch, Negativ-Test)
 *   TP-06  Haupt-App: app.get('trust proxy') === 2
 */

import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';

// ─── Testdaten (RFC 5737 / RFC 3927) ─────────────────────────────────────────

// Echte Client-IP (Cloudflare setzt diese im XFF)
const REAL_CLIENT_IP  = '203.0.113.42';
// Cloudflare-Edge-IP (Render LB hängt diese an)
const CLOUDFLARE_EDGE = '104.21.1.1';
// Normaler XFF, wie er im App ankommt
const XFF_NORMAL      = `${REAL_CLIENT_IP}, ${CLOUDFLARE_EDGE}`;

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Erstellt eine minimale Express-App mit einer /ip-Route die req.ip zurückgibt */
function makeApp(trustProxy) {
  const app = express();
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  return app;
}

function startServer(app) {
  return new Promise(resolve => {
    const server = createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function stopServer(server) {
  return new Promise(resolve => server.close(resolve));
}

async function getIp(port, xff) {
  const headers = xff !== null ? { 'X-Forwarded-For': xff } : {};
  const res = await fetch(`http://127.0.0.1:${port}/ip`, { headers });
  const { ip } = await res.json();
  return ip;
}

// ─── Tests: trust proxy: 2 (korrekte Einstellung für Render+Cloudflare) ─────

describe('trust proxy: 2 — Render + Cloudflare (2 Hops)', () => {
  let server, port;

  before(async () => {
    server = await startServer(makeApp(2));
    port = server.address().port;
  });

  after(async () => { await stopServer(server); });

  it('TP-01: req.ip ist die echte Client-IP, nicht die Cloudflare-IP', async () => {
    const ip = await getIp(port, XFF_NORMAL);
    assert.equal(ip, REAL_CLIENT_IP,
      `req.ip sollte ${REAL_CLIENT_IP} sein, erhalten: ${ip}`);
  });

  it('TP-02: Gefälschter zusätzlicher XFF-Eintrag links wird ignoriert', async () => {
    // Angreifer schickt vorab eine eigene IP ganz links im XFF.
    // Trust:2 vertraut exakt 2 Hops → nimmt 3. Eintrag von rechts = real_client_ip.
    // Der Spoof-Eintrag liegt weiter links und wird nicht vertraut.
    const ATTACKER_IP = '192.0.2.1';
    const spoofedXff  = `${ATTACKER_IP}, ${REAL_CLIENT_IP}, ${CLOUDFLARE_EDGE}`;
    const ip = await getIp(port, spoofedXff);
    assert.equal(ip, REAL_CLIENT_IP,
      `Spoofing sollte ignoriert werden. req.ip sollte ${REAL_CLIENT_IP} sein, erhalten: ${ip}`);
  });

  it('TP-03: Ohne XFF liefert req.ip die socket-IP (Render LB / loopback im Test)', async () => {
    // Direktanfrage ohne Proxy-Header → socket.remoteAddress = 127.0.0.1
    const ip = await getIp(port, null);
    assert.equal(ip, '127.0.0.1',
      `Ohne XFF sollte req.ip = 127.0.0.1 (socket) sein, erhalten: ${ip}`);
  });
});

// ─── Negativ-Test: trust proxy: 1 (zu niedrig) ───────────────────────────────

describe('trust proxy: 1 — zu niedrig, liefert Cloudflare-IP', () => {
  let server, port;

  before(async () => {
    server = await startServer(makeApp(1));
    port = server.address().port;
  });

  after(async () => { await stopServer(server); });

  it('TP-04: trust proxy: 1 liefert Cloudflare-Edge-IP statt Client-IP (zeigt Fehler auf)', async () => {
    const ip = await getIp(port, XFF_NORMAL);
    // Dieser Test dokumentiert das falsche Verhalten bei trust:1 —
    // er ist ein Negativ-Test: hier wird das Fehlverhalten bestätigt.
    assert.equal(ip, CLOUDFLARE_EDGE,
      `Trust:1 sollte Cloudflare-IP ${CLOUDFLARE_EDGE} liefern, erhalten: ${ip}`);
  });
});

// ─── Negativ-Test: trust proxy: 3 (zu hoch, Spoof-gefährdet) ─────────────────

describe('trust proxy: 3 — zu hoch, anfällig für IP-Spoofing', () => {
  let server, port;

  before(async () => {
    server = await startServer(makeApp(3));
    port = server.address().port;
  });

  after(async () => { await stopServer(server); });

  it('TP-05: trust proxy: 3 erlaubt gefälschte Client-IP (zeigt Spoof-Gefahr auf)', async () => {
    // Angreifer stellt eine Fake-IP ganz links in den XFF.
    // addrs = [socket=127.0.0.1, cloudflare_edge, real_client, attacker]
    // Trust:3 → skip 3 → addrs[3] = ATTACKER_IP
    const ATTACKER_IP = '10.0.0.1';
    const spoofedXff  = `${ATTACKER_IP}, ${REAL_CLIENT_IP}, ${CLOUDFLARE_EDGE}`;
    const ip = await getIp(port, spoofedXff);
    // Dieser Test dokumentiert das gefährliche Verhalten bei trust:3
    assert.equal(ip, ATTACKER_IP,
      `Trust:3 ist spoof-gefährdet: erhalten ${ip}, erwartet ${ATTACKER_IP} (Angreifer-IP)`);
  });
});

// ─── Haupt-App: Einstellung verifizieren ─────────────────────────────────────

describe('Haupt-App: trust proxy korrekt konfiguriert', () => {
  let app;

  before(async () => {
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-trust-proxy';
    process.env.NODE_ENV = 'test';
    const mod = await import('../server/index.js');
    app = mod.app;
  });

  it('TP-06: app.get("trust proxy") ist auf 2 gesetzt', () => {
    const val = app.get('trust proxy');
    assert.equal(val, 2,
      `Erwartet trust proxy: 2, erhalten: ${val}. Prüfe app.set('trust proxy', 2) in server/index.js`);
  });
});
