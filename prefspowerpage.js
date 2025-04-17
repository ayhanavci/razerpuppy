import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";

import * as Constants from "./constants.js";
import { gettext as _, } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import * as RazerDbusHandler from './razerdbushandler.js'    
import * as Utils from "./utils.js";


export const PowerPageHandler = class OptionsPageHandler {
    constructor(razerpuppyPrefs) {
        this._razerpuppyPrefs = razerpuppyPrefs;
        this._window = razerpuppyPrefs._window;
        this._settings = razerpuppyPrefs.getSettings();
    }
   
    createPage() {
        this._powerPage = new Adw.PreferencesPage();
        this._powerPage.title = _("Power");
        this._powerPage.icon_name = Constants.ICON_POWER;        
        this._razer_dbus = new RazerDbusHandler.RazerDbusHandler();
        this._window.add(this._powerPage);
        this._deviceListGroup = new Adw.PreferencesGroup({title: _("Set a device to default to show its battery on tray")});
        this._powerPage.add(this._deviceListGroup);

        this._optionsGroup = new Adw.PreferencesGroup();

        this._dropdowndevices = new Gtk.DropDown();
        this._combo_strings = new Gtk.StringList();
        this._dropdowndevices.set_model(this._combo_strings);
        
        this._set_default_device_button = new Gtk.Button({
            halign: Gtk.Align.START,
            hexpand: false,
            label: _("Display Power")
        });
        this._devices_box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            "spacing": 10,
            "margin-start": 0,
            "margin-end": 0,
            "margin-top": 0,
            "margin-bottom": 0,
        });

        this._devices_box.append(this._dropdowndevices);
        this._devices_box.append(this._set_default_device_button);
        this._deviceListGroup.add(this._devices_box);        
        
        this._sleep_after_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 15, 1);
        this._sleep_after_scale.set_valign(Gtk.Align.START);  // Set vertical alignment
        this._sleep_after_scale.set_value(15);                // Set initial value
        this._sleep_after_scale.set_digits(0);                // Set number of decimal places      
        this._sleep_after_scale.set_draw_value(true);                
        this._sleep_after_scale.set_has_origin(true);                
        this._sleep_after_scale.set_format_value_func( (scale, value) => {
            let retval = _("Sleep After\n");
            if (value === 0) return retval + " 0";
            if (value === 1) return retval + _("1 minute");
            return retval + " " + value.toString() + " " + _("minutes");
        });  

                
        this._enter_low_power_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 1, 99, 1);
        this._enter_low_power_scale.set_valign(Gtk.Align.START);  // Set vertical alignment
        this._enter_low_power_scale.set_value(50);                // Set initial value
        this._enter_low_power_scale.set_digits(0);                // Set number of decimal places      
        this._enter_low_power_scale.set_draw_value(true);                
        this._enter_low_power_scale.set_has_origin(true);                
        this._enter_low_power_scale.set_format_value_func( (scale, value) => {           
            return "Enter Low Power At\n            " + value.toString() + "%";
        });  
        
        this._deviceListGroup.add(this._sleep_after_scale);        
        this._deviceListGroup.add(this._enter_low_power_scale);                
               
        this._show_percentage = new Adw.SwitchRow({
            title: _("Show Power Percentage"),
            subtitle: _("If enabled, shows device power % next to the battery icon.")
        });        
        this._optionsGroup.add(this._show_percentage);
        
        this._font_size_spin = new Adw.SpinRow({
            title: _('Percentage Font Size:'),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 30,
                step_increment: 1
            })
        });
        let current_font_size = this._settings.get_uint(Constants.SCHEMA_PERCENTAGE_FONT_SIZE);
        this._font_size_spin.set_value(current_font_size);
        this._optionsGroup.add(this._font_size_spin);

        this._font_size_spin.connect("notify::value", () => {                
            this._settings.set_uint(
                Constants.SCHEMA_PERCENTAGE_FONT_SIZE,
                this._font_size_spin.get_value()
            );
        });

        this._show_hover_power = new Adw.SwitchRow({
            title: _("Show Hover Tooltip"),
            subtitle: _("If enabled, shows device info on mouse hover.")
        });
        this._optionsGroup.add(this._show_hover_power);    
        this._powerPage.add(this._optionsGroup);        
        
        this._settings.bind(Constants.SCHEMA_SHOW_POWER_PERCENTAGE, this._show_percentage, 'active', Gio.SettingsBindFlags.DEFAULT);
        this._settings.bind(Constants.SCHEMA_SHOW_HOVER_POWER, this._show_hover_power, 'active', Gio.SettingsBindFlags.DEFAULT);        

        this._dropdowndevices.connect("notify::selected-item", (_dropdown, _spec) => {
            let device = this.getSelectedDevice();
            if (device !== null) {
                this._razer_dbus.GetIdleTime(device._device_serial,
                    this.onGetIdleTime.bind(this),
                    this.onGetIdleTimeError.bind(this)
                );
                this._razer_dbus.GetLowBatteryThreshold(device._device_serial,
                    this.onGetLowBatteryThreshold.bind(this),
                    this.onGetLowBatteryThresholdError.bind(this)
                );
            }
        });

        this._enter_low_power_scale.connect("value-changed", () => {                
            let device = this.getSelectedDevice();
            if (device === null) return; 
                this._razer_dbus.SetLowBatteryThreshold(
                    device._device_serial,                    
                    this._enter_low_power_scale.get_value()
            );
        });
        this._sleep_after_scale.connect("value-changed", () => {                
            let device = this.getSelectedDevice();
            if (device === null) return; 
                this._razer_dbus.SetIdleTime(
                    device._device_serial,                    
                    this._sleep_after_scale.get_value() * 60
            );
        });
    }
    onDeviceName(power_page, device) {        
        try {
            power_page._razerpuppyPrefs.logDevelopment(`Power Page Device ${device._device_serial} has battery: ${device._has_get_battery_method}`);
            if (!device._has_get_battery_method) return;            

            let position = power_page._combo_strings.length;
            power_page._combo_strings.append(device._device_name);

            let power_default_serial = power_page._settings.get_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL);
            if (Utils.isEmptyString(power_default_serial)) {
                power_page._settings.set_string(Constants.SCHEMA_BATTERY_DEVICE_SERIAL, device._device_serial);
                power_page._dropdowndevices.set_selected(position);
            }
            else if (power_default_serial === device._device_serial)  
                power_page._dropdowndevices.set_selected(position);
        }
        catch (error) {
            power_page._razerpuppyPrefs.logException(`Power Page Device EXCEPTION ${error}`);
        }
        

    }
    onDeviceType(_power_page, _device) {        
        
    }
    onGetIdleTime(device_serial, idle_time) {
        this._razerpuppyPrefs.logDevelopment(`Power Page onGetIdleTime ${device_serial}  ${idle_time}`);
        this._sleep_after_scale.set_value(idle_time / 60);
    }
    onGetIdleTimeError(device_serial, error) {
        this._razerpuppyPrefs.logException(`Power Page onGetIdleTime ERROR ${device_serial}  ${error}`);
    }
    onGetLowBatteryThreshold(device_serial, treshold) {
        this._razerpuppyPrefs.logDevelopment(`Power Page onGetLowBatteryThreshold ${device_serial}  ${treshold}`);
        this._enter_low_power_scale.set_value(treshold);
    }
    onGetLowBatteryThresholdError(device_serial, error) {
        this._razerpuppyPrefs.logException(`Power Page onGetLowBatteryThresholdError ERROR ${device_serial}  ${error}`);
    }
    getSelectedDeviceName() {
        let selected_item = this._dropdowndevices.get_selected_item();
        if (selected_item === null)
            return null;
        return selected_item.get_string();
    }
    getSelectedDevice() {
        let selected_device_name = this.getSelectedDeviceName();
        if (selected_device_name === null) return null;
        return this._razerpuppyPrefs.getDetectedDeviceByName(selected_device_name);
    }

}

