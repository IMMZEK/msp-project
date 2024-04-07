"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findComPorts = void 0;
const Q = require("q");
const serialport_1 = require("serialport");
const logger = require("../logger");
async function findComPorts(boardId) {
    const matchingPorts = [];
    try {
        const serialList = await serialport_1.SerialPort.list();
        const promiseList = [];
        serialList.forEach((serialDevice) => {
            switch (process.platform) {
                // on Windows win32 is returned for 32-bit and 64-bit
                case "win32": {
                    // match the PID and VID of the device list to the serial port list
                    if (serialDevice.pnpId) {
                        promiseList.push(findBoardIDGivenSerialDeviceWin(serialDevice)
                            .then((curBoardId) => {
                            if (curBoardId === boardId) {
                                return serialDevice.path;
                            }
                            else {
                                return "";
                            }
                        }));
                    }
                    break;
                }
                case "linux": {
                    // these xds110 is what's called a multi interface usb device,
                    // and the if00 is the interface 0 which is what the application COM port is at and that's what everyone wants.
                    // Not much to do be done here since this is a purely OS convention.
                    if (serialDevice.pnpId &&
                        serialDevice.pnpId.indexOf(boardId) !== -1 &&
                        serialDevice.pnpId.indexOf("if00") !== -1) {
                        promiseList.push(Q.resolve(serialDevice.path));
                    }
                    break;
                }
                case "darwin": {
                    if (serialDevice.serialNumber === boardId) {
                        promiseList.push(Q.resolve(serialDevice.path));
                    }
                    break;
                }
                default: {
                    // do nothing;
                }
            }
        });
        // the winreg returns error in some situations such as can't find something you are looking up,
        // but I am not interested in those cases, only the success ones.
        // q.all is not used because it will fail when one of those promise fail.
        const results = await Q.allSettled(promiseList);
        results.forEach((result) => {
            if (result.state === "fulfilled") {
                matchingPorts.push(result.value);
            }
        });
    }
    catch (err) {
        logger.info(err);
        throw new Error("serialport.list() failed: " + err);
    }
    if (matchingPorts.length > 0) {
        return matchingPorts;
    }
    else {
        throw new Error("No matching COM port found.");
    }
}
exports.findComPorts = findComPorts;
function findBoardIDGivenSerialDeviceWin(serialDevice) {
    const regSerialNumStartIdx = serialDevice.pnpId.lastIndexOf("\\") + 1;
    const regSerialNum = serialDevice.pnpId.toLowerCase().substring(regSerialNumStartIdx);
    const pathPrefix = "\\SYSTEM\\CurrentControlSet\\Enum\\";
    const vidPidRegex = /VID_[0-9a-fA-F]{4}&PID_[0-9a-fA-F]{4}&MI_00/i;
    const match = serialDevice.pnpId.match(vidPidRegex);
    if (!match) {
        const errMsg = "ERROR: found no pnpId match: " + serialDevice.pnpId;
        logger.info(errMsg);
        return Q.reject(errMsg);
    }
    else {
        const deviceHardwareID = serialDevice.pnpId.substring(0, match.index + "VID_FFFF&PID_FFFF".length);
        const devicePath = pathPrefix + deviceHardwareID;
        const registry = require("winreg");
        const regKey = new registry({
            hive: registry.HKLM,
            key: devicePath,
        });
        const getKeys = Q.nbind(regKey.keys, regKey);
        return getKeys()
            .then((devices) => {
            const promiseList = [];
            for (const device of devices) {
                const getValues = Q.nbind(device.values, device);
                const getValuePromise = (() => {
                    const curKey = device.key;
                    return getValues()
                        .then((items) => {
                        for (const item of items) {
                            const curItemValue = item.value.toLowerCase();
                            if (item.name === "ParentIdPrefix" && regSerialNum.indexOf(curItemValue) === 0) {
                                const actualSerialNumStartIdx = curKey.lastIndexOf("\\") + 1;
                                const actualSerialNum = curKey.substring(actualSerialNumStartIdx);
                                return actualSerialNum;
                            }
                        }
                        throw new Error("not found " + regSerialNum);
                    });
                })();
                promiseList.push(getValuePromise);
            }
            return Q.allSettled(promiseList)
                .then((results) => {
                let ret = "";
                results.forEach((result) => {
                    if (result.state === "fulfilled") {
                        ret = result.value;
                    }
                });
                return ret;
            });
        });
    }
}
