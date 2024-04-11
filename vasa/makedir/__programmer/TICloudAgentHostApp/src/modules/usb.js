"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.name = exports.TiUsb = void 0;
const usb = require("usb");
const logger = require("../logger");
const util = require("../../util/util");
const LIBUSB_CLASS_HUB = 9;
const LIBUSB_CLASS_DATA = 10; // CDC Data
class TiUsb {
    /**
     * Returns a unique key for looking up a usb device in the deviceCache or openDeviceCache maps
     * @param device the usb device to get the key for
     */
    static getKey(device) {
        let key = `${asHex(device.deviceDescriptor.idVendor)}_${asHex(device.deviceDescriptor.idProduct)}$` +
            `${device.busNumber}_${device.deviceAddress}`;
        if (device.portNumbers && device.portNumbers.length > 0) {
            key += `_${device.portNumbers[device.portNumbers.length - 1]}`;
        }
        return key;
        function asHex(id) {
            let result = id.toString(16);
            while (result.length < 4) {
                result = "0" + result;
            }
            return result;
        }
    }
    static getEventName(eventPrefix, deviceInfoKey, intf) {
        return `${eventPrefix}.${deviceInfoKey}.${intf.index}`;
    }
    static async _delay(ms) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }
    static async _setImmediate() {
        return new Promise((resolve) => {
            setImmediate(() => {
                resolve();
            });
        });
    }
    /**
     * returns the string descriptor for the usbDevice at the specified index.  NOTE: usbDevice must be open.
     * @param usbDevice device to get the string descriptor from
     * @param stringIndex index of string descriptor to return
     */
    static async _getStringDescriptor(usbDevice, stringIndex) {
        if (stringIndex === 0) {
            throw new Error("String Index must be > 0");
        }
        else {
            const getStringDescriptor = util.ctxPromisify(usbDevice, usbDevice.getStringDescriptor);
            const buf = await getStringDescriptor(stringIndex);
            return buf.toString();
        }
    }
    static async _generateDeviceInfo(ud) {
        const usbDevice = ud.usbDevice;
        const devDesc = usbDevice.deviceDescriptor;
        const ids = await TiUsb._getDeviceIds(devDesc, ud, usbDevice);
        let displayName = ids.manufacturer.length > 0 ? ids.manufacturer : `vendorId=0x${devDesc.idVendor.toString(16)}`;
        displayName += ":" + (ids.productName.length > 0 ? ids.productName : `productId=0x${devDesc.idProduct.toString(16)}`);
        if (ids.serialNumber) {
            displayName += ` S/N:${ids.serialNumber}`;
        }
        const result = {
            vendorId: devDesc ? devDesc.idVendor : 0,
            productId: devDesc ? devDesc.idProduct : 0,
            key: TiUsb.getKey(usbDevice),
            numInterfaces: ud.interfaceDescriptors.length,
            usbPath: `${usbDevice.busNumber}.${usbDevice.deviceAddress}`,
            usbPortNumber: -1,
            isBulkDevice: (ud.bulkInterfaceIndexes.length > 0),
            canBeOpened: ud.canBeOpened,
            parentKey: (usbDevice.parent && usbDevice.parent.deviceDescriptor) ? TiUsb.getKey(usbDevice.parent) : "",
            productName: ids.productName,
            manufacturer: ids.manufacturer,
            serialNumber: ids.serialNumber,
            displayName,
        };
        if (usbDevice.portNumbers && usbDevice.portNumbers.length > 0) {
            result.usbPath += `.${usbDevice.portNumbers.join(",")}`;
            result.usbPortNumber = usbDevice.portNumbers[usbDevice.portNumbers.length - 1];
        }
        return result;
    }
    static async _getDeviceIds(devDesc, ud, usbDevice) {
        const result = {
            productName: "",
            manufacturer: "",
            serialNumber: "",
        };
        if (devDesc) {
            if (ud.canBeOpened) {
                usbDevice.open();
                let buf = "";
                // gracefully ignore any errors that arise because a usb device does not support any of the following
                try {
                    buf = await TiUsb._getStringDescriptor(usbDevice, devDesc.iProduct);
                    result.productName = buf.toString();
                }
                catch (ex) { }
                try {
                    buf = await TiUsb._getStringDescriptor(usbDevice, devDesc.iManufacturer);
                    result.manufacturer = buf.toString();
                }
                catch (ex1) { }
                try {
                    buf = await TiUsb._getStringDescriptor(usbDevice, devDesc.iSerialNumber);
                    result.serialNumber = buf.toString();
                }
                catch (ex2) { }
                try {
                    usbDevice.close();
                }
                catch (ex3) { }
            }
            else {
                if (TiUsb._isTIDevice(devDesc.idVendor)) {
                    result.manufacturer = "Texas Instruments";
                }
            }
        }
        return result;
    }
    static _isTIDevice(idVendor) {
        return ((idVendor === TiUsb.TI_VID) || (idVendor === TiUsb.TI_HID_VID) || (idVendor === TiUsb.LUMINARY_VID));
    }
    /**
     * To minimize security concerns, apps are only allowed to interact with TI devices, serial ports and USB hubs
     * @param ud the IUsbDevicestate object for the usb device
     * @returns true if there is no security risk created by allowing apps to interact with the usb device.
     */
    static _isDeviceSafe(ud) {
        const desc = ud && ud.usbDevice && ud.usbDevice.deviceDescriptor;
        return desc && (TiUsb._isTIDevice(desc.idVendor) || desc.bDeviceClass === LIBUSB_CLASS_HUB ||
            desc.bDeviceClass === LIBUSB_CLASS_DATA);
    }
    static async _addToCache(ud) {
        if (TiUsb._isDeviceSafe(ud)) {
            try {
                ud.info = await TiUsb._generateDeviceInfo(ud);
                TiUsb.deviceCache.set(ud.info.key, ud);
            }
            catch (ex) {
                logger.info(`Exception in _addToCache: ex=${ex}`);
            }
        }
    }
    static _getInfoList(vendorIdFilter) {
        const includeEverything = (!vendorIdFilter || vendorIdFilter.length === 0);
        return Array.from(this.deviceCache.values())
            .filter((ud) => (includeEverything || vendorIdFilter.indexOf(+ud.info.vendorId) >= 0))
            .map((ud) => ud.info);
    }
    constructor(_triggerEvent) {
        this._triggerEvent = _triggerEvent;
        this.openDeviceCache = new Map();
        this._waitForList = null;
        this._onAttach = (device) => {
            this._eventHdlr(device, "attach");
        };
        this._onDetach = (device) => {
            this._eventHdlr(device, "detach");
        };
        this._eventHdlr = (device, eventName) => {
            const key = TiUsb.getKey(device);
            const vidpid = key.substring(0, key.indexOf("$"));
            // Ignore apple events as they are constantly attaching and detaching
            const APPLE_VID = "05ac";
            const IR_RCV = APPLE_VID + "_8242";
            if (vidpid !== IR_RCV) {
                logger.info(`detected ${eventName} of usb id ${key}`);
                this._updateDeviceCache(eventName, key).then(() => {
                    this._triggerEvent(eventName, key);
                });
            }
        };
        logger.info("in TiUsb constructor");
        try {
            usb.on("attach", this._onAttach);
            usb.on("detach", this._onDetach);
            this._waitForList = this._updateDeviceCache("init");
        }
        catch (ex) {
            // do not throw the exception as it will kill TICloudAgentHostApp
            logger.info(`Exception in ti_usb constructor: ex=${ex}`);
            this._waitForList = null;
        }
    }
    /**
     * list the devices that have the specified vendor ID(s)
     * @param strVendorIdFilter comma separated value string.  Use * for all vendor IDs, empty string for all TI devices.
     * @returns { deviceInfoList: IUsbDeviceInfo[]}
     */
    async list(vendorIdFilter) {
        let vendorIds = [TiUsb.TI_VID, TiUsb.TI_HID_VID, TiUsb.LUMINARY_VID];
        const strVendorIdFilter = (vendorIdFilter === undefined) ? "" : "" + vendorIdFilter;
        if (strVendorIdFilter.trim().length > 0) {
            const radix = (strVendorIdFilter.indexOf("0x") >= 0) ? 16 : 10;
            vendorIds = (strVendorIdFilter.indexOf("*") >= 0) ? [] :
                strVendorIdFilter.split(",").map((vendorId) => parseInt(vendorId, radix));
        }
        if (this._waitForList) {
            await this._waitForList;
        }
        return { deviceInfoList: TiUsb._getInfoList(vendorIds) };
    }
    /**
     * returns the device, config and interface descriptors for the specified usb device.
     * @param deviceInfoKey unique id specifying which device to get the descriptors for
     * @result null if device not in cache
     */
    async getDescriptors(deviceInfoKey) {
        const ud = TiUsb.deviceCache.get(deviceInfoKey);
        if (!ud || !ud.usbDevice) {
            return null;
        }
        let cfgDescriptor = null;
        const devDescriptor = ud.usbDevice.deviceDescriptor;
        try {
            cfgDescriptor = ud.usbDevice.configDescriptor;
        }
        catch (ex1) {
            // ignore errors caused by devices that fail when trying
            // to call usb's internal __getConfigDescriptor function.
            // We still want to return the device descriptor etc. in this situation.
        }
        return {
            deviceDescriptor: devDescriptor,
            configDescriptor: cfgDescriptor,
            interfaceDescriptors: [...ud.interfaceDescriptors],
            bulkInterfaceIndexes: [...ud.bulkInterfaceIndexes],
        };
    }
    /**
     * open the specified device.
     * @param deviceInfoKey unique id specifying which device to open
     * @returns IUsbDeviceInfo for the opened device
     * @throws if device is already open or open fails
     */
    async open(deviceInfoKey) {
        const numUsbDevices = TiUsb.deviceCache.size;
        logger.info(`TiUsb.open called! deviceInfo.key = ${deviceInfoKey}`);
        logger.info(`Num TiDevices devices = ${numUsbDevices}`);
        if (this.openDeviceCache.has(deviceInfoKey)) {
            throw new Error(`Device ${deviceInfoKey} is already open.`);
        }
        if (numUsbDevices > 0) {
            try {
                const ud = TiUsb.deviceCache.get(deviceInfoKey);
                const usbDevice = ud.usbDevice;
                usbDevice.open();
                ud.isOpen = true;
                ud.isDetached = false;
                this.openDeviceCache.set(deviceInfoKey, ud);
                logger.info(`${deviceInfoKey} opened!!!`);
                return ud.info;
            }
            catch (err) {
                let errMsg = err;
                if (err.message) {
                    errMsg = err.message;
                }
                logger.info(`Failed to open device ${deviceInfoKey}! err = ${errMsg}`);
                throw new Error(`Failed to open device ${deviceInfoKey} (err = ${errMsg}).` +
                    ` Please unplug, plug back in and try again.`);
            }
        }
        else {
            const err = `Device ${deviceInfoKey} not found.`;
            logger.info(err);
            throw new Error(err);
        }
    }
    /**
     * close the specified device.
     * @param deviceInfoKey unique id specifying which previously opened device to close
     */
    async close(deviceInfoKey) {
        return this._close(deviceInfoKey, false);
    }
    /**
     * onClose is called automatically when TICloudAgentHostApp is shutting down.  Closes all open devices.
     */
    async onClose() {
        usb.removeListener("attach", this._onAttach);
        usb.removeListener("detach", this._onDetach);
        const promises = [];
        for (const key of this.openDeviceCache.keys()) {
            promises.push(this._close(key, true));
        }
        await util.allSettled(promises);
        this.openDeviceCache.clear();
        TiUsb.deviceCache.clear();
    }
    /**
     * claimInterface: this method must be called before using any endpoints of this interface
     * @param deviceInfoKey string that uniquely identifies which usb device to use
     * @param intfArg interface index specifying which interface to use
     * @param startPolling if true, the inEndpoint of the interface will generate rx_data events
     * @param numBufsToConcat the number of rx packet payloads to send up the websocket as a single buffer
     */
    // tslint:disable-next-line:max-line-length
    async claimInterface(deviceInfoKey, intfArg, startPolling, numBufsToConcat) {
        const interfaceIndex = +intfArg; // handle case where arg is a string
        let intf = null;
        const ud = this.openDeviceCache.get(deviceInfoKey);
        if (!ud) {
            throw new Error(`USB device with key ${deviceInfoKey} not open`);
        }
        else {
            const usbDevice = ud.usbDevice;
            if (usbDevice && usbDevice.interfaces && usbDevice.interfaces.length > interfaceIndex) {
                const claimedIntf = usbDevice.interfaces[interfaceIndex];
                try {
                    claimedIntf.claim();
                    const endpoints = claimedIntf.endpoints;
                    let inEp = null;
                    let outEp = null;
                    // From libusb spec:
                    // uint8_t libusb_endpoint_descriptor::bEndpointAddress
                    // defines the address of the endpoint described by this descriptor.
                    // Bits 0:3 are the endpoint number.
                    // Bits 4:6 are reserved.
                    // Bit 7 indicates direction, see libusb_endpoint_direction.
                    for (const ep of endpoints) {
                        if (ep.descriptor.bEndpointAddress < 0x80) {
                            outEp = ep;
                        }
                        else {
                            inEp = ep;
                        }
                    }
                    const intfDescriptor = claimedIntf.descriptor;
                    const isBulkEndpt = endpoints[0].transferType === usb.LIBUSB_TRANSFER_TYPE_BULK;
                    // From https://docs.microsoft.com/en-us/windows-hardware/drivers/usbcon/usb-bulk-and-interrupt-transfer
                    // Max pkt size depends on bus speed: full speed = 64, high speed = 512, SuperSpeed = 1024
                    // From https://docs.microsoft.com/en-us/windows-hardware/drivers/usbcon/transfer-data-to-isochronous-endpoints
                    // Bits 10..0 = maximum packet size
                    // tslint:disable-next-line:no-bitwise
                    const inMaxPktSize = inEp ? inEp.descriptor.wMaxPacketSize & 0x3FF : 0;
                    // tslint:disable-next-line:no-bitwise
                    const outMaxPktSize = outEp ? outEp.descriptor.wMaxPacketSize & 0x3FF : 0;
                    intf = {
                        index: interfaceIndex,
                        claimedInterface: claimedIntf,
                        interfaceDescriptor: intfDescriptor,
                        inEndpoint: inEp,
                        outEndpoint: outEp,
                        isBulkEndpoint: isBulkEndpt,
                        inMaxPacketSize: inMaxPktSize,
                        outMaxPacketSize: outMaxPktSize,
                        isPollingEnabled: startPolling,
                        parent: ud,
                    };
                    ud.claimedInterfaces.set(interfaceIndex, intf);
                }
                catch (ex) {
                    // if error occurred after the interface was claimed, make sure it is released.
                    try {
                        if (claimedIntf) {
                            claimedIntf.release();
                        }
                    }
                    catch (ex) { }
                    const errMsg = `Exception claiming interface. ex=${ex}`;
                    logger.info(errMsg);
                    throw new Error(errMsg);
                }
            }
        }
        if (intf && startPolling) {
            // defer start Polling call until after constructor returns
            await TiUsb._setImmediate();
            try {
                await this._startPolling(deviceInfoKey, intf, numBufsToConcat);
                logger.info(`polling started...`);
            }
            catch (err) {
                const errMsg = `Could not start polling. Error=${err}`;
                logger.info(errMsg);
                throw new Error(errMsg);
            }
        }
    }
    /**
     * releaseInterface: releases the specified interface and its endpoints so they can be used by someone else.
     * It is an error to release an interface with pending transfers.
     * @param deviceInfoKey string that uniquely identifies which usb device to use
     * @param intfIndexArg interface index specifying which interface to use
     */
    async releaseInterface(deviceInfoKey, intfIndexArg) {
        return this._releaseInterface(deviceInfoKey, intfIndexArg, false);
    }
    /**
     * sendCmd: sends a command string to the specified interface's out endpoint
     * @param deviceInfoKey string that uniquely identifies which usb device to use
     * @param intfIndexArg interface index specifying which interface to use
     * @param cmd command string to send to the out endpoint. For hex data: 0x prefix, csv
     */
    async sendCmd(deviceInfoKey, intfIndexArg, cmd) {
        const interfaceIndex = +intfIndexArg; // handle case where arg is a string
        let hexData = null;
        if (cmd.indexOf("0x") === 0) {
            const hexWords = cmd.split(",");
            hexData = Buffer.from(hexWords.map((value) => (parseInt(value, 16))));
        }
        else {
            hexData = Buffer.from(cmd, "utf-8");
        }
        logger.info(`Sending command: ${cmd}`);
        const ud = this.openDeviceCache.get(deviceInfoKey);
        const intf = ud.claimedInterfaces.get(interfaceIndex);
        const transfer = util.ctxPromisify(intf.outEndpoint, intf.outEndpoint.transfer);
        try {
            await transfer(hexData);
            logger.info(`Cmd = ${cmd} complete\n`);
            return cmd;
        }
        catch (error) {
            const errMsg = `Error in response to Cmd=${cmd}: ${error}`;
            logger.info(errMsg);
            throw new Error(errMsg);
        }
    }
    /**
     * controlTransfer: Perform a synchronous control transfer (libusb_control_transfer)
     * @param deviceInfoKey string that uniquely identifies which usb device to use (must have been opened)
     * @param bmRequestType Bits 0:4 determine recipient, 5:6 determine type, Bit 7 determines data transfer direction
     * @param bRequest if bmRequestType[5:6] = b00, is a "Standard Request" enum value (e.g. LIBUSB_REQUEST_GET_STATUS)
     * @param wValue value (varies according to request)
     * @param wIndex index (Varies according to request, typically used to pass an index or offset)
     * @param dataOrLength Buffer (for an outEndpoint) or numBytesToReceive (for an inEndpoint) as per bmRequestType:b7
     */
    async controlTransfer(deviceInfoKey, bmRequestType, bRequest, wValue, wIndex, dataOrLength) {
        const ud = this.openDeviceCache.get(deviceInfoKey);
        if (!ud) {
            throw new Error(`${deviceInfoKey} must be open before calling controlTransfer`);
        }
        else {
            try {
                const controlTransfer = util.ctxPromisify(ud.usbDevice, ud.usbDevice.controlTransfer);
                // check if it is "IN" or "OUT"
                const bufferOrNum = typeof dataOrLength === "number" ? dataOrLength : new Buffer(dataOrLength);
                const data = await controlTransfer(bmRequestType, bRequest, wValue, wIndex, bufferOrNum);
                return data;
            }
            catch (ex) {
                throw new Error(ex);
            }
        }
    }
    async reset(deviceInfoKey) {
        const ud = this.openDeviceCache.get(deviceInfoKey);
        const reset = util.ctxPromisify(ud.usbDevice, ud.usbDevice.reset);
        await reset();
    }
    /**
     * writeData: writes data to usb device interface out endpoint
     * @param deviceInfoKey string that uniquely identifies which usb device to use
     * @param intfIndexArg interface index specifying which interface to use
     * @param dataBuffer Buffer of data to send to the out endpoint
     */
    async writeData(deviceInfoKey, intfIndexArg, dataBuffer) {
        const interfaceIndex = +intfIndexArg; // handle case where arg is a string
        const ud = this.openDeviceCache.get(deviceInfoKey);
        const intf = ud.claimedInterfaces.get(interfaceIndex);
        const transfer = util.ctxPromisify(intf.outEndpoint, intf.outEndpoint.transfer);
        await transfer(dataBuffer);
    }
    /**
     * readData: reads data from usb device interface in endpoint
     * @param deviceInfoKey string that uniquely identifies which usb device to use
     * @param intfIndexArg interface index specifying which interface to use
     * @param numBytesToRead number of bytes to read from the in endpoint
     */
    async readData(deviceInfoKey, intfIndexArg, numBytesToRead) {
        const interfaceIndex = +intfIndexArg; // handle case where arg is a string
        const ud = this.openDeviceCache.get(deviceInfoKey);
        const intf = ud.claimedInterfaces.get(interfaceIndex);
        const transfer = util.ctxPromisify(intf.inEndpoint, intf.inEndpoint.transfer);
        const data = await transfer(numBytesToRead);
        return data;
    }
    /**
     * uploadTestPackets: used for testing data bandwidth from this module up to app in browser context.
     * Packets contain an incrementing UInt32 count sequence for verification
     * @param numPackets number of packets to send
     * @param pktSizeInBytes number of bytes in each packet
     */
    async uploadTestPackets(numPackets, pktSizeInBytes) {
        let n = 0;
        const numWordsPerPacket = pktSizeInBytes / 4;
        for (let i = 0; i < numPackets; i++) {
            await TiUsb._setImmediate();
            const ab = new ArrayBuffer(pktSizeInBytes);
            const pkt = new Uint32Array(ab);
            for (let j = 0; j < numWordsPerPacket; j++) {
                pkt[j] = n++;
            }
            this._triggerEvent("rx_test_data", Buffer.from(pkt.buffer));
        }
        const numBytes = n * 4;
        return (`${numPackets} packets sent.  Byte Count = ${numBytes}`);
    }
    /**
     * close the specified device.
     * @param deviceInfoKey unique id specifying which previously opened device to close
     * @param doNotDelete should only be set to true when the openDeviceCache will be cleared after this is called
     */
    async _close(deviceInfoKey, doNotDelete) {
        const ud = TiUsb.deviceCache.get(deviceInfoKey);
        if (!ud || !ud.isOpen) {
            throw new Error(`Could not close device with key ${deviceInfoKey} - device is not open`);
        }
        else {
            // build an array of promises
            const promises = [];
            for (const intfIndex of ud.claimedInterfaces.keys()) {
                promises.push(this._releaseInterface(deviceInfoKey, intfIndex, true));
            }
            await Promise.all(promises);
            // give time for pending usb operations to complete
            await TiUsb._delay(100);
            ud.claimedInterfaces.clear();
            ud.isOpen = false;
            try {
                if (!ud.isDetached) {
                    try {
                        ud.usbDevice.close();
                    }
                    catch (ex2) { }
                }
                if (!doNotDelete) {
                    if (this.openDeviceCache.has(deviceInfoKey)) {
                        this.openDeviceCache.delete(deviceInfoKey);
                    }
                }
                return (`Device with key ${deviceInfoKey} closed.`);
            }
            catch (ex1) {
                let errMsg = `Exception when closing device with key=${deviceInfoKey}. error = `;
                if (ex1.message) {
                    errMsg += ex1.message;
                }
                else {
                    errMsg += ex1;
                }
                logger.info(errMsg);
                throw new Error(errMsg);
            }
        }
    }
    /**
     * releaseInterface: releases the specified interface and its endpoints so they can be used by someone else.
     * It is an error to release an interface with pending transfers.
     * @param deviceInfoKey string that uniquely identifies which usb device to use
     * @param intfIndexArg interface index specifying which interface to use
     * @param doNotDelete should only be set to true when the device's claimedInterfaces map will be cleared later
     */
    async _releaseInterface(deviceInfoKey, intfIndexArg, doNotDelete) {
        const interfaceIndex = +intfIndexArg; // handle case where arg is a string
        const ud = this.openDeviceCache.get(deviceInfoKey);
        if (!ud) {
            return;
        }
        const usbDevice = ud.usbDevice;
        if (usbDevice && usbDevice.interfaces && usbDevice.interfaces.length > interfaceIndex) {
            try {
                const claimedIntf = ud.claimedInterfaces.get(+interfaceIndex);
                if (claimedIntf && claimedIntf.isPollingEnabled) {
                    claimedIntf.isPollingEnabled = false;
                    await this._stopPolling(claimedIntf, ud.isDetached);
                }
                if (!ud.isDetached) {
                    const intf = usbDevice.interfaces[interfaceIndex];
                    const release = util.ctxPromisify(intf, intf.release);
                    await release();
                }
                if (!doNotDelete) {
                    ud.claimedInterfaces.delete(+interfaceIndex);
                }
            }
            catch (ex) {
                const errMsg = `Exception when releasing interface. Error=${ex}`;
                logger.info(errMsg);
                throw new Error(errMsg);
            }
        }
    }
    async _startPolling(deviceInfoKey, intf, numBufsToConcatArg) {
        const rxDataEventName = TiUsb.getEventName("rx_data", deviceInfoKey, intf);
        const rxErrorEventName = TiUsb.getEventName("rx_error", deviceInfoKey, intf);
        const bufs = [];
        let numBufsToConcat = 1;
        if (numBufsToConcatArg !== undefined) {
            numBufsToConcat = +numBufsToConcatArg;
        }
        for (let i = 0; i < numBufsToConcat; i++) {
            bufs.push(null);
        }
        let index = 0;
        if (intf.isBulkEndpoint) {
            await TiUsb._delay(1000);
            intf.outEndpoint.on("data", (data) => {
                logger.info("unexpected data from outEndpoint:" + data.toString());
            });
            intf.outEndpoint.on("error", (error) => {
                logger.info("error from outEndpoint:" + error);
            });
            intf.inEndpoint.on("data", (data) => {
                if (data && data.length > 0) {
                    bufs[index++] = data;
                    if (index === numBufsToConcat) {
                        const rxData = numBufsToConcat > 1 ? Buffer.concat(bufs) : data;
                        this._triggerEvent(rxDataEventName, rxData);
                        index = 0;
                    }
                }
            });
            intf.inEndpoint.on("error", (error) => {
                this._triggerEvent(rxErrorEventName, error);
                logger.info(error);
            });
            logger.info("calling startPoll...");
            intf.inEndpoint.startPoll(1, intf.inMaxPacketSize);
        }
        else {
            throw new Error("no bulk interfaces");
        }
    }
    async _stopPolling(intf, isDetached) {
        if (intf.isBulkEndpoint) {
            logger.info("Stopping streaming [IN]...");
            if (intf.inEndpoint) {
                intf.inEndpoint.removeAllListeners("data");
                intf.inEndpoint.removeAllListeners("error");
                intf.outEndpoint.removeAllListeners("data");
                intf.outEndpoint.removeAllListeners("error");
                if (!isDetached) {
                    try {
                        const stopPoll = util.ctxPromisify(intf.inEndpoint, intf.inEndpoint.stopPoll);
                        await stopPoll();
                        await TiUsb._delay(1);
                    }
                    catch (ex) {
                        // ignore exceptions thrown because the device was already removed
                    }
                }
            }
            else {
                const errMsg = "Polling not started (no device endpoint found)";
                logger.info(errMsg);
                throw new Error(errMsg);
            }
        }
        else {
            const errMsg2 = "Not a bulk device";
            logger.info(errMsg2);
            throw new Error(errMsg2);
        }
    }
    _updateInterfaceInfo(ud) {
        if (ud.usbDevice) {
            ud.bulkInterfaceIndexes = [];
            try {
                ud.usbDevice.open();
                ud.canBeOpened = true;
                let ifIndex = 0;
                try {
                    for (const intf of ud.usbDevice.interfaces) {
                        try {
                            ud.interfaceDescriptors.push(JSON.stringify(intf.descriptor));
                        }
                        catch (ex1) {
                            logger.info("Exception while trying to stringify interface: ex1=" + ex1);
                        }
                        if (intf.endpoints) {
                            for (const endpoint of intf.endpoints) {
                                if (endpoint.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK) {
                                    ud.bulkInterfaceIndexes.push(ifIndex);
                                    break;
                                }
                            }
                        }
                        ifIndex++;
                    }
                }
                finally {
                    try {
                        ud.usbDevice.close();
                    }
                    catch (ex3) {
                        // ensure finally does not throw
                    }
                }
            }
            catch (ex) {
                ud.canBeOpened = false;
            }
        }
        return ud;
    }
    _newDevice(device) {
        let ud = {
            bulkInterfaceIndexes: [], interfaceDescriptors: [], claimedInterfaces: new Map(), usbDevice: device,
        };
        try {
            ud = this._updateInterfaceInfo(ud);
        }
        catch (ex) {
            logger.info(`Error updating InterfaceInfo: ex=${ex}`);
            // do not throw exception, as errors with the interfaceInfo function
            // should not prevent the user from using the device
        }
        return ud;
    }
    async _updateDeviceCache(eventName, eventKey) {
        // Delay to give device time to initialize after being plugged in
        TiUsb._delay(100);
        const allUsbDevices = usb.getDeviceList();
        const promises = [];
        try {
            switch (eventName) {
                case "attach":
                    const newUsbDevices = allUsbDevices.filter((x) => (TiUsb.getKey(x) === eventKey));
                    if (newUsbDevices.length > 0) {
                        const dev0 = this._newDevice(newUsbDevices[0]);
                        promises.push(TiUsb._addToCache(dev0));
                    }
                    break;
                case "detach":
                    if (TiUsb.deviceCache.has(eventKey)) {
                        const ud = TiUsb.deviceCache.get(eventKey);
                        if (ud) {
                            ud.isDetached = true; // prevent calling in to the low level APIs as it has already closed the device
                            try {
                                await this.close(eventKey);
                            }
                            catch (ex) {
                                // ignore any errors caused by closing the device.
                                if (ex && ex.message) {
                                    logger.info(`Ignoring errors caused by closing a detached device ${eventKey}. ex=${ex.message}`);
                                }
                            }
                            TiUsb.deviceCache.delete(eventKey);
                        }
                    }
                    break;
                case "init":
                default:
                    for (const dev of allUsbDevices) {
                        promises.push(TiUsb._addToCache(this._newDevice(dev)));
                    }
                    break;
            }
            if (promises.length > 0) {
                await util.allSettled(promises);
            }
        }
        catch (ex) {
            logger.info(`Exception in _updateDeviceCache: ${ex}`);
        }
        return;
    }
}
exports.TiUsb = TiUsb;
TiUsb.deviceCache = new Map();
TiUsb.TI_VID = 0x451; // 1105
TiUsb.TI_HID_VID = 0x2047; // 8263
TiUsb.LUMINARY_VID = 0x1CBE; // 7358;
exports.name = "USB"; // this is the string that the service needs to pass into the agent.getSubModule API
function instance(triggerEvent) {
    return {
        commands: new TiUsb(triggerEvent),
    };
}
exports.instance = instance;
