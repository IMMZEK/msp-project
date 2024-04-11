"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callbackifyAny = void 0;
/**
 * Wrapper of node's callbackify that accepts any type for RexError instead of Error
 */
const util_1 = require("util");
function callbackifyAny(fn) {
    return (0, util_1.callbackify)(fn);
}
exports.callbackifyAny = callbackifyAny;
