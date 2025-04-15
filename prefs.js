import Gio from "gi://Gio";

import { ExtensionPreferences, gettext as _, } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import * as Constants from './constants.js'
import * as DpiPageHandler from "./prefsdpipage.js";
import * as PowerPagehandler from "./prefspowerpage.js"
import * as AboutPagehandler from "./prefsaboutspage.js"
import * as LogoRgbPagehandler from "./prefslogorgbpage.js"
import * as RazerDbusHandler from './razerdbushandler.js'

//glib-compile-schemas schemas/
let prefsPage = null;
export default class RazerPuppyPreferences extends ExtensionPreferences {
  constructor(metadata) {
    super(metadata);
    console.info(`constructing ${this.metadata.name}`);
    prefsPage = this;
    prefsPage._devices = [];        
    prefsPage._razer_dbus = new RazerDbusHandler.RazerDbusHandler();
  }
  fillPreferencesWindow(window) {
    this._window = window;
    
    prefsPage._razer_dbus.GetDevices(prefsPage.onDeviceList, prefsPage.onDeviceListError);
    //Dpi Settings
    this._dpiPageHandler = new DpiPageHandler.DpiPageHandler(this);
    this._dpiPageHandler.createPage();

    this._powerPageHandler = new PowerPagehandler.PowerPageHandler(this);
    this._powerPageHandler.createPage();

    this._logoRgbPageHandler = new LogoRgbPagehandler.LogoRgbPageHandler(this);
    this._logoRgbPageHandler.createPage();

    this._aboutPageHandler = new AboutPagehandler.AboutPageHandler(this);
    this._aboutPageHandler.createPage();

    /*window.connect("close-request", () => {      
    });*/
  }
  getDeviceBySerial(device_serial) {
    try {
      for (let i = 0; i < prefsPage._devices.length; ++i) {
        if (prefsPage._devices[i]._device_serial === device_serial)
          return prefsPage._devices[i];
      }
    }
    catch (error) {
      prefsPage.logException(`prefs getDeviceBySerial exception [${error}]`);
    }
    prefsPage.logDevelopment(`prefs getDeviceBySerial ${device_serial} NOT FOUND out of ${prefsPage._devices.length} `);
    return null;
  }
  getDetectedDeviceByName(device_name) {
    try {
      for (let i = 0; i < prefsPage._devices.length; ++i) {
        if (prefsPage._devices[i]._device_name === device_name)
          return prefsPage._devices[i];
      }
    }
    catch (error) {
      prefsPage.logException(`prefs getDetectedDeviceByName ${device_name} [${error}]`);
    }
    prefsPage.logDevelopment(`prefs getDetectedDeviceByName ${device_name} NOT FOUND out of ${prefsPage._devices.length} `);
    return null;
  }
  onIntrospect(device_serial, xml) {
    let device = prefsPage.getDeviceBySerial(device_serial);
    device._has_get_battery_method = false;
    let bus_info = Gio.DBusNodeInfo.new_for_xml(xml);
    if (bus_info !== null) {
      //Battery Interface
      let bus_power_interface = bus_info.lookup_interface('razer.device.power');
      if (bus_power_interface !== null) {
        let get_battery_method = bus_power_interface.lookup_method('getBattery');
        if (get_battery_method !== null) {
          prefsPage.logDevelopment(`prefs onIntrospect ${device_serial} found getBattery method!`);
          device._has_get_battery_method = true;
        }
      }

      //RGB Logo Interface
      let bus_logo_rgb_interface = bus_info.lookup_interface('razer.device.lighting.logo');
      if (bus_logo_rgb_interface !== null) {
        console.error(`prefs onIntrospect ${device_serial} found logo rgb interface!`);
        if (bus_logo_rgb_interface.lookup_method('getLogoEffect') !== null) device._has_get_logo_effect_method = true;
        if (bus_logo_rgb_interface.lookup_method('setLogoStatic') !== null) device._has_logo_static_method = true;
        if (bus_logo_rgb_interface.lookup_method('setLogoSpectrum') !== null) device._has_logo_spectrum_method = true;
        if (bus_logo_rgb_interface.lookup_method('setLogoBrightness') !== null) device._has_logo_brightness_method = true;
        if (bus_logo_rgb_interface.lookup_method('setLogoNone') !== null) device._has_logo_none_method = true;
        if (bus_logo_rgb_interface.lookup_method('setLogoBreathSingle') !== null) device._has_logo_breathing_single_method = true;
        if (bus_logo_rgb_interface.lookup_method('setLogoBreathDual') !== null) device._has_logo_breathing_dual_method = true;
        if (bus_logo_rgb_interface.lookup_method('setLogoReactive') !== null) device._has_logo_reactive_method = true;
        if (bus_logo_rgb_interface.lookup_method('setLogoBreathRandom') !== null) device._has_logo_breathe_random_method = true;        
      }
      //razer.device.lighting.logo
    }
    else
      prefsPage.logDevelopment(`prefs onIntrospect ${device_serial} found NO logo rgb interface!`);

    prefsPage._razer_dbus.GetDeviceName(device._device_serial,
      prefsPage.onDeviceName,
      prefsPage.onDeviceNameError);
  }
  onLogoEffect(device_serial, effect) {
    prefsPage.logDevelopment(`prefs onLogoEffect [${device_serial} ${effect}]`);

    try {
      let device = prefsPage.getDeviceBySerial(device_serial);
      device._effect = effect;
      prefsPage._razer_dbus.GetLogoBrightness(device._device_serial,
        prefsPage.onLogoBrightness,
        prefsPage.onLogoBrightnessError);

    }
    catch (error) {
      prefsPage.logException(`prefs onLogoEffect EXCEPTION [${device_serial}] [${error}]`);
    }
        
  }
  onLogoEffectError(device_serial, error) {
    prefsPage.logException(`prefs onLogoEffectError [${device_serial} ${error}]`);
  }
  onLogoBrightness(device_serial, brightness) {
    prefsPage.logDevelopment(`prefs onLogoBrightness [${device_serial} ${brightness}]`);

    try {
      let device = prefsPage.getDeviceBySerial(device_serial);
      device._brightness = brightness;
      prefsPage._razer_dbus.GetLogoEffectColors(device._device_serial,
        prefsPage.onLogoEffectColors,
        prefsPage.onLogoEffectColorsError);

    }
    catch (error) {
      prefsPage.logException(`prefs onLogoBrightness EXCEPTION [${device_serial}] [${error}]`);
    }    
  }
  onLogoBrightnessError(device_serial, error) {
    prefsPage.logException(`prefs onLogoBrightnessError [${device_serial} ${error}]`);
  }
  onLogoEffectColors(device_serial, colors_array) {
    prefsPage.logDevelopment(`prefs onLogoEffectColors [${device_serial} ${colors_array.length}]`);    
    try {
      let device = prefsPage.getDeviceBySerial(device_serial);      
      device._color1 = [0, 0, 0];
      device._color2 = [0, 0, 0];
      device._color3 = [0, 0, 0];
      if (colors_array.length >= 3) {
        device._color1[0] = colors_array[0];
        device._color1[1] = colors_array[1];
        device._color1[2] = colors_array[2];
      }
      if (colors_array.length >= 6) {
        device._color2[0] = colors_array[3];
        device._color2[1] = colors_array[4];
        device._color2[2] = colors_array[5];
      }
      if (colors_array.length >= 9) {
        device._color3[0] = colors_array[6];
        device._color3[1] = colors_array[7];
        device._color3[2] = colors_array[8];
      }
              
      prefsPage._logoRgbPageHandler.onDeviceName(device);
    }
    catch (error) {
      prefsPage.logException(`prefs onLogoEffectColors EXCEPTION [${device_serial}] [${error}]`);
    }
  }
  onLogoEffectColorsError(device_serial, error) {
    prefsPage.logException(`prefs onLogoEffectColorsError [${device_serial} ${error}]`);
  }
  onDeviceList(device_list) {
    console.error(`prefs onDeviceList [${device_list}]`);
    try {
      for (let i = 0; i < device_list.length; ++i) {
        let device_serial = device_list[i];
        let device = prefsPage.getDeviceBySerial(device_serial);
        if (device === null) {
          device = new RazerDbusHandler.RazerDevice();
          device._device_serial = device_serial;
          prefsPage._devices.push(device);
        }
        prefsPage._razer_dbus.Introspect(device._device_serial, prefsPage.onIntrospect);
      }

    }
    catch (e) {
      prefsPage.logException(`prefs onDeviceList exception [${device_list}] [${e}]`);
    }

  }
  onDeviceListError(error) {
    prefsPage.logException(`prefs onDeviceListError [${error}]`);
  }
  onDeviceName(device_serial, device_name) {
    prefsPage.logDevelopment(`prefs onDeviceName [${device_serial}] [${device_name}]`);
    try {

      let device = prefsPage.getDeviceBySerial(device_serial);
      if (device !== null) {
        device._device_name = device_name;        
        prefsPage._dpiPageHandler.onDeviceName(device);        
        prefsPage._powerPageHandler.onDeviceName(device);        
        prefsPage._razer_dbus.GetDeviceType(device._device_serial,
          prefsPage.onDeviceType,
          prefsPage.onDeviceTypeError);        
        if (device._has_logo_brightness_method) {
          prefsPage._razer_dbus.GetLogoEffect(device._device_serial,
            prefsPage.onLogoEffect,
            prefsPage.onLogoEffectError);
        }
      }
    }
    catch (error) {
      prefsPage.logException(`prefs onDeviceName EXCEPTION [${device_serial}] [${device_name}] [${error}]`);
    }
  }
  onDeviceNameError(device_serial, error) {
    prefsPage.logException(`prefs onDeviceNameError [${device_serial}] [${error}]`);
  }
  onDeviceType(device_serial, device_type) {
    prefsPage.logDevelopment(`prefs onDeviceType [${device_serial}] [${device_type}]`);
    try {
      let device = prefsPage.getDeviceBySerial(device_serial);
      if (device !== null)
        device._device_type = device_type;

      prefsPage._dpiPageHandler.onDeviceType(device);
      prefsPage._powerPageHandler.onDeviceType(device);
      if (device_type === Constants.DEVICE_TYPE_MOUSE) {
        prefsPage._razer_dbus.GetDpi(device_serial, prefsPage.onGetDpi, prefsPage.onGetDpi);
        prefsPage._razer_dbus.GetDpiStages(device_serial, prefsPage.onGetDpiStages, prefsPage.onGetDpiStagesError);
      }

    }
    catch (error) {
      prefsPage.logException(`prefs onDeviceType EXCEPTION [${device_serial}] [${error}]`);
    }
  }
  onDeviceTypeError(device_serial, error) {
    prefsPage.logException(`prefs onDeviceTypeError [${device_serial}] [${error}]`);
  }
  onGetDpiStages(device_serial, stages) {
    prefsPage.logDevelopment(`prefs onGetDpiStages [${device_serial}] [${stages.length}] [${stages}]`);
    if (stages === null)
      return;
    try {
      let device = prefsPage.getDeviceBySerial(device_serial);
      if (device === null) return;
      device._onboard_dpis = [];
      device._onboard_dpis_xy = [];
      //let active_stage = stages[0];
      for (let index = 0; index < stages[1].length; ++index) {
        let stage = stages[1][index];
        let x = stage[0];
        let y = stage[1];
        device._onboard_dpis_xy.push([x, y]);
        device._onboard_dpis.push(x);
      }
      prefsPage._dpiPageHandler.onGetDpiStages(device);
      prefsPage._razer_dbus.GetMaxDpi(device_serial, prefsPage.onGetMaxDpi, prefsPage.onGetMaxDpi);
    }
    catch (error) {
      prefsPage.logException(`prefs onGetDpiStages exception [${device_serial}] [${error}]`);
    }
  }
  onGetDpiStagesError(device_serial, error) {
    prefsPage.logException(`prefs onGetDpiStagesError [${device_serial}] [${error}]`);
  }
  onGetDpi(device_serial, dpi) {
    prefsPage.logDevelopment(`prefs onGetDpi [${device_serial}] [${dpi}]`);

    try {
      let device = prefsPage.getDeviceBySerial(device_serial);
      if (device === null) return;
      device._current_dpi = dpi[0];
      device._current_dpi_xy = dpi;
    }
    catch (error) {
      prefsPage.logException(`prefs onGetDpi exception [${device_serial}] [${error}]`);
    }

  }
  onGetDpiError(device_serial, error) {
    prefsPage.logException(`prefs onGetDpiError [${device_serial}] [${error}]`);
  }
  onGetMaxDpi(device_serial, maxdpi) {
    prefsPage.logDevelopment(`prefs onGetMaxDpi [${device_serial}] [${maxdpi}]`);

    try {
      let device = prefsPage.getDeviceBySerial(device_serial);
      if (device === null) return;
      device._max_dpi = maxdpi;
      prefsPage._dpiPageHandler.onGetMaxDpi(device);
    }
    catch (error) {
      prefsPage.logException(`prefs onGetMaxDpi exception [${device_serial}] [${error}]`);
    }

  }
  onGetMaxDpiError(device_serial, error) {
    prefsPage.logException(`prefs onGetMaxDpiError [${device_serial}] [${error}]`);
  }
  onRefreshDpiStages(device_serial, stages) {
    prefsPage.logDevelopment(`prefs onRefreshDpiStages [${device_serial}] [${stages.length}] [${stages}]`);
    if (stages === null) return;
    try {
      let device = prefsPage.getDeviceBySerial(device_serial);
      if (device === null) return;
      device._onboard_dpis = [];
      device._onboard_dpis_xy = [];
      //let active_stage = stages[0];
      for (let index = 0; index < stages[1].length; ++index) {
        let stage = stages[1][index];
        let x = stage[0];
        let y = stage[1];
        device._onboard_dpis_xy.push([x, y]);
        device._onboard_dpis.push(x);
      }
      prefsPage._dpiPageHandler.onRefreshDpiStages(device);      
    }
    catch (error) {
      prefsPage.logException(`prefs onRefreshDpiStages exception [${device_serial}] [${error}]`);
    }
    
  }
  logDevelopment(message) {
    if (Constants.LOG_DEVELOPMENT_ENABLED) 
      console.error(message);  
  }
  logException(message) {
    console.error(message);  
  }
}
