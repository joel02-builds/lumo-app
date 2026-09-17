const PING_INTERVAL_MS = 10 * 60 * 1000; // alle 10 Minuten

export function startKeepAlive() {
  const ping = async () => {
    try {
      await fetch('/api/health', { method: 'GET' });
    } catch {}
  };

  ping();
  return setInterval(ping, PING_INTERVAL_MS);
}
