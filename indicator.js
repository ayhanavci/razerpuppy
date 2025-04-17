import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import GLib from 'gi://GLib';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as RazerDbusHandler from './razerdbushandler.js'
import * as DevicePopup from './devicesubmenu.js'
import * as Constants from './constants.js'
import * as Utils from "./utils.js";

export const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, _('Razer Puppy Indicator'));
            
            this._extension = extension;
            this._settings = extension.getSettings();
            this._devices = [];
            this._device_popup_menus = [];
            this._max_device_menu_count = 20;
            this._max_power_history_count = 4;
            this._tooltip = new St.Label({ style_class: 'battery-info-panel-tooltip' });
            this.label_actor = this._tooltip;

            Main.layoutManager.addChrome(this._tooltip);
            this._handler_enter_event = this.connect("enter-event", (_widget) => {
                this.showTooltip();
            });
            this._handler_exit_event = this.connect("leave-event", (_widget) => {
                this.hideTooltip();
            });

            this._battery_missing_icon = Gio.icon_new_for_string("battery-missing-symbolic");

            //NOT CHARGING
            this._battery_full_icon = Gio.icon_new_for_string("battery-full-symbolic");
            this._battery_good_icon = Gio.icon_new_for_string("battery-good-symbolic");
            this._battery_low_icon = Gio.icon_new_for_string("battery-low-symbolic");
            this._battery_empty_icon = Gio.icon_new_for_string("battery-empty-symbolic");
            this._battery_idle_icon = Gio.icon_new_for_string("preferences-desktop-screensaver-symbolic");

            //CHARGING
            this._battery_charging_full_icon = Gio.icon_new_for_string("battery-full-charging-symbolic");
            this._battery_charging_good_icon = Gio.icon_new_for_string("battery-good-charging-symbolic");
            this._battery_charging_low_icon = Gio.icon_new_for_string("battery-low-charging-symbolic");
            this._battery_charging_empty_icon = Gio.icon_new_for_string("battery-empty-charging-symbolic");

            this._battery_icon = new St.Icon({
                gicon: this._battery_missing_icon,
                style_class: 'system-status-icon',
            });

            this._info_box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

            this._percentage_label = new St.Label({
                reactive: true,
                y_align: Clutter.ActorAlign.CENTER,
                text: _(""),
            });

            let new_size = this._settings.get_uint(Constants.SCHEMA_PERCENTAGE_FONT_SIZE);
            this._percentage_label.style = `font-size: ${new_size}px;`;
            this._percentage_label.style_changed();
            this._percentage_label.hide();
            this._info_box.add_child(this._battery_icon);
            this._info_box.add_child(this._percentage_label);
            this.add_child(this._info_box);
            //this.add_child(this._battery_icon);


            this._razer_dbus = new RazerDbusHandler.RazerDbusHandler();

            for (let i = 0; i < this._max_device_menu_count; ++i) {
                let device_sub_menu = new DevicePopup.DeviceSubMenu(this, i);
                this._device_popup_menus.push(device_sub_menu);
                this.menu.addMenuItem(device_sub_menu);
                device_sub_menu.hide();
            }
            this._settingsMenuItem = new PopupMenu.PopupImageMenuItem(_("Settings"), Constants.ICON_SETTINGS, { style_class: Constants.CSS_SETTINGS_POPUP, },);
            this._handler_settings_menu_activate = this._settingsMenuItem.connect("activate", () => { this._extension.openPreferences(); });
            this.menu.addMenuItem(this._settingsMenuItem);

            this._handler_power_per_change = this._settings.connect(`changed::${Constants.SCHEMA_SHOW_POWER_PERCENTAGE}`, () => {                                
                this.showPowerPercentage(this.getDefaultPowerDevice());
            });
            this._handler_font_size_change = this._settings.connect(`changed::${Constants.SCHEMA_PERCENTAGE_FONT_SIZE}`, () => {
                let size = this._settings.get_uint(Constants.SCHEMA_PERCENTAGE_FONT_SIZE);
                this._percentage_label.style = `font-size: ${size}px;`;
                this._percentage_label.style_changed();
            });
            //return;
            this._razer_dbus.GetDevices(this.onDeviceList.bind(this), this.onDeviceListError.bind(this));
            //return;
            this._repeat_timer = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT, 3,
                () => {
                    this._razer_dbus.GetDevices(this.onDeviceList.bind(this), this.onDeviceListError.bind(this));
                    return true;
                });
        }

        showPowerPercentage(device) {
            if (!this._settings.get_boolean(Constants.SCHEMA_SHOW_POWER_PERCENTAGE)) {
                this._percentage_label.hide();
                return;
            }           
            if (device === null || device === undefined) {
                this._percentage_label.hide();
                return;//No saved device nor any connected device with battery
            }                
            
            let truncated = Math.trunc(device._power_level);
            this._percentage_label.text = `${truncated.toString()}%`;

            this._percentage_label.show();
        }
        switchToNextDPI() {
            let default_dpi_device_serial = this._settings.get_string(Constants.SCHEMA_DPI_HOTKEY_DEVICE_SERIAL);
            if (Utils.isEmptyString(default_dpi_device_serial))
                return;
            let razer_device = this.getRazerDevice(default_dpi_device_serial);
            if (razer_device === null)
                return;
            let dpis = razer_device._onboard_dpis;

            if (razer_device._hotkey_dpi_index === dpis.length - 1) razer_device._hotkey_dpi_index = 0;
            else razer_device._hotkey_dpi_index += 1;

            this._razer_dbus.SetDpi(default_dpi_device_serial, dpis[razer_device._hotkey_dpi_index]);
        }

        onIntrospect(device_serial, xml) {            
            let bus_info = Gio.DBusNodeInfo.new_for_xml(xml);
            if (bus_info === null) {
                this.logDevelopment(`onIntrospect ${device_serial} No bus info]`)
                return;
            }
            let bus_power_interface = bus_info.lookup_interface('razer.device.power');
            if (bus_power_interface === null) {
                this.logDevelopment(`onIntrospect ${device_serial} No power interface]`);
                return;
            }
            let get_battery_method = bus_power_interface.lookup_method('getBattery');
            if (get_battery_method === null) {
                this.logDevelopment(`onIntrospect ${device_serial} No getBattery method`);
                return;
            }
            this.logDevelopment(`onIntrospect ${device_serial} found getBattery method!`);
            let device = this.getRazerDevice(device_serial);
            device._has_get_battery_method = true;
            this._razer_dbus.GetBatteryPower(device_serial,
                this.onPowerStatus.bind(this),
                this.onPowerError.bind(this));
        }
        onDeviceList(device_list) {
            try {
                this.logDevelopment(`onDeviceList [${device_list}]`);
                this.clearUnpluggedDevices(device_list);
                this.updateActiveDevices(device_list);

                //Re-create connected device list. 
                for (let i = 0; i < device_list.length; ++i) {
                    let device_serial = device_list[i];

                    let razer_device = this.getRazerDevice(device_serial);
                    if (razer_device === null) {
                        this.logDevelopment(`ADDING NEW DEVICE: ${device_serial}`);
                        razer_device = new RazerDbusHandler.RazerDevice();
                        razer_device._device_serial = device_serial;
                        this._devices.push(razer_device);                        
                    }
                    this._razer_dbus.GetDeviceName(razer_device._device_serial,
                        this.onDeviceName.bind(this),
                        this.onDeviceNameError.bind(this));
                    this._razer_dbus.GetDeviceType(razer_device._device_serial,
                        this.onDeviceType.bind(this),
                        this.onDeviceTypeError.bind(this));

                    if (razer_device._has_get_battery_method === undefined)
                        this._razer_dbus.Introspect(razer_device._device_serial, this.onIntrospect.bind(this));
                    else if (razer_device._has_get_battery_method === true)
                        this._razer_dbus.GetBatteryPower(razer_device._device_serial,
                            this.onPowerStatus.bind(this),
                            this.onPowerError.bind(this));
                }
            }
            catch (e) {
                this.logException(`onDeviceList exception [${device_list}] [${e}]`);
            }
            this.LogState("onDeviceList");
        }
        onDeviceListError(error) {
            this.logException(`onDeviceListError [${error}]`);
        }
        onDeviceName(device_serial, device_name) {
            this.logDevelopment(`onDeviceName [${device_serial}] [${device_name}]`);
            try {
                let device = this.getRazerDevice(device_serial);
                if (device === null) return;
                if (Utils.isEmptyString(device._device_name) || device._device_name !== device_name) 
                    device._device_name = device_name;                                    
                this.showDevicePopupMenu(device);
            }
            catch (error) {
                this.logException(`onDeviceName EXCEPTION [${device_serial}] [${device_name}] [${error}]`);
            }
            this.LogState("onDeviceName");
        }
        onDeviceNameError(device_serial, error) {
            this.logException(`onDeviceNameError [${device_serial}] [${error}]`);
        }
        onDeviceType(device_serial, device_type) {
            this.logDevelopment(`onDeviceType [${device_serial}] [${device_type}]`);
            try {
                let device = this.getRazerDevice(device_serial);
                if (device !== null)
                    device._device_type = device_type;
                if (device_type === Constants.DEVICE_TYPE_MOUSE) {
                    let default_dpi_device_serial = this._settings.get_string(Constants.SCHEMA_DPI_HOTKEY_DEVICE_SERIAL);
                    if (Utils.isEmptyString(default_dpi_device_serial))  //If there is no default already
                        this._settings.set_string(Constants.SCHEMA_DPI_HOTKEY_DEVICE_SERIAL, device_serial);

                    this._razer_dbus.GetDpi(device_serial, 
                        this.onGetDpi.bind(this), this.onGetDpiError.bind(this));
                    this._razer_dbus.GetDpiStages(device_serial, 
                        this.onGetDpiStages.bind(this), this.onGetDpiStagesError.bind(this));
                }
            }
            catch (error) {
                this.logException(`onDeviceType EXCEPTION [${device_serial}] [${device_type}] [${error}]`);
            }
            this.LogState("onDeviceType");
        }
        onDeviceTypeError(device_serial, error) {
            this.logException(`onDeviceTypeError [${device_serial}] [${error}]`);
        }
        onGetDpiStages(device_serial, stages) {
            this.logDevelopment(`onGetDpiStages [${device_serial}] [${stages.length}] [${stages}]`);
            if (stages === null)
                return;
            try {
                let device = this.getRazerDevice(device_serial);
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

                this.UpdatePopupDpis(device);
            }
            catch (error) {
                this.logException(`onGetDpiStages exception [${device_serial}] [${error}]`);
            }
        }
        onGetDpiStagesError(device_serial, error) {
            this.logException(`onGetDpiStagesError [${device_serial}] [${error}]`);
        }
        onGetDpi(device_serial, dpi) {
            this.logDevelopment(`onGetDpi [${device_serial}] [${dpi}]`);

            try {
                let device = this.getRazerDevice(device_serial);
                if (device === null)
                    return;
                device._current_dpi = dpi[0];
                device._current_dpi_xy = dpi;

                this.UpdatePopupCurrentDpi(device);
            }
            catch (error) {
                this.logException(`onGetDpi exception [${device_serial}] [${error}]`);
            }

        }
        onGetDpiError(device_serial, error) {
            this.logException(`onGetDpiError [${device_serial}] [${error}]`);
        }
        onPowerStatus(device_serial, power_level, no_method) {
            this.logDevelopment(`onPowerStatus [${device_serial}] [${power_level}] [${no_method}]`);
            let default_battery_device_serial = this._settings.get_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL);
            if (Utils.isEmptyString(default_battery_device_serial)) { //Check if there is no default device for power
                default_battery_device_serial = device_serial;
                this._settings.set_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL, device_serial);
            }
            let device = this.getRazerDevice(device_serial);
            if (device !== null) {
                power_level = this.getNormalizedPowerLevel(device, power_level);
                device._power_level = power_level;
            }
            this._razer_dbus.GetIsCharging(device_serial, this.onIsCharging.bind(this), this.onIsChargingError.bind(this));
            this.LogState("onPowerStatus");
        }
        onPowerError(device_serial, error) {
            this.logException(`onPowerError [${device_serial}] [${error}]`);
        }
        getNormalizedPowerLevel(device, new_power_level) {
            let normalized_power = new_power_level;

            if (new_power_level <= 0) {
                for (let i = 0; i < this._max_power_history_count; ++i) {
                    if (device._power_level_history[i] > 1) { //If even 1 of the last n values is greater than 1%, then no change
                        normalized_power = device._power_level;
                        break;
                    }
                }
            }

            //Insert new power 
            if (device._power_level_history.length < this._max_power_history_count) { //if there is a space
                device._power_level_history.push(new_power_level);
            }
            else {//if the list is full, ditch the oldest
                device._power_level_history.shift();
                device._power_level_history.push(new_power_level);
            }

            return normalized_power;
        }
        onIsCharging(device_serial, is_charging, error) {
            this.logDevelopment(`onIsCharging [${device_serial}] [${is_charging}] [${error}]`);
            try {
                if (error !== null)
                    return;
                let device = this.getRazerDevice(device_serial);
                if (device === null)
                    return;
                let default_battery_device_serial = this._settings.get_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL);
                device._is_charging = is_charging;
                if (device_serial === default_battery_device_serial) { //Default power device is this device
                    let power_level = device._power_level;
                    this.showPowerPercentage(device);
                    this.logDevelopment(`onIsCharging Active Device Found: [${device_serial}] [${power_level}]`);
                    if (is_charging) {
                        if (power_level > 90)
                            this._battery_icon.set_gicon(this._battery_charging_full_icon);
                        else if (power_level > 35)
                            this._battery_icon.set_gicon(this._battery_charging_good_icon);
                        else if (power_level === 0)
                            this._battery_icon.set_gicon(this._battery_charging_empty_icon);
                        else
                            this._battery_icon.set_gicon(this._battery_charging_low_icon);
                    }
                    else {
                        //this.logDevelopment(`onPowerStatus Active Device Found: [${device_serial}] [${power_level}]`);   
                        if (power_level > 90)
                            this._battery_icon.set_gicon(this._battery_full_icon);
                        else if (power_level > 35)
                            this._battery_icon.set_gicon(this._battery_good_icon);
                        else if (power_level > 1)
                            this._battery_icon.set_gicon(this._battery_low_icon);
                        else if (power_level > 0)
                            this._battery_icon.set_gicon(this._battery_empty_icon);
                        else if (power_level === 0)
                            this._battery_icon.set_gicon(this._battery_idle_icon);
                        else
                            this._battery_icon.set_gicon(this._battery_missing_icon);
                    }
                }
                else {
                    this.logDevelopment(`onIsCharging Not active battery Device: [${device_serial}] [${default_battery_device_serial}]`);
                }
            }
            catch (_error) {
                this.logException(`onIsCharging [${device_serial}] [${_error}] [${error}]`);
            }

            this.LogState("onIsCharging");
        }
        onIsChargingError(device_serial, error) {
            this.logDevelopment(`onIsChargingError [${device_serial}] [${error}]`);
        }
        getRazerDevice(device_serial) {
            try {
                for (let i = 0; i < this._devices.length; ++i) {
                    if (this._devices[i]._device_serial === device_serial)
                        return this._devices[i];
                }
            }
            catch (error) {
                this.logException(`getRazerDevice [${error}]`);
            }
            return null;
        }
        getAnyRazerDeviceWithBattery() {
            for (let i = 0; i < this._devices.length; ++i) {
                if (this._devices[i]._has_get_battery_method === true) 
                    return this._devices[i];                
            }
            return null;
        }
        getDefaultPowerDevice() {
            let device = null;
            //Try to get the device which was set as default power device
            let default_battery_device_serial = this._settings.get_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL);            
            if (!Utils.isEmptyString(default_battery_device_serial)) 
                device = this._devices.find(dev => default_battery_device_serial === dev._device_serial);                        
            
            //Default not found. Get any device with a battery
            if (device === null || device === undefined) {
                device = this.getAnyRazerDeviceWithBattery(); 
                if (device !== null) //Set the device as default. 
                    this._settings.set_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL, device._device_serial);
            }                
            
            return device;
        }
        showDevicePopupMenu(device) {
            try {
                this.logDevelopment(`showDevicePopupMenu ${device._device_serial} ${device._device_name}`);
                let proper_slot = null;
                for (let j = 0; j < this._device_popup_menus.length; ++j) {
                    let device_popup_menu = this._device_popup_menus[j];
                    if (device_popup_menu._device === null) {
                        if (proper_slot === null) proper_slot = device_popup_menu;
                    }
                    else if (device_popup_menu._device._device_serial === device._device_serial) //already exist
                    {
                        proper_slot = device_popup_menu;
                        break;
                    }
                }

                if (proper_slot !== null) {
                    proper_slot.UpdateDevice(proper_slot, device);
                    proper_slot.show();
                }
            }
            catch (error) {
                this.logException(`showDevicePopupMenu EXCEPTION ${error}`);
            }
        }
        UpdatePopupDpis(device) {
            try {
                this.logDevelopment(`UpdatePopupDpis ${device}`);
                for (let j = 0; j < this._device_popup_menus.length; ++j) {
                    let device_popup_menu = this._device_popup_menus[j];
                    if (device_popup_menu._device === null) continue;
                    if (device_popup_menu._device._device_serial === device._device_serial) {
                        device_popup_menu.UpdateDpis(device_popup_menu);
                        return;
                    }
                }
            }
            catch (error) {
                this.logException(`UpdatePopupDpis exception ${device} ${error}`);
            }

        }
        UpdatePopupCurrentDpi(device) {
            try {
                this.logDevelopment(`UpdatePopupCurrentDpi ${device._device_serial}`);
                for (let j = 0; j < this._device_popup_menus.length; ++j) {
                    let device_popup_menu = this._device_popup_menus[j];
                    if (device_popup_menu._device === null) continue;
                    if (device_popup_menu._device._device_serial === device._device_serial) {
                        device_popup_menu.UpdateCurrentDpi(device_popup_menu);
                        return;
                    }
                }
            }
            catch (error) {
                this.logException(`UpdatePopupCurrentDpi exception ${device} ${error}`);
            }
        }
        clearUnpluggedDevices(device_list) {
            //Filter devices that no longer exists.
            for (let i = 0; i < this._devices.length; ++i) {
                this._devices[i]._is_online = false;
                for (let j = 0; j < device_list.length; ++j) {
                    if (device_list[j] === this._devices[i]._device_serial) {
                        this._devices[i]._is_online = true;
                        break;
                    }
                }
                if (this._devices[i]._is_online === false) {
                    this.hideUnpluggedDevice(this._devices[i]._device_serial);
                    let default_battery_device_serial = this._settings.get_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL);                     
                    if (this._devices[i]._device_serial === default_battery_device_serial) {
                        this._battery_icon.set_gicon(this._battery_missing_icon); 
                        this._percentage_label.text = "";
                    }
                }                    
            }
        }
        hideUnpluggedDevice(device_serial) {
            for (let i = 0; i < this._device_popup_menus.length; ++i) {
                let device_popup_menu = this._device_popup_menus[i];
                if (device_popup_menu._device !== null &&
                    device_popup_menu._device._device_serial === device_serial) {

                    device_popup_menu._device = null;
                    device_popup_menu.hide();
                    return;
                }
            }
        }
        updateActiveDevices(device_list) {
            //Check if the active devices in settings are connected. If it is not, clear active devices.
            
            //Default battery device
            let default_battery_device_serial = this._settings.get_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL);                        
            if (!Utils.isEmptyString(default_battery_device_serial)) {
                let fFound = false;
                for (let i = 0; i < device_list.length; ++i) {
                    if (default_battery_device_serial === device_list[i]) {
                        fFound = true;
                        break;
                    }
                }
                if (!fFound) //Default Power mouse is NOT plugged in. Clean it up. It will be auto filled at onPowerStatus
                    this._settings.set_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL, "");
            }
            //Default dpi device            
            let default_dpi_device_serial = this._settings.get_string(Constants.SCHEMA_DPI_HOTKEY_DEVICE_SERIAL);
            if (!Utils.isEmptyString(default_dpi_device_serial)) { //If there is a default dpi device.
                let fFound = false;
                for (let i = 0; i < device_list.length; ++i) { //Check if it is plugged in.
                    if (default_dpi_device_serial === device_list[i]) {
                        fFound = true;
                        break;
                    }
                }
                if (!fFound) //Default DPI mouse is NOT plugged in. Clean it up. It will be auto filled at onDeviceType
                    this._settings.set_string(Constants.SCHEMA_DPI_HOTKEY_DEVICE_SERIAL, "");
            }
        }
        LogState(title) {
            for (let i = 0; i < this._devices.length; ++i) {
                let dev = this._devices[i];
                this.logDevelopment(`LogState ${title} [${dev._device_serial}] [${dev._device_name}] power:[${dev._power_level}] is_charging:[${dev._is_charging}] dpis:[${dev._onboard_dpis}]`);
            }
        }
        updateToolTip() {
            let show_tooltip = this._settings.get_boolean(Constants.SCHEMA_SHOW_HOVER_POWER);
            this._tooltip.text = "";
            if (!show_tooltip) return;
            
            let device = this.getDefaultPowerDevice();                                          
            if (device === null) return;

            let truncated = Math.trunc(device._power_level);
            this._tooltip.text = `${device._device_name}\n${truncated}%`;
            if (device._is_charging === true) this._tooltip.text += " Charging";
        }
        showTooltip() {
            this.updateToolTip();

            if (Utils.isEmptyString(this._tooltip.text)) {
                this.hideTooltip();
                return;
            };
            this._tooltip.opacity = 0;
            this._tooltip.show();

            let [stageX, stageY] = this.get_transformed_position();

            let itemWidth = this.allocation.x2 - this.allocation.x1;
            let tooltipWidth = this._tooltip.get_width();

            let y = stageY + 40;
            let x = Math.floor(stageX + itemWidth / 2 - tooltipWidth / 2);

            let parent = this._tooltip.get_parent();
            let parentWidth = parent.allocation.x2 - parent.allocation.x1;

            if (Clutter.get_default_text_direction() === Clutter.TextDirection.LTR) {
                // stop long tooltips falling off the right of the screen
                x = Math.min(x, parentWidth - tooltipWidth - 6);
                // but whatever happens don't let them fall of the left
                x = Math.max(x, 6);
            }
            else {
                x = Math.max(x, 6);
                x = Math.min(x, parentWidth - tooltipWidth - 6);
            }

            this._tooltip.set_position(x, y);
            this._tooltip.remove_all_transitions();
            this._tooltip.ease({
                opacity: 255,
                duration: 500,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });
        }
        hideTooltip() {
            if (this._tooltip === null)
                return;
            this._tooltip.opacity = 255;

            this._tooltip.remove_all_transitions();
            this._tooltip.ease({
                opacity: 0,
                duration: 500,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => this._tooltip.hide()
            });
        }
        logException(message) {
            console.error(message);
        }
        logDevelopment(message) {
            if (Constants.LOG_DEVELOPMENT_ENABLED)
                console.error(message);
        }
        destroy() {
            //Timer
            GLib.Source.remove(this._repeat_timer);
            this._repeat_timer = null;

            //Event handlers
            this.disconnect(this._handler_enter_event);
            this.disconnect(this._handler_exit_event);
            this._settingsMenuItem.disconnect(this._handler_settings_menu_activate);
            this._settings.disconnect(this._handler_power_per_change);
            this._settings.disconnect(this._handler_font_size_change);

            this._handler_enter_event = null;
            this._handler_exit_event = null;
            this._handler_settings_menu_activate = null;
            this._handler_power_per_change = null;
            this._handler_font_size_change = null;

            //Widgets            
            this._battery_icon = null;
            this._tooltip = null;
            this._info_box = null;
            this._percentage_label = null;

            for (let i = 0; i < this._device_popup_menus.length; ++i) {                
                this._device_popup_menus[i] = null;
            }
            this._device_popup_menus = [];
            this._device_popup_menus = null;
            this._settingsMenuItem = null;

            //Other
            this._devices = [];
            this._devices = null;            
            this._razer_dbus = null;
            this._battery_missing_icon = null;

            this._battery_full_icon = null;
            this._battery_good_icon = null;
            this._battery_low_icon = null;
            this._battery_empty_icon = null;
            this._battery_idle_icon = null;

            this._battery_charging_full_icon = null;
            this._battery_charging_good_icon = null;
            this._battery_charging_low_icon = null;
            this._battery_charging_empty_icon = null;
            super.destroy();
        }
    });

