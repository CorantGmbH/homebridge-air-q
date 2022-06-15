import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { AirQPlatformAccessory } from './platformAccessory';
import Bonjour from 'bonjour-hap';
import { performRequest } from './httpRequest';
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

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const browser = (Bonjour() as any).find({ type: 'http' });

    browser.on('up', this.foundAirQ.bind(this));

    // Check bonjour agains 5 seconds after launch
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
      const host = mdnsService.host;
      const name = mdnsService.txt.devicename;
      const serial = mdnsService.txt.id.substr(0, 10);
      const shortId = mdnsService.txt.id.substr(0, 5);
      const manufacturer = 'Corant GmbH';
      const ip = mdnsService.referer['address'];

      this.log.debug('Found', mdnsService.txt.device, '"'+name+'"; trying to set-up...');

      // choose the corresponding device from homebridge plugin configuration
      for (const i in this.config.airqList) {
        if (this.config.airqList[i].serialNumber === shortId) {

          // set password as defined in user configuration
          const password = this.config.airqList[i].password;

          // derive list of activated sensor from configuration of this device
          const sensorwish = Object.prototype.hasOwnProperty.call(this.config.airqList[i], 'sensors') ?
            this.config.airqList[i].sensors : {'configured': false};

          // connect to this air-Q to retrieve the missing configuration information
          performRequest({
            host: ip,
            path: '/config',
            method: 'GET',
          },
          password,
          )
            .then(response => {
              if (response) {
                const deviceType = response['type'];
                const firmware = response['air-Q-Software-Version'].split('_')[2];
                const hardware = response['air-Q-Software-Version'].split('_')[1];
                const sensorlist = response['sensors'];

                this.log.info('Found', mdnsService.txt.device, '"'+name+'"');
                this.log.info('\tmDNS Address:', host);
                this.log.info('\tIP Address:', ip);
                this.log.info('\tSerial Number:', serial);
                this.log.info('\tManufacturer:', manufacturer);
                this.log.info('\tFirmware Revision:', firmware);
                this.log.info('\tHardware Revision:', hardware);
                this.log.info('\tDevice Type:', deviceType);

                const device = {
                  displayName: name,
                  serialNumber: serial,
                  manufacturer: manufacturer,
                  firmwareRevision: firmware,
                  hardwareRevision: hardware,
                  deviceType: deviceType,
                  shortId: shortId,
                  ipAddress: ip,
                  sensorList: sensorlist,
                  sensorWishList: sensorwish,
                  password: password,
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
                  // as the bug message "Error: Cannot add a Service with the same UUID '...'
                  // and subtype '...' as another Service in this Accessory."
                  // could not be fixed yet, the device is removed from cache and then added again
                  // as a new device

                  this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
                  this.log.debug('Removed existing accessory from cache:', existingAccessory.displayName);

                }

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
            })
            .catch(error => {
              this.log.error(error);
            });
        }
      }
    }
  }
}
