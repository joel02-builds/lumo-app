const NETWORK_ERROR = 'Lumo kommt gerade nicht durch. Prüf kurz deine Internetverbindung und versuch es nochmal.';
const GENERIC_ERROR = 'Hier ist gerade etwas schiefgelaufen. Lass es uns nochmal versuchen.';
const TIMEOUT_ERROR = 'Lumo braucht einen Moment länger. Warte kurz oder versuch es nochmal.';
const OFFLINE_ERROR = 'Du bist gerade offline. Lumo braucht eine Verbindung zum Lernen.';

const TIMEOUT_MS = 30000;

async function post(path, body) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(OFFLINE_ERROR);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(TIMEOUT_ERROR);
    }
    throw new Error(NETWORK_ERROR);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let message = GENERIC_ERROR;
    try {
      const errBody = await res.json();
      if (errBody?.error) message = errBody.error;
    } catch {
      // keep generic message
    }
    throw new Error(message);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(GENERIC_ERROR);
  }
  return json.data;
}

export const lumoApi = {
  analyzeMaterial: (payload) => post('/api/analyze', payload),
  explainChat: (payload) => post('/api/explain-chat', payload),
  getUnderstandingHint: (payload) => post('/api/understanding-hint', payload),
  evaluateUnderstanding: (payload) => post('/api/evaluate-understanding', payload),
};
