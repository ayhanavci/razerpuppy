import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Constants from './constants.js'

function logException(message) {
    console.error(message);
}
function logDevelopment(message) {
    if (Constants.LOG_DEVELOPMENT_ENABLED) 
        console.error(message);
}

export class RazerDbusHandler {
    constructor() {

    }

    async GetDevices(devicelist_callback, devicelist_error_callback) {
        let log_method_name = "GetDevices";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer',
                'razer.devices',
                null,
                (connection, _res, _data) => {
                    try {
                        //logDevelopment("GetDevices connection:" + connection + " RES:" + res + "  DATA:" + data);
                        const reply = connection.call_sync('getDevices', null,
                            Gio.DBusCallFlags.NONE, -1, null);
                        const value = reply.get_child_value(0);
                        devicelist_callback(value.get_strv(), null);
                    }
                    catch (e) {
                        logException(`${log_method_name} call_sync error: ${e}`);
                        devicelist_error_callback(e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error: ${e}`);
        }

    }

    async GetBatteryPower(device_serial, power_callback, power_error_callback) {
        let log_method_name = "GetBatteryPower";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.power',
                null,
                (connection, _res, _data) => {
                    //logDevelopment("GetBatteryPower connection:" + connection + " RES:" + res + "  DATA:" + data);
                    try {
                        connection.call('getBattery', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [power_level] = reply.recursiveUnpack();
                                    try {
                                        power_callback(device_serial, power_level, false);
                                    }
                                    catch (ex) {
                                        power_error_callback(device_serial, ex);
                                    }

                                    //logDevelopment(`PARAM1:${source_object} PARAM2:${res} PARAM3:${data} POW:${power_level}`);
                                }
                                catch (e) {
                                    //let type = console.log(Object.prototype.toString.call(e));
                                    let errorCode = Gio.DBusError.get_remote_error(e);
                                    logException(`${log_method_name} connection.call [${e.message}] ${errorCode} EXCEPTION: ${e}`);
                                    if (errorCode === "org.freedesktop.DBus.Error.UnknownMethod")
                                        power_callback(device_serial, -1, true);
                                    else
                                        power_error_callback(device_serial, e);
                                }

                            });

                    }
                    catch (e) {
                        logException(`${log_method_name} getBattery error: ${e}`);
                        power_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error: ${e}`);
        }

    }
    async GetIsCharging(device_serial, is_charging_callback, is_charging_error_callback) {
        let log_method_name = "GetIsCharging";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.power',
                null,
                (connection, _res, _data) => {
                    //logDevelopment("GetIsCharging connection:" + connection + " RES:" + res + "  DATA:" + data);
                    try {
                        connection.call('isCharging', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [is_charging] = reply.recursiveUnpack();
                                    is_charging_callback(device_serial, is_charging, null);
                                    //logDevelopment(`PARAM1:${source_object} PARAM2:${res} PARAM3:${data} ISCHARGING:${is_charging}`);
                                }
                                catch (e) {
                                    is_charging_error_callback(device_serial, e);
                                    /*let errorCode = Gio.DBusError.get_remote_error(e);
                                    logException(`${log_method_name} connection.call [${e.message}] ${errorCode} EXCEPTION: ${e}`);
                                    if (errorCode === "org.freedesktop.DBus.Error.UnknownMethod")
                                        is_charging_error_callback(device_serial, e, true);
                                    else
                                        is_charging_error_callback(device_serial, e, false);*/
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} isCharging EXCEPTION: ${e}`);
                        is_charging_error_callback(device_serial, e, false);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async GetDeviceName(device_serial, device_name_callback, device_name_error_callback) {
        let log_method_name = "GetDeviceName";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.misc',
                null,
                (connection, _res, _data) => {
                    //logDevelopment(`${log_method_name} connection:${connection} RES:${res} DATA:${data}`);
                    try {
                        connection.call('getDeviceName', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [device_name] = reply.recursiveUnpack();
                                    device_name_callback(device_serial, device_name);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION:${e}`);
                                    device_name_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} getDeviceName error ${e}`);
                        device_name_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${e}`);
        }

    }
    async GetDeviceType(device_serial, device_type_callback, device_type_error_callback) {
        let log_method_name = "GetDeviceType";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.misc',
                null,
                (connection, _res, _data) => {
                    //logDevelopment(`${log_method_name} connection:${connection} RES:${res} DATA:${data}`);
                    try {
                        connection.call('getDeviceType', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [device_type] = reply.recursiveUnpack();
                                    device_type_callback(device_serial, device_type);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION:${e}`);
                                    device_type_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} getDeviceName error ${e}`);
                        device_type_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${e}`);
        }

    }
    async GetDpiStages(device_serial, device_getdpi_stages_callback, device_getdpi_stages_error_callback) {
        let log_method_name = "GetDpiStages";
        try {
            logDevelopment(`${log_method_name} ser:${device_serial}`);
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.dpi',
                null,
                (connection, _res, _data) => {
                    //logDevelopment(`${log_method_name} connection:${connection} RES:${res} DATA:${data}`);
                    try {
                        connection.call('getDPIStages', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [stages] = reply.recursiveUnpack();
                                    device_getdpi_stages_callback(device_serial, stages);
                                    //logDevelopment(`PARAM1:${stages} PARAM2:${reply}`);  //((ya(qq)))                                  
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION:${e}`);
                                    device_getdpi_stages_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} GetDpiStages error ${e}`);
                        device_getdpi_stages_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${e}`);
        }

    }
    async GetDpi(device_serial, device_getdpi_callback, device_getdpi_error_callback) {
        let log_method_name = "GetDpi";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.dpi',
                null,
                (connection, _res, _data) => {                    
                    try {
                        connection.call('getDPI', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [stages] = reply.recursiveUnpack();
                                    device_getdpi_callback(device_serial, stages);
                                    //logDevelopment(`PARAM1:${size} PARAM2:${stages}`);                                    
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION:${e}`);
                                    device_getdpi_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        device_getdpi_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${e}`);
        }

    }
    /*(0x05, [(1200, 1200), (2200, 2200), (3300, 3300), (4300, 4300), (6400, 6400)]) */
    async SetDpi(device_serial, dpi) {
        let log_method_name = "SetDpi";
        try {
            logDevelopment(`${log_method_name} new_for_bus ${device_serial} ${dpi}`);
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.dpi',
                null,
                (connection, _res, _data) => {
                    //logDevelopment(`${log_method_name} connection:${connection} RES:${res} DATA:${data}`);
                    try {
                        const parameters = new GLib.Variant('(ii)', [
                            dpi,
                            dpi,
                        ]);
                        connection.call('setDPI', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                //const reply = connection.call_finish(res);
                                //logDevelopment(`${log_method_name} ${res.get_completed()} ${reply}`);

                            });
                        return true;
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        return false;
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${device_serial} ${dpi} ${e}`);
            return false;
        }
        return true;

    }
    async SetDpiStages(device_serial, active_stage, dpi_stages) {
        let log_method_name = "SetDpiStages";
        try {                       
            logDevelopment(`${log_method_name} new_for_bus ${device_serial} ${dpi_stages}`);
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.dpi',
                null,
                (connection, _res, _data) => {
                    //logDevelopment(`${log_method_name} connection:${connection} RES:${res} DATA:${data}`);
                    try {
                        const parameters = new GLib.Variant('(yaaq)', [                        
                            active_stage,
                            dpi_stages, 
                        ]);
                        connection.call('setDPIStages', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                //const reply = connection.call_finish(res);
                                //logDevelopment(`${log_method_name} ${res.get_completed()} ${reply}`);

                            });
                        return true;
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        return false;
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${device_serial} ${e}`);
            return false;
        }
        return true;

    }
    async GetMaxDpi(device_serial, device_getmaxdpi_callback, device_getmaxdpi_error_callback) {
        let log_method_name = "GetMaxDpi";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.dpi',
                null,
                (connection, _res, _data) => {
                    try {
                        connection.call('maxDPI', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [maxdpi] = reply.recursiveUnpack();
                                    device_getmaxdpi_callback(device_serial, maxdpi);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION:${e}`);
                                    device_getmaxdpi_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        device_getmaxdpi_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${e}`);
        }

    }
    async GetLowBatteryThreshold(device_serial, device_getlowbatterytreshold_callback, device_getlowbatterytreshold_error_callback) {
        let log_method_name = "GetLowBatteryThreshold";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.power',
                null,
                (connection, _res, _data) => {
                    try {
                        connection.call('getLowBatteryThreshold', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [treshold] = reply.recursiveUnpack();
                                    device_getlowbatterytreshold_callback(device_serial, treshold);
                                    //logDevelopment(`PARAM1:${size} PARAM2:${stages}`);                                    
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION:${e}`);
                                    device_getlowbatterytreshold_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        device_getlowbatterytreshold_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${e}`);
        }

    }
    async SetLowBatteryThreshold(device_serial, treshold) {
        let log_method_name = "SetLowBatteryThreshold";
        try {
            logDevelopment(`${log_method_name} new_for_bus ${device_serial} ${treshold}`);
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.power',
                null,
                (connection, _res, _data) => {
                    //logDevelopment(`${log_method_name} connection:${connection} RES:${res} DATA:${data}`);
                    try {
                        const parameters = new GLib.Variant('(y)', [
                            treshold,                           
                        ]);
                        connection.call('setLowBatteryThreshold', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {});
                        return true;
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        return false;
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${device_serial} ${treshold} ${e}`);
            return false;
        }
        return true;

    }
    async GetIdleTime(device_serial, device_getidletime_callback, device_getidletime_error_callback) {
        let log_method_name = "GetIdleTime";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.power',
                null,
                (connection, _res, _data) => {
                    //logDevelopment(`${log_method_name} connection:${connection} RES:${res} DATA:${data}`);
                    try {
                        connection.call('getIdleTime', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [treshold] = reply.recursiveUnpack();
                                    device_getidletime_callback(device_serial, treshold);
                                    //logDevelopment(`PARAM1:${size} PARAM2:${stages}`);                                    
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION:${e}`);
                                    device_getidletime_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        device_getidletime_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${e}`);
        }

    }
    async SetIdleTime(device_serial, idle_time) {
        let log_method_name = "SetIdleTime";
        try {
            logDevelopment(`${log_method_name} new_for_bus ${device_serial} ${idle_time}`);
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.power',
                null,
                (connection, _res, _data) => {
                    //logDevelopment(`${log_method_name} connection:${connection} RES:${res} DATA:${data}`);
                    try {
                        const parameters = new GLib.Variant('(q)', [
                            idle_time,                           
                        ]);
                        connection.call('setIdleTime', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                //const reply = connection.call_finish(res);
                                //logDevelopment(`${log_method_name} ${res.get_completed()} ${reply}`);

                            });
                        return true;
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        return false;
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${device_serial} ${idle_time} ${e}`);
            return false;
        }
        return true;

    }
    async GetPollRate(device_serial, device_getpollrate_callback, device_getpollrate_error_callback) {
        let log_method_name = "GetPollRate";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.misc',
                null,
                (connection, _res, _data) => {
                    try {
                        connection.call('getPollRate', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [poll_rate] = reply.recursiveUnpack();
                                    device_getpollrate_callback(device_serial, poll_rate);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION:${e}`);
                                    device_getpollrate_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        device_getpollrate_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${e}`);
        }

    }
    async SetPollRate(device_serial, poll_rate) {
        let log_method_name = "SetPollRate";
        try {
            logDevelopment(`${log_method_name} new_for_bus ${device_serial} ${poll_rate}`);
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.misc',
                null,
                (connection, _res, _data) => {
                    //logDevelopment(`${log_method_name} connection:${connection} RES:${res} DATA:${data}`);
                    try {
                        const parameters = new GLib.Variant('(q)', [
                            poll_rate,                           
                        ]);
                        connection.call('setPollRate', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                //const reply = connection.call_finish(res);

                            });
                        return true;
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                        return false;
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${device_serial} ${poll_rate} ${e}`);
            return false;
        }
        return true;

    }
    async Introspect(device_serial, introspect_callback) {
        let log_method_name = "Introspect";
        try {
            logException(`${log_method_name} new_for_bus ${device_serial}`);
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'org.freedesktop.DBus.Introspectable',
                null,
                (connection, _res, _data) => {
                    try {
                        //logDevelopment(`${log_method_name} CALLING ${device_serial}`);           
                        connection.call('Introspect', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                const reply = connection.call_finish(res);
                                const [xml_data] = reply.recursiveUnpack();
                                //logDevelopment(`${log_method_name} CALL SUCCESS ${device_serial}`);    
                                introspect_callback(device_serial, xml_data);
                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} call error ${e}`);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} new_for_bus error ${device_serial} ${e}`);
        }
    }
    async GetLogoEffect(device_serial, get_logo_callback, get_logo_error_callback) {
        let log_method_name = "GetLogoEffect";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {
                        connection.call('getLogoEffect', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [logo_effect] = reply.recursiveUnpack();
                                    get_logo_callback(device_serial, logo_effect);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call [${e.message}] EXCEPTION: ${e}`);
                                    get_logo_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} isCharging EXCEPTION: ${e}`);
                        get_logo_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async GetLogoBrightness(device_serial, get_logo_brightness_callback, get_logo_brightness_error_callback) {
        let log_method_name = "GetLogoBrightness";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {
                        connection.call('getLogoBrightness', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    const [logo_brightness] = reply.recursiveUnpack();
                                    get_logo_brightness_callback(device_serial, logo_brightness);
                                }
                                catch (e) {
                                    let errorCode = Gio.DBusError.get_remote_error(e);
                                    logException(`${log_method_name} connection.call [${e.message}] ${errorCode} EXCEPTION: ${e}`);
                                    get_logo_brightness_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} isCharging EXCEPTION: ${e}`);
                        get_logo_brightness_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async GetLogoEffectColors(device_serial, get_logo_colors_callback, get_logo_colors_error_callback) {
        let log_method_name = "GetLogoBrightness";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {
                        connection.call('getLogoEffectColors', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (source_object, res, __data) => {
                                try {
                                    const reply = connection.call_finish(res);
                                    let [colors] = reply.recursiveUnpack();
                                    get_logo_colors_callback(device_serial, colors);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION: ${e}`);
                                    get_logo_colors_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} isCharging EXCEPTION: ${e}`);
                        get_logo_colors_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async SetLogoBreathDual(device_serial,
        set_logo_breath_dual_callback,
        set_logo_breath_dual_error_callback,
        red1, green1, blue1,
        red2, green2, blue2) {
        let log_method_name = "SetLogoBreathDual";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {
                        const parameters = new GLib.Variant('(yyyyyy)', [
                            red1, green1, blue1,
                            red2, green2, blue2,
                        ]);

                        connection.call('setLogoBreathDual', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                try {

                                    set_logo_breath_dual_callback(device_serial);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION: ${e}`);
                                    set_logo_breath_dual_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} EXCEPTION: ${e}`);
                        set_logo_breath_dual_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async SetLogoBreathRandom(device_serial,
        set_logo_breath_random_callback,
        set_logo_breath_random_error_callback) {
        let log_method_name = "SetLogoBreathRandom";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {                        
                        connection.call('setLogoBreathRandom', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                try {
                                    set_logo_breath_random_callback(device_serial);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION: ${e}`);
                                    set_logo_breath_random_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} EXCEPTION: ${e}`);
                        set_logo_breath_random_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async SetLogoBreathSingle(device_serial,
        set_logo_breath_single_callback,
        set_logo_breath_single_error_callback,
        red, green, blue) {
        let log_method_name = "SetLogoBreathSingle";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {
                        const parameters = new GLib.Variant('(yyy)', [
                            red, green, blue
                        ]);

                        connection.call('setLogoBreathSingle', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                try {
                                    set_logo_breath_single_callback(device_serial);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION: ${e}`);
                                    set_logo_breath_single_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} EXCEPTION: ${e}`);
                        set_logo_breath_single_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async SetLogoBrightness(device_serial,
        set_logo_brightness_callback,
        set_logo_brightness_error_callback,
        brightness) {
        let log_method_name = "SetLogoBrightness";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {
                        const parameters = new GLib.Variant('(d)', [brightness]);

                        connection.call('setLogoBrightness', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                try {
                                    set_logo_brightness_callback(device_serial);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION: ${e}`);
                                    set_logo_brightness_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} EXCEPTION: ${e}`);
                        set_logo_brightness_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async SetLogoNone(device_serial,
        set_logo_none_callback,
        set_logo_none_error_callback) {
        let log_method_name = "SetLogoNone";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {                        
                        connection.call('setLogoNone', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                try {
                                    set_logo_none_callback(device_serial);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION: ${e}`);
                                    set_logo_none_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} EXCEPTION: ${e}`);
                        set_logo_none_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async SetLogoReactive(device_serial,
        set_logo_reactive_callback,
        set_logo_reactive_error_callback,
        red, green, blue, speed) {
        let log_method_name = "SetLogoReactive";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {
                        const parameters = new GLib.Variant('(yyyy)', [
                            red, green, blue, speed
                        ]);

                        connection.call('setLogoReactive', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                try {
                                    set_logo_reactive_callback(device_serial);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION: ${e}`);
                                    set_logo_reactive_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} EXCEPTION: ${e}`);
                        set_logo_reactive_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async SetLogoSpectrum(device_serial,
        set_logo_spectrum_callback,
        set_logo_spectrum_error_callback) {
        let log_method_name = "SetLogoSpectrum";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {                        
                        connection.call('setLogoSpectrum', null,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                try {
                                    set_logo_spectrum_callback(device_serial);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION: ${e}`);
                                    set_logo_spectrum_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} EXCEPTION: ${e}`);
                        set_logo_spectrum_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
    async SetLogoStatic(device_serial,
        set_logo_static_callback,
        set_logo_static_error_callback,
        red, green, blue) {
        let log_method_name = "SetLogoStatic";
        try {
            await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.razer',
                '/org/razer/device/' + device_serial,
                'razer.device.lighting.logo',
                null,
                (connection, _res, _data) => {
                    try {
                        const parameters = new GLib.Variant('(yyy)', [
                            red, green, blue
                        ]);

                        connection.call('setLogoStatic', parameters,
                            Gio.DBusCallFlags.NONE, -1, null,
                            (_source_object, __res, __data) => {
                                try {
                                    set_logo_static_callback(device_serial);
                                }
                                catch (e) {
                                    logException(`${log_method_name} connection.call EXCEPTION: ${e}`);
                                    set_logo_static_error_callback(device_serial, e);
                                }

                            });
                    }
                    catch (e) {
                        logException(`${log_method_name} EXCEPTION: ${e}`);
                        set_logo_static_error_callback(device_serial, e);
                    }

                });
        } catch (e) {
            logException(`${log_method_name} EXCEPTION: ${e}`);
        }

    }
}



export class RazerDevice {
    _device_serial = "";
    _device_name = "";
    _device_type = "";
    _is_online = false;

    //Battery
    _is_charging = false;
    _has_get_battery_method = undefined;
    _power_level = 0;
    _power_level_history = [];

    //DPI
    _onboard_dpis = [];
    _onboard_dpis_xy = [];
    _current_dpi = -1;
    _current_dpi_xy = [];
    _hotkey_dpi_index = 0;
    _max_dpi = -1;

    //Logo Rgb
    _brightness = 0;
    _color1 = [];
    _color2 = [];
    _color3 = [];
    _effect = "";
    _speed = 0;
    _has_get_logo_effect_method = undefined;
    _has_logo_static_method = undefined;
    _has_logo_spectrum_method = undefined;
    _has_logo_brightness_method = undefined;
    _has_logo_none_method = undefined;
    _has_logo_breathing_single_method = undefined;
    _has_logo_breathing_dual_method = undefined;
    _has_logo_reactive_method = undefined;
    _has_logo_breathe_random_method = undefined;
}

