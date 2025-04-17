import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MenuButton from './indicator.js'
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

export default class RazerPuppyExtension extends Extension {
    enable() {        
        this.settings = this.getSettings();
        this._indicator = new MenuButton.Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        this.keybindingChangedId = this.settings.connect("changed::dpi-keybinding", () => {
            this.removeKeybinding();
            this.addKeybinding();
        });
        this.addKeybinding();
    }

    disable() {
        this.removeKeybinding();        
        this._indicator = null;
    }
    addKeybinding() {
        Main.wm.addKeybinding(
            'dpi-keybinding',
            this.settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => { this._indicator.switchToNextDPI(); }
        )
    }
    
    removeKeybinding() {        
        Main.wm.removeKeybinding('dpi-keybinding');
    }
}
