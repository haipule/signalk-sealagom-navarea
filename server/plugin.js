const path = require('path');
const fs = require('fs');

const { readJsonSafe, writeFileAtomic } = require('./storage');
const { fetchNavareaMessages } = require('./sealagom');
const { buildHtml } = require('./html');

module.exports = function (app) {
  let stopRequested = false;
  let timer = null;

  // Cache für Webapp/API
  let last = {
    ts: null,
    navarea: null,
    totalCount: 0,
    newCount: 0,
    hasNew: false,
    html: null,
    error: null
  };

  function dataDir() {
    // SignalK plugin data directory
    // app.getDataDirPath() existiert normalerweise.
    const base = (typeof app.getDataDirPath === 'function')
      ? app.getDataDirPath()
      : path.join(process.cwd(), 'data');
    const dir = path.join(base, 'signalk-sealagom-navarea');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function seenFile(navarea) {
    return path.join(dataDir(), `seen_navarea${navarea}.json`);
  }

  function htmlFile(navarea) {
    return path.join(dataDir(), `navarea${navarea}.html`);
  }

  async function tick(settings) {
    const navarea = String(settings?.navarea ?? '4');
    const apiToken = String(settings?.apiToken ?? '');
    const titleText = `NAVAREA ${navarea}`;

    const seenPath = seenFile(navarea);
    const htmlPath = htmlFile(navarea);

    const seenObj = readJsonSafe(seenPath, { seenIds: [], updated: null });
    const seenIds = Array.isArray(seenObj.seenIds) ? seenObj.seenIds : [];

    const messages = await fetchNavareaMessages(navarea, apiToken);

    const built = buildHtml(messages, seenIds, titleText);

    // write HTML only if changed or if new
    writeFileAtomic(htmlPath, built.html);

    const newSeenObj = {
      seenIds: built.seenIds,
      updated: new Date().toISOString()
    };
    // nur schreiben wenn neue dazugekommen sind (oder Datei fehlte)
    if (built.hasNew || !fs.existsSync(seenPath)) {
      writeFileAtomic(seenPath, JSON.stringify(newSeenObj, null, 2));
    }

    last = {
      ts: new Date().toISOString(),
      navarea,
      totalCount: built.totalCount,
      newCount: built.newCount,
      hasNew: built.hasNew,
      html: built.html,
      error: null
    };

    app.debug(`${titleText}: messages=${built.totalCount} new=${built.newCount}`);
  }

  const plugin = {
    id: 'signalk-sealagom-navarea',
    name: 'Sealagom NAVAREA Warnings',
    description: 'Fetch + parse NAVAREA warnings von sealagom.com; Webapp Anzeige; basierend auf Node-RED Flow.',

    schema: {
      type: 'object',
      required: ['navarea', 'pollIntervalSec'],
      properties: {
        apiToken: {
          type: 'string',
          title: 'Sealagom API Token',
          default: ''
        },
        navarea: {
          type: 'string',
          title: 'NAVAREA',
          default: '4',
          enum: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21']
        },
        pollIntervalSec: {
          type: 'integer',
          title: 'Poll-Intervall (Sekunden)',
          default: 300,
          minimum: 30,
          maximum: 86400
        }
      }
    },

    start: function (settings, restartPlugin) {
      stopRequested = false;

      const navarea = String(settings?.navarea ?? '4');
      const pollIntervalSec = Number(settings?.pollIntervalSec ?? 300);

      // Webapp static
      if (typeof app.registerWebApp === 'function') {
        app.registerWebApp(plugin.id, path.join(__dirname, '..', 'public'));
      }

      // kleines JSON API für die Webapp
      // -> /plugins/signalk-sealagom-navarea/api/status
      // -> /plugins/signalk-sealagom-navarea/api/html
      if (app?.get && typeof app.get === 'function') {
        app.get(`/plugins/${plugin.id}/api/status`, (req, res) => {
          res.json(last);
        });

        app.get(`/plugins/${plugin.id}/api/html`, (req, res) => {
          if (!last.html) {
            res.status(404).send('No HTML yet. Wait for first fetch.');
            return;
          }
          res.setHeader('content-type', 'text/html; charset=utf-8');
          res.send(last.html);
        });
      }

      const run = async () => {
        if (stopRequested) return;
        try {
          await tick(settings);
        } catch (e) {
          last = {
            ...last,
            ts: new Date().toISOString(),
            navarea,
            error: String(e?.message || e)
          };
          app.error(e);
        }
      };

      run();
      timer = setInterval(run, pollIntervalSec * 1000);

      app.debug(`Started ${plugin.id} navarea=${navarea} poll=${pollIntervalSec}s dataDir=${dataDir()}`);
    },

    stop: function () {
      stopRequested = true;
      if (timer) clearInterval(timer);
      timer = null;
      app.debug(`Stopped ${plugin.id}`);
    }
  };

  return plugin;
};
