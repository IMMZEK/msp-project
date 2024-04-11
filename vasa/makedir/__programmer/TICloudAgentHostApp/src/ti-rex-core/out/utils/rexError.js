"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyError = exports.RefreshError = exports.RexError = void 0;
/**
 * RexError
 *
 */
class RexError extends Error {
    level;
    causeError;
    httpCode;
    constructor(arg) {
        if (typeof arg === 'string') {
            arg = {
                message: arg
            };
        }
        // concatenate messages
        let message = arg.message;
        if (arg.causeError) {
            message += ': ' + arg.causeError.message;
        }
        super(message);
        if (arg.level) {
            this.level = arg.level;
        }
        if (arg.httpCode) {
            this.httpCode = arg.httpCode;
        }
        if (arg.causeError) {
            this.causeError = arg.causeError;
            // If the cause already set an error code, don't override it
            if (this.causeError instanceof RexError && this.causeError.httpCode) {
                this.httpCode = this.causeError.httpCode;
            }
        }
        if (arg.name) {
            this.name = arg.name;
        }
    }
}
exports.RexError = RexError;
class RefreshError extends RexError {
    refreshMessageLevel;
    message;
    constructor(arg) {
        const message = arg.message;
        const causeError = arg.causeError;
        super({ message, causeError });
        if (arg.refreshMessageLevel) {
            this.refreshMessageLevel = arg.refreshMessageLevel;
        }
    }
}
exports.RefreshError = RefreshError;
function stringifyError(error) {
    return JSON.stringify(error, Object.getOwnPropertyNames(error), 1);
}
exports.stringifyError = stringifyError;
