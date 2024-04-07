"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._getRex = exports.Rex = void 0;
// our modules
const logging = require("../utils/logging");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
let rex = null;
function Rex(args) {
    const { dinfraLogger, vars } = args;
    const loggerManager = new logging.LoggerManager(dinfraLogger);
    const log = new logging.Log({
        userLogger: loggerManager.createLogger('rexUser'),
        debugLogger: loggerManager.createLogger('rexDebug')
    });
    rex = {
        log,
        loggerManager,
        vars
    };
    return rex;
}
exports.Rex = Rex;
// For test purposes only
function _getRex() {
    if (!rex) {
        throw new Error('Rex not defined');
    }
    return rex;
}
exports._getRex = _getRex;
