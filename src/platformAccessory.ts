import { Service, PlatformAccessory } from 'homebridge';

import { AirQPlatform } from './platform';

import { decrypt } from './decryptAES256';
import axios from 'axios';

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
  pressure_rel?: number;
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
  n2o?: number;
  radon?: number;
  dewpt?: number;
  mold?: number;
  no_M250?: number;
  r32?: number;
  r454b?: number;
  r454c?: number;
  tvoc_ionsc?: number;
  virus?: number;
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
  pressure_rel: boolean;
  tvoc: boolean;
  sound: boolean;
  n2o: boolean;
  radon: boolean;
  dewpt: boolean;
  mold: boolean;
  no_M250: boolean;
  r32: boolean;
  r454b: boolean;
  r454c: boolean;
  tvoc_ionsc: boolean;
  virus: boolean;
}

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
  private airPressureRelService?: Service;
  private noiseSensorService?: Service;
  private n2oSensorService?: Service;
  private radonSensorService?: Service;
  private dewptSensorService?: Service;
  private moldSensorService?: Service;
  private noSensorService?: Service;
  private r32SensorService?: Service;
  private r454bSensorService?: Service;
  private r454cSensorService?: Service;
  private tvocIonscSensorService?: Service;
  private virusSensorService?: Service;
  private displayName: string;
  private serialNumber: string;
  private updateInterval: number;
  private latestData: DataPacket;
  private sensorStatusActive: SensorStatus;
  private sensorList: Array<string>;
  private sensorWishList: Record<string, boolean>;

  constructor(
    private readonly platform: AirQPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.displayName = this.accessory.context.device.displayName;
    this.serialNumber = this.accessory.context.device.serialNumber;
    this.sensorList = this.accessory.context.device.sensorList;
    this.sensorWishList = this.accessory.context.device.sensorWishList;
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
      pressure_rel: false,
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
      n2o: false,
      radon: false,
      dewpt: false,
      mold: false,
      no_M250: false,
      r32: false,
      r454b: false,
      r454c: false,
      tvoc_ionsc: false,
      virus: false,
    };

    // get initial data packet
    this.latestData = {
      health: 0.0,
      performance: 0.0,
      temperature: 0.0,
      humidity: 0.0,
    };
    this.updateData();

    // add temperature sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'temperatureSensor')) ||
      this.sensorWishList.temperatureSensor === true) {
      if (this.sensorList.indexOf('temperature') !== -1) {
        this.temperatureSensorService = this.accessory.getService('Temperature') ||
          this.accessory.addService(this.platform.Service.TemperatureSensor,
            `Temperature ${this.displayName}`, `Temperature ${this.serialNumber}`);
        this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .onGet(this.getTemperature.bind(this));
        this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getTemperatureStatus.bind(this));
      }
    }

    // add humidity sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'humidtySensor')) ||
      this.sensorWishList.humidtySensor === true) {
      if (this.sensorList.indexOf('humidity') !== -1) {
        this.humidtySensorService = this.accessory.getService('Humidity') ||
          this.accessory.addService(this.platform.Service.HumiditySensor,
            `Humidity ${this.displayName}`, `Humidity ${this.serialNumber}`);
        this.humidtySensorService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
          .onGet(this.getHumidity.bind(this));
        this.humidtySensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getHumidityStatus.bind(this));
      }
    }

    // add CO2 sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'co2Sensor')) ||
      this.sensorWishList.co2Sensor === true) {
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
    }

    // add CO sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'coSensor')) ||
      this.sensorWishList.coSensor === true) {
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
    }

    // add health air quality sensor for health
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'healthSensor')) ||
      this.sensorWishList.healthSensor === true) {
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
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'performanceSensor')) ||
      this.sensorWishList.performanceSensor === true) {
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
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'o3Sensor')) ||
      this.sensorWishList.o3Sensor === true) {
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
    }

    // add air quality sensor for H2S
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'h2sSensor')) ||
      this.sensorWishList.h2sSensor === true) {
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
    }

    // add air quality sensor for SO2
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'so2Sensor')) ||
      this.sensorWishList.so2Sensor === true) {
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
    }

    // add air quality sensor for NO2
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'no2Sensor')) ||
      this.sensorWishList.no2Sensor === true) {
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
    }

    // add air quality sensor for N2O
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'n2oSensor')) ||
      this.sensorWishList.n2oSensor === true) {
      if (this.sensorList.indexOf('n2o') !== -1) {
        this.n2oSensorService = this.accessory.getService('N2O') ||
          this.accessory.addService(this.platform.Service.AirQualitySensor,
            `N2O ${this.displayName}`, `N2O ${this.serialNumber}`);
        this.n2oSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
          .onGet(this.getN2Oquality.bind(this));
        this.n2oSensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
          .onGet(this.getN2Olevel.bind(this));
        this.n2oSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getN2OStatus.bind(this));
      }
    }

    // add air quality sensor for Radon
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'radonSensor')) ||
      this.sensorWishList.radonSensor === true) {
      if (this.sensorList.indexOf('radon') !== -1) {
        this.radonSensorService = this.accessory.getService('Radon') ||
          this.accessory.addService(this.platform.Service.AirQualitySensor,
            `Radon ${this.displayName}`, `Radon ${this.serialNumber}`);
        this.radonSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
          .onGet(this.getRadonquality.bind(this));
        this.radonSensorService.getCharacteristic(this.platform.Characteristic.OzoneDensity)
          .onGet(this.getRadonlevel.bind(this));
        this.radonSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getRadonStatus.bind(this));
      }
    }

    // add air quality sensor for NH3
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'nh3Sensor')) ||
      this.sensorWishList.nh3Sensor === true) {
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
    }

    // add air quality sensor for CH2O
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'ch2oSensor')) ||
      this.sensorWishList.ch2oSensor === true) {
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
    }

    // add air quality sensor for Cl2
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'cl2Sensor')) ||
      this.sensorWishList.cl2Sensor === true) {
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
    }

    // add air quality sensor for VOC
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'vocSensor')) ||
      this.sensorWishList.vocSensor === true) {
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
    }

    // add air quality sensor for particulates
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'pmSensor')) ||
      this.sensorWishList.pmSensor === true) {
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
      }

      // add smoke detector
      if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'smokeSensor')) ||
        this.sensorWishList.smokeSensor === true) {
        this.smokeSensorService = this.accessory.getService('Smoke') ||
          this.accessory.addService(this.platform.Service.SmokeSensor,
            `Smoke ${this.displayName}`, `Smoke ${this.serialNumber}`);
        this.smokeSensorService.getCharacteristic(this.platform.Characteristic.SmokeDetected)
          .onGet(this.getSmokeDetected.bind(this));
        this.smokeSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getSmokeDetectedStatus.bind(this));
      }
    }

    // add CH4 sensor as leak detector
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'ch4Sensor')) ||
      this.sensorWishList.ch4Sensor === true) {
      if (this.sensorList.indexOf('ch4_MIPEX') !== -1) {
        this.ch4SensorService = this.accessory.getService('CH4') ||
          this.accessory.addService(this.platform.Service.LeakSensor,
            `CH4 ${this.displayName}`, `CH4 ${this.serialNumber}`);
        this.ch4SensorService.getCharacteristic(this.platform.Characteristic.LeakDetected)
          .onGet(this.getCH4quality.bind(this));
        this.ch4SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getCH4Status.bind(this));
      }
    }

    // add C3H8 sensor as leak detector
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'c3h8Sensor')) ||
      this.sensorWishList.c3h8Sensor === true) {
      if (this.sensorList.indexOf('c3h8_MIPEX') !== -1) {
        this.c3h8SensorService = this.accessory.getService('C3H8') ||
          this.accessory.addService(this.platform.Service.LeakSensor,
            `C3H8 ${this.displayName}`, `C3H8 ${this.serialNumber}`);
        this.c3h8SensorService.getCharacteristic(this.platform.Characteristic.LeakDetected)
          .onGet(this.getC3H8quality.bind(this));
        this.c3h8SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getC3H8Status.bind(this));
      }
    }

    // add H2 sensor as leak detector
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'h2Sensor')) ||
      this.sensorWishList.h2Sensor === true) {
      if (this.sensorList.indexOf('h2_M1000') !== -1) {
        this.h2SensorService = this.accessory.getService('H2') ||
          this.accessory.addService(this.platform.Service.LeakSensor,
            `H2 ${this.displayName}`, `H2 ${this.serialNumber}`);
        this.h2SensorService.getCharacteristic(this.platform.Characteristic.LeakDetected)
          .onGet(this.getH2quality.bind(this));
        this.h2SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getH2Status.bind(this));
      }
    }

    // add noise sensor as light sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'noiseSensor')) ||
      this.sensorWishList.noiseSensor === true) {
      if (this.sensorList.indexOf('sound') !== -1) {
        this.noiseSensorService = this.accessory.getService('Noise') ||
          this.accessory.addService(this.platform.Service.LightSensor,
            `Noise ${this.displayName}`, `Noise ${this.serialNumber}`);
        this.noiseSensorService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
          .onGet(this.getNoiseLevel.bind(this));
        this.noiseSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getNoiseStatus.bind(this));
      }
    }

    // add pressure sensor as light sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'airPressure')) ||
      this.sensorWishList.airPressure === true) {
      if (this.sensorList.indexOf('pressure') !== -1) {
        this.airPressureService = this.accessory.getService('Air Pressure') ||
          this.accessory.addService(this.platform.Service.LightSensor,
            `Air Pressure ${this.displayName}`, `Air Pressure ${this.serialNumber}`);
        this.airPressureService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
          .onGet(this.getAirPressure.bind(this));
        this.airPressureService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getPressureStatus.bind(this));
      }
    }

    // add relative air pressure virtual sensor as light sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'airPressureRel')) ||
      this.sensorWishList.airPressureRel === true) {
      if (this.sensorList.indexOf('pressure_rel') !== -1) {
        this.airPressureRelService = this.accessory.getService('Relative Air Pressure') ||
          this.accessory.addService(this.platform.Service.LightSensor,
            `Relative Air Pressure ${this.displayName}`, `Relative Air Pressure ${this.serialNumber}`);
        this.airPressureRelService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
          .onGet(this.getAirPressureRel.bind(this));
        this.airPressureRelService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getPressureRelStatus.bind(this));
      }
    }

    // add dew point sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'dewptSensor')) ||
      this.sensorWishList.dewptSensor === true) {
      if (this.sensorList.indexOf('dewpt') !== -1) {
        this.dewptSensorService = this.accessory.getService('Dew Point') ||
          this.accessory.addService(this.platform.Service.TemperatureSensor,
            `Dew Point ${this.displayName}`, `Dew Point ${this.serialNumber}`);
        this.dewptSensorService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .onGet(this.getDewPoint.bind(this));
        this.dewptSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getDewPointStatus.bind(this));
      }
    }

    // add R-32 refrigerant sensor as leak detector
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'r32Sensor')) ||
      this.sensorWishList.r32Sensor === true) {
      if (this.sensorList.indexOf('r32') !== -1) {
        this.r32SensorService = this.accessory.getService('R-32') ||
          this.accessory.addService(this.platform.Service.LeakSensor,
            `R-32 ${this.displayName}`, `R-32 ${this.serialNumber}`);
        this.r32SensorService.getCharacteristic(this.platform.Characteristic.LeakDetected)
          .onGet(this.getR32quality.bind(this));
        this.r32SensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getR32Status.bind(this));
      }
    }

    // add R-454B refrigerant sensor as leak detector
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'r454bSensor')) ||
      this.sensorWishList.r454bSensor === true) {
      if (this.sensorList.indexOf('r454b') !== -1) {
        this.r454bSensorService = this.accessory.getService('R-454B') ||
          this.accessory.addService(this.platform.Service.LeakSensor,
            `R-454B ${this.displayName}`, `R-454B ${this.serialNumber}`);
        this.r454bSensorService.getCharacteristic(this.platform.Characteristic.LeakDetected)
          .onGet(this.getR454bquality.bind(this));
        this.r454bSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getR454bStatus.bind(this));
      }
    }

    // add R-454C refrigerant sensor as leak detector
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'r454cSensor')) ||
      this.sensorWishList.r454cSensor === true) {
      if (this.sensorList.indexOf('r454c') !== -1) {
        this.r454cSensorService = this.accessory.getService('R-454C') ||
          this.accessory.addService(this.platform.Service.LeakSensor,
            `R-454C ${this.displayName}`, `R-454C ${this.serialNumber}`);
        this.r454cSensorService.getCharacteristic(this.platform.Characteristic.LeakDetected)
          .onGet(this.getR454cquality.bind(this));
        this.r454cSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getR454cStatus.bind(this));
      }
    }

    // add mold index sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'moldSensor')) ||
      this.sensorWishList.moldSensor === true) {
      if (this.sensorList.indexOf('mold') !== -1) {
        this.moldSensorService = this.accessory.getService('Mold') ||
          this.accessory.addService(this.platform.Service.AirQualitySensor,
            `Mold ${this.displayName}`, `Mold ${this.serialNumber}`);
        this.moldSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
          .onGet(this.getMoldquality.bind(this));
        this.moldSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getMoldStatus.bind(this));
      }
    }

    // add nitrogen monoxide sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'noSensor')) ||
      this.sensorWishList.noSensor === true) {
      if (this.sensorList.indexOf('no_M250') !== -1) {
        this.noSensorService = this.accessory.getService('NO') ||
          this.accessory.addService(this.platform.Service.AirQualitySensor,
            `NO ${this.displayName}`, `NO ${this.serialNumber}`);
        this.noSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
          .onGet(this.getNOquality.bind(this));
        this.noSensorService.getCharacteristic(this.platform.Characteristic.NitrogenDioxideDensity)
          .onGet(this.getNOlevel.bind(this));
        this.noSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getNOStatus.bind(this));
      }
    }

    // add industrial VOC sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'tvocIonscSensor')) ||
      this.sensorWishList.tvocIonscSensor === true) {
      if (this.sensorList.indexOf('tvoc_ionsc') !== -1) {
        this.tvocIonscSensorService = this.accessory.getService('Industrial VOC') ||
          this.accessory.addService(this.platform.Service.AirQualitySensor,
            `Industrial VOC ${this.displayName}`, `Industrial VOC ${this.serialNumber}`);
        this.tvocIonscSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
          .onGet(this.getTvocIonscquality.bind(this));
        this.tvocIonscSensorService.getCharacteristic(this.platform.Characteristic.VOCDensity)
          .onGet(this.getTvocIonsclevel.bind(this));
        this.tvocIonscSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getTvocIonscStatus.bind(this));
      }
    }

    // add virus index sensor
    if (!(Object.prototype.hasOwnProperty.call(this.sensorWishList, 'virusSensor')) ||
      this.sensorWishList.virusSensor === true) {
      if (this.sensorList.indexOf('virus') !== -1) {
        this.virusSensorService = this.accessory.getService('Virus') ||
          this.accessory.addService(this.platform.Service.AirQualitySensor,
            `Virus ${this.displayName}`, `Virus ${this.serialNumber}`);
        this.virusSensorService.getCharacteristic(this.platform.Characteristic.AirQuality)
          .onGet(this.getVirusquality.bind(this));
        this.virusSensorService.getCharacteristic(this.platform.Characteristic.StatusActive)
          .onGet(this.getVirusStatus.bind(this));
      }
    }


    // Start auto-refresh data
    setInterval(() => {
      this.updateData();
    }, this.updateInterval * 1000);
    this.updateData();
  }

  async getTemperatureStatus() {
    return this.sensorStatusActive.temperature;
  }

  async getHumidityStatus() {
    return this.sensorStatusActive.humidity;
  }

  async getHealthStatus() {
    return this.sensorStatusActive.health;
  }

  async getPerformanceStatus() {
    return this.sensorStatusActive.performance;
  }

  async getCO2Status() {
    return this.sensorStatusActive.co2;
  }

  async getNO2Status() {
    return this.sensorStatusActive.no2;
  }

  async getCl2Status() {
    return this.sensorStatusActive.cl2_M20;
  }

  async getCH2OStatus() {
    return this.sensorStatusActive.ch2o_M10;
  }

  async getH2Status() {
    return this.sensorStatusActive.h2_M1000;
  }

  async getNH3Status() {
    return this.sensorStatusActive.nh3_MR100;
  }

  async getC3H8Status() {
    return this.sensorStatusActive.c3h8_MIPEX;
  }

  async getCH4Status() {
    return this.sensorStatusActive.ch4_MIPEX;
  }

  async getSO2Status() {
    return this.sensorStatusActive.so2;
  }

  async getH2SStatus() {
    return this.sensorStatusActive.h2s;
  }

  async getO3Status() {
    return this.sensorStatusActive.o3;
  }

  async getCOStatus() {
    return this.sensorStatusActive.co;
  }

  async getPressureStatus() {
    return this.sensorStatusActive.pressure;
  }

  async getPressureRelStatus() {
    return this.sensorStatusActive.pressure;
  }

  async getNoiseStatus() {
    return this.sensorStatusActive.sound;
  }

  async getVOCStatus() {
    return this.sensorStatusActive.tvoc;
  }

  async getPM2_5Status() {
    return this.sensorStatusActive.pm2_5;
  }

  async getSmokeDetectedStatus() {
    return this.sensorStatusActive.pm2_5;
  }

  async getN2OStatus() {
    return this.sensorStatusActive.n2o;
  }

  async getRadonStatus() {
    return this.sensorStatusActive.radon;
  }

  async getSmokeDetected() {
    let currentValue = this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
    if (this.latestData.pm2_5 === undefined || this.latestData.pm2_5 < 500) {
      currentValue = this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
    } else {
      currentValue = this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED;
    }
    return currentValue;
  }

  async getTemperature() {
    return this.latestData.temperature;
  }

  async getHumidity() {
    return this.latestData.humidity;
  }

  async getCO2level() {
    const currentValue = this.latestData.co2 === undefined ? 0 : this.latestData.co2;
    return currentValue;
  }

  async getCO2detected() {
    let currentValue = this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
    if (this.latestData.co2 === undefined || this.latestData.co2 < 1500){
      currentValue = this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
    } else {
      currentValue = this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
    }
    return currentValue;
  }

  async getCOlevel() {
    const currentValue = this.latestData.co === undefined ? 0 : this.latestData.co / 1.15;
    return currentValue;
  }

  async getCOdetected() {
    let currentValue = this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
    if (this.latestData.co === undefined || this.latestData.co < 30){
      currentValue = this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
    } else {
      currentValue = this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
    }
    return currentValue;
  }

  async getHealth() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.health === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.health > 900){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.health > 750){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.health > 500){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.health > 200){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getPerformance() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.performance === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.performance > 900){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.performance > 750){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.performance > 500){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.performance > 200){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getNO2quality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.no2 === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.no2 < 20){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.no2 < 45){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.no2 < 100){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.no2 < 250){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getNO2level() {
    let currentValue = 0;
    if (this.latestData.no2 === undefined || this.latestData.no2 < 0){
      currentValue = 0;
    } else if (this.latestData.no2 < 1000) {
      currentValue = this.latestData.no2;
    } else {
      currentValue = 1000;
    }
    return currentValue;
    return currentValue;
  }

  async getCl2quality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.cl2_M20 === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.cl2_M20 < 100){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.cl2_M20 < 400){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.cl2_M20 < 2000){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.cl2_M20 < 5000){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getCl2level() {
    let currentValue = 0;
    if (this.latestData.cl2_M20 === undefined || this.latestData.cl2_M20 < 0){
      currentValue = 0;
    } else if (this.latestData.cl2_M20 < 1000) {
      currentValue = this.latestData.cl2_M20;
    } else {
      currentValue = 1000;
    }
    return currentValue;
  }

  async getNH3quality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.nh3_MR100 === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.nh3_MR100 < 300){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.nh3_MR100 < 1000){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.nh3_MR100 < 2500){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.nh3_MR100 < 5000){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getNH3level() {
    let currentValue = 0;
    if (this.latestData.nh3_MR100 === undefined || this.latestData.nh3_MR100 < 0){
      currentValue = 0;
    } else if (this.latestData.nh3_MR100 < 1000) {
      currentValue = this.latestData.nh3_MR100;
    } else {
      currentValue = 1000;
    }
    return currentValue;
  }

  async getCH2Oquality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.ch2o_M10 === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.ch2o_M10 < 15){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.ch2o_M10 < 30){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.ch2o_M10 < 80){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.ch2o_M10 < 150){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getCH2Olevel() {
    let currentValue = 0;
    if (this.latestData.ch2o_M10 === undefined || this.latestData.ch2o_M10 < 0){
      currentValue = 0;
    } else if (this.latestData.ch2o_M10 < 1000) {
      currentValue = this.latestData.ch2o_M10;
    } else {
      currentValue = 1000;
    }
    return currentValue;
  }

  async getCH4quality() {
    let currentValue = this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    if (this.latestData.ch4_MIPEX === undefined || this.latestData.ch4_MIPEX < 0.5){
      currentValue = this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    } else {
      currentValue = this.platform.Characteristic.LeakDetected.LEAK_DETECTED;
    }
    return currentValue;
  }

  async getC3H8quality() {
    let currentValue = this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    if (this.latestData.c3h8_MIPEX === undefined || this.latestData.c3h8_MIPEX < 0.25){
      currentValue = this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    } else {
      currentValue = this.platform.Characteristic.LeakDetected.LEAK_DETECTED;
    }
    return currentValue;
  }

  async getH2quality() {
    let currentValue = this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    if (this.latestData.h2_M1000 === undefined || this.latestData.h2_M1000 < 1000){
      currentValue = this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    } else {
      currentValue = this.platform.Characteristic.LeakDetected.LEAK_DETECTED;
    }
    return currentValue;
  }

  async getH2Slevel() {
    let currentValue = 0;
    if (this.latestData.h2s === undefined || this.latestData.h2s < 0){
      currentValue = 0;
    } else if (this.latestData.h2s < 1000) {
      currentValue = this.latestData.h2s;
    } else {
      currentValue = 1000;
    }
    return currentValue;
  }

  async getH2Squality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.h2s === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.h2s < 50){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.h2s < 120){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.h2s < 280){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.h2s < 1000){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getO3level() {
    let currentValue = 0;
    if (this.latestData.o3 === undefined || this.latestData.o3 < 0){
      currentValue = 0;
    } else if (this.latestData.o3 < 1000) {
      currentValue = this.latestData.o3;
    } else {
      currentValue = 1000;
    }
    return currentValue;
  }

  async getO3quality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.o3 === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.o3 < 10){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.o3 < 60){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.o3 < 110){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.o3 < 180){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getSO2level() {
    let currentValue = 0;
    if (this.latestData.so2 === undefined || this.latestData.so2 < 0){
      currentValue = 0;
    } else if (this.latestData.so2 < 1000) {
      currentValue = this.latestData.so2;
    } else {
      currentValue = 1000;
    }
    return currentValue;
  }

  async getSO2quality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.so2 === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.so2 < 80){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.so2 < 120){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.so2 < 240){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.so2 < 480){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getN2Olevel() {
    let currentValue = 0;
    if (this.latestData.n2o === undefined || this.latestData.n2o < 0){
      currentValue = 0;
    } else if (this.latestData.n2o/1000 < 1000) {
      currentValue = this.latestData.n2o/1000;
    } else {
      currentValue = 1000;
    }
    return currentValue;
  }

  async getN2Oquality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.n2o === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.n2o/1000 < 10){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.n2o/1000 < 60){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.n2o/1000 < 110){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.n2o/1000 < 180){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getRadonlevel() {
    let currentValue = 0;
    if (this.latestData.radon === undefined || this.latestData.radon < 0){
      currentValue = 0;
    } else if (this.latestData.radon < 1000) {
      currentValue = this.latestData.radon;
    } else {
      currentValue = 1000;
    }
    return currentValue;
  }

  async getRadonquality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.radon === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.radon < 30){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.radon < 50){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.radon < 100){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.radon < 300){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getVOClevel() {
    let currentValue = 0;
    if (this.latestData.tvoc === undefined || this.latestData.tvoc < 0){
      currentValue = 0;
    } else if (this.latestData.tvoc < 1000) {
      currentValue = this.latestData.tvoc / 1.88;
    } else {
      currentValue = 1000;
    }
    return currentValue;
  }

  async getVOCquality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.tvoc === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.tvoc < 500){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.tvoc < 1000){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.tvoc < 1500){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.tvoc < 2500){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getPM2_5level() {
    const currentValue = this.latestData.pm2_5 === undefined ? 0 : this.latestData.pm2_5;
    return currentValue;
  }

  async getPM2_5quality() {
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (this.latestData.pm2_5 === undefined){
      currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (this.latestData.pm2_5 < 5){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (this.latestData.pm2_5 < 15){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    } else if (this.latestData.pm2_5 < 25){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    } else if (this.latestData.pm2_5 < 50){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    } else {
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  async getPM10level() {
    const currentValue = this.latestData.pm10 === undefined ? 0 : this.latestData.pm10;
    return currentValue;
  }

  async getAirPressure() {
    const currentValue = this.latestData.pressure === undefined ? 400 : this.latestData.pressure;
    return currentValue;
  }

  async getAirPressureRel() {
    const currentValue = this.latestData.pressure_rel === undefined ? 400 : this.latestData.pressure_rel;
    return currentValue;
  }

  async getNoiseLevel() {
    const currentValue = this.latestData.sound === undefined ? 13 : this.latestData.sound;
    return currentValue;
  }

  // --- Dew point ---

  async getDewPointStatus() {
    return this.sensorStatusActive.dewpt;
  }

  async getDewPoint() {
    return this.latestData.dewpt === undefined ? 0 : this.latestData.dewpt;
  }

  // --- R-32 refrigerant (leak detector) ---
  // Threshold: 0.5% matches the existing CH4 threshold (both measured in % LEL)

  async getR32Status() {
    return this.sensorStatusActive.r32;
  }

  async getR32quality() {
    if (this.latestData.r32 === undefined || this.latestData.r32 < 0.5) {
      return this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    }
    return this.platform.Characteristic.LeakDetected.LEAK_DETECTED;
  }

  // --- R-454B refrigerant (leak detector) ---

  async getR454bStatus() {
    return this.sensorStatusActive.r454b;
  }

  async getR454bquality() {
    if (this.latestData.r454b === undefined || this.latestData.r454b < 0.5) {
      return this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    }
    return this.platform.Characteristic.LeakDetected.LEAK_DETECTED;
  }

  // --- R-454C refrigerant (leak detector) ---

  async getR454cStatus() {
    return this.sensorStatusActive.r454c;
  }

  async getR454cquality() {
    if (this.latestData.r454c === undefined || this.latestData.r454c < 0.5) {
      return this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    }
    return this.platform.Characteristic.LeakDetected.LEAK_DETECTED;
  }

  // --- Mold index (0–100 %) ---

  async getMoldStatus() {
    return this.sensorStatusActive.mold;
  }

  async getMoldquality() {
    const v = this.latestData.mold;
    if (v === undefined) {
      return this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (v > 90) {
      return this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (v > 75) {
      return this.platform.Characteristic.AirQuality.GOOD;
    } else if (v > 50) {
      return this.platform.Characteristic.AirQuality.FAIR;
    } else if (v > 20) {
      return this.platform.Characteristic.AirQuality.INFERIOR;
    }
    return this.platform.Characteristic.AirQuality.POOR;
  }

  // --- Nitrogen monoxide (µg/m³) ---
  // Thresholds aligned with WHO/EU NO2 guidelines (NO converts rapidly to NO2)

  async getNOStatus() {
    return this.sensorStatusActive.no_M250;
  }

  async getNOquality() {
    const v = this.latestData.no_M250;
    if (v === undefined) {
      return this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (v < 40) {
      return this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (v < 100) {
      return this.platform.Characteristic.AirQuality.GOOD;
    } else if (v < 200) {
      return this.platform.Characteristic.AirQuality.FAIR;
    } else if (v < 400) {
      return this.platform.Characteristic.AirQuality.INFERIOR;
    }
    return this.platform.Characteristic.AirQuality.POOR;
  }

  async getNOlevel() {
    const v = this.latestData.no_M250;
    if (v === undefined || v < 0) {
      return 0;
    }
    return v < 1000 ? v : 1000;
  }

  // --- Industrial VOC / tvoc_ionsc (ppb) ---
  // Same thresholds and ppb→µg/m³ conversion as tvoc

  async getTvocIonscStatus() {
    return this.sensorStatusActive.tvoc_ionsc;
  }

  async getTvocIonscquality() {
    const v = this.latestData.tvoc_ionsc;
    if (v === undefined) {
      return this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (v < 500) {
      return this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (v < 1000) {
      return this.platform.Characteristic.AirQuality.GOOD;
    } else if (v < 1500) {
      return this.platform.Characteristic.AirQuality.FAIR;
    } else if (v < 2500) {
      return this.platform.Characteristic.AirQuality.INFERIOR;
    }
    return this.platform.Characteristic.AirQuality.POOR;
  }

  async getTvocIonsclevel() {
    const v = this.latestData.tvoc_ionsc;
    if (v === undefined || v < 0) {
      return 0;
    }
    const ugm3 = v / 1.88;
    return ugm3 < 1000 ? ugm3 : 1000;
  }

  // --- Virus index (0–100 %) ---

  async getVirusStatus() {
    return this.sensorStatusActive.virus;
  }

  async getVirusquality() {
    const v = this.latestData.virus;
    if (v === undefined) {
      return this.platform.Characteristic.AirQuality.UNKNOWN;
    } else if (v > 90) {
      return this.platform.Characteristic.AirQuality.EXCELLENT;
    } else if (v > 75) {
      return this.platform.Characteristic.AirQuality.GOOD;
    } else if (v > 50) {
      return this.platform.Characteristic.AirQuality.FAIR;
    } else if (v > 20) {
      return this.platform.Characteristic.AirQuality.INFERIOR;
    }
    return this.platform.Characteristic.AirQuality.POOR;
  }

  async getSensorData(): Promise<[DataPacket, SensorStatus]> {
    this.platform.log.debug('\tRequesting data from', this.displayName);
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
      pressure_rel: 0.0,
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
      n2o: 0.0,
      radon: 0.0,
      dewpt: 0.0,
      mold: 0.0,
      no_M250: 0.0,
      r32: 0.0,
      r454b: 0.0,
      r454c: 0.0,
      tvoc_ionsc: 0.0,
      virus: 0.0,
    };

    const status: SensorStatus = {
      health: false,
      performance: false,
      temperature: false,
      humidity: false,
      co2: false,
      co: false,
      pm2_5: false,
      pressure: false,
      pressure_rel: false,
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
      n2o: false,
      radon: false,
      dewpt: false,
      mold: false,
      no_M250: false,
      r32: false,
      r454b: false,
      r454c: false,
      tvoc_ionsc: false,
      virus: false,
    };

    try {
      // Open connection to air-Q
      const resp = await axios.get('http://'+this.accessory.context.device.ipAddress+'/data');
      const airqDataResponse = decrypt(resp.data.content, this.accessory.context.device.password);

      // DataPacket object with correct values
      if (airqDataResponse) {
        for (const key in data){
          if (Object.prototype.hasOwnProperty.call(airqDataResponse, key)){
            status[key] = true;
            data[key] = typeof(airqDataResponse[key]) === 'object' ? airqDataResponse[key][0] : airqDataResponse[key];
          }
        }
      }
      return [data, status];
    } catch (err) {
      this.platform.log.debug('\tConnection to', this.displayName, 'lost');
      return [data, status];
    }
  }

  async updateData() {
    [this.latestData, this.sensorStatusActive] = await this.getSensorData();
    return true;
  }
}
