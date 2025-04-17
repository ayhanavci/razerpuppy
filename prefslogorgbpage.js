import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gdk from 'gi://Gdk';
import * as Constants from "./constants.js";
import { gettext as _, } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import * as RazerDbusHandler from './razerdbushandler.js'
    
export const LogoRgbPageHandler = class AboutPageHandler {
    constructor(razerpuppyPrefs) {
        this._razerpuppyPrefs = razerpuppyPrefs;
        this._window = razerpuppyPrefs._window;
        this._schema = razerpuppyPrefs.getSettings();      
    }   
    createPage() {
        this._razer_dbus = new RazerDbusHandler.RazerDbusHandler();        
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
            let device = this.getSelectedDevice();
            if (device !== null) {                                
                let effect_index = this.findIndexOfEffect(device._effect);
                //console.error(`SELECTION CHANGE ${device._color1[0]} ${device._color1[1]} ${device._color1[2]} - ${device._color2[0]} ${device._color2[1]} ${device._color2[2]} effect:${device._effect} index:${effect_index}`)
                this._dropdowneffects.set_selected(effect_index);
                this.showHideColorPickers(effect_index);
                this._brightness_scale.set_value(device._brightness);
                
                this._pick_color_button1.set_rgba(new Gdk.RGBA({ 
                    red: device._color1[0] / 255, 
                    green: device._color1[1] / 255, 
                    blue: device._color1[2] / 255, 
                    alpha: 1.0 }));
                this._pick_color_button2.set_rgba(new Gdk.RGBA({ 
                    red: device._color2[0] / 255, 
                    green: device._color2[1] / 255, 
                    blue: device._color2[2] / 255, 
                    alpha: 1.0 }));    
                                        
            }
        });
        this._dropdowneffects.connect("notify::selected-item", (_dropdown, _spec) => {     
            this.changeLightingEffect();              
        });
        this._pick_color_button1.connect("notify::rgba", (_button, _spec) => {     
            this.changeLightingEffect();
        });
        this._pick_color_button2.connect("notify::rgba", (_button, _spec) => {     
            this.changeLightingEffect();
        });
        this._brightness_scale.connect("value-changed", () => {                
            let device = this.getSelectedDevice();
            if (device === null) return; 
            this._razer_dbus.SetLogoBrightness(
                device._device_serial,
                this.onLogoBrightness,
                this.onLogoBrightnessError,
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
            this._pick_color_button1.hide();
            this._pick_color_button2.hide();
        }         
        else if (effect_index === 1) {//static
            this._pick_color_button1.show();
            this._pick_color_button2.hide();
        }
        else if (effect_index === 2) {//breathe single
            this._pick_color_button1.show();
            this._pick_color_button2.hide();
        }
        else if (effect_index === 3) {//breathe dual
            this._pick_color_button1.show();
            this._pick_color_button2.show();
        }
        else if (effect_index === 4) {//breathe random
            this._pick_color_button1.hide();
            this._pick_color_button2.hide();
        }
        else if (effect_index === 5) {//spectrum
            this._pick_color_button1.hide();
            this._pick_color_button2.hide();                        
        }
        else if (effect_index === 6) {//reactive
            this._pick_color_button1.show();
            this._pick_color_button2.hide();
        }
    }
    changeLightingEffect() { 
        let device = this.getSelectedDevice();
        if (device === null) return;
        let effect_index = this._dropdowneffects.get_selected();
        this.showHideColorPickers(effect_index);        
        //console.error(`changeLightingEffect ${device._device_serial} ${effect_index}`);      
        if (effect_index === 0) {//None
            this._razer_dbus.SetLogoNone(
                device._device_serial,
                this.onLogoNone.bind(this),
                this.onLogoNoneError.bind(this)
            );
        }         
        else if (effect_index === 1) {//static
            let color1_rgba = this._pick_color_button1.get_rgba();
            
            this._razer_dbus.SetLogoStatic(
                device._device_serial,
                this.onLogoStatic.bind(this),
                this.onLogoStaticError.bind(this),
                color1_rgba.red * 255, color1_rgba.green * 255, color1_rgba.blue * 255,                
            );
        }
        else if (effect_index === 2) {//breathe single
            let color1_rgba = this._pick_color_button1.get_rgba();
            
            this._razer_dbus.SetLogoBreathSingle(
                device._device_serial,
                this.onLogoBreathSingle.bind(this),
                this.onLogoBreathSingleError.bind(this),
                color1_rgba.red * 255, color1_rgba.green * 255, color1_rgba.blue * 255,                
            );
        }
        else if (effect_index === 3) {//breathe dual
            let color1_rgba = this._pick_color_button1.get_rgba();
            let color2_rgba = this._pick_color_button2.get_rgba();
            
            this._razer_dbus.SetLogoBreathDual(
                device._device_serial,
                this.onLogoBreathDual.bind(this),
                this.onLogoBreathDualError.bind(this),
                color1_rgba.red * 255, color1_rgba.green * 255, color1_rgba.blue * 255,
                color2_rgba.red * 255, color2_rgba.green * 255 , color2_rgba.blue * 255
            );
        }
        else if (effect_index === 4) {//breathe random
            this._razer_dbus.SetLogoBreathRandom(
                device._device_serial,
                this.onLogoBreathRandom.bind(this),
                this.onLogoBreathRandomError.bind(this)
            );
        }
        else if (effect_index === 5) {//spectrum
            this._razer_dbus.SetLogoSpectrum(
                device._device_serial,
                this.onLogoSpectrum.bind(this),
                this.onLogoSpectrumError.bind(this)
            );                    
        }
        else if (effect_index === 6) {//reactive
            let color1_rgba = this._pick_color_button1.get_rgba();
            
            this._razer_dbus.SetLogoReactive(
                device._device_serial,
                this.onLogoReactive.bind(this),
                this.onLogoReactiveError.bind(this),
                color1_rgba.red * 255, color1_rgba.green * 255, color1_rgba.blue * 255, 255               
            );
        }
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
    onLogoBreathDual(_device_serial) {
    }
    onLogoBreathDualError(device_serial, error) {
        console.error(`onLogoBreathDualError ${device_serial} ${error}`);
    }
    onLogoBreathRandom(_device_serial) {
    }
    onLogoBreathRandomError(device_serial, error) {
        console.error(`onLogoBreathRandomError ${device_serial} ${error}`);
    }
    onLogoBreathSingle(_device_serial) {        
    }
    onLogoBreathSingleError(device_serial, error) {
        console.error(`onLogoBreathSingleError ${device_serial} ${error}`);
    }
    onLogoBrightness(_device_serial) {
    }
    onLogoBrightnessError(device_serial, error) {
        console.error(`onLogoBrightnessError ${device_serial} ${error}`);
    }
    onLogoNone(_device_serial) {
    }
    onLogoNoneError(device_serial, error) {
        console.error(`onLogoNoneError ${device_serial} ${error}`);
    }
    onLogoReactive(_device_serial) {
    }
    onLogoReactiveError(device_serial, error) {
        console.error(`onLogoReactiveError ${device_serial} ${error}`);
    }
    onLogoSpectrum(_device_serial) {
    }
    onLogoSpectrumError(device_serial, error) {
        console.error(`onLogoSpectrumError ${device_serial} ${error}`);
    }
    onLogoStatic(_device_serial) {
    }
    onLogoStaticError(device_serial, error) {
        console.error(`onLogoStaticError ${device_serial} ${error}`);
    }
    onDeviceName(device) {
        this._razerpuppyPrefs.logDevelopment(`RGB Page Device ${device._device_serial} has battery: ${device._has_get_logo_effect_method}`);
        if (!device._has_get_logo_effect_method) return;
        
        this._combo_strings.append(device._device_name);   

        this._logoRgbGroup.show();     
    }
    onDeviceType(_device) {

    }
}