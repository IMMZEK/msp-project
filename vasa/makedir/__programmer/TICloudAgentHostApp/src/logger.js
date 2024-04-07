"use strict";
const fs = require("fs");
const path = require("path");
const env = process.env;
class FileLogger {
    constructor(file) {
        this.file = this.determineFileName(file);
        try {
            fs.truncateSync(this.file);
        }
        catch (err) { } // swallow - file is not there or in use
    }
    info(msg) {
        fs.appendFileSync(this.file, new Date().toISOString() + ": " + msg + "\n");
    }
    determineFileName(file) {
        const dir = path.dirname(file);
        const ext = path.extname(file);
        const basename = path.basename(file);
        const fileName = basename.slice(0, basename.length - ext.length) + "_ticld" + ext;
        return path.join(dir, fileName);
    }
}
class DisabledLogger {
    info() { }
}
function getLogger() {
    if (env.TI_DS_ENABLE_LOGGING) {
        if (env.TI_DS_LOGGING_OUTPUT) {
            return new FileLogger(env.TI_DS_LOGGING_OUTPUT);
        }
    }
    return new DisabledLogger();
}
const logger = getLogger();
process.on("uncaughtException", (err) => logger.info("Uncaught exception: " + err + ": " + err.stack));
module.exports = logger;
