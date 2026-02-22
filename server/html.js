function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function prettifyContent(content){
  let t = String(content || "").replaceAll("↵", "\n").trim();
  t = t.replace(/(\))\s+(UNLIT\b)/g, "$1\n$2");
  t = t.replace(/(\))\s+(WIDE BERTH REQUESTED\b)/g, "$1\n$2");
  return t;
}

function buildHtml(messages, seenIds, titleText) {
  const sorted = [...(messages || [])].sort((a,b) => String(b.added_on).localeCompare(String(a.added_on)));

  const seenSet = new Set(Array.isArray(seenIds) ? seenIds : []);
  const newOnes = sorted.filter(m => m && !seenSet.has(m.id));

  let html = "";
  html += `<!doctype html><html><head><meta charset="utf-8"/>`;
  html += `<meta name="viewport" content="width=device-width, initial-scale=1"/>`;
  html += `<title>${esc(titleText)}</title>`;
  html += `<style>body{font-family:system-ui,Arial,sans-serif;margin:12px} .meta{opacity:.7} pre{white-space:pre-wrap} .msg{margin:10px 0}</style>`;
  html += `</head><body>`;
  html += `<h2>${esc(titleText)}</h2>`;
  html += `<div class="meta">Messages: ${sorted.length} | New: ${newOnes.length} | Fetch: ${new Date().toISOString()}</div>`;
  html += `<hr/>`;

  for (const m of sorted) {
    const num = m.number || ("ID " + m.id);
    const date = m.added_on || "";
    const text = prettifyContent(m.content);
    html += `<div class="msg">`;
    html += `<div><b>${esc(num)}</b> <span class="meta">${esc(date)}</span></div>`;
    html += `<pre>${esc(text)}</pre>`;
    html += `</div><hr/>`;
  }

  html += `</body></html>`;

  if (newOnes.length) {
    for (const m of newOnes) seenSet.add(m.id);
  }

  return {
    html,
    hasNew: newOnes.length > 0,
    newCount: newOnes.length,
    totalCount: sorted.length,
    seenIds: Array.from(seenSet).sort((a,b) => (a-b))
  };
}

module.exports = { buildHtml };
