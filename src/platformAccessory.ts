import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { AirQPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AirQPlatformAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
    Brightness: 100,
  };

  constructor(
    private readonly platform: AirQPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Corant GmbH')
      .setCharacteristic(this.platform.Characteristic.Model, 'air-Q')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    // add temperature sensor
    this.service = this.accessory.getService(this.platform.Characteristic.Name) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, this.platform.Characteristic.Name, 'YourUniqueIdentifier-1');
    // bind temperature sensor service to read function
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getTemperature.bind(this));

    // add humidty sensor
    const humidtySensorService = this.accessory.getService(this.platform.Characteristic.Name) ||
      this.accessory.addService(this.platform.Service.HumiditySensor, this.platform.Characteristic.Name, 'YourUniqueIdentifier-2');
    // bind temperature sensor service to read function
    humidtySensorService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getHumidity.bind(this));

    // add CO2 sensor
    const co2SensorService = this.accessory.getService(this.platform.Characteristic.Name) ||
      this.accessory.addService(this.platform.Service.CarbonDioxideSensor, this.platform.Characteristic.Name, 'YourUniqueIdentifier-3');
    // bind CO2 sensor service to read function
    co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
      .onGet(this.getCO2level.bind(this));
    co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideDetected)
      .onGet(this.getCO2detected.bind(this));

    // add CO sensor
    const coSensorService = this.accessory.getService(this.platform.Characteristic.Name) ||
      this.accessory.addService(this.platform.Service.CarbonMonoxideSensor, this.platform.Characteristic.Name, 'YourUniqueIdentifier-4');
    // bind CO2 sensor service to read function
    coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideLevel)
      .onGet(this.getCOlevel.bind(this));
    coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected)
      .onGet(this.getCOdetected.bind(this));

    // add air quality sensor for not individually possible values
    const airQualitySensorService = this.accessory.getService(this.platform.Characteristic.Name) ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, this.platform.Characteristic.Name, 'YourUniqueIdentifier-5');
    // bind air quality sensor characteristic
    airQualitySensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getAirQuality.bind(this));
    // bind air quality sensor service to NO2 sensor
    airQualitySensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
      .onGet(this.getNO2level.bind(this));
    // bind air quality sensor service to O3 sensor
    airQualitySensorService.getCharacteristic(this.platform.Characteristic.OzoneDensity)
      .onGet(this.getO3level.bind(this));
    // bind air quality sensor service to SO2 sensor
    airQualitySensorService.getCharacteristic(this.platform.Characteristic.SulphurDioxideDensity)
      .onGet(this.getSO2level.bind(this));
    // bind air quality sensor service to VOC sensor
    airQualitySensorService.getCharacteristic(this.platform.Characteristic.VOCDensity)
      .onGet(this.getVOClevel.bind(this));
    // bind air quality sensor service to PM2.5 sensor
    airQualitySensorService.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .onGet(this.getPM2_5level.bind(this));
  }

  async getTemperature(value: CharacteristicValue) {
    this.platform.log.debug('getTemperature requested');
    const currentValue = 22.3;
    return currentValue;
  }

  async getHumidity(value: CharacteristicValue) {
    this.platform.log.debug('getHumidity requested');
    const currentValue = 56.3;
    return currentValue;
  }

  async getCO2level(value: CharacteristicValue) {
    this.platform.log.debug('getCO2level requested');
    const currentValue = 543;
    return currentValue;
  }

  async getCO2detected(value: CharacteristicValue) {
    this.platform.log.debug('getCO2detected requested');
    const currentValue = this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
    return currentValue;
  }

  async getCOlevel(value: CharacteristicValue) {
    this.platform.log.debug('getCOlevel requested');
    const currentValue = 1.8;
    return currentValue;
  }

  async getCOdetected(value: CharacteristicValue) {
    this.platform.log.debug('getCOdetected requested');
    const currentValue = this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
    return currentValue;
  }

  async getAirQuality(value: CharacteristicValue) {
    this.platform.log.debug('getAirQuality requested');
    const currentValue = this.Characteristic.AirQuality.GOOD;
    return currentValue;
  }

  async getNO2level(value: CharacteristicValue) {
    this.platform.log.debug('getNO2level requested');
    const currentValue = 43.5;
    return currentValue;
  }

  async getO3level(value: CharacteristicValue) {
    this.platform.log.debug('getO3level requested');
    const currentValue = 38.3;
    return currentValue;
  }

  async getSO2level(value: CharacteristicValue) {
    this.platform.log.debug('getSO2level requested');
    const currentValue = 127.7;
    return currentValue;
  }

  async getVOClevel(value: CharacteristicValue) {
    this.platform.log.debug('getVOClevel requested');
    const currentValue = 678.3;
    return currentValue;
  }

  async getPM2_5level(value: CharacteristicValue) {
    this.platform.log.debug('getPM2_5level requested');
    const currentValue = 3.2;
    return currentValue;
  }

  async getPM10level(value: CharacteristicValue) {
    this.platform.log.debug('getPM10level requested');
    const currentValue = 7.3;
    return currentValue;
  }
}
