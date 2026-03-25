const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
const Bonjour = require('bonjour-hap');

const DISCOVERY_TIMEOUT_MS = 6000;

class AirQUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    this.onRequest('/discover', this.handleDiscover.bind(this));
    this.ready();
  }

  async handleDiscover() {
    return new Promise((resolve) => {
      const devices = [];
      const seen = new Set();
      const instance = Bonjour();
      const browser = instance.find({ type: 'http' });

      browser.on('up', (service) => {
        if (service.txt && service.txt.device === 'air-Q') {
          const fullId = service.txt.id;
          if (!fullId || seen.has(fullId)) {
            return;
          }
          seen.add(fullId);

          devices.push({
            name: service.txt.devicename || 'air-Q',
            shortId: fullId.substr(0, 5),
            fullId: fullId,
            ip: service.referer ? service.referer.address : service.host,
          });

          // Push each device as it's found so the UI can update in real-time
          this.pushEvent('device-found', devices[devices.length - 1]);
        }
      });

      setTimeout(() => {
        browser.stop();
        instance.destroy();
        resolve(devices);
      }, DISCOVERY_TIMEOUT_MS);
    });
  }
}

(() => new AirQUiServer())();
