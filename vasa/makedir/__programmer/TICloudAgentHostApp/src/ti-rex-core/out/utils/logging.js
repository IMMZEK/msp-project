"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Log = exports.Logger = exports.BaseLogger = exports.LoggerManager = void 0;
const stream_1 = require("stream");
const priorities = [
    'emergency',
    'alert',
    'critical',
    'error',
    'warning',
    'notice',
    'info',
    'debug',
    'fine',
    'finer',
    'finest'
];
/**
 * For Managing Loggers
 */
class LoggerManager {
    _dinfraLogger;
    constructor(dinfraLogger) {
        this._dinfraLogger = dinfraLogger;
    }
    /**
     * Creates a Logger object.
     *
     * @param {String} name
     * @param {Object} config
     *  @param {Boolean} config.save - if true, save the logs sent to this logger in the db.
     *
     * @returns {Logger} logger
     */
    createLogger(name, _opts = {}) {
        // TODO - pipe logger to a db entry if save is true
        return new Logger(name, this._dinfraLogger);
    }
}
exports.LoggerManager = LoggerManager;
/**
 *  BaseLogger - can be used as an empty logger if no logging is needed
 *
 */
class BaseLogger extends stream_1.Readable {
    // We have to pre-declare these functions here so that they can be accessed using [] with the
    // type system in a type-safe way
    emergency = (_message, _tags = []) => { };
    alert = (_message, _tags = []) => { };
    critical = (_message, _tags = []) => { };
    error = (_message, _tags = []) => { };
    warning = (_message, _tags = []) => { };
    notice = (_message, _tags = []) => { };
    info = (_message, _tags = []) => { };
    debug = (_message, _tags = []) => { };
    fine = (_message, _tags = []) => { };
    finer = (_message, _tags = []) => { };
    finest = (_message, _tags = []) => { };
}
exports.BaseLogger = BaseLogger;
/**
 * A thin wrapper around the dinfra logger. Supports the same methods as the dinfra logger. Also
 * this is a stream.Readable.
 */
class Logger extends BaseLogger {
    _name;
    _dinfraLogger;
    _isOpen = true;
    /**
     * @param {String} name
     * @param {Object} dinfraLogger
     */
    constructor(name, dinfraLogger) {
        super();
        this._name = name;
        this._dinfraLogger = dinfraLogger;
        this._isOpen = true;
        this.once('close', () => {
            this._isOpen = false;
        });
        // create log functions which map to dlog functions
        priorities.map((priority) => {
            this._createLogFunction(priority);
        });
    }
    /**
     * Get the logger name
     *
     * @returns {Boolean} name
     */
    getName() {
        return this._name;
    }
    /**
     * Closes the Readable, emitting a close event
     */
    close() {
        this.push(null);
        this.emit('close');
    }
    _read() {
        // do nothing, required by Readable
    }
    /**
     * Creates a log function, which mirrors one in the dinfraLogger.
     *
     * @private
     * @param {Integer} priority
     */
    _createLogFunction(name) {
        // needs to be done for each instance
        // (need to attach this._name to dinfraLog message)
        this[name] = (message, tags = []) => {
            if (!this._isOpen) {
                return;
            }
            message = message + '\n';
            this._dinfraLogger[name]({
                name: this._name,
                message,
                tags
            });
            // null is interpreted as EOF, which will close the steam
            if (message) {
                // We might want to send more info - possibly the entire dinfraLog
                // entry - to the readstream (useful for filtering by log level,
                // tags, etc).
                this.push(JSON.stringify({
                    data: message,
                    type: name,
                    tags
                }));
            }
        };
    }
}
exports.Logger = Logger;
/**
 * Standardizes the use of loggers.
 *
 */
class Log {
    userLogger;
    debugLogger;
    /**
     * @param {Logger} userLogger - For user friendly messages
     * @param {Logger} debugLogger - For debugging (not for users)
     */
    constructor({ userLogger, debugLogger }) {
        this.userLogger = userLogger;
        this.debugLogger = debugLogger;
    }
    /**
     * Handle an error (if these is one). Works with promises.
     *
     */
    handleErrorPromise(promiseFn, { userMessage, debugMessage } = {}) {
        return promiseFn().catch((e) => {
            if (userMessage) {
                this.userLogger.error(userMessage);
            }
            if (debugMessage) {
                this.debugLogger.error(debugMessage);
            }
            // could attach long stacktrace, or include the logger.getName()
            this.debugLogger.error(e);
            throw e;
        });
    }
    /**
     * Close the loggers
     */
    closeLoggers() {
        this.userLogger.close();
        this.debugLogger.close();
    }
}
exports.Log = Log;
