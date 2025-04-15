import GObject from "gi://GObject";
import St from 'gi://St';
import Clutter from "gi://Clutter";
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import { gettext as _, } from "resource:///org/gnome/shell/extensions/extension.js";

let panelIndicator;
const DpiSubMenu = GObject.registerClass(
    {
        GTypeName: "RazerPuppyDpiSubMenu",
    },
    class extends PopupMenu.PopupBaseMenuItem {
        constructor() {
            super();
            this._dpi = -1;                 
            this._device = null;
            this._parent = null;            
            
            this.vbox = new St.BoxLayout({ vertical: false });
            this.add_child(this.vbox);
            
            this.label = new St.Label({
                text: this._dpi.toString(),
                y_align: Clutter.ActorAlign.CENTER,
                y_expand: true,
              });
            this.vbox.add_child(this.label);
            this._handler_activate = this.connect('activate', (_item, _event) => {                 
                //console.error(`DPI CLICKED ${this._parent}  ${this._dpi}`); 
                panelIndicator._razer_dbus.SetDpi(this._device._device_serial, this._dpi);
                panelIndicator._razer_dbus.GetDpi(this._device._device_serial, panelIndicator.onGetDpi, panelIndicator.onGetDpi);
                return Clutter.EVENT_PROPAGATE;
            });                                    
        }        
        updateDpi(_this, dpi) {
            if (_this._dpi === dpi)  return;            
            _this._dpi = dpi;
            _this.label.set_text(`Set ${dpi.toString()} DPI`);                        
            _this.show();
        }
        updateDevice(_this, device) {
            _this._device = device;
        }
        clear() {
            this.disconnect(this._handler_activate);
            this._handler_activate = null;
            this.label?.destroy();
            this.vbox?.destroy();
            this.label = null;
            this.vbox = null;
        }                
    },
);
export const DeviceSubMenu = GObject.registerClass(
    {
        GTypeName: "RazerPuppySubMenu",
    },
    class extends PopupMenu.PopupSubMenuMenuItem {
        constructor(_panelIndicator, id) {
            super("", true);           
            this._id = id;             
            this._device = null;
            this._dpi_slots = [];
            this._previous_dpis = [];
            this._current_dpi = -1;
            this.label.text = "";
            panelIndicator = _panelIndicator;
            this.menu.actor.add_style_class_name("device-popup-sub-menu");            
            for (let i = 0; i < 20; ++i) {
                let new_item = new DpiSubMenu();
                this._dpi_slots.push(new_item);
                new_item.hide();
                this.menu.addMenuItem(new_item);
            }            
                
            //this.menu.addAction('Submenu Item 0', () => console.log('activated'));
        }
        destroy() {                       
            this.emit('destroy');    
            Main.sessionMode.disconnectObject(this);
        }
        
        UpdateDevice(_this, device) 
        {
            //console.error(`UpdateDevice: ${_this} ${device}`);
            _this._device = device;
            for (let i = 0; i < _this._dpi_slots.length; ++i) 
                _this._dpi_slots[i].updateDevice(_this._dpi_slots[i], device);                    
            
            if (device._current_dpi === -1) {
                _this.label.text = device._device_name;
                return;
            }
            _this.UpdateCurrentDpi(_this);
        }
        UpdateCurrentDpi(_this) {
            //console.error(`Update current dpi: ${_this._device._current_dpi}`);
            if (_this._current_dpi !== _this._device._current_dpi) {
                //console.error(`Update current dpi CHANGING: ${_this._current_dpi} VS ${_this._device._current_dpi}`);
                _this._current_dpi = _this._device._current_dpi;
                
                let new_text = `${_this._device._device_name}`;            
                new_text += '\n';
                new_text += _('Active Dpi')                
                new_text += ` ${_this._current_dpi}`;
                _this.label.text = new_text;      
                //console.error(`Setting text:[${new_text}]`);
            }            
        }
        UpdateDpis(_this) {
            try {
                let dpis = _this._device._onboard_dpis;                                            
                if (_this._device === null || dpis === null) return;
                                
                for (let i = 0; i < dpis.length && i < _this._dpi_slots.length; ++i) 
                    _this._dpi_slots[i].updateDpi(_this._dpi_slots[i], dpis[i]);                
                               
            }
            catch (error) {
                console.error(`Update dpis: EXCEPTION ${error}`);
            }            
        }              
    },
);


