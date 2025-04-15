import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gdk from 'gi://Gdk';
import * as Constants from "./constants.js";
import { gettext as _, } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import * as RazerDbusHandler from './razerdbushandler.js'
    
let logoRgbPage = null;
let razerpuppyPrefs = null;
export const LogoRgbPageHandler = class AboutPageHandler {
    constructor(_razerpuppyPrefs) {
        razerpuppyPrefs = _razerpuppyPrefs;
        this._window = razerpuppyPrefs._window;
        this._schema = razerpuppyPrefs.getSettings();
        logoRgbPage = this;
        logoRgbPage._razer_dbus = new RazerDbusHandler.RazerDbusHandler();
    }
   
    createPage() {
        this._logoRgbPrefPage = new Adw.PreferencesPage();
        this._logoRgbPrefPage.title = _("Logo RGB");
        this._logoRgbPrefPage.icon_name = Constants.ICON_LOGO_RGB;

        this._window.add(this._logoRgbPrefPage);
        this._rows = [];

        this._deviceListGroup = new Adw.PreferencesGroup({ title: _("Select a device with RGB lighting") });        
        this._logoRgbPrefPage.add(this._deviceListGroup);        

        this._dropdowndevices = new Gtk.DropDown();
        this._combo_strings = new Gtk.StringList();
        this._dropdowndevices.set_model(this._combo_strings);

        this._dropdowndevices.set_margin_bottom(15);
        this._deviceListGroup.add(this._dropdowndevices);
        
        this._dropdowneffects = new Gtk.DropDown();
        this._combo_effect_strings = new Gtk.StringList();
        this._combo_effect_strings.append("Off");
        this._combo_effect_strings.append("Static");
        this._combo_effect_strings.append("Breath Single");
        this._combo_effect_strings.append("Breathe Dual");
        this._combo_effect_strings.append("Breathe Random");
        this._combo_effect_strings.append("Spectrum");
        this._combo_effect_strings.append("Reactive");
        this._dropdowneffects.set_model(this._combo_effect_strings);

        this._pick_color_button1 = new Gtk.ColorDialogButton();
        let colorDialog = new Gtk.ColorDialog();
        this._pick_color_button1.set_dialog(colorDialog);
        this._pick_color_button1.set_rgba(new Gdk.RGBA({ red: 0.0, green: 0.0, blue: 0.0, alpha: 1.0 }));

        this._pick_color_button2 = new Gtk.ColorDialogButton();
        let colorDialog2 = new Gtk.ColorDialog();
        this._pick_color_button2.set_dialog(colorDialog2);
        this._pick_color_button2.set_rgba(new Gdk.RGBA({ red: 0.0, green: 0.0, blue: 0.0, alpha: 1.0 }));

        this._colors_box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            "spacing": 10,
            "margin-start": 0,
            "margin-end": 0,
            "margin-top": 0,
            "margin-bottom": 0,
        });
        
        this._colors_box.append(this._dropdowneffects);
        this._colors_box.append(this._pick_color_button1);
        this._colors_box.append(this._pick_color_button2);
        
        this._logoRgbGroup = new Adw.PreferencesGroup();
        this._logoRgbPrefPage.add(this._logoRgbGroup);
        this._logoRgbGroup.add(this._colors_box);
                
        this._update_device_rgb_button = new Gtk.Button({
            halign: Gtk.Align.START,
            hexpand: false,
            label: _("Write to Device")
        });
        this._brightness_label = new Gtk.Label();
        this._brightness_label.set_text(_("Brightness"));
        this._logoRgbGroup.add(this._brightness_label);
        this._brightness_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 5);
        this._brightness_scale.set_valign(Gtk.Align.START);  // Set vertical alignment
        this._brightness_scale.set_value(50);                // Set initial value
        this._brightness_scale.set_digits(3);                // Set number of decimal places      
        this._logoRgbGroup.add(this._brightness_scale);
        this._logoRgbGroup.hide();
        
        this._dropdowndevices.connect("notify::selected-item", (_dropdown, _spec) => {
            let device = logoRgbPage.getSelectedDevice();
            if (device !== null) {                                
                let effect_index = logoRgbPage.findIndexOfEffect(device._effect);
                //console.error(`SELECTION CHANGE ${device._color1[0]} ${device._color1[1]} ${device._color1[2]} - ${device._color2[0]} ${device._color2[1]} ${device._color2[2]} effect:${device._effect} index:${effect_index}`)
                logoRgbPage._dropdowneffects.set_selected(effect_index);
                logoRgbPage.showHideColorPickers(effect_index);
                logoRgbPage._brightness_scale.set_value(device._brightness);
                logoRgbPage._pick_color_button1.set_rgba(new Gdk.RGBA({ 
                    red: device._color1[0] / 255, 
                    green: device._color1[1] / 255, 
                    blue: device._color1[2] / 255, 
                    alpha: 1.0 }));
                logoRgbPage._pick_color_button2.set_rgba(new Gdk.RGBA({ 
                    red: device._color2[0] / 255, 
                    green: device._color2[1] / 255, 
                    blue: device._color2[2] / 255, 
                    alpha: 1.0 }));    
                                        
            }
        });
        this._dropdowneffects.connect("notify::selected-item", (_dropdown, _spec) => {     
            logoRgbPage.changeLightingEffect();              
        });
        this._pick_color_button1.connect("notify::rgba", (_button, _spec) => {     
            logoRgbPage.changeLightingEffect();
        });
        this._pick_color_button2.connect("notify::rgba", (_button, _spec) => {     
            logoRgbPage.changeLightingEffect();
        });
        this._brightness_scale.connect("value-changed", () => {                
            let device = logoRgbPage.getSelectedDevice();
            if (device === null) return; 
            logoRgbPage._razer_dbus.SetLogoBrightness(
                device._device_serial,
                logoRgbPage.onLogoBrightness,
                logoRgbPage.onLogoBrightnessError,
                this._brightness_scale.get_value()
            );
        });
    }
   
    findIndexOfEffect(effect) {        
        if (effect === "none") return 0;
        if (effect === "static") return 1;
        if (effect === "breathSingle") return 2;
        if (effect === "breathDual") return 3;
        if (effect === "breathRandom") return 4;
        if (effect === "spectrum") return 5;
        if (effect === "reactive") return 6;    
        return 0;
    }
    showHideColorPickers(effect_index) {        
        if (effect_index === 0) {//None
            logoRgbPage._pick_color_button1.hide();
            logoRgbPage._pick_color_button2.hide();
        }         
        else if (effect_index === 1) {//static
            logoRgbPage._pick_color_button1.show();
            logoRgbPage._pick_color_button2.hide();
        }
        else if (effect_index === 2) {//breathe single
            logoRgbPage._pick_color_button1.show();
            logoRgbPage._pick_color_button2.hide();
        }
        else if (effect_index === 3) {//breathe dual
            logoRgbPage._pick_color_button1.show();
            logoRgbPage._pick_color_button2.show();
        }
        else if (effect_index === 4) {//breathe random
            logoRgbPage._pick_color_button1.hide();
            logoRgbPage._pick_color_button2.hide();
        }
        else if (effect_index === 5) {//spectrum
            logoRgbPage._pick_color_button1.hide();
            logoRgbPage._pick_color_button2.hide();                        
        }
        else if (effect_index === 6) {//reactive
            logoRgbPage._pick_color_button1.show();
            logoRgbPage._pick_color_button2.hide();
        }
    }
    changeLightingEffect() { 
        let device = logoRgbPage.getSelectedDevice();
        if (device === null) return;
        let effect_index = logoRgbPage._dropdowneffects.get_selected();
        logoRgbPage.showHideColorPickers(effect_index);        
        console.error(`changeLightingEffect ${device._device_serial} ${effect_index}`);      
        if (effect_index === 0) {//None
            logoRgbPage._razer_dbus.SetLogoNone(
                device._device_serial,
                logoRgbPage.onLogoNone,
                logoRgbPage.onLogoNoneError
            );
        }         
        else if (effect_index === 1) {//static
            let color1_rgba = logoRgbPage._pick_color_button1.get_rgba();
            
            logoRgbPage._razer_dbus.SetLogoStatic(
                device._device_serial,
                logoRgbPage.onLogoStatic,
                logoRgbPage.onLogoStaticError,
                color1_rgba.red * 255, color1_rgba.green * 255, color1_rgba.blue * 255,                
            );
        }
        else if (effect_index === 2) {//breathe single
            let color1_rgba = logoRgbPage._pick_color_button1.get_rgba();
            
            logoRgbPage._razer_dbus.SetLogoBreathSingle(
                device._device_serial,
                logoRgbPage.onLogoBreathSingle,
                logoRgbPage.onLogoBreatSingleError,
                color1_rgba.red * 255, color1_rgba.green * 255, color1_rgba.blue * 255,                
            );
        }
        else if (effect_index === 3) {//breathe dual
            let color1_rgba = logoRgbPage._pick_color_button1.get_rgba();
            let color2_rgba = logoRgbPage._pick_color_button2.get_rgba();
            
            logoRgbPage._razer_dbus.SetLogoBreathDual(
                device._device_serial,
                logoRgbPage.onLogoBreathDual,
                logoRgbPage.onLogoBreathDualError,
                color1_rgba.red * 255, color1_rgba.green * 255, color1_rgba.blue * 255,
                color2_rgba.red * 255, color2_rgba.green * 255 , color2_rgba.blue * 255
            );
        }
        else if (effect_index === 4) {//breathe random
            logoRgbPage._razer_dbus.SetLogoBreathRandom(
                device._device_serial,
                logoRgbPage.onLogoBreathRandom,
                logoRgbPage.onLogoBreathRandomError
            );
        }
        else if (effect_index === 5) {//spectrum
            logoRgbPage._razer_dbus.SetLogoSpectrum(
                device._device_serial,
                logoRgbPage.onLogoSpectrum,
                logoRgbPage.onLogoSpectrumError
            );                    
        }
        else if (effect_index === 6) {//reactive
            let color1_rgba = logoRgbPage._pick_color_button1.get_rgba();
            
            logoRgbPage._razer_dbus.SetLogoReactive(
                device._device_serial,
                logoRgbPage.onLogoReactive,
                logoRgbPage.onLogoReactiveError,
                color1_rgba.red * 255, color1_rgba.green * 255, color1_rgba.blue * 255, 255               
            );
        }
    }
    getSelectedDeviceName() {
        let selected_item = logoRgbPage._dropdowndevices.get_selected_item();
        if (selected_item === null)
            return null;
        return selected_item.get_string();
    }
    getSelectedDevice() {
        let selected_device_name = logoRgbPage.getSelectedDeviceName();
        if (selected_device_name === null) return null;
        return razerpuppyPrefs.getDetectedDeviceByName(selected_device_name);
    }
    onLogoBreathDual(device_serial) {
        console.error(`onLogoBreathDual ${device_serial}`);
    }
    onLogoBreathDualError(device_serial, error) {
        console.error(`onLogoBreathDualError ${device_serial} ${error}`);
    }
    onLogoBreathRandom(device_serial) {
        console.error(`onLogoBreathRandom ${device_serial}`);
    }
    onLogoBreathRandomError(device_serial, error) {
        console.error(`onLogoBreathRandomError ${device_serial} ${error}`);
    }
    onLogoBreathSingle(device_serial) {
        console.error(`onLogoBreathSingle ${device_serial}`);
    }
    onLogoBreathSingleError(device_serial, error) {
        console.error(`onLogoBreathSingleError ${device_serial} ${error}`);
    }
    onLogoBrightness(device_serial) {
        console.error(`onLogoBrightness ${device_serial}`);
    }
    onLogoBrightnessError(device_serial, error) {
        console.error(`onLogoBrightnessError ${device_serial} ${error}`);
    }
    onLogoNone(device_serial) {
        console.error(`onLogoNone ${device_serial}`);
    }
    onLogoNoneError(device_serial, error) {
        console.error(`onLogoNoneError ${device_serial} ${error}`);
    }
    onLogoReactive(device_serial) {
        console.error(`onLogoReactive ${device_serial}`);
    }
    onLogoReactiveError(device_serial, error) {
        console.error(`onLogoReactiveError ${device_serial} ${error}`);
    }
    onLogoSpectrum(device_serial) {
        console.error(`onLogoSpectrum ${device_serial}`);
    }
    onLogoSpectrumError(device_serial, error) {
        console.error(`onLogoSpectrumError ${device_serial} ${error}`);
    }
    onLogoStatic(device_serial) {
        console.error(`onLogoStatic ${device_serial}`);
    }
    onLogoStaticError(device_serial, error) {
        console.error(`onLogoStaticError ${device_serial} ${error}`);
    }
    onDeviceName(device) {
        console.error(`RGB Page Device ${device._device_serial} has battery: ${device._has_get_logo_effect_method}`);
        if (!device._has_get_logo_effect_method) return;
        
        logoRgbPage._combo_strings.append(device._device_name);   

        this._logoRgbGroup.show();     
    }
    onDeviceType(_device) {

    }
}