"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbLogger = void 0;
const fs = require("fs-extra");
const path = require("path");
const stream_1 = require("stream");
function isTimedLogData(data) {
    return data.start !== undefined;
}
const dbLogPriorities = [
    'emergency',
    'alert',
    'critical',
    'error',
    'warning',
    'notice',
    'info'
];
class DbLogger {
    category;
    logConfigPath;
    dinfraLogger;
    readableLogger;
    fileLogPriorities;
    static inst;
    static async instance(dinfraLibPath, category, logConfigPath = '/etc/rex/rexdblog.json') {
        if (!DbLogger.inst) {
            let logConfig = {
                priorities: dbLogPriorities
            };
            const configFileExists = await fs.pathExists(logConfigPath);
            if (configFileExists) {
                try {
                    logConfig = {
                        ...logConfig,
                        ...(await fs.readJson(logConfigPath))
                    };
                }
                catch (e) {
                    console.warn('Error reading database logger configuration file: ' + logConfigPath);
                }
            }
            // TODO: Log warnings to infra logger
            let readableLogger;
            if (logConfig.dir) {
                if (!(await fs.pathExists(logConfig.dir))) {
                    console.warn("Log directory doesn't exist: " + logConfig.dir);
                }
                else {
                    const logPath = path.join(logConfig.dir, 'rexdb.log');
                    try {
                        const fd = await fs.open(logPath, 'a', 0o660);
                        // Pipe logs to log file
                        // TODO?: May take another approach later, such as opening and writing
                        // to file for short periods so that it can be easily rotated by
                        // logrotate without lock issues.
                        const logStream = fs.createWriteStream('', { fd });
                        logStream.on('error', (e) => {
                            console.error(e);
                        });
                        readableLogger = new ReadableLogger(category);
                        readableLogger
                            .on('error', (e) => {
                            console.error(e);
                        })
                            .pipe(logStream);
                    }
                    catch (e) {
                        console.error('Error Cannot open log file for write: ' + logPath);
                    }
                }
            }
            const dinfra = require(dinfraLibPath + '/dinfra');
            // Going with actual name of service ('tirex') for now (probably what all loggers
            // should do?). An alternative is to use the name assigned by the landscape in
            // dconfig.origin.serviceName.
            const dinfraLogger = dinfra.logger('tirex');
            DbLogger.inst = new DbLogger(category, logConfigPath, dinfraLogger, readableLogger, logConfig.priorities);
            if (configFileExists) {
                // Using fs.watchFile() instead of fs.watch() because fs.watch() only works for the
                // first file change by vi (and like other editors) because it applies edits by
                // moving a tmp file over the actual one.
                fs.watchFile(logConfigPath, { interval: 20000 }, () => {
                    DbLogger.inst.reloadConfig().catch((err) => {
                        // Swallow error from reload
                        console.error('Error on log config reload: ' + err);
                    });
                });
            }
        }
        return DbLogger.inst;
    }
    constructor(category, logConfigPath, dinfraLogger, readableLogger, fileLogPriorities = []) {
        this.category = category;
        this.logConfigPath = logConfigPath;
        this.dinfraLogger = dinfraLogger;
        this.readableLogger = readableLogger;
        this.fileLogPriorities = fileLogPriorities;
    }
    // TODO?: Generate these instead?
    emergency(message, data) {
        this.log('emergency', message, data);
    }
    alert(message, data) {
        this.log('alert', message, data);
    }
    critical(message, data) {
        this.log('critical', message, data);
    }
    error(message, data) {
        this.log('error', message, data);
    }
    warning(message, data) {
        this.log('warning', message, data);
    }
    notice(message, data) {
        this.log('notice', message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    debug(message, data) {
        this.log('debug', message, data);
    }
    fine(message, data) {
        this.log('fine', message, data);
    }
    finer(message, data) {
        this.log('finer', message, data);
    }
    finest(message, data) {
        this.log('finest', message, data);
    }
    // TODO!: log() should be fast fire and forget for priority levels below info. That is,
    // if the priority level is finest through debug, the call should be synchronous with
    // the actual logging performed later asynchronously without a callback to caller.
    // If however the priority is info or higher, logging should be performed before
    // returning.
    /**
     * Log the given message or/and data at the given priority.
     *
     * @param {Integer} priority
     */
    log(priority, message, data) {
        let timestamp;
        // Calculate and add duration (if not in data) based on start (if in data) and current time
        let dataToLog;
        if (data) {
            if (isTimedLogData(data) && data.duration === undefined) {
                const copyWithDuration = {
                    ...data,
                    duration: Date.now() - data.start
                };
                dataToLog = copyWithDuration;
            }
            else {
                dataToLog = data;
            }
        }
        // TODO: Priority comparison should be against its numeric level instead
        if (dbLogPriorities.includes(priority)) {
            const msg = this.dinfraLogger[priority]({
                message,
                category: this.category,
                dataToLog
            });
            timestamp = msg.stamp;
        }
        else {
            timestamp = Date.now();
        }
        if (this.readableLogger) {
            // TODO: Priority comparison should be against its numeric level instead
            if (this.fileLogPriorities.includes(priority)) {
                this.readableLogger.log(timestamp, priority, message, dataToLog);
            }
        }
    }
    /**
     * Reload configuration file.
     *
     * NOTE: Currently reloads only priorities
     */
    async reloadConfig() {
        console.log(`Reloading config file: ${this.logConfigPath}`);
        const logConfig = {
            priorities: dbLogPriorities,
            ...(await fs.readJson(this.logConfigPath))
        };
        if (logConfig.priorities) {
            this.fileLogPriorities = logConfig.priorities;
        }
    }
}
exports.DbLogger = DbLogger;
/**
 * A logger that implements stream.Readable and somewhat mirrors dinfra logger.
 */
class ReadableLogger extends stream_1.Readable {
    category;
    isOpen = true;
    /**
     * @param {String} type
     * @param {Object} dinfraLogger
     */
    constructor(category) {
        super();
        this.category = category;
        this.isOpen = true;
        this.once('close', () => {
            this.isOpen = false;
        });
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
    log(timestamp, priority, message, data) {
        if (!this.isOpen) {
            return;
        }
        this.push(
        // TODO: Convert this to a more concise, (human and machine) readable format
        JSON.stringify({
            timestamp,
            priority,
            category: this.category,
            message,
            data
        }) + '\n');
    }
}
