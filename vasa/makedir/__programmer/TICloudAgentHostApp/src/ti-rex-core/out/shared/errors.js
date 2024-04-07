"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorWithLog = exports.CloudAgentError = exports.GracefulError = exports.SessionIdError = exports.NetworkError = void 0;
const ts_error_1 = require("ts-error");
class NetworkError extends ts_error_1.ExtendableError {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.NetworkError = NetworkError;
class SessionIdError extends ts_error_1.ExtendableError {
}
exports.SessionIdError = SessionIdError;
class GracefulError extends ts_error_1.ExtendableError {
}
exports.GracefulError = GracefulError;
class CloudAgentError extends ts_error_1.ExtendableError {
}
exports.CloudAgentError = CloudAgentError;
class ErrorWithLog extends ts_error_1.ExtendableError {
    logFile;
    constructor(message, statusCode) {
        super(message);
        this.logFile = statusCode;
    }
}
exports.ErrorWithLog = ErrorWithLog;
