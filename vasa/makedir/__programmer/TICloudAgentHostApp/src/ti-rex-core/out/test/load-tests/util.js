"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomDelay = exports.createLoggingResponseHandler = void 0;
const os = require("os");
const settings_1 = require("./settings");
const delay_1 = require("../delay");
// Log the response time of an HTTP request
function createLoggingResponseHandler(logStream) {
    let initialLogStatementWritten = false;
    return (url, resOrError, proxyResponseTime) => {
        const prefix = initialLogStatementWritten ? ',' : '';
        initialLogStatementWritten = true;
        const logStatement = prefix +
            createServerLog(url, resOrError, proxyResponseTime)
                .map(entry => JSON.stringify(entry))
                .join(',');
        logStream.write(logStatement);
    };
}
exports.createLoggingResponseHandler = createLoggingResponseHandler;
// Create server log entries given an HTTP response
function createServerLog(url, resOrError, proxyResponseTime) {
    const stamp = new Date().getTime();
    const entries = [];
    if (isResponse(resOrError)) {
        // Prepare server log entry
        const latency = Number(resOrError.header['x-response-time']);
        const serverLogEntry = {
            machine: resOrError.body.sideBand ? resOrError.body.sideBand.machine : 'unknown',
            file: 'TIREX-SERVER',
            apiPath: url,
            latency,
            stamp
        };
        if (resOrError.body.sideBand && resOrError.body.sideBand.metrics) {
            serverLogEntry.metrics = resOrError.body.sideBand.metrics;
        }
        entries.push(serverLogEntry);
        if (settings_1.latencyLog) {
            if (latency < 250) {
                process.stdout.write('.');
            }
            else if (latency < 500) {
                process.stdout.write('-');
            }
            else if (latency < 1000) {
                process.stdout.write('+');
            }
            else {
                process.stdout.write('*');
            }
        }
    }
    // Prepare proxy log entry
    const proxyLogEntry = {
        machine: os.hostname(),
        file: 'PROXY-SERVER',
        apiPath: url,
        latency: proxyResponseTime,
        stamp
    };
    if (!isResponse(resOrError)) {
        if (settings_1.latencyLog) {
            process.stdout.write('!');
        }
        proxyLogEntry.exception = resOrError.message;
    }
    entries.push(proxyLogEntry);
    return entries;
}
function isResponse(resOrError) {
    return !!resOrError.body;
}
function randomDelay(milliseconds, rand) {
    const delayAdjustment = (milliseconds * settings_1.delayAdjustmentPercentage) / 100;
    const amount = milliseconds - delayAdjustment + rand.generate(delayAdjustment * 2);
    return (0, delay_1.delay)(amount);
}
exports.randomDelay = randomDelay;
