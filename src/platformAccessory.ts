import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { AirQPlatform } from './platform';
import { performRequest } from './httpRequest';

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
  cl2_M20?: number;
  ch2o_M10?: number;
  ch4_MIPEX?: number;
  c3h8_MIPEX?: number;
  h2_M1000?: number;
  nh3_MR100?: number;
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
  cl2_M20: boolean;
  ch2o_M10: boolean;
  ch4_MIPEX: boolean;
  c3h8_MIPEX: boolean;
  h2_M1000: boolean;
  nh3_MR100: boolean;
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
  private temperatureSensorService?: Service;
  private humidtySensorService?: Service;
  private co2SensorService?: Service;
  private no2SensorService?: Service;
  private so2SensorService?: Service;
  private o3SensorService?: Service;
  private h2sSensorService?: Service;
  private vocSensorService?: Service;
  private coSensorService?: Service;
  private ch2oSensorService?: Service;
  private nh3SensorService?: Service;
  private cl2SensorService?: Service;
  private h2SensorService?: Service;
  private ch4SensorService?: Service;
  private c3h8SensorService?: Service;
  private pmSensorService?: Service;
  private healthSensorService?: Service;
  private performanceSensorService?: Service;
  private smokeSensorService?: Service;
  private airPressureService?: Service;
  private noiseSensorService?: Service;
  private displayName: string;
  private serialNumber: string;
  private updateInterval: number;
  private latestData: DataPacket;
  private sensorStatusActive: SensorStatus;
  private sensorList: Array<string>;

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
    this.serialNumber = this.accessory.context.device.serialNumber;
    this.sensorList = this.accessory.context.device.sensorList;
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
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if your platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    // get initial sensorStatus
    this.sensorStatusActive = {
      health: false,
      performance: false,
      temperature: false,
      humidity: false,
      co2: false,
      co: false,
      pm2_5: false,
      pressure: false,
      no2: false,
      o3: false,
      so2: false,
      h2s: false,
      tvoc: false,
      sound: false,
      cl2_M20: false,
      ch2o_M10: false,
      ch4_MIPEX: false,
      c3h8_MIPEX: false,
      h2_M1000: false,
      nh3_MR100: false,
    };
    this.updateStates();

    // get initial data packet
    this.latestData = {
      health: 0.0,
      performance: 0.0,
      temperature: 0.0,
      humidity: 0.0,
    };
    this.updateData();

    // add temperature sensor
    if (this.sensorList.indexOf('temperature') !== -1) {
      this.temperatureSensorService = this.accessory.getService('Temperature') ||
        this.accessory.addService(this.platform.Service.TemperatureSensor,
          `Temperature ${this.displayName}`, `Temperature ${this.serialNumber}`);
      this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
        .onGet(this.getTemperature.bind(this));
      this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getTemperatureStatus.bind(this));
    }

    // add humidity sensor
    if (this.sensorList.indexOf('humidity') !== -1) {
      this.humidtySensorService = this.accessory.getService('Humidity') ||
        this.accessory.addService(this.platform.Service.HumiditySensor,
          `Humidity ${this.displayName}`, `Humidity ${this.serialNumber}`);
      this.humidtySensorService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .onGet(this.getHumidity.bind(this));
      this.humidtySensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getHumidityStatus.bind(this));
    }

    // add CO2 sensor
    if (this.sensorList.indexOf('co2') !== -1) {
      this.co2SensorService = this.accessory.getService('CO2') ||
        this.accessory.addService(this.platform.Service.CarbonDioxideSensor,
          `CO2 ${this.displayName}`, `CO2 ${this.serialNumber}`);
      this.co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
        .onGet(this.getCO2level.bind(this));
      this.co2SensorService.getCharacteristic(this.platform.Characteristic.CarbonDioxideDetected)
        .onGet(this.getCO2detected.bind(this));
      this.co2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getCO2Status.bind(this));
    }

    // add CO sensor
    if (this.sensorList.indexOf('co') !== -1) {
      this.coSensorService = this.accessory.getService('CO') ||
        this.accessory.addService(this.platform.Service.CarbonMonoxideSensor,
          `CO ${this.displayName}`, `CO ${this.serialNumber}`);
      this.coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideLevel)
        .onGet(this.getCOlevel.bind(this));
      this.coSensorService.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected)
        .onGet(this.getCOdetected.bind(this));
      this.coSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getCOStatus.bind(this));
    }

    // add health air quality sensor for health
    if (this.sensorList.indexOf('health') !== -1) {
      this.healthSensorService = this.accessory.getService('Health') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `Health ${this.displayName}`, `Health ${this.serialNumber}`);
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
    }

    // add performance air quality sensor
    if (this.sensorList.indexOf('performance') !== -1) {
      this.performanceSensorService = this.accessory.getService('Performance') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `Performance ${this.displayName}`, `Performance ${this.serialNumber}`);
      this.performanceSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
        .onGet(this.getPerformance.bind(this));
      this.performanceSensorService.getCharacteristic(this.platform.Characteristic.OzoneDensity)
        .onGet(this.getO3level.bind(this));
      this.performanceSensorService.getCharacteristic(this.platform.Characteristic.VOCDensity)
        .onGet(this.getVOClevel.bind(this));
      this.performanceSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getPerformanceStatus.bind(this));
    }

    // add air quality sensor for O3
    if (this.sensorList.indexOf('o3') !== -1) {
      this.o3SensorService = this.accessory.getService('O3') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `O3 ${this.displayName}`, `O3 ${this.serialNumber}`);
      this.o3SensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
        .onGet(this.getO3quality.bind(this));
      this.o3SensorService.getCharacteristic(this.platform.Characteristic.OzoneDensity)
        .onGet(this.getO3level.bind(this));
      this.o3SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getO3Status.bind(this));
    }

    // add air quality sensor for H2S
    if (this.sensorList.indexOf('h2s') !== -1) {
      this.h2sSensorService = this.accessory.getService('H2S') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `H2S ${this.displayName}`, `H2S ${this.serialNumber}`);
      this.h2sSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
        .onGet(this.getH2Squality.bind(this));
      this.h2sSensorService.getCharacteristic(this.platform.Characteristic.SulphurDioxideDensity)
        .onGet(this.getH2Slevel.bind(this));
      this.h2sSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getH2SStatus.bind(this));
    }

    // add air quality sensor for SO2
    if (this.sensorList.indexOf('so2') !== -1) {
      this.so2SensorService = this.accessory.getService('SO2') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `SO2 ${this.displayName}`, `SO2 ${this.serialNumber}`);
      this.so2SensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
        .onGet(this.getSO2quality.bind(this));
      this.so2SensorService.getCharacteristic(this.platform.Characteristic.SulphurDioxideDensity)
        .onGet(this.getSO2level.bind(this));
      this.so2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getSO2Status.bind(this));
    }

    // add air quality sensor for NO2
    if (this.sensorList.indexOf('no2') !== -1) {
      this.no2SensorService = this.accessory.getService('NO2') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `NO2 ${this.displayName}`, `NO2 ${this.serialNumber}`);
      this.no2SensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
        .onGet(this.getNO2quality.bind(this));
      this.no2SensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
        .onGet(this.getNO2level.bind(this));
      this.no2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getNO2Status.bind(this));
    }

    // add air quality sensor for NH3
    if (this.sensorList.indexOf('nh3_MR100') !== -1) {
      this.nh3SensorService = this.accessory.getService('NH3') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `NH3 ${this.displayName}`, `NH3 ${this.serialNumber}`);
      this.nh3SensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
        .onGet(this.getNH3quality.bind(this));
      this.nh3SensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
        .onGet(this.getNH3level.bind(this));
      this.nh3SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getNH3Status.bind(this));
    }

    // add air quality sensor for CH2O
    if (this.sensorList.indexOf('ch2o_M10') !== -1) {
      this.ch2oSensorService = this.accessory.getService('CH2O') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `CH2O ${this.displayName}`, `CH2O ${this.serialNumber}`);
      this.ch2oSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
        .onGet(this.getCH2Oquality.bind(this));
      this.ch2oSensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
        .onGet(this.getCH2Olevel.bind(this));
      this.ch2oSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getCH2OStatus.bind(this));
    }

    // add air quality sensor for Cl2
    if (this.sensorList.indexOf('cl2_M20') !== -1) {
      this.cl2SensorService = this.accessory.getService('Cl2') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `Cl2 ${this.displayName}`, `Cl2 ${this.serialNumber}`);
      this.cl2SensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
        .onGet(this.getCl2quality.bind(this));
      this.cl2SensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
        .onGet(this.getCl2level.bind(this));
      this.cl2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getCl2Status.bind(this));
    }

    // add air quality sensor for VOC
    if (this.sensorList.indexOf('tvoc') !== -1) {
      this.vocSensorService = this.accessory.getService('VOC') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `VOC ${this.displayName}`, `VOC ${this.serialNumber}`);
      this.vocSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
        .onGet(this.getVOCquality.bind(this));
      this.vocSensorService.getCharacteristic(this.platform.Characteristic.VOCDensity)
        .onGet(this.getVOClevel.bind(this));
      this.vocSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getVOCStatus.bind(this));
    }

    // add air quality sensor for particulates
    if (this.sensorList.indexOf('particulates') !== -1) {
      this.pmSensorService = this.accessory.getService('Particulates') ||
        this.accessory.addService(this.platform.Service.AirQualitySensor,
          `Particulates ${this.displayName}`, `Particulates ${this.serialNumber}`);
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
        this.accessory.addService(this.platform.Service.SmokeSensor,
          `Smoke ${this.displayName}`, `Smoke ${this.serialNumber}`);
      this.smokeSensorService.getCharacteristic(this.platform.Characteristic.SmokeDetected)
        .onGet(this.getSmokeDetected.bind(this));
      this.smokeSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getSmokeDetectedStatus.bind(this));
    }

    // add CH4 sensor as leak detector
    if (this.sensorList.indexOf('ch4_MIPEX') !== -1) {
      this.ch4SensorService = this.accessory.getService('CH4') ||
        this.accessory.addService(this.platform.Service.LeakSensor,
          `CH4 ${this.displayName}`, `CH4 ${this.serialNumber}`);
      this.ch4SensorService.getCharacteristic(this.platform.Characteristic.LeakDetected)
        .onGet(this.getCH4quality.bind(this));
      this.ch4SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getCH4Status.bind(this));
    }

    // add C3H8 sensor as leak detector
    if (this.sensorList.indexOf('c3h8_MIPEX') !== -1) {
      this.c3h8SensorService = this.accessory.getService('C3H8') ||
        this.accessory.addService(this.platform.Service.LeakSensor,
          `C3H8 ${this.displayName}`, `C3H8 ${this.serialNumber}`);
      this.c3h8SensorService.getCharacteristic(this.platform.Characteristic.LeakDetected)
        .onGet(this.getC3H8quality.bind(this));
      this.c3h8SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getC3H8Status.bind(this));
    }

    // add H2 sensor as leak detector
    if (this.sensorList.indexOf('h2_M1000') !== -1) {
      this.h2SensorService = this.accessory.getService('H2') ||
        this.accessory.addService(this.platform.Service.LeakSensor,
          `H2 ${this.displayName}`, `H2 ${this.serialNumber}`);
      this.h2SensorService.getCharacteristic(this.platform.Characteristic.LeakDetected)
        .onGet(this.getH2quality.bind(this));
      this.h2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getH2Status.bind(this));
    }

    // add noise sensor as light sensor
    if (this.sensorList.indexOf('sound') !== -1) {
      this.noiseSensorService = this.accessory.getService('Noise') ||
        this.accessory.addService(this.platform.Service.LightSensor,
          `Noise ${this.displayName}`, `Noise ${this.serialNumber}`);
      this.noiseSensorService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
        .onGet(this.getNoiseLevel.bind(this));
      this.noiseSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getNoiseStatus.bind(this));
    }

    // add pressure sensor as light sensor
    if (this.sensorList.indexOf('pressure') !== -1) {
      this.airPressureService = this.accessory.getService('Air Pressure') ||
        this.accessory.addService(this.platform.Service.LightSensor,
          `Air Pressure ${this.displayName}`, `Air Pressure ${this.serialNumber}`);
      this.airPressureService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
        .onGet(this.getAirPressure.bind(this));
      this.airPressureService.getCharacteristic(this.platform.Characteristic.StatusActive)
        .onGet(this.getPressureStatus.bind(this));
    }


    // Start auto-refresh data
    setInterval(() => {
      this.updateData();
    }, this.updateInterval * 1000);
    this.updateData();

    // Start auto-refresh status
    setInterval(() => {
      this.updateStates();
    }, this.updateInterval * 1000 * 120);
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

  async getCl2Status(value: CharacteristicValue) {
    this.platform.log.debug('getCl2Status requested');
    return this.sensorStatusActive.cl2_M20;
  }

  async getCH2OStatus(value: CharacteristicValue) {
    this.platform.log.debug('getCH2OStatus requested');
    return this.sensorStatusActive.ch2o_M10;
  }

  async getH2Status(value: CharacteristicValue) {
    this.platform.log.debug('getH2Status requested');
    return this.sensorStatusActive.h2_M1000;
  }

  async getNH3Status(value: CharacteristicValue) {
    this.platform.log.debug('getNH3Status requested');
    return this.sensorStatusActive.nh3_MR100;
  }

  async getC3H8Status(value: CharacteristicValue) {
    this.platform.log.debug('getC3H8Status requested');
    return this.sensorStatusActive.c3h8_MIPEX;
  }

  async getCH4Status(value: CharacteristicValue) {
    this.platform.log.debug('getCH4Status requested');
    return this.sensorStatusActive.ch4_MIPEX;
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
    const currentValue = this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
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
    const currentValue = this.latestData.co2 === undefined ? 0 : this.latestData.co2;
    return currentValue;
  }

  async getCO2detected(value: CharacteristicValue) {
    this.platform.log.debug('getCO2detected requested');
    const currentValue = this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
    return currentValue;
  }

  async getCOlevel(value: CharacteristicValue) {
    this.platform.log.debug('getCOlevel requested');
    const currentValue = this.latestData.co === undefined ? 0 : this.latestData.co;
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
    const currentValue = this.latestData.no2 === undefined ? 0 : this.latestData.no2;
    return currentValue;
  }

  async getCl2quality(value: CharacteristicValue) {
    this.platform.log.debug('getCl2quality requested');
    const currentValue = this.platform.Characteristic.AirQuality.GOOD;
    return currentValue;
  }

  async getCl2level(value: CharacteristicValue) {
    this.platform.log.debug('getCl2level requested');
    const currentValue = this.latestData.cl2_M20 === undefined ? 0 : this.latestData.cl2_M20;
    return currentValue;
  }

  async getNH3quality(value: CharacteristicValue) {
    this.platform.log.debug('getNH3quality requested');
    const currentValue = this.platform.Characteristic.AirQuality.GOOD;
    return currentValue;
  }

  async getNH3level(value: CharacteristicValue) {
    this.platform.log.debug('getNH3level requested');
    const currentValue = this.latestData.nh3_MR100 === undefined ? 0 : this.latestData.nh3_MR100;
    return currentValue;
  }

  async getCH2Oquality(value: CharacteristicValue) {
    this.platform.log.debug('getCH2Oquality requested');
    const currentValue = this.platform.Characteristic.AirQuality.GOOD;
    return currentValue;
  }

  async getCH2Olevel(value: CharacteristicValue) {
    this.platform.log.debug('getCH2Olevel requested');
    const currentValue = this.latestData.ch2o_M10 === undefined ? 0 : this.latestData.ch2o_M10;
    return currentValue;
  }

  async getCH4quality(value: CharacteristicValue) {
    this.platform.log.debug('getCH4quality requested');
    const currentValue = this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    return currentValue;
  }

  async getC3H8quality(value: CharacteristicValue) {
    this.platform.log.debug('getC3H8quality requested');
    const currentValue = this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    return currentValue;
  }

  async getH2quality(value: CharacteristicValue) {
    this.platform.log.debug('getH2quality requested');
    const currentValue = this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    return currentValue;
  }

  async getH2Slevel(value: CharacteristicValue) {
    this.platform.log.debug('getH2Slevel requested');
    const currentValue = this.latestData.h2s === undefined ? 0 : this.latestData.h2s;
    return currentValue;
  }

  async getH2Squality(value: CharacteristicValue) {
    this.platform.log.debug('getH2Squality requested');
    const currentValue = this.platform.Characteristic.AirQuality.FAIR;
    return currentValue;
  }

  async getO3level(value: CharacteristicValue) {
    this.platform.log.debug('getO3level requested');
    const currentValue = this.latestData.o3 === undefined ? 0 : this.latestData.o3;
    return currentValue;
  }

  async getO3quality(value: CharacteristicValue) {
    this.platform.log.debug('getO3quality requested');
    const currentValue = this.platform.Characteristic.AirQuality.FAIR;
    return currentValue;
  }

  async getSO2level(value: CharacteristicValue) {
    this.platform.log.debug('getSO2level requested');
    const currentValue = this.latestData.so2 === undefined ? 0 : this.latestData.so2;
    return currentValue;
  }

  async getSO2quality(value: CharacteristicValue) {
    this.platform.log.debug('getSO2quality requested');
    const currentValue = this.platform.Characteristic.AirQuality.FAIR;
    return currentValue;
  }

  async getVOClevel(value: CharacteristicValue) {
    this.platform.log.debug('getVOClevel requested');
    const currentValue = this.latestData.tvoc === undefined ? 0 : this.latestData.tvoc / 1000;
    return currentValue;
  }

  async getVOCquality(value: CharacteristicValue) {
    this.platform.log.debug('getVOCquality requested');
    const currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    return currentValue;
  }

  async getPM2_5level(value: CharacteristicValue) {
    this.platform.log.debug('getPM2_5level requested');
    const currentValue = this.latestData.pm2_5 === undefined ? 0 : this.latestData.pm2_5;
    return currentValue;
  }

  async getPM2_5quality(value: CharacteristicValue) {
    this.platform.log.debug('getPM2_5quality requested');
    const currentValue = this.platform.Characteristic.AirQuality.GOOD;
    return currentValue;
  }

  async getPM10level(value: CharacteristicValue) {
    this.platform.log.debug('getPM10level requested');
    const currentValue = this.latestData.pm10 === undefined ? 0 : this.latestData.pm10;
    return currentValue;
  }

  async getAirPressure(value: CharacteristicValue) {
    this.platform.log.debug('getPressure requested');
    const currentValue = this.latestData.pressure === undefined ? 0 : this.latestData.pressure;
    return currentValue;
  }

  async getNoiseLevel(value: CharacteristicValue) {
    this.platform.log.debug('getNoiseLevel requested');
    const currentValue = this.latestData.sound === undefined ? 0 : this.latestData.sound;
    return currentValue;
  }


  async getSensorData() {
    this.platform.log.debug('getSensorData requested');
    // predefine returned object
    const data: DataPacket = {
      health: 0.0,
      performance: 0.0,
      temperature: 0.0,
      humidity: 0.0,
      co2: 0.0,
      co: 0.0,
      pm2_5: 0.0,
      pm10: 0.0,
      pressure: 0.0,
      no2: 0.0,
      o3: 0.0,
      so2: 0.0,
      h2s: 0.0,
      tvoc: 0.0,
      sound: 0.0,
      cl2_M20: 0.0,
      ch2o_M10: 0.0,
      ch4_MIPEX: 0.0,
      c3h8_MIPEX: 0.0,
      h2_M1000: 0.0,
      nh3_MR100: 0.0,
    };

    // Open connection to air-Q
    const airqDataResponse = await performRequest({
      host: this.accessory.context.device.ipAddress,
      path: '/data',
      method: 'GET',
    }, this.accessory.context.device.password);
    if (airqDataResponse) {
      for (const key in data){
        if (Object.prototype.hasOwnProperty.call(airqDataResponse, key)){
          data[key] = airqDataResponse[key][0];
        }
      }
    }
    return data;
  }

  async getSensorStatus() {
    this.platform.log.debug('getSensorStatus requested');

    // predefine returned object
    const status: SensorStatus = {
      health: false,
      performance: false,
      temperature: false,
      humidity: false,
      co2: false,
      co: false,
      pm2_5: false,
      pressure: false,
      no2: false,
      o3: false,
      so2: false,
      h2s: false,
      tvoc: false,
      sound: false,
      cl2_M20: false,
      ch2o_M10: false,
      ch4_MIPEX: false,
      c3h8_MIPEX: false,
      h2_M1000: false,
      nh3_MR100: false,
    };

    // Open connection to air-Q
    const airqDataResponse = await performRequest({
      host: this.accessory.context.device.ipAddress,
      path: '/data',
      method: 'GET',
    }, this.accessory.context.device.password);
    if (airqDataResponse) {
      for (const key in status){
        if (Object.prototype.hasOwnProperty.call(airqDataResponse, key)){
          status[key] = true;
        }
      }
    }
    return status;
  }

  async updateData() {
    this.latestData = await this.getSensorData();
    return true;
  }

  async updateStates() {
    this.sensorStatusActive = await this.getSensorStatus();
    return true;
  }
}
