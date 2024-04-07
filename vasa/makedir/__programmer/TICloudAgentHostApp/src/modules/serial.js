"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.name = exports.Serial = void 0;
const logger = require("../logger");
const serialport_1 = require("serialport");
const util = require("../../util/util");
class Serial {
    static _setUpDisplayName(ports) {
        ports.forEach((port) => {
            if (port.manufacturer) {
                port.displayName = `${port.comName} (${port.manufacturer})`;
            }
            else if (port.pnpId) {
                port.displayName = `${port.comName} (${port.pnpId})`;
            }
            else {
                port.displayName = port.comName;
            }
        });
        return ports;
    }
    constructor(_triggerEvent) {
        this._triggerEvent = _triggerEvent;
        this.openPortCache = new Map();
    }
    async onClose() {
        const promises = [];
        for (const comName of this.openPortCache.keys()) {
            const serialPort = this.openPortCache.get(comName);
            promises.push(util.ctxPromisify(serialPort, serialPort.close)());
        }
        await util.allSettled(promises);
        this.openPortCache.clear();
    }
    async list() {
        const ports = [];
        try {
            const portsList = await serialport_1.SerialPort.list();
            portsList.forEach((port) => {
                ports.push(Object.assign(Object.assign({}, port), { comName: port.path }));
            });
            Serial._setUpDisplayName(ports);
        }
        catch (error) {
            logger.info(`list exception : ${error.message}`);
            throw error;
        }
        return ({ ports });
    }
    // temp fix, need to make serial hooked up to websocket connections, refer to TICLD-2024
    async open(portInfo) {
        // map 'path' to the passed in 'comName' for backwards compatibility
        portInfo.path = portInfo.comName;
        const serialPort = this.openPortCache.get(portInfo.path);
        if (serialPort) {
            try {
                await util.ctxPromisify(serialPort, serialPort.close)();
                this.openPortCache.delete(portInfo.path);
            }
            catch (err) {
                const msg = `Could not close serial port: ${err.message}`;
                logger.info(msg);
                throw err;
            }
        }
        return this.createSerialPort(portInfo);
    }
    async write(portInfo, dataToWrite) {
        const comName = portInfo.comName;
        const serialPort = this.openPortCache.get(comName);
        if (serialPort) {
            try {
                // need to cast first param to specific type, since 'any' type was messing with ctxPromisify
                await util.ctxPromisify(serialPort, serialPort.write)(dataToWrite);
                return portInfo;
            }
            catch (err) {
                logger.info(err.message);
                throw err;
            }
        }
        else {
            const msg = `Trying to write to a closed port: ${comName}`;
            logger.info(msg);
            throw new Error(msg);
        }
    }
    /**
     * Set control flags on an open port.  All options are operating system default when the port is opened.
     * Every flag is set on each call to the provided or default values. If options isn't provided default options is used.
     */
    async setSignals(portInfo, options) {
        const comName = portInfo.comName;
        const serialPort = this.openPortCache.get(comName);
        if (serialPort) {
            try {
                await util.ctxPromisify(serialPort, serialPort.set)(options);
                return portInfo;
            }
            catch (err) {
                logger.info(err.message);
                throw err;
            }
        }
        else {
            const msg = `Trying to call setSignals on a closed port: ${comName}`;
            logger.info(msg);
            throw new Error(msg);
        }
    }
    /**
     *  Returns the control flags (CTS, DSR, DCD) on the open port.
     */
    async getSignals(portInfo) {
        const comName = portInfo.comName;
        const serialPort = this.openPortCache.get(comName);
        if (serialPort) {
            try {
                return await util.ctxPromisify(serialPort, serialPort.get)();
            }
            catch (err) {
                logger.info(err.message);
                throw err;
            }
        }
        else {
            const msg = `Trying to call getSignals on a closed port: ${comName}`;
            logger.info(msg);
            throw new Error(msg);
        }
    }
    async overrideBaudRate(portInfo, baudRateArg) {
        const comName = portInfo.comName;
        const serialPort = this.openPortCache.get(comName);
        try {
            return await util.ctxPromisify(serialPort, serialPort.update)({ baudRate: +baudRateArg });
        }
        catch (err) {
            const errObj = err && err.message ? err : new Error(err);
            throw errObj;
        }
    }
    async close(portInfo) {
        const comName = portInfo.comName;
        const serialPort = this.openPortCache.get(comName);
        if (serialPort) {
            try {
                await util.ctxPromisify(serialPort, serialPort.close)();
                this.openPortCache.delete(comName);
                return portInfo;
            }
            catch (err) {
                const msg = `Could not close serial port: ${err.message}`;
                logger.info(msg);
                throw err;
            }
        }
        else {
            const msg = `Trying to close an already closed port: ${comName}`;
            logger.info(msg);
            throw new Error(msg);
        }
    }
    /* users use list() to obtain a list of com ports of PortInfo type and
       augment it with options from OpenOptions then pass back to us.
    */
    async createSerialPort(portInfoAndOpenOptions) {
        return new Promise((resolve, reject) => {
            try {
                // handle backward compatibility, notice the camelCase difference "baudrate" and "baudRate"
                if (portInfoAndOpenOptions.baudrate && !portInfoAndOpenOptions.baudRate) {
                    portInfoAndOpenOptions.baudRate = Number(portInfoAndOpenOptions.baudrate);
                    delete portInfoAndOpenOptions.baudrate;
                }
                // in previous versions of the serialport module, baudRate is default to 9600
                // but starting with v10, it is a mandatory field.
                // so if user has not pass in the value, it will be defaulted to the same value for now
                if (!portInfoAndOpenOptions.baudRate) {
                    portInfoAndOpenOptions.baudRate = 9600;
                }
                // They really shouldn't set the new version as a string, but this is safe regardless
                portInfoAndOpenOptions.baudRate = Number(portInfoAndOpenOptions.baudRate);
                const comName = portInfoAndOpenOptions.comName;
                // create the serial port
                // casting the type to any, since the constructor is expected a OS aware typing, which our typing does not handle
                const serialPort = new serialport_1.SerialPort(portInfoAndOpenOptions, (err) => {
                    if (err) {
                        const msg = portInfoAndOpenOptions.comName + " could not be opened: " + err.toString();
                        logger.info(msg);
                        reject(new Error(err.message));
                    }
                    else {
                        serialPort.on("close", () => {
                            logger.info("Serial port connection closed: " + portInfoAndOpenOptions.comName);
                            if (this.openPortCache.has(comName)) {
                                this.openPortCache.delete(portInfoAndOpenOptions.comName);
                            }
                            this._triggerEvent("serialClose", {
                                port: portInfoAndOpenOptions,
                            });
                        });
                        serialPort.on("data", (data) => {
                            const dataJSON = JSON.stringify(data);
                            const dataPOD = JSON.parse(dataJSON);
                            this._triggerEvent("serialout", {
                                buffer: dataPOD.data,
                                comName: portInfoAndOpenOptions.comName,
                            });
                        });
                        serialPort.on("error", () => {
                            logger.info("Serial port connection error: " + portInfoAndOpenOptions.comName);
                            if (this.openPortCache.has(comName)) {
                                this.openPortCache.delete(portInfoAndOpenOptions.comName);
                            }
                            this._triggerEvent("serialClose", {
                                port: portInfoAndOpenOptions,
                            });
                        });
                        this.openPortCache.set(comName, serialPort);
                        resolve(portInfoAndOpenOptions);
                    }
                });
            }
            catch (err1) {
                const error1 = err1 && err1.message ? err1 : new Error(err1);
                logger.info(error1.message);
                reject(new Error(error1.message));
            }
        });
    }
}
exports.Serial = Serial;
exports.name = "Serial";
function instance(triggerEvent) {
    return {
        commands: new Serial(triggerEvent),
    };
}
exports.instance = instance;
