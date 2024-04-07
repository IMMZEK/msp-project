"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDebugProbe = void 0;
const board_id = require("./board_id");
function detectDebugProbe(attachedProbes, id) {
    const device = attachedProbes[id];
    // We know we're an xds110
    // Read the board id, and then fill in that value for the serial number
    class ProbeInfo {
    }
    let boardIdCache = "";
    return board_id.readBoardId(device.usbDevice)
        .then((boardId) => {
        boardIdCache = boardId;
        return require("./serial_id").findComPorts(boardId);
    })
        .then((com) => {
        return {
            serialNumber: boardIdCache,
            comPorts: com,
        };
    })
        .then((probeInfo) => {
        return {
            connectionXml: "TIXDS110_Connection",
            id,
            serialNumber: probeInfo.serialNumber,
            comPorts: probeInfo.comPorts,
            overrides: {
                "Debug Probe Selection": "1",
                "-- Enter the serial number": probeInfo.serialNumber,
            },
        };
    });
}
exports.detectDebugProbe = detectDebugProbe;
