/*
Copyright (c) 2018, Texas Instruments Incorporated
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

*   Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.
*   Neither the name of Texas Instruments Incorporated nor the names of
its contributors may be used to endorse or promote products derived
from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*jslint node: true */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.name = exports.Usbhid = void 0;
const ti_devices_1 = require("../usbhid/ti-devices");
const Q = require("q");
const logger = require("../logger");
let numUsbHidDevices = 0;
const usbHidComPortNameMap = {};
// Helper method to create unique comName for usbhid ports based on port.path being a unique identifier.
function createUniqueDisplayNameForHidPorts(productName, path) {
    usbHidComPortNameMap[productName] = usbHidComPortNameMap[productName] || { index: 0, portMap: {} };
    const product = usbHidComPortNameMap[productName];
    const ports = product.portMap;
    let portIndex = ports[path];
    if (portIndex === undefined) {
        portIndex = ports[path] = product.index++;
    }
    // if only one port, dont add zero to the product name.
    return productName + (portIndex > 0 ? "." + portIndex : "");
}
class Usbhid {
    static _setUpDisplayName(ports) {
        return ports.map((port, i) => {
            let productName = "Unnamed HID Device";
            if (port.product) {
                productName = port.product;
            }
            port.comName = createUniqueDisplayNameForHidPorts(productName, port.path);
            let vendorName = "vendorId=0x" + port.vendorId.toString(16);
            if (port.manufacturer) {
                vendorName += `(${port.manufacturer})`;
            }
            else if (port.vendorId === 8263) {
                vendorName += "(Texas Instruments)";
            }
            port.displayName = "productId=0x" + port.productId.toString(16) + "(" + port.comName + ") " + vendorName;
            const portNameMsg = `usb-hid.listPorts[${i}]: ${port.displayName}`;
            logger.info(`USB-HID.setUpDisplayName = ${portNameMsg}`);
            return port;
        });
    }
    constructor(_triggerEvent) {
        this._triggerEvent = _triggerEvent;
        this.openPortCache = {};
        this._numDataEvents = 0;
    }
    onClose() {
        for (const comName in this.openPortCache) {
            if (this.openPortCache.hasOwnProperty(comName)) {
                this.openPortCache[comName].close(false);
            }
        }
        for (const comName in this.openPortCache) {
            if (this.openPortCache.hasOwnProperty(comName)) {
                delete this.openPortCache[comName];
            }
        }
    }
    list(vendorIdFilter) {
        const deferred = Q.defer(); // Q.defer<{ ports: IPortInfo[] }>();
        numUsbHidDevices = ti_devices_1.TiDevices.deviceCount(vendorIdFilter);
        logger.info(`Usbhid.list: numUsbHidDevices = ${numUsbHidDevices}`);
        ti_devices_1.TiDevices.list((err, ports) => {
            if (err) {
                deferred.reject({ message: err.toString() });
            }
            else {
                const portsList = [];
                ports.forEach((port) => {
                    portsList.push(Object.assign(Object.assign({}, port), { comName: port.path }));
                });
                deferred.resolve({ ports: Usbhid._setUpDisplayName(portsList) });
            }
        }, vendorIdFilter);
        return deferred.promise;
    }
    open(portInfo, msTimeout, vendorIdFilter, enableLogging) {
        const deferred = Q.defer();
        const argPortInfo = portInfo;
        let tiDeviceObj = null;
        let argMsTimeout = msTimeout;
        if (isNaN(argMsTimeout)) {
            argMsTimeout = 0;
        }
        logger.info(`Usbhid.open called! portInfo.comName = ${portInfo.comName} msTimeout=${msTimeout}`);
        numUsbHidDevices = ti_devices_1.TiDevices.deviceCount(vendorIdFilter);
        logger.info(`Num TiDevices devices = ${numUsbHidDevices}`);
        if (this.openPortCache.hasOwnProperty(portInfo.comName)) {
            logger.info(`Device ${portInfo.comName} not properly closed before calling open. Closing now.`);
            this.openPortCache[portInfo.comName].close(false);
            delete this.openPortCache[portInfo.comName];
        }
        if (numUsbHidDevices > 0) {
            try {
                tiDeviceObj = new ti_devices_1.TiDevices(portInfo.index, argMsTimeout, vendorIdFilter, enableLogging);
                this.openPortCache[portInfo.comName] = tiDeviceObj;
                let openedName = "WARNING: deviceObj not defined!";
                if ((tiDeviceObj) && (tiDeviceObj.hidDescriptor)) {
                    openedName = `vendorId=0x${tiDeviceObj.hidDescriptor.vendorId.toString(16)}`;
                    openedName += ` (Timeout=${tiDeviceObj.msTimeout} ms)`;
                }
                logger.info(`${portInfo.comName} opened!!! (${openedName})`);
                tiDeviceObj.on("close", () => {
                    logger.info(`USB-HID port connection closed: ${portInfo.comName}`);
                    if (portInfo.comName in this.openPortCache) {
                        delete this.openPortCache[portInfo.comName];
                    }
                    this._onCloseCallback(portInfo);
                });
                tiDeviceObj.on("timeout", () => {
                    // Need to close and re-open the device
                    logger.info("USB-HID - timeout!");
                    if (tiDeviceObj.hidDescriptor) {
                        if (tiDeviceObj.hidDescriptor.retryTimeoutHdlr) {
                            tiDeviceObj.hidDescriptor.retryTimeoutHdlr = null;
                        }
                        tiDeviceObj.hidDescriptor.retryTimeoutHdlr = setTimeout(() => {
                            tiDeviceObj.hidDescriptor.retryTimeoutHdlr = undefined;
                            logger.info("usb-hid Timeout handling: Closing USB-HID port.");
                            if (this.openPortCache[portInfo.comName]) {
                                delete this.openPortCache[portInfo.comName];
                                tiDeviceObj.close(true);
                                logger.info("usb-hid Timeout handling: Re-opening USB-HID port...");
                                this.open(argPortInfo, argMsTimeout);
                            }
                        }, argMsTimeout);
                    }
                });
                tiDeviceObj.on("dataReceived", (data, error) => {
                    this._numDataEvents++;
                    if (data) {
                        if ((this._numDataEvents % 4096) === 0) {
                            logger.info(`USB-HID.numDataEvents = ${this._numDataEvents}`);
                        }
                        this._onDataCallback(data, tiDeviceObj.hidDescriptor);
                    }
                    if (error) {
                        logger.info(`usb-hid onDataReceived: error=${error}`);
                        this._onErrorCallback(error, tiDeviceObj.hidDescriptor);
                    }
                });
                tiDeviceObj.on("log", (logStr) => {
                    logger.info(`tiDeviceObj: ${logStr}`);
                });
                deferred.resolve(portInfo);
            }
            catch (err) {
                logger.info(`Exception when trying to open port! err = ${err.stack}`);
                deferred.reject({
                    message: `Failed to open port ${portInfo.comName}. Please unplug, plug back in and try again.`,
                    stack: err.stack,
                });
            }
        }
        else {
            const err = "No Texas Instruments USB-HID Ports found.";
            logger.info(err);
            deferred.reject({
                message: err,
            });
        }
        return deferred.promise;
    }
    write(portInfo, data) {
        const deferred = Q.defer();
        const tiDeviceObj = this.openPortCache[portInfo.comName];
        const result = tiDeviceObj.writeData(data, this._onErrorCallback);
        if (result) {
            deferred.resolve();
        }
        else {
            deferred.reject("writeData failed - see error callback for details.");
        }
        return deferred.promise;
    }
    closePort(portInfo) {
        logger.info(`Usbhid.closePort(${portInfo.comName})`);
        const deferred = Q.defer();
        const comName = portInfo.comName;
        let tiDeviceObj = this.openPortCache[comName];
        if (tiDeviceObj) {
            try {
                if (tiDeviceObj.hidDescriptor.retryTimeoutHdlr) {
                    logger.info("closePort called while in timeout retry: clearing retry timer.");
                    clearTimeout(tiDeviceObj.hidDescriptor.retryTimeoutHdlr);
                }
                tiDeviceObj.close(true);
                logger.info("TiDevices.close called.");
                delete this.openPortCache[portInfo.comName];
                deferred.resolve(portInfo);
            }
            catch (err) {
                const msg = `Could not close serial port: ${err.toString()}`;
                logger.info(msg);
                deferred.reject({
                    message: msg,
                });
            }
            tiDeviceObj = null;
        }
        else {
            const msg = `Trying to close an already closed port: ${comName}`;
            logger.info(msg);
            deferred.reject({
                message: msg,
            });
        }
        return deferred.promise;
    }
    _onDataCallback(data, portInfo) {
        const dataJSON = JSON.stringify(data);
        const dataPOD = JSON.parse(dataJSON);
        this._triggerEvent("serialout", {
            buffer: dataPOD.data,
            portInfo,
        });
    }
    _onCloseCallback(portInfo) {
        if (portInfo) {
            logger.info(`Usbhid._onCloseCallback(vendorId=${portInfo.vendorId}, productId=${portInfo.productId}, ` +
                `interface=${portInfo.interface})`);
        }
        this._triggerEvent("serialClose", {
            port: portInfo,
        });
    }
    _onErrorCallback(error, portInfo) {
        logger.info(`Usbhid._onErrorCallback( vendorId=${portInfo.vendorId}, productId=${portInfo.productId}, ` +
            `interface=${portInfo.interface}): error = ${error.toString()}`);
        if (this._triggerEvent) {
            this._triggerEvent("dataError", {
                port: portInfo,
                error,
            });
        }
    }
}
exports.Usbhid = Usbhid;
exports.name = "USB-HID";
function instance(triggerEvent) {
    return {
        commands: new Usbhid(triggerEvent),
    };
}
exports.instance = instance;
