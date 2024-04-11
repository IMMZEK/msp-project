"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promisifyAny = void 0;
/**
 * Wrapper of node's promisify that accepts any type for err instead of Error
 */
const util_1 = require("util");
function promisifyAny(fn) {
    return (0, util_1.promisify)(fn);
}
exports.promisifyAny = promisifyAny;
