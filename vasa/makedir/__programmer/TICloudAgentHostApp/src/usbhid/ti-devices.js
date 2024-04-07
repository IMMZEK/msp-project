/*
Copyright (c) 2017, Texas Instruments Incorporated
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiDevices = void 0;
/*jslint node: true */
const events = require("events");
let HID = require("node-hid");
class TiDevices extends events.EventEmitter {
    static getDeviceList(vendorIdFilter) {
        if (HID) {
            const name = require.resolve("node-hid");
            delete require.cache[name];
        }
        if (!vendorIdFilter) {
            vendorIdFilter = 8263; // default TI vendor ID
        }
        // tslint:disable-next-line
        HID = require("node-hid"); // need to re-initialize in order to pick up any newly plugged in devices.
        const allDevices = HID.devices();
        const tiDeviceList = new Array();
        for (const deviceInfo of allDevices) {
            if ((deviceInfo.vendorId === vendorIdFilter) || (vendorIdFilter === 0)) {
                tiDeviceList.push(deviceInfo);
                tiDeviceList[tiDeviceList.length - 1].index = tiDeviceList.length - 1;
            }
        }
        return tiDeviceList;
    }
    static deviceCount(vendorIdFilter) {
        const result = TiDevices.getDeviceList(vendorIdFilter).length;
        return result;
    }
    static list(callback, vendorIdFilter) {
        // Need to sort by the interface number to handle case where device with interface = 1
        //  is enumerated before device with interface = 0
        const ports = TiDevices.getDeviceList(vendorIdFilter)
            .sort((a, b) => this.sortByInterfaceId(a, b));
        if (callback) {
            const err = null;
            callback(err, ports);
        }
        return ports;
    }
    static sortByInterfaceId(a, b) {
        if (a === b) {
            return 0;
        }
        if ((b.interface === undefined) || (b.interface < 0)) {
            return -1; // put b after a
        }
        if ((a.interface === undefined) || (a.interface < 0)) {
            return 1; // put a after b
        }
        if (a.interface > b.interface) {
            return 1; // a is greater than b by the ordering criterion - i.e. put a after b
        }
        if ((a.interface >= 0) && (a.interface < b.interface)) {
            return -1; // a is less than b by some ordering criterion - i.e. put a before b
        }
        // handle case where b is undefined
        return 1;
    }
    constructor(index = 0, timeoutInMs = 1000, vendorIdFilter, enableLogging) {
        super();
        this.hidDescriptor = undefined;
        this.hTimeoutHdlr = undefined;
        this.hid = undefined;
        this.msTimeout = 1000;
        this._vendorIdFilter = 8263; // default value for Texas Instruments vendor ID
        this.debugLogging = false;
        this.isClosing = false;
        if (enableLogging) {
            this.debugLogging = true;
        }
        if (vendorIdFilter) {
            this._vendorIdFilter = vendorIdFilter;
        }
        this._debugLog(`in TiDevices(${index}) constructor.  About to call getDeviceList...`);
        const _tiDeviceList = TiDevices.getDeviceList(this._vendorIdFilter);
        if (!_tiDeviceList.length) {
            throw new Error("No TI USB-HID devices could be found");
        }
        if (index > _tiDeviceList.length || index < 0) {
            throw new Error(`Index ${index} out of range, only ${_tiDeviceList.length} TI USB-HID devices found`);
        }
        this.hidDescriptor = _tiDeviceList[index];
        if (!this.hidDescriptor) {
            throw new Error(`ti-devices.js constructor: _tiDeviceList[${index}] = ${this.hidDescriptor}`);
        }
        this._debugLog(`in TiDevices(${index}) constructor.  About to call new HID.HID(${_tiDeviceList[index].path})...`);
        let ok = false;
        try {
            this.hid = new HID.HID(_tiDeviceList[index].path);
            ok = true;
        }
        catch (ex) {
            this._debugLog(`Exception opening new HID device[${index}] with new HID.HID(${this.hidDescriptor.path}). ex=${ex}`);
            ok = false;
        }
        if (!ok) {
            if (index === 0) {
                try {
                    this._debugLog(`About to try to open HID.vendorID=0x${this.hidDescriptor.vendorId.toString(16)},` +
                        `productId=0x${this.hidDescriptor.productId.toString(16)}`);
                    this.hid = new HID.HID(this.hidDescriptor.vendorId, this.hidDescriptor.productId);
                    this._debugLog(`successfully opened productId=0x${this.hidDescriptor.productId.toString(16)}`);
                    ok = true;
                }
                catch (ex1) {
                    const msg = `Exception opening new HID device[${index}]: ${ex1}`;
                    this._debugLog(msg);
                    throw new Error(msg);
                }
            }
        }
        this._debugLog(`in TiDevices(${index}) constructor.  About to call readData...`);
        if ((timeoutInMs !== undefined) && (timeoutInMs !== null) && (!isNaN(timeoutInMs))) {
            this.msTimeout = timeoutInMs;
        }
        // defer initial readData call until after constructor returns
        setImmediate(() => {
            try {
                this._readData();
            }
            catch (ex4) {
                this._debugLog(`Exception in this.readData... ex4=${ex4}`);
            }
        });
    }
    /**
     * writeData writes a buffer of data to the usb target
     * @param dataBuffer - array of integers to send to the target usb device
     * @param errCallback - function(error, hidDescriptor) to be called in case of error
     * @returns {boolean} true if write successful, false if write failed
     */
    writeData(dataBuffer, errCallback) {
        let result = false;
        try {
            // NOTE: data must be an array of integers.
            // See https://github.com/node-hid/node-hid/issues/70
            // (some devices require the first byte to be 0)
            if (typeof dataBuffer === "string") {
                if (errCallback) {
                    errCallback("usbhid.write: must pass in array of integers, not a string");
                }
            }
            else {
                if (!this.hid) {
                    this.hid = new HID.HID(this.hidDescriptor.vendorId, this.hidDescriptor.productId);
                }
                if (this.hid) {
                    this._debugLog(`usbHID.writeData(${dataBuffer})`);
                    this.hid.write(dataBuffer);
                    result = true;
                }
                else {
                    this._debugLog(`usbHID.writeData: this.hid is not defined.  Did not write data (${dataBuffer})`);
                }
            }
        }
        catch (ex) {
            if (errCallback) {
                errCallback(ex, this.hidDescriptor);
            }
        }
        return result;
    }
    getVendorIdFilter() {
        return this._vendorIdFilter;
    }
    close(isCloseQuietly) {
        this._debugLog(`in TiDevices.close(${isCloseQuietly})`);
        if (this.hTimeoutHdlr) {
            clearTimeout(this.hTimeoutHdlr);
            this.hTimeoutHdlr = null;
        }
        if (this.hid) {
            this.isClosing = true;
            // In order to allow current hid.read calls to terminate, we need to 'poke' the
            // device to send us a response so that the read command can exit normally.
            // Send a 'status' command to the device in order to do this.
            const statusCmd = [0x3f, 0x02, 0x80, 0x00];
            try {
                this.hid.write(statusCmd);
            }
            catch (e) {
                this._closeDevice();
                this._debugLog(`TiDevices.close exception: e=${e}`);
            }
            if (!isCloseQuietly) {
                this.emit("close");
            }
            if (this.removeAllListeners) {
                this.removeAllListeners("dataReceived");
                this.removeAllListeners("log");
                this.removeAllListeners("close");
                this.removeAllListeners("timeout");
            }
            else {
                this._debugLog("this.removeAllListeners does not exist!");
            }
        }
    }
    _closeDevice() {
        this.hid.close();
        this.hid = null;
        const name = require.resolve("node-hid");
        delete require.cache[name];
    }
    _readData() {
        if (!this.hid) {
            return;
        }
        if (this.hTimeoutHdlr) {
            clearTimeout(this.hTimeoutHdlr);
            this.hTimeoutHdlr = null;
        }
        try {
            if ((this.msTimeout > 0) && (!this.isClosing)) {
                this.hTimeoutHdlr = setTimeout(() => {
                    if (this.hidDescriptor) {
                        this._debugLog(`TIMEOUT!!  productId=0x${this.hidDescriptor.productId.toString(16)}, ` +
                            `index=${this.hidDescriptor.index}`);
                    }
                    else {
                        this._debugLog("TIMEOUT!!! no hidDescriptor!");
                    }
                    this.emit("timeout");
                }, this.msTimeout);
            }
        }
        catch (ex0) {
            this._debugLog(`Exception in TiDevices._readData: ex0=${ex0}`);
        }
        try {
            if (this.hid) {
                if (!this.isClosing) {
                    this.hid.read(this._readDataCallback.bind(this));
                }
                else {
                    this._closeDevice();
                }
            }
        }
        catch (ex) {
            this._debugLog(`TiDevices._readData exception: ex=${ex}`);
        }
    }
    _readDataCallback(error, data) {
        if (this.hTimeoutHdlr) {
            clearTimeout(this.hTimeoutHdlr);
            this.hTimeoutHdlr = null;
        }
        if (error) {
            this._debugLog(`TiDevices.readData: error = ${error}`);
            // suppress errors that occur when trying to read from a closed port
            if ((this) && (this.hid) && (this.hidDescriptor)) {
                this._debugLog(`ERROR in readData:${error}`);
                this.emit("dataReceived", null, `ERROR=${error}`);
            }
            return;
        }
        try {
            if (data) {
                this.emit("dataReceived", data, error);
            }
        }
        catch (ex0) {
            this._debugLog(`Exception in TiDevices.readData: ex0=${ex0}`);
        }
        this.hTimeoutHdlr = setTimeout(() => {
            // Cannot call hid.read recursively as it prevents it from shutting down in response to hid.close
            // The fix is to call subsequent reads from a setTimeout / setImmediate callback.
            try {
                if ((this.hid) && (!this.isClosing)) {
                    this.hid.read(this._readDataCallback.bind(this));
                }
                else {
                    this._closeDevice();
                }
            }
            catch (ex) {
                this._debugLog(`TiDevices.readData exception: ex=${ex}`);
            }
        }, 1);
    }
    _debugLog(str) {
        if (this.debugLogging) {
            this.emit("log", str);
        }
    }
}
exports.TiDevices = TiDevices;
