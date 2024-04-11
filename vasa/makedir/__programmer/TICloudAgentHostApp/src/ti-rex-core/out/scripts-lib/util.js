'use strict';
// native modules
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const _ = require('lodash');
// 3rd party modules
const async = require('async');
const kill = require('tree-kill');
const projectRoot = path.join(__dirname, '..', '..');
exports.projectRoot = projectRoot;
// Log files
const logsDir = path.join(projectRoot, 'logs');
exports.remoteServerLog = path.join(logsDir, 'remoteserver.log');
exports.webdriverLog = path.join(logsDir, `webdriver-${os.platform()}.log`);
exports.protractorLog = path.join(logsDir, `protractor-${os.platform()}.log`);
exports.browserConsoleLog = path.join(logsDir, `browserconsole-${os.platform()}.log`);
exports.mochaLog = path.join(logsDir, `mocha-${os.platform()}.log`);
exports.tscLog = path.join(logsDir, 'tsc.log');
exports.npmLog = path.join(logsDir, 'npm.log');
exports.logsDir = logsDir;
// Ports
// TODO put local / remote server ports here
exports.mochaServerPort = 4002;
exports.seleniumServerPort = 4004;
exports.remoteServerDebugPort = 6000;
// Where mocha should write reports
const reportDir = path.join(projectRoot, 'reports');
exports.mochaHtmlReport = path.join(reportDir, `mocha-report-${os.platform()}.html`);
exports.mochaJSONReport = path.join(reportDir, `mocha-report-${os.platform()}.json`);
exports.protractorHtmlReport = path.join(reportDir, `protractor-report-${os.platform()}.html`);
exports.protractorJSONReport = path.join(reportDir, `protractor-report-${os.platform()}.json`);
const loadTestReportFileName = `summary-${new Date().toLocaleDateString()}.HTML`.replace(new RegExp('/', 'g'), '-');
exports.loadTestSummaryHtmlReport = path.join(reportDir, loadTestReportFileName);
exports.loadTestHtmlReportDir = reportDir;
// Test variables
exports.generatedDataFolder = path.join(projectRoot, 'test', 'generated-data');
exports.dataFolder = path.join(projectRoot, 'test', 'data');
exports.mochaServer = `http://localhost:${exports.mochaServerPort}/`;
exports.TestConfig = {
    REMOTESERVER: 'remoteserver',
    LOADREMOTESERVER: 'loadRemoteserver',
    SERVER_INDEPENDENT: 'serverIndependent',
    E2E: 'e2e'
};
exports.TestMode = {
    LIGHT_WEIGHT: 'LightWeight',
    HEAVY: 'Heavy',
    VERY_HEAVY: 'VeryHeavy'
};
// Misc paths
exports.siteStaticData = path.join(projectRoot, 'src', 'scripts-lib', 'data', 'site');
exports.webdriversPath = path.join(projectRoot, 'bin', os.platform(), os.arch(), 'webdrivers');
exports.defaultTestdataPath = path.join(projectRoot, '..', '..', 'ti-rex-testdata');
///////////////////////////////////////////////////////////////////////////////
/// Mocha tirex config
///////////////////////////////////////////////////////////////////////////////
exports.mochaServerDataFolder = path.join(exports.dataFolder, 'mochaServer');
const mochaServerGeneratedFolder = path.join(exports.generatedDataFolder, 'mochaServer');
let isMochaConfigInitialized = false;
let isMochaDconfigInitialized = false;
let mochaConfig = {
    preset: '',
    mode: 'remoteserver',
    validationType: 'refresh',
    myHttpPort: `${exports.mochaServerPort}`,
    contentPath: `${mochaServerGeneratedFolder}/content`,
    dbTablePrefix: 'tirexTest',
    dbPath: `${mochaServerGeneratedFolder}/.db`,
    seoPath: `${mochaServerGeneratedFolder}/seo`,
    logsDir: '',
    analyticsDir: `${mochaServerGeneratedFolder}/.tirex-analytics-data`,
    contentPackagesConfig: `${mochaServerGeneratedFolder}/config/default.json`,
    remoteBundleZips: '',
    localBundleZips: `${mochaServerGeneratedFolder}/zips/`,
    myRole: '',
    no_proxy: 'localhost,127.0.0.0,.ti.com,.toro.design.ti.com',
    refreshDB: 'false',
    allowRefreshFromWeb: 'true',
    mailingList: '',
    handoffServer: true,
    downloadServer: false,
    useConsole: 'false',
    dbResourcePrefix: '/tirexTest',
    serveContentFromFs: false,
    allowExit: false,
    testingServer: false,
    webComponentsServer: '',
    ccsCloudUrl: '',
    https_proxy: '',
    http_proxy: '',
    HTTP_PROXY: '',
    HTTPS_PROXY: '',
    NO_PROXY: '',
    seaportHostIP: '',
    seaportPort: '',
    dcontrol: null,
    serverMode: 'both'
};
/**
 * Initialize mocha config object
 *
 * @param {Object} overriddenConfig - Configuration object containing any overridden properties
 */
exports.initMochaConfig = function (overriddenConfig) {
    mochaConfig = { ...mochaConfig, ...overriddenConfig };
    isMochaConfigInitialized = true;
};
/**
 * Get mocha config object if it has been initialized
 *
 * @returns mocha config object
 */
exports.getMochaConfig = function () {
    if (isMochaConfigInitialized) {
        return mochaConfig;
    }
    throw new Error(`Never called initMochaConfig`);
};
let mochaDconfig;
/**
 * Initialize mocha dconfig object
 *
 * @param  {} overriddenDconfig Configuration object containing any overridden properties
 */
exports.initMochaDConfig = function (overriddenDconfig) {
    const mochaDconfigFile = require('../../config-develop/test/dconfig_mocha.json');
    mochaDconfigFile.origin.basePort = exports.mochaServerPort;
    mochaDconfig = _.merge(mochaDconfigFile, overriddenDconfig);
    isMochaDconfigInitialized = true;
};
/**
 * Get mocha dconfig object if it has been initialized
 *
 * @returns mocha dconfig object
 */
exports.getMochaDconfig = function () {
    if (isMochaDconfigInitialized) {
        return mochaDconfig;
    }
    else {
        throw new Error(`Never called initMochaDconfig`);
    }
};
/**
 * Clears the log file and opens a writeable stream to write to the log.
 *
 * @param {String} log
 * @param callback(err, logStream)
 * @param {Object} options
 */
exports.setupLog = function (log, callback, { clear = true } = {}) {
    async.series([
        (callback) => {
            if (clear) {
                fs.outputFile(log, '', callback);
            }
            else {
                fs.ensureFile(log, callback);
            }
        },
        (callback) => {
            const logStream = fs.createWriteStream(log, { flags: 'a' });
            let callbackCalled = false;
            logStream.on('open', () => {
                if (!callbackCalled) {
                    callbackCalled = true;
                    callback(null, logStream);
                }
            });
            logStream.on('error', (err) => {
                if (!callbackCalled) {
                    callbackCalled = true;
                    callback(err);
                }
            });
        }
    ], (err, [_, logstream]) => {
        callback(err, logstream);
    });
};
/**
 * Simplifies process management
 *
 */
class ProcessManager {
    constructor() {
        process.once('exit', () => {
            kill(process.pid);
        });
    }
    /**
     * Register process and redirect to out.
     *
     * @param {Object} args
     *  @param {Object} args.child - An object returned by a child_process function
     *   i.e require('child_processes').spawn(..)
     *  @param {stream.Writeable} args.out - The stream to write the
     *   processes output to.
     *  @param {String} name
     *  @param {Boolean} exitMessage - if false suppress the exit code message
     *  @param {Boolean} restart - if false don't kill child when receiving restart signal
     */
    addProcess({ child, out, name = '', exitMessage = true, restart = true }) {
        ProcessManager.redirectProcessOutput({
            child,
            out,
            name,
            exitMessage
        });
        process.once('SIGUSR2', () => {
            if (restart) {
                child.kill();
            }
        });
    }
    /**
     * Redirect the processes output to the write stream
     *
     * @param {Object} p - An object returned by a child_process function
     *  i.e require('child_processes').spawn(..)
     * @param {stream.Writeable} out - The stream to write the processes output to
     *
     */
    static redirectProcessOutput({ child, out, name, exitMessage }) {
        child.stdout.pipe(out);
        child.stderr.pipe(out);
        child.on('error', (err) => {
            out.write(err);
        });
        child.on('exit', (code) => {
            if (exitMessage) {
                out.write(`${name} exited with code ${code}\n`);
            }
        });
    }
}
exports.ProcessManager = ProcessManager;
exports.processManager = new ProcessManager();
/**
 * Resolves the path relative to the current working directory. This also handles ~ in paths.
 *
 * @param {String} p - The path to resolve.
 * @param {Object} options
 *  @param {String} options.relative - The path to be relative to (default current working directory)
 *
 * @returns {String} resolvedPath - The absolute resolved path.
 */
exports.resolvePath = function (p, { relative } = {}) {
    if (!relative) {
        relative = process.cwd();
    }
    if (path.isAbsolute(p)) {
        return p;
    }
    else if (p.indexOf('~') > -1) {
        return path.normalize(p.replace('~', os.homedir()));
    }
    else {
        const absPath = path.join(relative, p);
        return path.normalize(absPath);
    }
};
exports.setOptionDefault = function (option, optionList, value) {
    if (value != null) {
        return value;
    }
    const config = optionList[option];
    return config && config.default;
};
