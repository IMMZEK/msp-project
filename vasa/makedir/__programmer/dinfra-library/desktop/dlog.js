// Copyright (C) 2015-2021 Texas Instruments Incorporated - http://www.ti.com/
const util = require('util');
const djson = require('./djson');
const denum = require('./denum');
const fs = require('fs');
const path = require('path');

// simple tuning parameters:
const delay = 200; // ms: delay between message and log flush
const afterFailureDelay = 800; // ms
const afterDeadlockDelay = 300; // ms
const maxBatchSize = 512;

// these are priorities corresponding to syslog.h, upt to DEBUG ...
// the other terms come from java.util.logging.
exports.PRIORITY = new denum.Enumeration().
    withDeclare("EMERGENCY", "Application is unusable.", ["EMERG"]).
    withDeclare("ALERT", "Application is crashing or cannot recover.", ["FATAL"]).
    withDeclare("CRITICAL", "Application must exit to recover.", ["CRIT", "EXCEPTION"]).
    withDeclare("ERROR", "Request or transaction failed unrecoverably, application continues running.", ["ERR"]).
    withDeclare("WARNING", "For a recoverable failure, or other service-altering condition.", ["WARN"]).
    withDeclare("NOTICE", "For configuration notices and internal limits.", []).
    withDeclare("INFO", "For general log messages.", ["INFORMATION", "LOG"]).
    withDeclare("DEBUG", "For debugging messages.", []).
    withDeclare("FINE", "For trace messages.", ["TRACE", "TRACEFINE"]).
    withDeclare("FINER", "For finer trace messages.", ["TRACEFINER"]).
    withDeclare("FINEST", "For finest trace messages.", ["TRACEFINEST"]);

// these are from syslog.h, but divided by 8 - remember to << 3 to syslog
exports.FACILITY = denum.cardinals(
    "KERN",
    "USER",
    "MAIL",
    "DAEMON",
    "AUTH",
    "SYSLOG",
    "LPR",
    "NEWS",
    "UUCP",
    "CRON",
    "AUTHPRIV",
    "FTP",
    "LOCAL0",
    "LOCAL1",
    "LOCAL2",
    "LOCAL3",
    "LOCAL4",
    "LOCAL5",
    "LOCAL6",
    "LOCAL7");

var defaultBackend = null;

/**
 * Return the default logger backend that all logging is directed to by
 * default.
 * 
 * Backend is created if not yet created.
 */
var getDefaultBackend = function() {
    if (!defaultBackend) {
        defaultBackend = new LoggerBackend();
    }
    return defaultBackend;
}
exports.getDefaultBackend = getDefaultBackend;

/**
 * A LoggerBackend is a destination to which a logger send logs.
 * 
 * Multiple backends are supported, with all loggers sending logs to the
 * DefaultBackend if not configured to send logs to a specific backend.
 */

function LoggerBackend() {

    this.stringifier = new djson.Stringify(null, 4);
    
    this.spool = []; // messages are added here
    this.flushers = []; // callbacks to call when flushed
    this.drain = undefined; // null to indicate no spool, else spool is pending
    this.writableGroup = null;
    this.readableGroup = null;
    this.origin = null;
    this.tablePrefix = null;
    this.messageTable = null;
    this.lastEventTable = null;
    this.jsonTablePrefix = null;
    this.alwaysToConsole = false; // always log messages to console (even if db)
    
    this.captureFrameInfo = false; // show frame information in messages
    this.deliveryPauser = null; // entry point for tx isolation testing

    /**
     * The very last log that was flushed successfully (ie. confirmed committed
     * to storage).
     * @private
     */
    this.lastFlushedLog = null;
}

exports.LoggerBackend = LoggerBackend;

LoggerBackend.prototype.configure = function (
        log, config, anOrigin, aTablePrefix, aWritableGroup, aReadableGroup,
        loggerLockName, callback) {

    this.origin = anOrigin;

    if (config) {
        if (config.console) {
            this.alwaysToConsole = true;
        }

        if (config.indent != null) {
            this.stringifier.shift = config.indent;
        }

        if (config["indent-error"] != null) {
            this.stringifier.shiftError = config["indent-error"];
        }

        if (config.style == "loose") {
            this.stringifier.looseFrames = true;
            this.stringifier.looseTop = true;
            this.stringifier.looseNames = true;
        }
    }

    if (config && config["base-path"] != null) {
        this.drain = new FileDrain(this, config);
    }
    else if (config && config["file-path"] != null) {
        this.drain = new SingleDrain(this, config);
    }
    else if (aTablePrefix) {
        this.tablePrefix = aTablePrefix;

        this.messageTable = this.tablePrefix + "messages";
        this.lastEventTable = this.tablePrefix + "lastevent";
        this.jsonTablePrefix = this.tablePrefix + "json";
        this.writableGroup = aWritableGroup;
        this.readableGroup = aReadableGroup;
        this.loggerLockName = loggerLockName;

        if (!this.writableGroup) {
            this.drain = null; // explicit null means no spool
            this.spool.splice(0, this.spool.length); // clear spool
        }
        else {
            this.log = log;
            return (this._openConnection(callback));
        }
    }
    else {
        this.drain = null; // explicit null means no spool
        this.spool.splice(0, this.spool.length); // clear spool
    }

    this.flush(0, function () {
        callback(null);
    });
}

LoggerBackend.prototype._close = function () {
    if (this.conn) {
        this.conn.close(function (error) {
                this.conn = null; // clear it regardless

                if (error) {
                    this.errors.push(error);
                }

                this._close();
            }.bind(this));
    }
    else if (this.errors.length > 0) {
        this.callback(this.errors);
    }
    else {
        this.drain = new DBDrain(this);

        this.flush(0, this.callback);
    }
}

LoggerBackend.prototype._openConnection = function (callback) {

    this.callback = callback;

    this.conn = null;
    this.errors = [];

    this.writableGroup.openConnection(function (error, aConn) {
            if (error) {
                this.errors.push(error);
                this._close();
            }
            else {
                this.conn = aConn;
                this._maintainJSON();
            }
        }.bind(this));
}

LoggerBackend.prototype._maintainJSON = function () {
    this.writableGroup.maintainSchema(this.conn,
        this.jsonTablePrefix,
        this.writableGroup.getJSONSchema(),
        true, // upgrade
        function (error, warnings) {
            for (var i = 0; i < warnings.length; i++) {
                this.log.warning(warnings[i]);
            }

            if (error) {
                this.errors.push(error);
                this._close();
            }
            else {
                this._maintainLogging();
            }
        }.bind(this));
}

LoggerBackend.prototype._maintainLogging = function () {
    var schema = require('./dlog_schema.json');
    this.writableGroup.maintainSchema(this.conn, this.tablePrefix, schema, true,
        function (error, warnings) {
            for (var i = 0; i < warnings.length; i++) {
                this.log.vwarning(warnings[i]);
            }

            if (error) {
                this.errors.push(error);
                this._close();
            }
            else {
                this._close();
            }
        }.bind(this));
}

LoggerBackend.prototype.notifyFlushers = function () {
    this.flushers.splice(0).forEach(function (flusher) {
            setImmediate(flusher);
        });
}

LoggerBackend.prototype.flush = function (delay, callback) {

    if (callback) {
        this.flushers.push(callback);
    }

    if (this.spool.length == 0) {
        this.notifyFlushers(); // tell the flushers what's up
    }
    else if (this.drain == null) {
        // no db or file setup yet, stay unflushed
    }
    else {
        this.drain.startWithin(delay); // may advance
    }
}

/**
 * This injects a callback into the DB log flush sequence
 * just before a commit for an otherwise successful flush transaction.
 * The value returned by this function is a callback which may be called
 * at any time to release the log flush to continue to commit.  This is
 * is used in transaction isolation testing.  That function itself 
 * returns true if the callback was used to block the flush.  Alternatively
 * a callback can be provided to intercept the delivery, it will in turn
 * be called with a callback that should be invoked to continue delivery.
 */
function pauseDuringDelivery(optCallback) {
    var savedCallback = null;

    if (defaultBackend.deliveryPauser != null) {
        throw new denum.StateError("deliveryPauser already set");
    }

    var result = function (error) {
            if (defaultBackend.deliveryPauser !== inject) {
                throw new denum.StateError("already called");
            }

            defaultBackend.deliveryPauser = null;

            if (savedCallback != null) {
                savedCallback(error);
            }

            return (savedCallback != null);
        };

    // pauses before tx commit
    var inject = function (callback) {
            console.log("log flush delivery pausing");

            savedCallback = callback;

            if (optCallback != null) {
                return (optCallback(result)); 
            }
        };

    defaultBackend.deliveryPauser = inject;

    console.log("log flush delivery pauser installed");

    return (result);
}

function filterFrame(stack, name, loc) {
    var store;

    if (stack.list.length == 0) {
        store = true;
    }
    else if (stack.list.length == 2) {
        store = false;
    }
    else if (loc == "anonymous function") {
        store = false;
    }
    else {
        const ref = stack.list[0].loc;
        const l = Math.min(ref.length, loc.length);
        var i = 0;
        var c0;
        var c1;
        var seen = false;

        while ((i < l) && // either the characters are the same ...
                (((c0 = ref.charCodeAt(i)) === (c1 = loc.charCodeAt(i))) ||
                (seen && // or they are digits and we've seen a :
                (c0 >= 48) && (c0 < 58) && // range of digits
                (c1 >= 48) && (c1 < 58)))) { // range of digits
            if (c0 === 58) { // colon
                seen = true;
            }
            else if (c0 !== c1) {
                // must be a digit, so seen must remain true
            }
            else if ((c0 >= 48) && (c0 < 58)) {
                // is a digit - seen won't change
            }
            else {
                seen = false; // reset seen
            }

            i++;
        }

        if (i == l) {
            store = false;
        }
        else {
            store = !seen; // if we've seen a colon
        }
    }

    return (store);
}

function captureFrame() {
    // This is a hack - it executes slowly, so don't use in production.
    return (new djson.Stack(new Error("X").stack, filterFrame).list[1]);
}

/**
 * A Logger logs messages for a given service and facility and
 * is set to discard messages below a given priority.  The output
 * of a logger usually goes to the console, until another place
 * is nominated by the dinfra configuration.  That will usually
 * be either the landscape database, or a file.  Logging is
 * better than writing to console or stdout/stderr under node
 * since it is asynchronous and frees up CPU time for other
 * activities.  The underlying mechanism is robust and spools
 * all messages (including those from before startup) to the
 * configured backend.  Use var logger = dinfra.logger(name) to create
 * a logger, and logger.info(arg1, arg2, ...) to log a message.
 * The arguments provided to these logger functions are
 * stored in the args variable of a log message.  See
 * {@link Message} for details of other log mesage fields. 
 * @class Logger
 */
function Logger(service, facility, priority, backend) {
    this.service = service;
    this.facility = facility;
    this.priority = priority;
    this.backend = backend ? backend : getDefaultBackend();
}

/**
 * @method Logger#info
 * @param optArg1
 * @param ...optArgN
 */
/**
 * Set the priority on this logger.  Use: dinfra.dlog.PRIORITY.<word>
 * to select a priority.
 */
Logger.prototype.setPriority = function(priority) {
    this.priority = priority;
}
/**
 * All logs are ultimately delivered with vmessage.
 * @private
 */
Logger.prototype.vmessage = function(priority, args) {
    var message;

    if (priority <= this.priority) {
        message = new Message(Date.now(), priority, this.facility,
            this.backend.origin, this.service, this.backend, args).queue();
    }
    else {
        message = null;
    }

    return (message);
}

/**
 * This sets up two functions for the given priority.  For example,
 * if the priority is INFO, then it will set up functions:
 * info(arg...) which calls vmessage(INFO,[args...]) and
 * vinfo(args) which calls vmessage(INFO,args).
 * @private
 */
Logger.prototype.defineFunctions = function(priority) {
    var varName = exports.PRIORITY.nameOf(priority);
    var name = varName.toLowerCase();

    Logger.prototype[name] = function () {
            var args = [];

            while (args.length < arguments.length) {
                args.push(arguments[args.length]);
            }

            return (this.vmessage(priority, args));
        };

    exports.PRIORITY.details[priority].aliases.forEach(function (alias) {
            Logger.prototype[alias.toLowerCase()] = Logger.prototype[name];
        });

    Logger.prototype["v" + name] = function () {
            var args;

            if ((arguments.length != 1) ||
                    !((args = arguments[0]) instanceof Array)) {
                throw new Error("v" + name + " requires exactly 1 array arg");
            }

            return (this.vmessage(priority, args));
        };
}

/*
    Sets up Logger.prototype.info, warning etc. 
    as well as vinfo, vwarning etc.
*/
for (var priority = 0; priority < exports.PRIORITY.list.length; priority++) {
    Logger.prototype.defineFunctions(priority);
}

util.inherits(SafeLogger, Logger);

/**
 * Create "Safe" Logger, that uses pass-by-value instead of pass-by-reference
 * with log arguments.
 */
function SafeLogger(service, facility, priority, backend) {
    Logger.call(this, service, facility, priority, backend);
}

/**
 * Override Logger.vmessage() (which ultimately delivers all logs) in order to
 * copy args so that they are passed by value and not reference.
 * @private
 */
SafeLogger.prototype.vmessage = function(priority, args) {
    return (Logger.prototype.vmessage.call(
            this, priority, djson.simpleTreeCopy(args)
        ));
}

/**
 * A Message as used internally by the {@link Logger}.  In some cases,
 * this can be used by other modules (for example, to discover the
 * unique log message id, once the message has been flushed).
 * @class Message
 * @protected
 */
function Message(stamp, priority, facility, origin, service, backend, args) {
    /**
     * @member {number} Message#stamp - timestamp milliseconds since 1970.
     */
    this.stamp = stamp;
    /**
     * @member {number} Message#priority - dinfra.dlog.PRIORITY level
     */
    this.priority = priority;
    /**
     * @member {number} Message#facility - dinfra.dlog.FACILITY index
     */
    this.facility = facility;
    /**
     * @member {string} Message#origin - <landscape>/<cluster>/<host> string
     */
    this.origin = origin;
    /**
     * @member {string} Message#service - name provided to dinfra.logger(name)
     */
    this.service = service;
    /**
     * @member {LoggerBackend} Message#backend - backend to which message is to
     * be sent (internal to dlog, unused by other modules)
     */
    this.backend = backend;
    /**
     * @member {Backend} Message#args - array of JSON argument objects
     */
    this.args = args;
    /**
     * @member {number} Message#id - id allocated for message by backend
     * @protected
     */
    this.id = undefined;
}

/**
 * Queue this message to any of the places that it is supposed to go.
 */
Message.prototype.queue = function () {
    if (this.id !== undefined) {
        throw new Error("cannot requeue a message");
    }

    if (this.backend.drain !== null) {
        // unless the drain has been explicitly initialized to null,
        // the message always goes to the spool
        this.backend.spool.push(this);
    }

    if ((this.backend.drain == null) || this.backend.alwaysToConsole) {
        if (this.backend.captureFrameInfo) {
            try {
                this.frame = captureFrame();
            }
            catch (e) {
                console.log("logger implementation failure", e);
            }
        }

        this.applyTo(console, console.log);
    }

    if (this.backend.drain == null) {
        // do nothing here
    }
    else {
        this.backend.drain.startWithin(delay); // may advance
    }

    return (this);
}

/**
 * Returns true if this message is so similar to another message that
 * it deserves some sort of compression handling.  This ignores differences
 * in timestamp and origin, but accounts for differences in
 * priority, facility, service and args.
 */
Message.prototype.similar = function (message) {
    var similar;

    if (this.priority !== message.priority) {
        similar = false;
    }
    else if (this.facility !== message.facility) {
        similar = false;
    }
    else if (this.service !== message.service) {
        similar = false;
    }
    else {
        // ignore differences in timestamp or origin
        similar = djson.simpleTreeCompare(this.args, message.args);
    }

    return (similar);
}

/*
    Used for writing to console reporting from remote systems.
*/
Message.prototype.applyFullTo = function(owner, fn) {
    var array = [new Date(this.stamp).toISOString(), 
        exports.PRIORITY.nameOf(this.priority),
        exports.FACILITY.nameOf(this.facility),
        this.origin,
        this.service,
        this.id == null ? "-" : this.id,
        this.backend.stringifier.resultOfValue(null, this.args)];

    if (this.dups) {
        array.push(this.dups + " duplicates from " +
            new Date(this.start).toISOString());
    }

    fn.apply(owner, array);
}

/*
    Used for writing to console reporting from local system,
    including when origin is not yet defined.
*/
Message.prototype.applyTo = function(owner, fn) {
    var array = [
        new Date(this.stamp).toISOString(), 
        exports.PRIORITY.nameOf(this.priority),
        exports.FACILITY.nameOf(this.facility),
        // do not display origin, its not valid until configure()
        this.service,
        (this.id != null ? this.id : // ids are only set on db stored things
        (this.frame == null ? "-" : // caller frames are never stored in db
        (this.frame.loc + ":" + this.frame.name + "()"))),
        this.backend.stringifier.resultOfValue(null, this.args) ];

    if (this.dups) {
        array.push(this.dups + " duplicates from " +
            new Date(this.start).toISOString());
    }

    fn.apply(owner, array);
}

function Drain(backend) {

    this.backend = backend;

    this.waiting = null;
    this.wakeup = 0;
    this.delay = 0;
    this.errors = [];
    this.span = 0;
    this.queued = false;
    this.failing = false;
    this.cancels = 0;
    this.invocations = 0; // used for debugging, counts invocations
}

Drain.prototype.startWithin = function (delay) {
    if (this.queued && this.delay <= delay) {
        // don't bother to check - just causes contention
    }
    else {
        var now = Date.now();
        var wake = now + delay;

        if (this.queued && this.wakeup < wake) {
            // don't bother to requeue
        }
        else if (this.queued && this.waiting == null) {
            // don't interrupt DB activity
        }
        else {
            if (this.waiting != null) {
                clearTimeout(this.waiting);
                this.waiting = null;
                this.cancels++;
            }

            var hook = function () {
                    this.cancels = 0;
                    this.waiting = null;
                    this.beginAppend();
                }.bind(this);

            this.queued = true;
            this.wakeup = wake;
            this.delay = delay; // reporting delay, not actual delay

            if (delay <= 0) {
                delay = 1; // at least some delay
            }

            this.waiting = setTimeout(hook, delay);
        }
    }
}

Drain.prototype.resetAppend = function (deadlock) {
    this.errors = [];
    this.span = 0;
    this.queued = false;

    if (deadlock) {
        /*
            In the case of deadlocks, we don't really care, since
            they are a normal part of operation, so we don't increment
            the failing and we only wait the deadlock delay.  There
            is no alert to the console here.
        */

        this.startWithin(afterDeadlockDelay);
    }
    else {
        /*
            In the case of other failures, we should note it on the
            console - this likely indicates the start of a DB
            failover condition.  The delay after a failure is longer,
            since we don't want to hammer the infrastructure while
            failover is in place.  Note also, that the post failure
            delay increases linearly with the enumber of failures.  This
            is adequate for logging.
        */
        if (this.failing++ == 0) {
            console.log("log flushes failing;",
                "will message again on success");
        }

        this.startWithin(afterFailureDelay * this.failing);
    }
}

Drain.prototype.endAppend = function () {
    if (this.failing != 0) {
        console.log("log flushes now succeeeding after",
            this.failing, "failures (no messages lost)");
        this.failing = 0;
    }

    if (this.span > 0) {
        this.backend.lastFlushedLog = this.backend.spool[this.span - 1];
    }

    this.backend.spool.splice(0, this.span); // remove all written log messages
    this.span = 0;

    if (this.backend.spool.length > 0) {
        this.beginAppend(); // go again, immediately
    }
    else {
        this.queued = false;
        this.backend.notifyFlushers();
    }
}

Drain.prototype.flushQueue = function () {
    var inserts = [];

    // readjust for whole spool to date, up to the maximum batch size
    this.span = Math.min(this.backend.spool.length, maxBatchSize);

    for (var i = 0; i < this.span; i++) {
        var message = this.backend.spool[i];

        // clean up origin of messages
        if (message.origin == null) {
            message.origin = this.backend.origin;
        }

        inserts.push([message.stamp, message.priority, message.facility,
            message.origin, message.service]);
    }

    if (inserts.length == 0) {
        this.flushQueueCleanup();
    }
    else {
        this.flushQueueStart(inserts);
    }
}

util.inherits(StreamDrain, Drain);

function StreamDrain(backend, config) {
    Drain.call(this, backend);
}

StreamDrain.prototype.createLogsText = function () {
    var text = "";

    for (var i = 0; i < this.span; i++) {
        var log = this.backend.spool[i];

        if (this.consoleStyle) {
            text += 
                new Date(log.stamp).toISOString() + " " +
                exports.PRIORITY.nameOf(log.priority) + " " +
                exports.FACILITY.nameOf(log.facility) + " " +
                log.service + " " +
                this.backend.stringifier.resultOfValue(null, log.args) + "\n";
        }
        else {
            var slog = {
                    stamp: new Date(log.stamp).toISOString(), 
                    priority: exports.PRIORITY.nameOf(log.priority),
                    facility: exports.FACILITY.nameOf(log.facility),
                    service: log.service,
                    args: log.args
                };

            text += this.backend.stringifier.resultOfValue(null, slog);
            text += ",\n";
        }
    }

    return (text);
}

util.inherits(SingleDrain, StreamDrain);

function SingleDrain(backend, config) {
    StreamDrain.call(this, backend, config);

    this.consoleStyle = true; // @todo hrm - used to be config driven?
    this.writable = fs.createWriteStream(config["file-path"], {
            flags: "a",
        });
}

SingleDrain.prototype.beginAppend = function () {
    this.flushQueue(); // always ready, just flush queue
}

SingleDrain.prototype.flushQueueStart = function (inserts) {
    var text = this.createLogsText();

    this.writable.write(text, "UTF-8", this.flushQueueCleanup.bind(this));
}

SingleDrain.prototype.flushQueueCleanup = function (error) {
    if (error != null) {
        this.errors.push(error);
    }

    if (this.errors.length > 0) {
        this.resetAppend(false); // not a deadlock
    }
    else {
        this.endAppend();
    }
}

util.inherits(FileDrain, StreamDrain);

function FileDrain(backend, config) {
    StreamDrain.call(this, backend, config);

    this.basePath = config["base-path"];
    this.isoStampWidth = config["iso-stamp-width"];

    if (this.isoStampWidth == null) {
        this.isoStampWidth = 1;
    }
    else {
        this.isoStampWidth = Math.floor(1 * this.isoStampWidth);
    }

    this.isoStampWidth = Math.max(10, Math.min(23, this.isoStampWidth));

    this.filesToKeep = config["files-to-keep"];

    if (this.filesToKeep == null) {
        this.filesToKeep = 7;
    }
    else {
        this.filesToKeep = Math.floor(1 * this.filesToKeep);
    }

    this.filesToKeep = Math.max(2, Math.min(100, this.filesToKeep));

    var now = Date.now();
    var presentStamp = this.stampForUnixMS(now);
    var day2 = 1000 * 3600 * 24 * 2;
    var from = now - day2; // at least two days
    var to = now;

    while (from != to) {
        var mid = Math.floor((from + to) / 2);

        if (this.stampForUnixMS(mid) != presentStamp) {
            from = mid + 1;
        }
        else {
            to = mid;
        }
    }

    var begin = from;

    from = now;
    to = now + day2;

    while (from != to) {
        var mid = Math.ceil((from + to) / 2);

        if (this.stampForUnixMS(mid) != presentStamp) {
            to = mid - 1;
        }
        else {
            from = mid;
        }
    }

    var end = to;

    this.stampMS = end - begin + 1;

/* DEBUG trace
    console.log("cycling logs every", this.stampMS, "and keeping",
        this.filesToKeep, "files");
*/
}

FileDrain.prototype.beginAppend = function () {
    this.flushQueue(); // always ready, just flush queue
}

/**
 * This is called when the append file name changes (and on startup).
 */
FileDrain.prototype.flushQueueMaint = function () {
    var dir = path.dirname(this.basePath);
    var begin = path.basename(this.basePath);
    var end = ".log";
    var acceptable = {};
    var now = Date.now();

    for (var i = -1; i < this.filesToKeep; i++) { // about a week
        acceptable[path.basename(this.fileNameForUnixMS(
            now - i * this.stampMS))] = false;
    }

    fs.readdir(dir, function (error, files) {
            if (error != null) {
                // just ignore it - we've already added the results
                this.flushQueueCleanup(null);
            }
            else {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];

                    if (file.indexOf(begin) != 0) {
                        // ignore
                    }
                    else if (file.lastIndexOf(end) != file.length -
                            end.length) {
                        // ignore
                    }
                    else if (file in acceptable) {
                        // keep
                    }
                    else {
                        console.log("removing old log file", file);

                        fs.unlink(path.join(dir, file),
                            function (error) {
                                // ignore
                            });
                    }
                }

                this.lastFileName = this.fileName;
                this.flushQueueCleanup(null);
            }
        }.bind(this));
}

FileDrain.prototype.stampForUnixMS = function (ms) {
    return (new Date(ms).toISOString().substring(0,
            this.isoStampWidth));
}

FileDrain.prototype.fileNameForUnixMS = function (ms) {
    return (this.basePath + "-" + this.stampForUnixMS(ms) + ".log");
}

FileDrain.prototype.flushQueueStart = function (inserts) {
    this.fileName = this.fileNameForUnixMS(Date.now());

    var text = this.createLogsText();

    fs.appendFile(this.fileName, text, { encoding: "UTF-8" },
        function (error) {
            if (error != null) {
                this.flushQueueCleanup(error);
            }
            else if (this.lastFileName != this.fileName) {
                this.flushQueueMaint();
            }
            else {
                this.flushQueueCleanup(null);
            }
        }.bind(this));
}

FileDrain.prototype.flushQueueCleanup = function (error) {
    if (error != null) {
        this.errors.push(error);
    }
    else if (this.errors.length > 0) {
        // ignore
    }

    if (this.writable != null) {
        /*
            Clearing the writable before the cancel and close
            is a robustness feature that kicks in when there
            are re-entrancy problems and ensures proper sequencing.
            In normal, correct operation, it can be deferred to the
            close callback.
        */
        var writable = this.writable;

        this.writable = null;

        writable.end(null, null, function (error) {
                if (error != null) {
                    this.errors.push(error);
                }

                this.flushQueueCleanup();
            }.bind(this));
    }
    else if (this.errors.length > 0) {
        this.resetAppend(false); // not a deadlock
    }
    else {
        this.endAppend();
    }
}

util.inherits(DBDrain, Drain);

function DBDrain(backend) {
    Drain.call(this, backend);
    this.conn = null;
}

DBDrain.prototype.beginAppend = function () {
    if (this.conn != null) {
        throw new Error("illegal state");
    }

    this.backend.writableGroup.openTransaction(function (error, conn) {
            if (error != null) {
                this.errors.push(error);
                this.flushQueueCleanup();
            }
            else {
                this.conn = conn;
                this.flushQueue();
            }
        }.bind(this));
}

DBDrain.prototype.flushQueueCleanup = function (error) {
    if (error != null) {
        this.errors.push(error);
    }
    else if (this.errors.length > 0) {
        // ignore
    }
    /*
    // use this to emulate DB failures
    else if (this.invocations++ % 10 < 3) {
        this.errors.push("force failure");
    }
    */

    if (this.backend.deliveryPauser != null && this.errors.length == 0) {
        // note that calling deliveryPauser will clear it automatically
        return (this.backend.deliveryPauser(function (error) {
                console.log("log flush delivery released");
                this.flushQueueCleanup(error);
            }.bind(this)));
    }
    else if (this.conn != null) {
        /*
            Clearing the connection before the cancel and close
            is a robustness feature that kicks in when there
            are re-entrancy problems and ensures proper sequencing.
            In normal, correct operation, it can be deferred to the
            close callback.
        */
        var conn = this.conn;

        this.conn = null;

        if (this.errors.length > 0) {
            conn.cancel();
        }

        conn.close(function (error) {
                if (error != null) {
                    this.errors.push(error);
                }

                this.flushQueueCleanup();
            }.bind(this));
    }
    else if (this.errors.length > 0) {
        this.fixups = null; // clear any fixups ...

        // this is created to check for deadlocks ...
        var queryError = this.backend.writableGroup.queryErrors(this.errors);

        // reset, sleep and acquire new conn ...
        this.resetAppend(queryError.deadlock);
    }
    else {
        var fixups = this.fixups;

        if (fixups != null) {
            this.fixups = null;

            fixups.forEach(function (fn) {
                    fn();
                });
        }

        this.endAppend();
    }
}

DBDrain.prototype.flushQueueJSON = function (from) {
    var inserts = require('./dschema_sql').openDecompose(
        this.backend.writableGroup, this.conn, this.backend.jsonTablePrefix);

    for (var i = 0; (i < this.span) && (this.errors.length == 0); i++) {
        var message = this.backend.spool[i];

        inserts.sendArrayScope(from + i, message.args);
    }

    inserts.close(function (error) {
            return (this.flushQueueCleanup(error));
        }.bind(this));
}

DBDrain.prototype.flushQueueStart = function (inserts) {

    /*
        This fixups usage is fairly similar to SimpleTX.
        Ideally, we would re-implement this around SimpleTX,
        just not sure if the extra risk/cost is justified
        at the time of writing.
    */
    this.fixups = [];

    if (this.backend.loggerLockName) {
        // Logger locking enabled. Obtain an exclusive lock on the logger so that only one service
        // can write logs to it at a time. This ensures that all of the logger's logs and their ids
        // are in-order.
        this._getFlushLock(inserts);
    }
    else {
        // Logger locking not enabled, so just go ahead and flush the log queue
        this._flushQueueStart2(inserts);
    }
}

DBDrain.prototype._getFlushLock = function (inserts) {

    // NOTE: Re-using lease table for locking as it's not worth creating another table just for
    // this.

    // TODO Consider making current lease lock table more generic by adding 2nd 'type' col
    // TODO Similar to getLock() in dlease, consider merging...

    const leasesLockTableName = 'dinfra_lease_locks';
    const resource = '__LOG_ID_LOCK_' + this.backend.loggerLockName + '__';

    return (this.conn.query(
        "SELECT 1 FROM " + leasesLockTableName + " WHERE resource = ? FOR UPDATE",
        [resource],
        function (error, rows) {
            if (error) {
                //TODO: Log on trace (and later metrics) only
                console.log("error while locking", error);
                return (this.flushQueueCleanup(error));
            }
            else if (rows.length === 0) {
                // Insert lock lease row
                this.conn.query(
                    "INSERT INTO " + leasesLockTableName + " (resource) VALUES (?)",
                    [[resource]],
                    function (error) {
                        if (error) {
                            console.log("error while executing", error);
                            return (this.flushQueueCleanup(error));
                        }
                        else {
                            return (this._getFlushLock(inserts));
                        }
                    }.bind(this));
            } else {
                return (this._flushQueueStart2(inserts));
            }
        }.bind(this)));
}

DBDrain.prototype._flushQueueStart2 = function (inserts) {

    this.conn.query("INSERT INTO " + this.backend.messageTable +
            " (`stamp`, `priority`, `facility`, `origin`, `service`) " +
            "VALUES ?", [inserts],
        function (error, results) {
            
            if (error) {
                //TODO: Log on trace (and later metrics) only
                console.log("error while executing", error);

                return (this.flushQueueCleanup(error));
            }

            var lastEventId = null;
            var span = inserts.length; // do not modify in this func
            var from = results.insertId; // do not modify in this func

            this.fixups.push(function () {
                    for (var i = 0; i < span; i++) {
                        var message = this.backend.spool[i];

                        message.id = from + i;
                    }
                }.bind(this));

            for (var i = 0; i < span; i++) {
                var message = this.backend.spool[i];
                var messageId = from + i;

                if (message.eventTopic != null && message.eventName != null) {
                    lastEventId = messageId;
                }
                else if (message.service.indexOf("topic/") == 0) {
                    console.log("WARNING: non-event topic/ log message");

                    lastEventId = messageId;
                }
                else {
                    // no need to be careful with insert order of this message
                }
            }

            if (lastEventId == null) {
                return (this.flushQueueJSON(from));
            }

            /*
                When dealing with sequenced events, we like to make
                sure that there is no interleaving of the log reports:
                especially anything that queries a log sequence id for
                an event must not miss log sequence ids that have not
                already been written.  For this reason, when logging
                events, we update this table with the last id written.
                The table has a single row, with key 0.
            */
            return (this.conn.query("INSERT INTO " +
                this.backend.lastEventTable + " (`key`,`id`) VALUES ?" +
                " ON DUPLICATE KEY UPDATE `id` = VALUES(`id`)",
                [[[0, lastEventId]]],
                function (error, results) {
                    if (error != null) {
                        // don't report, probably deadlock
                        return (this.flushQueueCleanup(error));
                    }

                    return (this.flushQueueJSON(from));
                }.bind(this)));
        }.bind(this));
}

exports.logger = function (origin, facility, priority, backend) {
    return (getLogger(origin, facility, priority, backend, Logger));
}

exports.safeLogger = function (origin, facility, priority, backend) {
    return (getLogger(origin, facility, priority, backend, SafeLogger));
}

function getLogger (origin, facility, priority, backend, logCtor) {
    var result;

    if (facility == null) { // either undefined or null
        facility = exports.FACILITY.DAEMON; // sort of unix service default
    }

    exports.FACILITY.ensureValid(facility);

    if (priority == null) {
        priority = exports.PRIORITY.FINEST;
    }

    result = new logCtor(origin, facility, priority, backend);

    return (result);
};

exports.isFlushed = function () {
    return (defaultBackend.spool.length == 0);
};

exports.flush = function (delay, callback) {
    defaultBackend.flush(delay, callback);
}

exports.console = function (opts) {
    if (opts === false) {
        opts = { always: false, frame: false };
    }
    else if (typeof(opts) != "object") {
        opts = { always: true, frame: true };
    }
    else {
        // use the opts verbatim
        if (!("always" in opts)) {
            opts.always = true; // force to true if not explicitly false
        }
    }

    const backend = getDefaultBackend();
    backend.alwaysToConsole = opts.always;
    backend.captureFrameInfo = opts.frame;
};

exports.getFlushedLogId = function (backend) {
    if (!backend) {
        backend = defaultBackend;
    }
    return (backend.lastFlushedLog ? backend.lastFlushedLog.id : null);
};

exports.getFlushedLogStamp = function (backend) {
    if (!backend) {
        backend = defaultBackend;
    }
    return (backend.lastFlushedLog != null ? backend.lastFlushedLog.stamp : null);
};

exports.Message = Message; // really should be internal/protected

exports.maintDB = function () {
    var dlog_query = require('./dlog_query');
    return (dlog_query.maint.apply(dlog_query, arguments));
};

exports.pauseDuringDelivery = pauseDuringDelivery;

var fileBackend = null;
const configureFileBackend = function (origin) {
    var tempBackend = new LoggerBackend();
    tempBackend.configure(null,
        { console: true, 'file-path': '/tmp/dinfra-file-logs-' + (Math.floor(Math.random() * 10000)).toString() + '.txt' },
        origin, null, null, null, null, function (error) {
        if (error) {
            self._close(error);
        } else {
            fileBackend = tempBackend;
        }
    });
}
exports.configureFileBackend = configureFileBackend;

const flushFileBackend = function (callback) {
    if (fileBackend != null) {
        fileBackend.flush(0, callback)
    } else {
       callback();
    }
}
exports.flushFileBackend = flushFileBackend;

const fileLogger = function (service) {
    return getLogger(service, null, null, fileBackend, Logger);
}

exports.fileLogger = fileLogger;