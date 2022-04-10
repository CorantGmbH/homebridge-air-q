# Homebridge air-Q
[![mit license](https://badgen.net/badge/license/MIT/red)](https://github.com/apexad/homebridge-mysmartblinds-bridge/blob/master/LICENSE)

This plugin for [Homebridge](https://github.com/homebridge/homebridge) is based
on the [Homebridge Platform Plugin Template](https://github.com/homebridge/homebridge-plugin-template).

## Plugin Installation

This plugin was developed to be installed and configured with
[homebridge-config-ui-x](https://www.npmjs.com/package/homebridge-config-ui-x).
It can be found by searching for `air-Q` in the `Plugins` section.

## Working Principle

1. The plugin performs and mDNS scan to find all air-Qs in the connected network.
2. For each found device which has also been configured with the air-Q short-ID
   (1st five letters of the serial number) and device password (as configured in
    the air-Q mobile phone App), a HTTP network connection will be established.
3. Each device will be initialized depending on the sensor list found in the
   retrieved device configuration.
4. If a sensor is still in warm-up phase, it will be marked as `inactive`. The
   sensor state will be updated every 120 seconds by a data request to this air-Q.
5. Live measured data will be requested every 10 seconds.
6. Many of air-Q's sensors are not supported by the HomeKit specification. To make
   them accessible anyways, they are *disguised* as either *air quality sensors*
   each by its own (health and performance index, Ozone, Hydrogen Sulfide,
   Sulfur Dioxide, Nitrogen Dioxide, Ammonia, Formaldehyde, Chlorine, VOCs,
   particulates), smoke detector (again particulates), leak detector (Methane,
   Propane, Hydrogen), or light detector (Noise Level and Air Pressure).


## Development and Contribution

In order to modify this plugin, the same procedure applies as for the original
plugin template. They are as follows in shorted version:

### Setup Development Environment

To develop Homebridge plugins you must have Node.js 12 or later installed, and a modern code editor such as [VS Code](https://code.visualstudio.com/). This plugin template uses [TypeScript](https://www.typescriptlang.org/) to make development easier and comes with pre-configured settings for [VS Code](https://code.visualstudio.com/) and ESLint. If you are using VS Code install these extensions:

* [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

### Install Development Dependencies

Using a terminal, navigate to the project folder and run this command to install the development dependencies:

```
npm install
```

### Build Plugin

TypeScript needs to be compiled into JavaScript before it can run. The following command will compile the contents of your [`src`](./src) directory and put the resulting code into the `dist` folder.

```
npm run build
```

### Link To Homebridge

Run this command so your global install of Homebridge can discover the plugin in your development environment:

```
npm link
```

You can now start Homebridge, use the `-D` flag so you can see debug log messages in your plugin:

```
homebridge -D
```

### Customise Plugin

* [`src/platform.ts`](./src/platform.ts) - this is where your device setup and discovery should go.
* [`src/platformAccessory.ts`](./src/platformAccessory.ts) - this is where your accessory control logic should go, you can rename or create multiple instances of this file for each accessory type you need to implement as part of your platform plugin. You can refer to the [developer documentation](https://developers.homebridge.io/) to see what characteristics you need to implement for each service type.
* [`config.schema.json`](./config.schema.json) - update the config schema to match the config you expect from the user. See the [Plugin Config Schema Documentation](https://developers.homebridge.io/#/config-schema).

### Versioning Your Plugin

Given a version number `MAJOR`.`MINOR`.`PATCH`, such as `1.4.3`, increment the:

1. **MAJOR** version when you make breaking changes to your plugin,
2. **MINOR** version when you add functionality in a backwards compatible manner, and
3. **PATCH** version when you make backwards compatible bug fixes.

You can use the `npm version` command to help you with this:

```bash
# major update / breaking changes
npm version major

# minor update / new features
npm version update

# patch / bugfixes
npm version patch
```

### Publish Package

When you are ready to publish your plugin to [npm](https://www.npmjs.com/), make sure you have removed the `private` attribute from the [`package.json`](./package.json) file then run:

```
npm publish
```

If you are publishing a scoped plugin, i.e. `@username/homebridge-xxx` you will need to add `--access=public` to command the first time you publish.

#### Publishing Beta Versions

You can publish *beta* versions of your plugin for other users to test before you release it to everyone.

```bash
# create a new pre-release version (eg. 2.1.0-beta.1)
npm version prepatch --preid beta

# publsh to @beta
npm publish --tag=beta
```

Users can then install the  *beta* version by appending `@beta` to the install command, for example:

```
sudo npm install -g homebridge-example-plugin@beta
```
