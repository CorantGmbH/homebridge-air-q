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
    this.service = this.accessory.getService("Temperatur") ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, "Temperatur", 'YourUniqueIdentifier-10');
    // bind temperature sensor service to read function
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getTemperature.bind(this));
    // bind temperature sensor service to status function
    this.service.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add humidty sensor
    const humidtySensorService = this.accessory.getService("Luftfeuchtigkeit") ||
      this.accessory.addService(this.platform.Service.HumiditySensor, "Luftfeuchtigkeit", 'YourUniqueIdentifier-11');
    // bind humidity sensor service to read function
    humidtySensorService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getHumidity.bind(this));
    // bind temperature sensor service to status function
    humidtySensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add CO2 sensor
    const co2SensorService = this.accessory.getService("CO2 Sensor") ||
      this.accessory.addService(this.platform.Service.CarbonDioxideSensor, "CO2 Sensor", 'YourUniqueIdentifier-12');
    // bind CO2 sensor service to read function
    co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
      .onGet(this.getCO2level.bind(this));
    co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideDetected)
      .onGet(this.getCO2detected.bind(this));
    // bind CO2 sensor service to status function
    co2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add CO sensor
    const coSensorService = this.accessory.getService("CO Sensor") ||
      this.accessory.addService(this.platform.Service.CarbonMonoxideSensor, "CO Sensor", 'YourUniqueIdentifier-13');
    // bind CO sensor service to read function
    coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideLevel)
      .onGet(this.getCOlevel.bind(this));
    coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected)
      .onGet(this.getCOdetected.bind(this));
    // bind CO sensor service to status function
    coSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add health air quality sensor for not individually possible values
    const airQualitySensorService = this.accessory.getService("Gesundheit") ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, "Gesundheit", 'YourUniqueIdentifier-16');
    // bind air quality sensor characteristic
    airQualitySensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getHealth.bind(this));
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
    // bind air quality sensor service to status function
    airQualitySensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add performance air quality sensor
    const performanceSensorService = this.accessory.getService("Leistung") ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, "Leistung", 'YourUniqueIdentifier-17');
    // bind performance air quality sensor characteristic
    performanceSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getPerformance.bind(this));
    // bind performance air quality sensor service to status function
    performanceSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add smoke detector
    const smokeSensorService = this.accessory.getService("Rauch-Sensor") ||
      this.accessory.addService(this.platform.Service.SmokeSensor, "Rauch-Sensor", 'YourUniqueIdentifier-18');
    // bind CO sensor service to read function
    smokeSensorService.getCharacteristic(this.platform.Characteristic.SmokeDetected)
      .onGet(this.getSmokeDetected.bind(this));
    // bind CO sensor service to status function
    smokeSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add pressure sensor
    pressureService = this.accessory.getService("Luftdruck") ||
      this.accessory.addService(this.platform.Service.PressureSensor, "Luftdruck", 'YourUniqueIdentifier-19');
    // bind pressure sensor service to read function
    pressureService.getCharacteristic(this.platform.Characteristic.PressureLevel)
      .onGet(this.getPressure.bind(this));
    // bind pressure sensor service to status function
    pressureService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));
  }

  async getStatus(value: CharacteristicValue) {
    this.platform.log.debug('getStatus requested');
    const currentValue = true;
    return currentValue;
  }

  async getSmokeDetected(value: CharacteristicValue) {
    this.platform.log.debug('getSmokeDetected requested');
    const currentValue = 1;
    return currentValue;
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
    const currentValue = this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
    return currentValue;
  }

  async getCOlevel(value: CharacteristicValue) {
    this.platform.log.debug('getCOlevel requested');
    const currentValue = 1.8;
    return currentValue;
  }

  async getCOdetected(value: CharacteristicValue) {
    this.platform.log.debug('getCOdetected requested');
    const currentValue = this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
    return currentValue;
  }

  async getHealth(value: CharacteristicValue) {
    this.platform.log.debug('getAirQuality requested');
    const currentValue = this.platform.Characteristic.AirQuality.GOOD;
    return currentValue;
  }

  async getPerformance(value: CharacteristicValue) {
    this.platform.log.debug('getAirQuality requested');
    const currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
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

  async getPressure(value: CharacteristicValue) {
    this.platform.log.debug('getPressure requested');
    const currentValue = 998.3;
    return currentValue;
  }
}
