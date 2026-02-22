const fetch = require('node-fetch');

/**
 * Passe das an deine Flow-URL an.
 * Beispiele (Platzhalter):
 * - https://api.sealagom.com/navarea/4
 * - https://sealagom.com/api/navarea/4/messages
 */
const API_URL_TEMPLATE = (navarea) => `https://www.sealagom.com/api/v1/navarea/${navarea}`;

/**
 * Erwartet: JSON mit messages Array (wie im Flow).
 * Wenn dein Endpoint HTML liefert, brauchst du einen anderen Parser.
 */
async function fetchNavareaMessages(navarea, apiToken) {
  const url = API_URL_TEMPLATE(navarea);

  const headers = {};
  if (apiToken) {
    // häufige Varianten:
    // headers['Authorization'] = `Bearer ${apiToken}`;
    // headers['x-api-key'] = apiToken;
    headers['Authorization'] = `Bearer ${apiToken}`;
  }

  const res = await fetch(url, { headers });
  const ct = (res.headers.get('content-type') || '').toLowerCase();

  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error(`Sealagom fetch failed: ${res.status} ${res.statusText} body=${text.slice(0,200)}`);
  }

  // Falls JSON:
  if (ct.includes('application/json')) {
    const data = await res.json();
    // Je nach Struktur:
    // return data.messages || data || []
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.messages)) return data.messages;
    if (data && Array.isArray(data.data)) return data.data;
    throw new Error('Unexpected JSON shape from Sealagom API');
  }

  // Falls HTML/Text (noch nicht implementiert):
  const body = await res.text();
  throw new Error(`Unexpected content-type (${ct}). Need parser for HTML/text endpoint. First 200 chars: ${body.slice(0,200)}`);
}

module.exports = { fetchNavareaMessages };
