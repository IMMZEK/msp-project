"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Q = require("q");
const device_detector_1 = require("./modules/device_detector");
// tslint:disable:no-console
const deviceDetector = new device_detector_1.DeviceDetector(() => { });
deviceDetector.detectDebugProbes()
    .then((data) => {
    if (data && data.probes.length > 0) {
        return Q.all(data.probes.sort(((a, b) => a.id - b.id)).map((probe) => {
            return deviceDetector.detectDeviceWithProbe(probe)
                .then((result) => {
                console.log(probe.id + ") "
                    + ((result.name) ? result.name : "") + " "
                    + ((probe.connectionXml) ? probe.connectionXml : "") + " "
                    + ((probe.serialNumber) ? probe.serialNumber : "") + " "
                    + ((probe.comPorts && (probe.comPorts.length > 0)) ? probe.comPorts[0] : ""));
            });
        }));
    }
    else {
        throw new Error("No device detected.");
    }
})
    .catch(handleError)
    .finally(() => { deviceDetector.onClose(); })
    .done(() => { process.exit(0); });
function handleError(e) {
    if (e.message) {
        console.error("Error: " + e.message);
    }
    else {
        console.error("Error: " + JSON.stringify(e));
    }
}
