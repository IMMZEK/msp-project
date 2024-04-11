/// <reference types="node" />
import { Logger as DinfraLogger } from 'dinfra';
import { Readable } from 'stream';
/**
 * For Managing Loggers
 */
export declare class LoggerManager {
    private _dinfraLogger;
    constructor(dinfraLogger: DinfraLogger);
    /**
     * Creates a Logger object.
     *
     * @param {String} name
     * @param {Object} config
     *  @param {Boolean} config.save - if true, save the logs sent to this logger in the db.
     *
     * @returns {Logger} logger
     */
    createLogger(name: string, _opts?: {
        save?: boolean;
    }): Logger;
}
/**
 *  BaseLogger - can be used as an empty logger if no logging is needed
 *
 */
export declare class BaseLogger extends Readable {
    emergency: (_message: string, _tags?: string[]) => void;
    alert: (_message: string, _tags?: string[]) => void;
    critical: (_message: string, _tags?: string[]) => void;
    error: (_message: string, _tags?: string[]) => void;
    warning: (_message: string, _tags?: string[]) => void;
    notice: (_message: string, _tags?: string[]) => void;
    info: (_message: string, _tags?: string[]) => void;
    debug: (_message: string, _tags?: string[]) => void;
    fine: (_message: string, _tags?: string[]) => void;
    finer: (_message: string, _tags?: string[]) => void;
    finest: (_message: string, _tags?: string[]) => void;
}
/**
 * A thin wrapper around the dinfra logger. Supports the same methods as the dinfra logger. Also
 * this is a stream.Readable.
 */
export declare class Logger extends BaseLogger {
    private _name;
    private _dinfraLogger;
    private _isOpen;
    /**
     * @param {String} name
     * @param {Object} dinfraLogger
     */
    constructor(name: string, dinfraLogger: DinfraLogger);
    /**
     * Get the logger name
     *
     * @returns {Boolean} name
     */
    getName(): string;
    /**
     * Closes the Readable, emitting a close event
     */
    close(): void;
    _read(): void;
    /**
     * Creates a log function, which mirrors one in the dinfraLogger.
     *
     * @private
     * @param {Integer} priority
     */
    private _createLogFunction;
}
/**
 * Standardizes the use of loggers.
 *
 */
export declare class Log {
    userLogger: Logger;
    debugLogger: Logger;
    /**
     * @param {Logger} userLogger - For user friendly messages
     * @param {Logger} debugLogger - For debugging (not for users)
     */
    constructor({ userLogger, debugLogger }: {
        userLogger: Logger;
        debugLogger: Logger;
    });
    /**
     * Handle an error (if these is one). Works with promises.
     *
     */
    handleErrorPromise<T>(promiseFn: () => Promise<T>, { userMessage, debugMessage }?: {
        userMessage?: string;
        debugMessage?: string;
    }): Promise<T>;
    /**
     * Close the loggers
     */
    closeLoggers(): void;
}
