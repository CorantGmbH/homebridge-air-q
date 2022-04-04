import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { AirQPlatformAccessory } from './platformAccessory';

import { performRequest } from './httpRequest';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class AirQPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    const bonjour = require('bonjour-hap')();
    const browser = bonjour.find({ type: 'http' });

    browser.on('up', this.foundAirQ.bind(this));

    // Check bonjour again 5 seconds after launch
    setTimeout(() => {
      browser.update();
    }, 5000);

    // Check bonjour every 60 seconds
    setInterval(() => {
      browser.update();
    }, 60000);
  }

  foundAirQ(mdnsService) {
    if (mdnsService.txt.device && mdnsService.txt.device === 'air-Q') {
      const HOST = mdnsService.host;
      const NAME = mdnsService.txt.devicename;
      const SERIAL = mdnsService.txt.id.substr(0, 10);
      const SHORTID = mdnsService.txt.id.substr(0, 5).toUpperCase();
      const MANUFACTURER = 'Corant GmbH';

      // choose the corresponding password from homebridge plugin configuration
      // TODO:
      // -> gehe die konfigurierten short IDs durch und schaue, welche zu SHORTID
      // passt -> wähle das zugehörige Passwort
      const PASSWORD = this.config.password1;

      // connect to this air-Q to retrieve the missing configuration information
      performRequest({
        host: mdnsService.host,
        path: '/config',
        method: 'GET',
      },
      PASSWORD,
      )
        .then(response => {
          if (response) {
            const DEVICETYPE = response['type'];
            const FIRMWARE = response['air-Q-Software-Version'].split('_')[2];
            const HARDWARE = response['air-Q-Software-Version'].split('_')[1];
            const IP = response['WLAN config']['IP address'];

            this.log.info('Found', mdnsService.txt.device, '"'+NAME+'"');
            this.log.info('\tmDNS Address:', HOST);
            this.log.info('\tIP Address:', IP);
            this.log.info('\tSerial Number:', SERIAL);
            this.log.info('\tManufacturer:', MANUFACTURER);
            this.log.info('\tFirmware Revision:', FIRMWARE);
            this.log.info('\tHardware Revision:', HARDWARE);
            this.log.info('\tDevice Type:', DEVICETYPE);

            const device = {
              displayName: NAME,
              serialNumber: SERIAL,
              manufacturer: MANUFACTURER,
              firmwareRevision: FIRMWARE,
              hardwareRevision: HARDWARE,
              deviceType: DEVICETYPE,
              shortId: SHORTID,
            };

            // generate a unique id for the accessory this should be generated from
            // something globally unique, but constant, for example, the device serial
            // number or MAC address
            const uuid = this.api.hap.uuid.generate(mdnsService.txt.id);
            this.log.info('\tUUID:', uuid);

            // see if an accessory with the same uuid has already been registered and restored from
            // the cached devices we stored in the `configureAccessory` method above
            const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

            if (existingAccessory) {
              // the accessory already exists
              this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

              // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
              existingAccessory.context.device = device;
              this.api.updatePlatformAccessories([existingAccessory]);

              // create the accessory handler for the restored accessory
              // this is imported from `platformAccessory.ts`
              new AirQPlatformAccessory(this, existingAccessory);

              // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
              // remove platform accessories when no longer present
              // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
              // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
            } else {
              // the accessory does not yet exist, so we need to create it
              this.log.info('Adding new accessory:', device.displayName);

              // create a new accessory
              const accessory = new this.api.platformAccessory(device.displayName, uuid);

              // store a copy of the device object in the `accessory.context`
              // the `context` property can be used to store any data about the accessory you may need
              accessory.context.device = device;

              // create the accessory handler for the newly create accessory
              // this is imported from `platformAccessory.ts`
              new AirQPlatformAccessory(this, accessory);

              // link the accessory to your platform
              this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
          }
        })
        .catch(error => {
          this.log.error(error);
        });
    }
  }
}
