"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const fs = require("fs-extra");
const path = require("path");
const glob = require("glob");
const util = require("util");
const ejs = require("ejs");
const _ = require("lodash");
// our modules
const scriptsUtil = require("../util");
const rexError_1 = require("../../utils/rexError");
const globAsync = util.promisify(glob);
// Can't promisify on this function due to promisify typing not supporting overloads
function renderFileAsync(path, data) {
    return new Promise((resolve, reject) => {
        ejs.renderFile(path, data, (err, str) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(str);
            }
        });
    });
}
async function generate(logDir, summarize) {
    if (!fs.pathExistsSync(logDir)) {
        throw new Error('Directory could not be found.');
    }
    const logFiles = await globAsync(`${logDir}/**/load-test*log.json`);
    if (logFiles.length === 0) {
        throw new Error('No JSON logs found in directory.');
    }
    const reports = [];
    if (summarize) {
        const allData = [];
        try {
            for (const logFile of logFiles) {
                const data = require(logFile);
                allData.push(...data);
            }
        }
        catch (e) {
            throw new rexError_1.RexError({ message: 'Failed to load all log files', causeError: e });
        }
        try {
            const reportName = scriptsUtil.loadTestSummaryHtmlReport;
            reports.push(await processData(allData, reportName));
        }
        catch (e) {
            throw new rexError_1.RexError({ message: `Failed to process all log files`, causeError: e });
        }
    }
    else {
        for (const logFile of logFiles) {
            try {
                const data = require(logFile);
                const reportName = path.join(scriptsUtil.loadTestHtmlReportDir, `${path.basename(logFile).slice(0, -'.log.json'.length)}.html`);
                reports.push(await processData(data, reportName));
            }
            catch (e) {
                throw new rexError_1.RexError({ message: `Failed to process ${logFile}`, causeError: e });
            }
        }
    }
    return reports;
}
exports.generate = generate;
// Selection of colours that looked nice
const rgbColours = [
    'rgb(0, 0, 0)',
    'rgb(0, 0, 255)',
    'rgb(0, 255, 0)',
    'rgb(0, 255, 255)',
    'rgb(255, 0, 0)',
    'rgb(255, 0, 255)',
    'rgb(255, 255, 0)',
    'rgb(0, 0, 125)',
    'rgb(0, 125, 0)',
    'rgb(0, 125, 125)',
    'rgb(125, 0, 0)',
    'rgb(125, 0, 125)',
    'rgb(125, 125, 0)',
    'rgb(125, 125, 125)',
    'rgb(0, 0, 60)',
    'rgb(0, 60, 0)',
    'rgb(0, 60, 60)',
    'rgb(60, 0, 0)',
    'rgb(60, 0, 60)',
    'rgb(60, 60, 0)',
    'rgb(60, 60, 60)'
];
async function processData(data, htmlReportPath) {
    const logResult = setupGraphData(data);
    const htmlStr = await renderFileAsync(path.join(scriptsUtil.projectRoot, 'templates', 'load-test-report.ejs'), getEjsTemplateParamters(logResult));
    fs.ensureFileSync(htmlReportPath);
    fs.writeFileSync(htmlReportPath, htmlStr);
    return htmlReportPath;
}
/**
 * Parses JSON logs produced by a load test and sets up graph datasets
 */
function setupGraphData(data) {
    const cpuData = [];
    const memData = [];
    const dataSets = {};
    const latency = [];
    let errors = 0;
    let numServerReq = 0;
    const colours = rgbColours.slice();
    if (!data.length) {
        return {
            tickMax: 0,
            numServerReq,
            dataSets,
            cpuData,
            memData,
            stdDevs: [0, 0, 0],
            errors
        };
    }
    const start = _.minBy(data, entry => entry.stamp).stamp / 1000;
    const end = _.maxBy(data, entry => entry.stamp).stamp / 1000 - start;
    data.forEach(logEntry => {
        const isProxy = 'PROXY-SERVER' === logEntry.file;
        if (isProxy) {
            ++numServerReq;
        }
        // Parse metrics data if available
        if (logEntry.metrics) {
            if (logEntry.stamp && logEntry.metrics.cpuUsage) {
                cpuData.push({ x: logEntry.stamp / 1000 - start, y: logEntry.metrics.cpuUsage });
            }
            if (logEntry.stamp && logEntry.metrics.memUsage) {
                memData.push({
                    x: logEntry.stamp / 1000 - start,
                    y: logEntry.metrics.memUsage / 1024 / 1024
                }); // convert from bytes to MB
            }
        }
        if (!logEntry.stamp || !logEntry.latency) {
            return;
        }
        // Parse latenacy/error stats
        if (!isProxy) {
            latency.push(logEntry.latency);
        }
        if (logEntry.exception) {
            ++errors;
        }
        // Parse detailed response time data
        const dataPoint = { x: logEntry.stamp / 1000 - start, y: logEntry.latency };
        const labelType = logEntry.exception
            ? `Error: ${logEntry.exception}`
            : isProxy
                ? 'Proxy'
                : 'Server';
        const label = `${labelType} ${logEntry.apiPath.includes('content/') ? '/content' : logEntry.apiPath.split('?')[0]}`;
        if (!dataSets[label]) {
            dataSets[label] = { label, data: [], backgroundColor: colours.shift() };
        }
        dataSets[label].data.push(dataPoint);
    });
    // Determine 3 standard deviations for latency (68%, 95% 99.7%)
    const sortedLatency = _.sortBy(latency);
    const stdDevs = [
        sortedLatency[Math.floor(sortedLatency.length * 0.68)],
        sortedLatency[Math.floor(sortedLatency.length * 0.95)],
        sortedLatency[Math.floor(sortedLatency.length * 0.997)]
    ];
    return {
        tickMax: end,
        numServerReq,
        dataSets,
        cpuData,
        memData,
        stdDevs,
        errors
    };
}
function getEjsTemplateParamters(result) {
    const tickMaxHtml = result.tickMax;
    const numServerReqHtml = result.numServerReq;
    const dataSetsHtml = JSON.stringify(_.values(result.dataSets));
    const cpuDataHtml = JSON.stringify(result.cpuData);
    const memDataHtml = JSON.stringify(result.memData);
    return {
        numServerReqHtml,
        dataSetsHtml,
        tickMaxHtml,
        cpuDataHtml,
        memDataHtml,
        numErrorsHtml: result.errors,
        stdDevsHtml: result.stdDevs
    };
}
