"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeTrace = exports.nstimeToSec = exports.hrtimeToNanosec = exports.hrtimeToMillisec = exports.hrtimeToSec = void 0;
// TODO: throw error instead of accepting null
function hrtimeToSec(hrtime) {
    return hrtime ? hrtime[0] + hrtime[1] / 1e9 : -1;
}
exports.hrtimeToSec = hrtimeToSec;
function hrtimeToMillisec(hrtime) {
    return hrtime && hrtime[0] * 1e3 + hrtime[1] / 1e6;
}
exports.hrtimeToMillisec = hrtimeToMillisec;
function hrtimeToNanosec(hrtime) {
    return hrtime[0] * 1e9 + hrtime[1];
}
exports.hrtimeToNanosec = hrtimeToNanosec;
function nstimeToSec(nstime) {
    return nstime / 1e9;
}
exports.nstimeToSec = nstimeToSec;
function safeTrace(traceFunc, ...args) {
    if (traceFunc != null) {
        traceFunc(...args);
    }
}
exports.safeTrace = safeTrace;
