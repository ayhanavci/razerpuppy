import Adw from "gi://Adw";
import Gtk from "gi://Gtk";

import * as Constants from "./constants.js";
import { gettext as _, } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import * as ShortCutButton from './shortcutButton.js'
import * as Utils from "./utils.js";
import * as RazerDbusHandler from './razerdbushandler.js'

let razerpuppyPrefs = null;
let settingsDpiPage = null;

export const DpiPageHandler = class DpiPageHandler {
    constructor(_razerpuppyPrefs) {
        razerpuppyPrefs = _razerpuppyPrefs;
        this._window = razerpuppyPrefs._window;
        this._settings = razerpuppyPrefs.getSettings();
        settingsDpiPage = this;
    }
   
    createPage() {
        this._dpi_spin_count = 5;
        this._devices = [];
        this._settingsPage = new Adw.PreferencesPage();
        this._settingsPage.title = _("DPI");
        this._settingsPage.icon_name = Constants.ICON_MOUSE;
        this._razer_dbus = new RazerDbusHandler.RazerDbusHandler();

        this._window.add(this._settingsPage);
        this._deviceListGroup = new Adw.PreferencesGroup({ title: _("Set a device to default to use with dpi hotkeys") });
        this._settingsPage.add(this._deviceListGroup);
        this._dropdowndevices = new Gtk.DropDown();
        this._combo_strings = new Gtk.StringList();
        this._dropdowndevices.set_model(this._combo_strings);

        this._set_default_device_button = new Gtk.Button({
            halign: Gtk.Align.START,
            hexpand: false,
            label: _("Set As Default")
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
      
        //SHORTCUT BUTTON              
        this._shortcut_button = new ShortCutButton.DpiShortcutButton(this._settings, {
            hhomogeneous: false,
        });
        this._handler_dpi_key = this._settings.connect("changed::dpi-keybinding", () => {
            settingsDpiPage._shortcut_button.keybinding = settingsDpiPage._window.settings.get_strv("dpi-keybinding")[0];
        });
        this._shortcut_button.keybinding = this._settings.get_strv("dpi-keybinding")[0];

        this._handler_shortcut = this._shortcut_button.connect("notify::keybinding", () => {
            settingsDpiPage._settings.set_strv("dpi-keybinding", [settingsDpiPage._shortcut_button.keybinding]);
        });

        //ROW
        this._row_shortcut = new Adw.ActionRow({
            title: _("DPI keybinding"),
            subtitle: _("Global hotkey to toggle DPI")
        });

        this._row_shortcut.add_suffix(this._shortcut_button);

        //SHORTCUT BUTTON

        //DPI rows        
        this._dpiGroup = new Adw.PreferencesGroup();
        this._settingsPage.add(this._dpiGroup);

        settingsDpiPage._dpiGroup.add(this._row_shortcut);        

        this._dpiSpinsGroup = new Adw.PreferencesGroup();

        this._spin_row_dpi1 = new Adw.ActionRow();
        this._spin_row_dpi2 = new Adw.ActionRow();
        this._spin_row_dpi3 = new Adw.ActionRow();
        this._dpiSpinsGroup.add(this._spin_row_dpi1);
        this._dpiSpinsGroup.add(this._spin_row_dpi2);
        this._dpiSpinsGroup.add(this._spin_row_dpi3);

        this._dpi_spins = [];
        for (let i = 0; i < this._dpi_spin_count; ++i) {
            //DPI spin rows
            let dpi_spin = new Adw.SpinRow({
                title: (i + 1).toString() + _(")"),
                adjustment: new Gtk.Adjustment({
                    lower: 100,
                    upper: 1000,
                    step_increment: 5
                })
            });
            this._dpi_spins.push(dpi_spin);
            switch (i) {
                case 0:
                    this._spin_row_dpi1.add_prefix(dpi_spin);
                    break;
                case 1:
                    this._spin_row_dpi2.add_prefix(dpi_spin);
                    break;
                case 2:
                    this._spin_row_dpi3.add_prefix(dpi_spin);
                    break;
                case 3:
                    this._spin_row_dpi1.add_suffix(dpi_spin);
                    break;
                case 4:
                    this._spin_row_dpi2.add_suffix(dpi_spin);
                    break;
            }
        }

        this._set_save_button = new Gtk.Button({
            halign: Gtk.Align.START,
            hexpand: false,
            label: _("Write to Device")
        });
        this._spin_row_dpi3.add_suffix(this._set_save_button);
        this._settingsPage.add(this._dpiSpinsGroup);        

        this._pollrate_label = new Gtk.Label();
        this._pollrate_label.set_text(_("Pol Rate"))
        this._dropdownpollrates = new Gtk.DropDown();
        this._combo_pollrate_strings = new Gtk.StringList();
        this._dropdownpollrates.set_model(this._combo_pollrate_strings);
        this._combo_pollrate_strings.append("125 hz");
        this._combo_pollrate_strings.append("500 hz");
        this._combo_pollrate_strings.append("1000 hz");
        this._combo_pollrate_strings.append("4000 hz");
        this._combo_pollrate_strings.append("8000 hz");
        
        this._pollrates_box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            "spacing": 10,
            "margin-start": 0,
            "margin-end": 0,
            "margin-top": 10,
            "margin-bottom": 0,
        });

        this._pollrates_box.append(this._pollrate_label);
        this._pollrates_box.append(this._dropdownpollrates);
        this._dpiSpinsGroup.add(this._pollrates_box);

        this.setEventHandlers();

    }
    getSelectedDeviceName() {
        let selected_item = settingsDpiPage._dropdowndevices.get_selected_item();
        if (selected_item === null)
            return null;
        return selected_item.get_string();
    }
    setEventHandlers() {
        this._handler_devices_change = this._dropdowndevices.connect("notify::selected-item", (_dropdown, _spec) => {            
            let device = settingsDpiPage.getSelectedDevice();
            if (device !== null) {
                settingsDpiPage._razer_dbus.GetPollRate(device._device_serial,
                    settingsDpiPage.onGetPollRate,
                    settingsDpiPage.onGetPollRateError
                );
                /*if (device._onboard_dpis !== null) {
                    let dpis = device._onboard_dpis;
                    let dpi_stages_text = _("On Board DPI: ");
                    for (let index = 0; index < dpis.length; ++index) {
                        let stage = dpis[index];
                        dpi_stages_text += stage.toString();
                        dpi_stages_text += " ";
                    }                    
                }*/
                if (device._max_dpi > 0) {                    
                    settingsDpiPage._dpiSpinsGroup.description = _("Max DPI: ") + device._max_dpi.toString();
                    settingsDpiPage.LoadDdpisToSpins(device);
                }                
            }
        });
        
        this._handler_set_battery_device_button_click = this._set_default_device_button.connect('clicked', () => this.onSetDefaultDevice());

        this._handler_set_save_button_click = this._set_save_button.connect('clicked', () => {
            let device = settingsDpiPage.getSelectedDevice();            
            if (device === null) return;
            let new_dpis = [];
            for (let j = 0; j < settingsDpiPage._dpi_spins.length; ++j) {
                let dpi = settingsDpiPage._dpi_spins[j].get_value();
                new_dpis.push([dpi, dpi]);            
            }
                
            settingsDpiPage.updateOnboardDpi(device, new_dpis);
        });
        this._handler_pollrate = this._dropdownpollrates.connect("notify::selected-item", (_dropdown, _spec) => {            
            let device = settingsDpiPage.getSelectedDevice();
            if (device === null) return;
            let poll_index = settingsDpiPage._dropdownpollrates.get_selected();
            let poll_rate = -1;
            switch (poll_index) {
                case 0:
                    poll_rate = 125; break;
                case 1:
                    poll_rate = 500; break;
                case 2:
                    poll_rate = 1000; break;
                case 3:
                    poll_rate = 4000; break;
                case 4:
                    poll_rate = 8000; break;
            }
            if (poll_rate === -1) return;
            settingsDpiPage._razer_dbus.SetPollRate(device._device_serial, poll_rate);                            
        });
    }
    async updateOnboardDpi(device, new_dpis) {
        try {
            let active_stage = 5;           
            let razer_dbus = new RazerDbusHandler.RazerDbusHandler();
            await razer_dbus.SetDpiStages(device._device_serial, active_stage, new_dpis);
            razerpuppyPrefs._razer_dbus.GetDpiStages(device._device_serial, razerpuppyPrefs.onRefreshDpiStages, razerpuppyPrefs.onGetDpiStagesError);
        }
        catch (e) {
            razerpuppyPrefs.logException(`updateOnboardDpi ${device._device_serial} ${e}`);
        }

    }
    getSelectedDevice() {
        let selected_device_name = settingsDpiPage.getSelectedDeviceName();
        if (selected_device_name === null)
            return null;
        return razerpuppyPrefs.getDetectedDeviceByName(selected_device_name);
    }

    LoadDdpisToSpins(device) {       
        for (let i = 0; i < settingsDpiPage._dpi_spins.length; ++i) {
            let spin = settingsDpiPage._dpi_spins[i];

            if (device._onboard_dpis !== null && device._onboard_dpis[i] !== null && device._onboard_dpis[i] !== undefined) 
                spin.set_value(device._onboard_dpis[i]);
             else 
                spin.set_value(100); // Default value if no DPI stage is available            
        }        
    }
    onGetPollRate(device_serial, poll_rate) {
        razerpuppyPrefs.logDevelopment(`Dpi Page onGetPollRate ${device_serial} Poll rate ${poll_rate}`);
        let device = razerpuppyPrefs.getDeviceBySerial(device_serial);
        if (device === null) return;        
        if (poll_rate === 125) 
            settingsDpiPage._dropdownpollrates.set_selected(0);
        else if (poll_rate === 500)
            settingsDpiPage._dropdownpollrates.set_selected(1);
        else if (poll_rate === 1000)
            settingsDpiPage._dropdownpollrates.set_selected(2);
        else if (poll_rate === 4000)
            settingsDpiPage._dropdownpollrates.set_selected(3);
        else if (poll_rate === 8000)
            settingsDpiPage._dropdownpollrates.set_selected(4);
    }
    onGetPollRateError(device_serial, error) {
        razerpuppyPrefs.logException(`Dpi Page onGetPollRateError ${device_serial} ${error}`);
    }
    onSetDefaultDevice() {
        razerpuppyPrefs.logDevelopment(`Dpi Page onSetDefaultDevice`);
        let device = settingsDpiPage.getSelectedDevice();
        if (device === null)
            return;
        razerpuppyPrefs.logDevelopment(`Dpi Page onSetDefaultDevice Setting: ${device._device_serial}`);
        settingsDpiPage._settings.set_string(Constants.SCHEMA_DPI_HOTKEY_DEVICE_SERIAL, device._device_serial);
    }
    onDeviceName(_device) {

    }
    onDeviceType(device) {
        try {
            razerpuppyPrefs.logDevelopment(`dpi page onDeviceType ${device._device_serial}`);
            if (device._device_type !== Constants.DEVICE_TYPE_MOUSE) //Not a mouse
                return;

            let position = settingsDpiPage._combo_strings.get_n_items();
            settingsDpiPage._combo_strings.append(device._device_name);

            let dpi_default_serial = settingsDpiPage._settings.get_string(Constants.SCHEMA_DPI_HOTKEY_DEVICE_SERIAL);            
            if (Utils.isEmptyString(dpi_default_serial)) {
                settingsDpiPage._settings.set_string(Constants.SCHEMA_DPI_HOTKEY_DEVICE_SERIAL, device._device_serial);
                settingsDpiPage._dropdowndevices.set_selected(position);
            }
            else if (dpi_default_serial === device._device_serial) {                
                settingsDpiPage._dropdowndevices.set_selected(position);
            }

        }
        catch (error) {
            razerpuppyPrefs.logDevelopment(`dpi page onDeviceType EXCEPTION ${error}`);
        }


    }
    onGetDpiStages(_device) {
        
        
    }
    onRefreshDpiStages(device) {
        settingsDpiPage.updateSpinners(device);
    }
    onGetMaxDpi(device) {
        let selected_device_name = settingsDpiPage.getSelectedDeviceName();
        if (selected_device_name !== null && selected_device_name === device._device_name) {            
            settingsDpiPage._dpiSpinsGroup.description = _("Max DPI: ") + device._max_dpi.toString();
            settingsDpiPage.updateSpinners(device); 
        }
        
    }
    updateSpinners(device) {
        for (let index = 0; index < settingsDpiPage._dpi_spins.length; ++index) {
            settingsDpiPage._dpi_spins[index].set_range(100, device._max_dpi);
            let dpi = device._onboard_dpis[index];            
            if (dpi !== null && dpi !== undefined) 
                settingsDpiPage._dpi_spins[index].set_value(dpi);            
        }  
    }
}

