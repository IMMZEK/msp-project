"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
const manage_1 = require("./manage");
class ConsoleLogger {
    consoleVerbosity;
    constructor(consoleVerbosity) {
        this.consoleVerbosity = consoleVerbosity;
    }
    log(message = '', level = manage_1.ConsoleVerbosity.Normal, newline = true) {
        if (level <= this.consoleVerbosity) {
            if (newline) {
                console.log(message);
            }
            else {
                process.stdout.write(message);
            }
        }
    }
    progress(message = '', newline = false) {
        this.log(message, manage_1.ConsoleVerbosity.ProgressOnly, newline);
    }
    progressOnly(message = '') {
        if (this.consoleVerbosity === manage_1.ConsoleVerbosity.ProgressOnly) {
            process.stdout.write(message);
        }
    }
    fine(message = '') {
        this.log(message, manage_1.ConsoleVerbosity.Verbose);
    }
    finer(message = '') {
        this.log(message, manage_1.ConsoleVerbosity.VeryVerbose);
    }
}
exports.ConsoleLogger = ConsoleLogger;
