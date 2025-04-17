import Adw from "gi://Adw";
import Gtk from "gi://Gtk";

import * as Constants from "./constants.js";
import { gettext as _, } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export const AboutPageHandler = class AboutPageHandler {
  constructor(razerpuppyPrefs) {
    this._razerpuppyPrefs = razerpuppyPrefs;
    this._window = razerpuppyPrefs._window;
    this._schema = this._razerpuppyPrefs.getSettings();
  }
 
  createPage() {
    this._aboutPage = new Adw.PreferencesPage();
    this._aboutPage.title = _("About");
    this._aboutPage.icon_name = Constants.ICON_ABOUT;

    this._window.add(this._aboutPage);
    this._rows = [];
    let title_text = 'Razer Puppy V1.0\n';
    title_text += _('A foss hobby project by Ayhan Avcı');
    title_text += _('(2024-2025)');

    //this.about = new Adw.PreferencesGroup({ title: title_text, description: _("Mid clicking the radio icon toggles play / stop.\nDon't forget to install yt-dlp &amp; gstreamer. Links at the bottom. Enjoy!")});
    this._aboutGroup = new Adw.PreferencesGroup({ title: title_text, description: _("Don't forget to install Open Razer Daemon. Link at the bottom. Enjoy!") });
    this._aboutPage.add(this._aboutGroup);

    this._urlsGroup = new Adw.PreferencesGroup({ title: _('Links') });

    this._project_row = new Adw.ActionRow();
    this._project_row.title = _("Project");
    this._project_link = new Gtk.LinkButton({
      valign: Gtk.Align.CENTER,
      label: "https://github.com/ayhanavci/razerpuppy",
      focusable: 1,
      uri: "https://github.com/ayhanavci/razerpuppy"
    });
    this._project_row.add_suffix(this._project_link);
    this._urlsGroup.add(this._project_row);


    this._orazer_row = new Adw.ActionRow();
    this._orazer_row.title = _("Open Razer");
    this._orazer_link = new Gtk.LinkButton({
      valign: Gtk.Align.CENTER,
      label: "https://openrazer.github.io/#download",
      focusable: 1,
      uri: "https://openrazer.github.io/#download"
    });
    this._orazer_row.add_suffix(this._orazer_link);
    this._urlsGroup.add(this._orazer_row);

    this._aboutPage.add(this._urlsGroup);
  }

}