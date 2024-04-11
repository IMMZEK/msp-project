"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.name = exports.DeviceDetector = void 0;
const Q = require("q");
const usb = require("usb");
const installer_1 = require("../installer/installer");
const xds110_1 = require("../probeIdentify/xds110");
const board_id_1 = require("../targetDetection/board_id");
const msp430_id_1 = require("../targetDetection/msp430_id");
const msp_fet_1 = require("../targetDetection/msp_fet");
const xds100_1 = require("../targetDetection/xds100");
const xds110_2 = require("../targetDetection/xds110");
const progress_1 = require("../progress");
const config = require("../config");
const logger = require("../logger");
function readDebugProbeData() {
    return require("../targetDetection/debug_probes.json");
}
// Returns a key for a device into the tiDebugProbes map
function getKey(device) {
    return asHex(device.deviceDescriptor.idVendor) + "_" + asHex(device.deviceDescriptor.idProduct);
    function asHex(id) {
        let result = id.toString(16);
        while (result.length < 4) {
            result = "0" + result;
        }
        return result;
    }
}
// This is the class that exposes a function to detect what probes are connected
class DeviceDetector {
    constructor(_triggerEvent) {
        this._triggerEvent = _triggerEvent;
        this.downloads = {
            categories: {},
            promise: Q(),
        };
        // This is a map of vid, pid -> connection xml file
        this.tiDebugProbes = readDebugProbeData().reduce((result, entry) => {
            result[entry.vid + "_" + entry.pid] = entry;
            return result;
        }, {});
        this.probeDetectionAlgorithms = {
            xds100: xds100_1.detectDebugProbe,
            xds110: xds110_2.detectDebugProbe,
            msp_fet: msp_fet_1.detectDebugProbe,
        };
        this.deviceDetectionAlgorithms = {
            board_id: board_id_1.detectDevice,
            msp430_id: msp430_id_1.detectDevice,
        };
        this.probeIdentifyAlgorithms = {
            identifyXds110: xds110_1.identify,
        };
        // These are the event handlers.  Note that they are instance
        // functions, and not class functions, so that they can be passed
        // to event handlers directly
        this._onAttach = (device) => {
            const key = getKey(device);
            logger.info("detected attach of usb id " + key);
            if (key in this.tiDebugProbes) {
                this.populateDeviceList();
                this._triggerEvent("attach");
            }
        };
        this._onDetach = (device) => {
            const key = getKey(device);
            logger.info("detected detach of usb id " + key);
            if (key in this.tiDebugProbes) {
                this.populateDeviceList();
                this._triggerEvent("detach");
            }
        };
        this.populateDeviceList();
        usb.on("attach", this._onAttach);
        usb.on("detach", this._onDetach);
    }
    detectDebugProbes() {
        const ids = Object.keys(this.attachedProbes);
        const promises = ids.map((id) => this._detectDebugProbe(id));
        return Q.all(promises)
            .then((probes) => ({ probes }));
    }
    detectDevice(id, options) {
        if (!(id in this.attachedProbes)) {
            throw new Error("Unknown debug probe id: " + id);
        }
        const device = this.attachedProbes[id];
        const deviceDetection = this.tiDebugProbes[getKey(device.usbDevice)].deviceDetection;
        if (deviceDetection) {
            return this._downloadCategories(deviceDetection)
                .then(() => this.deviceDetectionAlgorithms[deviceDetection.algorithm](device, options));
        }
        else {
            return Q({ name: undefined });
        }
    }
    detectDeviceWithProbe(probe) {
        if (probe.id) {
            return this.detectDevice(probe.id);
        }
        else {
            return Q({ name: undefined });
        }
    }
    identifyProbe(id, dsliteLogPath) {
        if (!(id in this.attachedProbes)) {
            throw new Error("Unknown debug probe id: " + id);
        }
        return this._detectDebugProbe(id).then((probe) => {
            const device = this.attachedProbes[id];
            const probeIdentify = this.tiDebugProbes[getKey(device.usbDevice)].probeIdentify;
            if (probeIdentify && probe) {
                return this._downloadCategories(probeIdentify)
                    .then(() => this.probeIdentifyAlgorithms[probeIdentify.algorithm](probe, this._triggerEvent, dsliteLogPath));
            }
            else {
                return Q();
            }
        });
    }
    filesNeeded() {
        const categories = this._getCategoriesOfAttachedDevices();
        if (categories.length) {
            const installer = new installer_1.Installer(config.cloudAgentInstallerServerURL, {});
            return installer.areFilesMissing(categories);
        }
        return Q(false);
    }
    // Called when the module is shutdown
    // Removes events from usb
    onClose() {
        usb.removeListener("attach", this._onAttach);
        usb.removeListener("detach", this._onDetach);
    }
    // Fetch the categories necessary to use any of the attached devices
    _getCategoriesOfAttachedDevices() {
        const ids = Object.keys(this.attachedProbes);
        return ids.reduce((categories, id) => {
            const key = getKey(this.attachedProbes[id].usbDevice);
            const info = this.tiDebugProbes[key];
            if (info.deviceDetection) {
                categories = categories.concat(info.deviceDetection.categories);
            }
            if (info.probeDetection) {
                categories = categories.concat(info.probeDetection.categories);
            }
            return categories;
        }, []);
    }
    // This downloads the categories specified to detect something
    _downloadCategories(strategy) {
        const undownloaded = strategy.categories
            .filter((category) => !(category in this.downloads.categories));
        if (undownloaded.length && !config.desktopMode) {
            undownloaded.forEach((category) => this.downloads.categories[category] = true);
            this.downloads.promise = this.downloads.promise.then(() => {
                const progress = new progress_1.ProgressGenerator("Installing device detection files...", this._triggerEvent);
                const installer = new installer_1.Installer(config.cloudAgentInstallerServerURL, {});
                return installer.installFilesForCategories(strategy.categories)
                    .progress((progressData) => {
                    progress.generateEvent(progressData);
                });
            });
        }
        return this.downloads.promise;
    }
    // This detects a specific debug probe
    _detectDebugProbe(id) {
        const device = this.attachedProbes[id];
        const key = getKey(device.usbDevice);
        const probeInfo = this.tiDebugProbes[key];
        if (probeInfo.connectionXml) {
            return Q({
                connectionXml: probeInfo.connectionXml,
                id,
            });
        }
        else {
            return this._downloadCategories(probeInfo.probeDetection)
                .then(() => this.probeDetectionAlgorithms[probeInfo.probeDetection.algorithm](this.attachedProbes, id));
        }
    }
    populateDeviceList() {
        this.attachedProbes = usb.getDeviceList()
            .filter((device) => {
            const key = getKey(device);
            logger.info("detected usb id " + key);
            return (key in this.tiDebugProbes);
        })
            .map((ret) => {
            return { usbDevice: ret };
        });
    }
}
exports.DeviceDetector = DeviceDetector;
exports.name = "DeviceDetector";
function instance(triggerEvent) {
    return {
        commands: new DeviceDetector(triggerEvent),
    };
}
exports.instance = instance;
