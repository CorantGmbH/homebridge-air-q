import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { AirQPlatform } from './platform';

//import { AirPressureService, AirPressureLevel } from './customService'

interface DataPacket {
  health: number;
  performance: number;
  temperature: number;
  humidity: number;
  co2?: number;
  co?: number;
  pm2_5?: number;
  pm10?: number;
  pressure?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  h2s?: number;
  tvoc?: number;
  sound?: number;
}

interface SensorStatus {
  health: boolean;
  performance: boolean;
  temperature: boolean;
  humidity: boolean;
  co2: boolean;
  co: boolean;
  pm2_5: boolean;
  no2: boolean;
  o3: boolean;
  so2: boolean;
  h2s: boolean;
  pressure: boolean;
  tvoc: boolean;
  sound: boolean;
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AirQPlatformAccessory {
  private temperatureSensorService: Service;
  private humidtySensorService: Service;
  private co2SensorService: Service;
  private no2SensorService: Service;
  private so2SensorService: Service;
  private o3SensorService: Service;
  private h2sSensorService: Service;
  private vocSensorService: Service;
  private coSensorService: Service;
  private pmSensorService: Service;
  private healthSensorService: Service;
  private performanceSensorService: Service;
  private smokeSensorService: Service;
  private displayName: string;
  private updateInterval: number;
  private airPressureService: Service;
  private noiseSensorService: Service;
  private latestData: DataPacket;
  private sensorStatusActive: SensorStatus;

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
    this.displayName = this.accessory.context.device.displayName;
    this.updateInterval = parseInt(this.platform.config.updateInterval) || 10;
    this.platform.log.info(`[${this.displayName}] Update Interval:`, this.updateInterval, 's');

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.device.manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.device.deviceType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.serialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.accessory.context.device.firmwareRevision)
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, this.accessory.context.device.hardwareRevision);

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

    // get initial sensorStatus
    this.sensorStatusActive = this.getSensorStatus();

    // get initial data packet
    this.latestData = this.getSensorData();

    // add temperature sensor
    this.temperatureSensorService = this.accessory.getService('Temperature') ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, `Temperature ${this.displayName}`, 'YourUniqueIdentifier-42');
    this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getTemperature.bind(this));
    this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getTemperatureStatus.bind(this));

    // add humidty sensor
    this.humidtySensorService = this.accessory.getService('Humidity') ||
      this.accessory.addService(this.platform.Service.HumiditySensor, `Humidity ${this.displayName}`, 'YourUniqueIdentifier-41');
    this.humidtySensorService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getHumidity.bind(this));
    this.humidtySensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getHumidityStatus.bind(this));

    // add CO2 sensor
    this.co2SensorService = this.accessory.getService('CO2') ||
      this.accessory.addService(this.platform.Service.CarbonDioxideSensor, `CO2 ${this.displayName}`, 'YourUniqueIdentifier-12');
    this.co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
      .onGet(this.getCO2level.bind(this));
    this.co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideDetected)
      .onGet(this.getCO2detected.bind(this));
    this.co2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getCO2Status.bind(this));

    // add CO sensor
    this.coSensorService = this.accessory.getService('CO') ||
      this.accessory.addService(this.platform.Service.CarbonMonoxideSensor, `CO ${this.displayName}`, 'YourUniqueIdentifier-13');
    this.coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideLevel)
      .onGet(this.getCOlevel.bind(this));
    this.coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected)
      .onGet(this.getCOdetected.bind(this));
    this.coSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getCOStatus.bind(this));

    // add health air quality sensor for health
    this.healthSensorService = this.accessory.getService('Health') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `Health ${this.displayName}`, 'YourUniqueIdentifier-16');
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getHealth.bind(this));
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
      .onGet(this.getNO2level.bind(this));
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.OzoneDensity)
      .onGet(this.getO3level.bind(this));
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.SulphurDioxideDensity)
      .onGet(this.getSO2level.bind(this));
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.VOCDensity)
      .onGet(this.getVOClevel.bind(this));
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .onGet(this.getPM2_5level.bind(this));
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.PM10Density)
      .onGet(this.getPM10level.bind(this));
    this.healthSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getHealthStatus.bind(this));

    // add performance air quality sensor
    this.performanceSensorService = this.accessory.getService('Performance') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `Performance ${this.displayName}`, 'YourUniqueIdentifier-17');
    this.performanceSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getPerformance.bind(this));
    this.performanceSensorService.getCharacteristic(this.platform.Characteristic.OzoneDensity)
      .onGet(this.getO3level.bind(this));
    this.performanceSensorService.getCharacteristic(this.platform.Characteristic.VOCDensity)
      .onGet(this.getVOClevel.bind(this));
    this.performanceSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getPerformanceStatus.bind(this));

    // add air quality sensor for O3
    this.o3SensorService = this.accessory.getService('O3') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `O3 ${this.displayName}`, 'YourUniqueIdentifier-30');
    this.o3SensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getO3quality.bind(this));
    this.o3SensorService.getCharacteristic(this.platform.Characteristic.OzoneDensity)
      .onGet(this.getO3level.bind(this));
    this.o3SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getO3Status.bind(this));

    // add air quality sensor for H2S
    this.h2sSensorService = this.accessory.getService('H2S') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `H2S ${this.displayName}`, 'YourUniqueIdentifier-31');
    this.h2sSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getH2Squality.bind(this));
    this.h2sSensorService.getCharacteristic(this.platform.Characteristic.SulphurDioxideDensity)
      .onGet(this.getH2Slevel.bind(this));
    this.h2sSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getH2SStatus.bind(this));

    // add air quality sensor for SO2
    this.so2SensorService = this.accessory.getService('SO2') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `SO2 ${this.displayName}`, 'YourUniqueIdentifier-32');
    this.so2SensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getSO2quality.bind(this));
    this.so2SensorService.getCharacteristic(this.platform.Characteristic.SulphurDioxideDensity)
      .onGet(this.getSO2level.bind(this));
    this.so2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getSO2Status.bind(this));

    // add air quality sensor for NO2
    this.no2SensorService = this.accessory.getService('NO2') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `NO2 ${this.displayName}`, 'YourUniqueIdentifier-33');
    this.no2SensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getNO2quality.bind(this));
    this.no2SensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
      .onGet(this.getNO2level.bind(this));
    this.no2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getNO2Status.bind(this));

    // add air quality sensor for VOC
    this.vocSensorService = this.accessory.getService('VOC') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `VOC ${this.displayName}`, 'YourUniqueIdentifier-34');
    this.vocSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getVOCquality.bind(this));
    this.vocSensorService.getCharacteristic(this.platform.Characteristic.VOCDensity)
      .onGet(this.getVOClevel.bind(this));
    this.vocSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getVOCStatus.bind(this));

    // add air quality sensor for particulates
    this.pmSensorService = this.accessory.getService('Particulates') ||
      this.accessory.addService(this.platform.Service.AirQualitySensor, `Particulates ${this.displayName}`, 'YourUniqueIdentifier-35');
    this.pmSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getPM2_5quality.bind(this));
    this.pmSensorService.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .onGet(this.getPM2_5level.bind(this));
    this.pmSensorService.getCharacteristic(this.platform.Characteristic.PM10Density)
      .onGet(this.getPM10level.bind(this));
    this.pmSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getPM2_5Status.bind(this));

    // add smoke detector
    this.smokeSensorService = this.accessory.getService('Smoke') ||
      this.accessory.addService(this.platform.Service.SmokeSensor, `Smoke ${this.displayName}`, 'YourUniqueIdentifier-18');
    this.smokeSensorService.getCharacteristic(this.platform.Characteristic.SmokeDetected)
      .onGet(this.getSmokeDetected.bind(this));
    this.smokeSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getSmokeDetectedStatus.bind(this));

    // add noise sensor as light sensor
    this.noiseSensorService = this.accessory.getService('Noise') ||
      this.accessory.addService(this.platform.Service.LightSensor, `Noise ${this.displayName}`, 'YourUniqueIdentifier-39');
    this.noiseSensorService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.getNoiseLevel.bind(this));
    this.noiseSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getNoiseStatus.bind(this));

    // add custom pressure sensor (not supported by HomeKit)
    //this.airPressureService = this.accessory.getService('Air Pressure') ||
    //  this.accessory.addService(AirPressureService, `Air Pressure ${this.displayName}`, 'YourUniqueIdentifier-21');
    //this.airPressureService.getCharacteristic(AirPressureLevel)
    //  .onGet(this.getAirPressure.bind(this));
    //this.airPressureService.getCharacteristic(this.platform.Characteristic.StatusActive)
    //  .onGet(this.getPressureStatus.bind(this));

    // add pressure sensor as light sensor
    this.airPressureService = this.accessory.getService('Air Pressure') ||
      this.accessory.addService(this.platform.Service.LightSensor, `Air Pressure ${this.displayName}`, 'YourUniqueIdentifier-38');
    this.airPressureService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.getAirPressure.bind(this));
    this.airPressureService.getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.getPressureStatus.bind(this));


    // Start auto-refresh states
    setInterval(() => {
      this.updateStates();
    }, this.updateInterval * 1000);
    this.updateStates();
  }

  async getTemperatureStatus(value: CharacteristicValue) {
    this.platform.log.debug('getTemperatureStatus requested');
    return this.sensorStatusActive.temperature;
  }

  async getHumidityStatus(value: CharacteristicValue) {
    this.platform.log.debug('getHumidityStatus requested');
    return this.sensorStatusActive.humidity;
  }

  async getHealthStatus(value: CharacteristicValue) {
    this.platform.log.debug('getHealthStatus requested');
    return this.sensorStatusActive.health;
  }

  async getPerformanceStatus(value: CharacteristicValue) {
    this.platform.log.debug('getPerformanceStatus requested');
    const currentValue = true;
    return this.sensorStatusActive.performance;
  }

  async getCO2Status(value: CharacteristicValue) {
    this.platform.log.debug('getCO2Status requested');
    return this.sensorStatusActive.co2;
  }

  async getNO2Status(value: CharacteristicValue) {
    this.platform.log.debug('getNO2Status requested');
    return this.sensorStatusActive.no2;
  }

  async getSO2Status(value: CharacteristicValue) {
    this.platform.log.debug('getSO2Status requested');
    return this.sensorStatusActive.so2;
  }

  async getH2SStatus(value: CharacteristicValue) {
    this.platform.log.debug('getH2SStatus requested');
    return this.sensorStatusActive.h2s;
  }

  async getO3Status(value: CharacteristicValue) {
    this.platform.log.debug('getO3Status requested');
    return this.sensorStatusActive.o3;
  }

  async getCOStatus(value: CharacteristicValue) {
    this.platform.log.debug('getCOStatus requested');
    return this.sensorStatusActive.co;
  }

  async getPressureStatus(value: CharacteristicValue) {
    this.platform.log.debug('getPressureStatus requested');
    const currentValue = true;
  return this.sensorStatusActive.pressure;
  }

  async getNoiseStatus(value: CharacteristicValue) {
    this.platform.log.debug('getNoiseStatus requested');
    const currentValue = true;
  return this.sensorStatusActive.sound;
  }

  async getVOCStatus(value: CharacteristicValue) {
    this.platform.log.debug('getVOCStatus requested');
    const currentValue = true;
  return this.sensorStatusActive.tvoc;
  }

  async getPM2_5Status(value: CharacteristicValue) {
    this.platform.log.debug('getPM2_5Status requested');
    return this.sensorStatusActive.pm2_5;
  }

  async getSmokeDetectedStatus(value: CharacteristicValue) {
    this.platform.log.debug('getSmokeDetectedStatus requested');
    return this.sensorStatusActive.pm2_5;
  }

  async getSmokeDetected(value: CharacteristicValue) {
    this.platform.log.debug('getSmokeDetected requested');
    const currentValue = 1;
    return currentValue;
  }

  async getTemperature(value: CharacteristicValue) {
    this.platform.log.debug('getTemperature requested');
    return this.latestData.temperature;
  }

  async getHumidity(value: CharacteristicValue) {
    this.platform.log.debug('getHumidity requested');
    return this.latestData.humidity;
  }

  async getCO2level(value: CharacteristicValue) {
    this.platform.log.debug('getCO2level requested');
    let currentValue = this.latestData.co2 === undefined ? 0 : this.latestData.co2;
    return currentValue;
  }

  async getCO2detected(value: CharacteristicValue) {
    this.platform.log.debug('getCO2detected requested');
    const currentValue = this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
    return currentValue;
  }

  async getCOlevel(value: CharacteristicValue) {
    this.platform.log.debug('getCOlevel requested');
    let currentValue = this.latestData.co === undefined ? 0 : this.latestData.co;
    return currentValue;
  }

  async getCOdetected(value: CharacteristicValue) {
    this.platform.log.debug('getCOdetected requested');
    const currentValue = this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
    return currentValue;
  }

  async getHealth(value: CharacteristicValue) {
    this.platform.log.debug('getHealth requested');
    const currentValue = this.platform.Characteristic.AirQuality.GOOD;
    return currentValue;
  }

  async getPerformance(value: CharacteristicValue) {
    this.platform.log.debug('getPerformance requested');
    const currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    return currentValue;
  }

  async getNO2quality(value: CharacteristicValue) {
    this.platform.log.debug('getNO2quality requested');
    const currentValue = this.platform.Characteristic.AirQuality.GOOD;
    return currentValue;
  }

  async getNO2level(value: CharacteristicValue) {
    this.platform.log.debug('getNO2level requested');
    let currentValue = this.latestData.no2 === undefined ? 0 : this.latestData.no2;
    return currentValue;
  }

  async getH2Slevel(value: CharacteristicValue) {
    this.platform.log.debug('getH2Slevel requested');
    let currentValue = this.latestData.h2s === undefined ? 0 : this.latestData.h2s;
    return currentValue;
  }

  async getH2Squality(value: CharacteristicValue) {
    this.platform.log.debug('getH2Squality requested');
    const currentValue = this.platform.Characteristic.AirQuality.FAIR;
    return currentValue;
  }

  async getO3level(value: CharacteristicValue) {
    this.platform.log.debug('getO3level requested');
    let currentValue = this.latestData.o3 === undefined ? 0 : this.latestData.o3;
    return currentValue;
  }

  async getO3quality(value: CharacteristicValue) {
    this.platform.log.debug('getO3quality requested');
    const currentValue = this.platform.Characteristic.AirQuality.FAIR;
    return currentValue;
  }

  async getSO2level(value: CharacteristicValue) {
    this.platform.log.debug('getSO2level requested');
    let currentValue = this.latestData.so2 === undefined ? 0 : this.latestData.so2;
    return currentValue;
  }

  async getSO2quality(value: CharacteristicValue) {
    this.platform.log.debug('getSO2quality requested');
    const currentValue = this.platform.Characteristic.AirQuality.FAIR;
    return currentValue;
  }

  async getVOClevel(value: CharacteristicValue) {
    this.platform.log.debug('getVOClevel requested');
    let currentValue = this.latestData.tvoc === undefined ? 0 : this.latestData.tvoc;
    return currentValue;
  }

  async getVOCquality(value: CharacteristicValue) {
    this.platform.log.debug('getVOCquality requested');
    const currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    return currentValue;
  }

  async getPM2_5level(value: CharacteristicValue) {
    this.platform.log.debug('getPM2_5level requested');
    let currentValue = this.latestData.pm2_5 === undefined ? 0 : this.latestData.pm2_5;
    return currentValue;
  }

  async getPM2_5quality(value: CharacteristicValue) {
    this.platform.log.debug('getPM2_5quality requested');
    const currentValue = this.platform.Characteristic.AirQuality.GOOD;
    return currentValue;
  }

  async getPM10level(value: CharacteristicValue) {
    this.platform.log.debug('getPM10level requested');
    let currentValue = this.latestData.pm10 === undefined ? 0 : this.latestData.pm10;
    return currentValue;
  }

  async getAirPressure(value: CharacteristicValue) {
    this.platform.log.debug('getPressure requested');
    let currentValue = this.latestData.pressure === undefined ? 0 : this.latestData.pressure;
    return currentValue;
  }

  async getNoiseLevel(value: CharacteristicValue) {
    this.platform.log.debug('getNoiseLevel requested');
    let currentValue = this.latestData.sound === undefined ? 0 : this.latestData.sound;
    return currentValue;
  }


  getSensorData() {
    this.platform.log.debug('getSensorData requested');
    // Open connection to air-Q

    // retrieve data or averaged data

    // update latestData JSON object
    let data: DataPacket = {
      health: 877,
      performance: 744,
      temperature: 24.5,
      humidity: 24.5,
      co2: 643,
      co: 1.8,
      pm2_5: 4.3,
      pm10: 8.2,
      pressure: 998.06,
      no2: 24.8,
      o3: 14.5,
      so2: 174.5,
      h2s: 88.5,
      tvoc: 356,
      sound: 45.3,
    }

    return data;
  }

  getSensorStatus() {
    this.platform.log.debug('getSensorData requested');
    // Open connection to air-Q

    // retrieve data or averaged data

    // retrieve initial sensor status from data in JSON object
    let status: SensorStatus = {
      health: true,
      performance: true,
      temperature: true,
      humidity: true,
      co2: true,
      co: true,
      pm2_5: true,
      pressure: true,
      no2: true,
      o3: true,
      so2: true,
      h2s: true,
      tvoc: true,
      sound: true,
    }

    return status;
  }

  getDeviceConfig() {
    // Open connection to air-Q

    // retrieve config

    // extract relevant entries

    return true;
  }

  async updateStates() {
    this.latestData = this.getSensorData()
    return true;
  }
}
