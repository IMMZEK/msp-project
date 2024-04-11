"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readBoardId = exports.detectDevice = void 0;
const logger = require("../logger");
const boardIdInfo = require("./board_ids.json");
const numPendingRequests = new Map();
async function detectDevice(device, _options) {
    const boardId = await readBoardId(device.usbDevice);
    return decodeBoardId(boardId);
}
exports.detectDevice = detectDevice;
async function readBoardId(device) {
    let error;
    for (let i = 0; i < 20; ++i) {
        try {
            return getStringDescriptor(device);
        }
        catch (err) {
            error = err.message ? err.message : err;
            logger.info("Got exception reading board id: " + error);
        }
        // Most likely windows is still setting up the device drivers.  Wait one second and try again
        logger.info("Waiting 1 second before retrying");
        await delay(1000);
    }
    throw new Error(`Unable to open USB device - ensure drivers are installed (${error})`);
}
exports.readBoardId = readBoardId;
function getStringDescriptor(device) {
    const previouslyPending = numPendingRequests.get(device) || 0;
    if (previouslyPending === 0) {
        device.open();
    }
    numPendingRequests.set(device, previouslyPending + 1);
    return new Promise((resolve, reject) => {
        device.getStringDescriptor(3, (err, buf) => {
            const stillPending = numPendingRequests.get(device) - 1;
            if (stillPending === 0) {
                device.close();
                numPendingRequests.delete(device);
            }
            else {
                numPendingRequests.set(device, stillPending);
            }
            if (err) {
                reject(err);
            }
            else {
                resolve(buf.toString());
            }
        });
    });
}
function decodeBoardId(boardId) {
    const key = boardId.slice(0, 4);
    if (key in boardIdInfo) {
        return boardIdInfo[key];
    }
    else {
        return {
            name: undefined,
        };
    }
}
function delay(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, milliseconds);
    });
}
