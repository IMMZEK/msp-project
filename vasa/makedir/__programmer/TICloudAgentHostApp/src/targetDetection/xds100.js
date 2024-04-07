"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDebugProbe = void 0;
const Q = require("q");
function detectDebugProbe(_attachedProbes, id) {
    // Assume it's xds100v2
    return Q({ connectionXml: "TIXDS100v2_Connection", id });
}
exports.detectDebugProbe = detectDebugProbe;
