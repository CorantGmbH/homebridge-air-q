import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { AirQPlatform } from './platform';

//import { AirPressureService, AirPressureLevel } from './customService'

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AirQPlatformAccessory {
  private temperatureSensorService: Service;
  private humidtySensorService: Service;
  private co2SensorService: Service;
  private coSensorService: Service;
  private healthSensorService: Service;
  private performanceSensorService: Service;
  private smokeSensorService: Service;
  private airPressureService: Service;
  private displayName: string;
  private updateInterval: number;

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
    this.displayName = accessory.context.device.displayName;
    this.updateInterval = parseInt(this.platform.config.updateInterval) || 10;
    this.platform.log.info(`[${this.displayName}] Update Interval:`, this.updateInterval, 's');

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
    this.temperatureSensorService = this.accessory.getService('Temperature') ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, `Temperature ${this.displayName}`, 'YourUniqueIdentifier-23');
    // bind temperature sensor service to read function
    this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getTemperature.bind(this));
    // bind temperature sensor service to status function
    this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add humidty sensor
    this.humidtySensorService = this.accessory.getService('Humidity') ||
      this.accessory.addService(this.platform.Service.HumiditySensor, `Humidity ${this.displayName}`, 'YourUniqueIdentifier-11');
    // bind humidity sensor service to read function
    this.humidtySensorService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getHumidity.bind(this));
    // bind temperature sensor service to status function
    this.humidtySensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add CO2 sensor
    this.co2SensorService = this.accessory.getService('CO2') ||
      this.accessory.addService(this.platform.Service.CarbonDioxideSensor, `CO2 ${this.displayName}`, 'YourUniqueIdentifier-12');
    // bind CO2 sensor service to read function
    this.co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
      .onGet(this.getCO2level.bind(this));
    this.co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideDetected)
      .onGet(this.getCO2detected.bind(this));
    // bind CO2 sensor service to status function
    this.co2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add CO sensor
    this.coSensorService = this.accessory.getService('CO') ||
      this.accessory.addService(this.platform.Service.CarbonMonoxideSensor, `CO ${this.displayName}`, 'YourUniqueIdentifier-13');
    // bind CO sensor service to read function
    this.coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideLevel)
      .onGet(this.getCOlevel.bind(this));
    this.coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected)
      .onGet(this.getCOdetected.bind(this));
    // bind CO sensor service to status function
    this.coSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add health air quality sensor for not individually possible values
    this.healthSensorService = this.accessory.getService('Health') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `Health ${this.displayName}`, 'YourUniqueIdentifier-16');
    // bind air quality sensor characteristic
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getHealth.bind(this));
    // bind air quality sensor service to NO2 sensor
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
      .onGet(this.getNO2level.bind(this));
    // bind air quality sensor service to O3 sensor
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.OzoneDensity)
      .onGet(this.getO3level.bind(this));
    // bind air quality sensor service to SO2 sensor
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.SulphurDioxideDensity)
      .onGet(this.getSO2level.bind(this));
    // bind air quality sensor service to VOC sensor
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.VOCDensity)
      .onGet(this.getVOClevel.bind(this));
    // bind air quality sensor service to PM2.5 sensor
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .onGet(this.getPM2_5level.bind(this));
    // bind air quality sensor service to status function
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add performance air quality sensor
    this.performanceSensorService = this.accessory.getService('Performance') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `Performance ${this.displayName}`, 'YourUniqueIdentifier-17');
    // bind performance air quality sensor characteristic
    this.performanceSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getPerformance.bind(this));
    // bind air quality sensor service to O3 sensor
    this.performanceSensorService.getCharacteristic(this.platform.Characteristic.OzoneDensity)
      .onGet(this.getO3level.bind(this));
    // bind air quality sensor service to VOC sensor
    this.performanceSensorService.getCharacteristic(this.platform.Characteristic.VOCDensity)
      .onGet(this.getVOClevel.bind(this));
    // bind performance air quality sensor service to status function
    this.performanceSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add smoke detector
    this.smokeSensorService = this.accessory.getService('Smoke') ||
      this.accessory.addService(this.platform.Service.SmokeSensor, `Smoke ${this.displayName}`, 'YourUniqueIdentifier-18');
    // bind CO sensor service to read function
    this.smokeSensorService.getCharacteristic(this.platform.Characteristic.SmokeDetected)
      .onGet(this.getSmokeDetected.bind(this));
    // bind CO sensor service to status function
    this.smokeSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));

    // add pressure sensor (not supported by HomeKit)
    /** this.airPressureService = this.accessory.getService('Air Pressure') ||
      this.accessory.addService(AirPressureService, `Air Pressure ${this.displayName}`, 'YourUniqueIdentifier-21');
    this.airPressureService.getCharacteristic(AirPressureLevel)
      .onGet(this.getAirPressure.bind(this));
    this.airPressureService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getStatus.bind(this));
    **/

    // Start auto-refresh states
    setInterval(() => {
      this.updateStates();
    }, this.updateInterval * 1000);
    this.updateStates();
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

  async getAirPressure(value: CharacteristicValue) {
    this.platform.log.debug('getPressure requested');
    const currentValue = 998.3;
    return currentValue;
  }

  getSensorData() {
    return true;
  }

  async updateStates() {
    this.platform.log.debug('updateStates requested');
    return true;
  }
}
