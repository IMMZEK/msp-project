"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDebugProbe = void 0;
const Q = require("q");
const logger = require("../logger");
function detectDebugProbe(attachedProbes, id) {
    const device = attachedProbes[id];
    // assign order number to msp connections.
    // since we can't reliably tell which usb is connected to which fet,
    // just assign them here in order. upon device detection,
    // use this assigned number to grab the associated fet and then the info can be used to configure DS.
    // However keep in mind the underlying usb.Device is likely not the right one associated with the FET.
    // Because we are repopulating the usb list whenever there is any change, this approach works.
    let count = 0;
    for (let i = 0; i < id; i++) {
        if (attachedProbes[i].probeType === "msp430") {
            count++;
        }
    }
    device.probeType = "msp430";
    device.probeObj = {
        connectionXml: (count === 0) ? "TIMSP430-USB" : "TIMSP430-USB" + (count + 1).toString(10),
        id,
        intrusiveDeviceDetect: true,
    };
    logger.info("detectDebugProbe msp_fet: " + JSON.stringify(device.probeObj));
    return Q(device.probeObj);
}
exports.detectDebugProbe = detectDebugProbe;
