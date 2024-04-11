"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOk = exports.isError = void 0;
function isError(err, _result) {
    return !!err;
}
exports.isError = isError;
function isOk(err, _result) {
    return !err;
}
exports.isOk = isOk;
