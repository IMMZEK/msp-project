"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultLogger = exports.createLogger = exports.logger = void 0;
const util_1 = require("../shared/util");
const logging_types_1 = require("./logging-types");
/**
 * Create a logger
 */
function createLogger(dinfra, name) {
    return dinfra.logger(name);
}
exports.createLogger = createLogger;
/**
 * Set the global default logger with name 'tirex'
 *
 * To use simply do
 *   import { logger } from '../utils/logger';
 *   logger.info('a log message');
 *
 */
function createDefaultLogger(dinfra) {
    exports.logger = createLogger(dinfra, 'tirex4');
    return exports.logger;
}
exports.createDefaultLogger = createDefaultLogger;
// Make the logger throw until it's properly initialized
exports.logger = {
    ...(0, util_1.mapValues)(logging_types_1.loggerLevelsDef, () => (..._toLog) => {
        throw new Error('logger not initialized');
    }),
    setPriority(_priority) {
        throw new Error('logger not initialized');
    }
};
