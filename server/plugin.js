const path = require('path')

module.exports = function (app) {
  let stopRequested = false
  let timer = null

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
          description: 'Token für sealagom.com (wird in SignalK Plugin Config gespeichert).',
          default: ''
        },
        navarea: {
          type: 'string',
          title: 'NAVAREA',
          description: 'Welche NAVAREA soll abgefragt werden?',
          default: '4',
          enum: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21']
        },
        pollIntervalSec: {
          type: 'integer',
          title: 'Poll-Intervall (Sekunden)',
          description: 'Wie oft sollen neue Warnings geholt werden?',
          default: 300,
          minimum: 30,
          maximum: 86400
        }
      }
    },

    start: function (settings, restartPlugin) {
      stopRequested = false

      const navarea = (settings && settings.navarea) ? String(settings.navarea) : '4'
      const pollIntervalSec = (settings && settings.pollIntervalSec) ? Number(settings.pollIntervalSec) : 300

      app.debug(`Starting ${plugin.id} navarea=${navarea} poll=${pollIntervalSec}s`)

      // Webapp: /plugins/signalk-sealagom-navarea/  (SignalK reverse-proxyed das)
      // Wichtig: Das ist der übliche Weg; je nach SignalK-Version ist registerWebApp verfügbar.
      if (typeof app.registerWebApp === 'function') {
        app.registerWebApp(plugin.id, path.join(__dirname, '..', 'public'))
      } else {
        app.debug('app.registerWebApp not available in this SignalK version (ok for now)')
      }

      // Timer nur als Platzhalter (API holen bauen wir als nächstes)
      const tick = async () => {
        if (stopRequested) return
        app.debug(`Tick: would fetch NAVAREA ${navarea} now`)
      }

      // Sofort 1x, dann periodisch
      tick().catch(err => app.error(err))
      timer = setInterval(() => tick().catch(err => app.error(err)), pollIntervalSec * 1000)
    },

    stop: function () {
      stopRequested = true
      if (timer) clearInterval(timer)
      timer = null
      app.debug(`Stopped ${plugin.id}`)
    }
  }

  return plugin
}
