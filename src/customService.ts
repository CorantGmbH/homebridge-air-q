/** As mentioned in https://github.com/homebridge/homebridge/issues/2740
* Not used, however, as it isn't supported by HomeKit
**/
import { Characteristic, Service, Perms, Formats } from 'hap-nodejs';

export class AirPressureLevel extends Characteristic {
    static readonly UUID: string = 'E863F10F-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Air Pressure', AirPressureLevel.UUID, {
        format: Formats.UINT16,
        unit: 'mbar',
        minValue: 700,
        maxValue: 1300,
        minStep: 0.5,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
}

export class AirPressureService extends Service {
    static UUID = '00A00084-0000-1000-8000-0026BB765291';

    constructor(displayName: string, subtype?: string) {
      super(displayName, AirPressureService.UUID, subtype);

      this.addCharacteristic(AirPressureLevel)
      this.addOptionalCharacteristic(Characteristic.StatusActive);
    }
}
