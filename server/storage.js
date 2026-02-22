const fs = require('fs');
const path = require('path');

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const txt = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return fallback;
  }
}

function writeFileAtomic(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, filePath);
}

module.exports = { readJsonSafe, writeFileAtomic };
