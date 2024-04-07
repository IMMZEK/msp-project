#!/usr/bin/env node
'use strict';
// Native modules
const os = require('os');
const path = require('path');
const p = require('child_process');
const fs = require('fs-extra');
const util = require('util');
// 3rd party modules
const async = require('async');
const glob = require('glob');
const Mocha = require('mocha');
const yargs = require('yargs');
// our modules
const { commandInfo, options, getOptionsMainProcess, getOptionsSubProcess } = require('./arguments');
const scriptsUtil = require('../util');
const Config = scriptsUtil.TestConfig;
const { ProcessManager, processManager } = scriptsUtil;
const out = process.stdout;
exports.runMochaTests = function (args, callback = () => { }) {
    // Process args
    const { configuration, ...remainingArgs } = args;
    const options = getOptionsMainProcess(configuration);
    Object.keys(remainingArgs).forEach(item => {
        remainingArgs[item] = scriptsUtil.setOptionDefault(item, options, remainingArgs[item]);
    });
    const { verbose, inspectBrk } = remainingArgs;
    // Spawn the Process
    out.write('Launching Mocha\n');
    const script = path.join(scriptsUtil.projectRoot, 'out', 'scripts-lib', 'test', 'run-mocha-tests');
    const inspectBrkPort = inspectBrk && (parseInt(inspectBrk) || 9229);
    const cliOptions = inspectBrkPort
        ? [`--inspect-brk=${inspectBrkPort}`, script, configuration]
        : [script, configuration];
    const subProcessOptions = getOptionsSubProcess(configuration);
    delete subProcessOptions.inspectBrk;
    Object.keys(subProcessOptions).forEach(option => {
        const item = remainingArgs[option];
        if (item != null) {
            Array.isArray(item)
                ? item.forEach(item => cliOptions.push(`--${option}`, item))
                : cliOptions.push(`--${option}`, item);
        }
    });
    const child = p.spawn(process.execPath, cliOptions);
    // Handle redirecting output, logging, and callback when tests are done
    async.waterfall([
        callback => {
            const mochaPath = path.parse(scriptsUtil.mochaLog);
            const mochaLog = path.join(mochaPath.dir, `${mochaPath.name}-${configuration}${mochaPath.ext}`);
            scriptsUtil.setupLog(mochaLog, callback);
        },
        (logStream, callback) => {
            processManager.addProcess({
                name: 'mocha',
                child,
                out: logStream
            });
            if (verbose) {
                ProcessManager.redirectProcessOutput({
                    child,
                    name: 'mocha',
                    exitMessage: true,
                    out: process.stdout
                });
                child.once('exit', code => handleExit(code, configuration, callback));
            }
            else {
                child.once('exit', code => {
                    out.write(`Mocha exited with code ${code}\n`);
                    handleExit(code, configuration, callback);
                });
            }
        }
    ], callback);
};
function _runMochaTests(args, callback = () => { }) {
    // tslint:disable-next-line no-var-requires
    require('source-map-support').install();
    // require('longjohn');
    // Process args
    const { configuration, ...remainingArgs } = args;
    const options = getOptionsSubProcess(configuration);
    Object.keys(remainingArgs).forEach(item => {
        remainingArgs[item] = scriptsUtil.setOptionDefault(item, options, remainingArgs[item]);
    });
    if (remainingArgs.remoteserverUrl && !remainingArgs.remoteserverUrl.endsWith('/')) {
        remainingArgs.remoteserverUrl += '/';
    }
    remainingArgs.dinfra = remainingArgs.dinfra
        ? scriptsUtil.resolvePath(remainingArgs.dinfra)
        : null;
    remainingArgs.testData = remainingArgs.testData
        ? scriptsUtil.resolvePath(remainingArgs.testData)
        : null;
    const { dinfra: dinfraPath, consoleLog, files, timeout, verbose } = remainingArgs;
    const shouldRunServer = configuration === Config.REMOTESERVER;
    // Setup globals
    {
        const { setTestingGlobals } = require('./test-helpers');
        // Replace any args that were extracted and processed in remaining args with the processed version
        setTestingGlobals({ ...args, ...remainingArgs });
    }
    // Init mocha configs
    if (shouldRunServer) {
        scriptsUtil.initMochaConfig({ mode: 'remoteserver' });
        scriptsUtil.initMochaDConfig({});
    }
    // Execute tests
    const start = new Date();
    const dinfra = shouldRunServer ? require(dinfraPath) : null;
    async.waterfall([
        // Setup tirex
        callback => {
            if (!shouldRunServer) {
                return setImmediate(callback);
            }
            const tirex = require('../../app');
            const config = {
                ...scriptsUtil.getMochaConfig()
            };
            tirex.setupTirex({
                config,
                dinfra,
                dconfig: scriptsUtil.getMochaDconfig(),
                dinfraPath
            }, err => {
                dinfra.uncaught(false);
                if (consoleLog) {
                    dinfra.logger('tirex').setPriority(dinfra.dlog.PRIORITY.NOTICE);
                    dinfra.dlog.console();
                }
                callback(err);
            });
        },
        // Launch mocha
        callback => {
            const { reportDir, reportFilename } = getHtmlReportPath(configuration);
            const mocha = new Mocha({
                reporter: 'mochawesome',
                reporterOptions: {
                    inlineAssets: true,
                    quiet: true,
                    reportDir,
                    reportFilename
                },
                timeout
                // noTimeouts: true
            });
            if (files) {
                setImmediate(callback, null, { files, mocha });
            }
            else {
                const allFiles = [`${scriptsUtil.projectRoot}/out/**/*.spec.js`];
                setImmediate(callback, null, { files: allFiles, mocha });
            }
        },
        ({ files, mocha }, callback) => {
            async.concat(files, glob, (err, files) => {
                callback(err, { files, mocha });
            });
        },
        ({ files, mocha }, callback) => {
            files.forEach(file => {
                mocha.addFile(file);
            });
            if (verbose) {
                // Ensure colours are set if you are outputting to the console
                mocha.useColors(true);
            }
            mocha.run(() => callback());
        },
        // Log all dinfra messages since the test started to a file
        callback => {
            if (!shouldRunServer) {
                return setImmediate(callback);
            }
            try {
                const fileName = `mocha-remoteserver-${start.toLocaleDateString()}.log`.replace(new RegExp('/', 'g'), '-');
                const fd = fs.openSync(path.join(scriptsUtil.mochaServerDataFolder, fileName), 'a');
                dinfra.dlog
                    .query()
                    .withFromTime(start.getTime())
                    .invoke((error, message) => {
                    if (error) {
                        fs.closeSync(fd);
                        callback(error);
                    }
                    else if (message === null) {
                        fs.closeSync(fd);
                        callback();
                    }
                    else {
                        fs.writeFileSync(fd, JSON.stringify(message, null, 4) + ',\n');
                    }
                });
            }
            catch (e) {
                setImmediate(callback, e);
            }
        },
        // Generate a load test report, if the load tests were run
        callback => {
            if (configuration === Config.LOADREMOTESERVER) {
                const impl = require('./generate-load-tests-report-impl');
                const generate = util.callbackify(impl.generate);
                generate(scriptsUtil.logsDir, false, callback);
            }
            else {
                setImmediate(callback);
            }
        }
    ], callback);
}
function handleExit(code, configuration, callback) {
    const { reportDir, reportFilename } = getHtmlReportPath(configuration);
    const reportFile = getReportFile();
    async.waterfall([
        callback => {
            fs.access(reportFile, fs.constants.F_OK, err => callback(null, !err));
        },
        (fileExists, callback) => {
            if (fileExists) {
                return setImmediate(callback);
            }
            // write placeholder results if the entire suite fails (i.e if nothing ran we get 0% it doesn't just skip it)
            fs.outputJson(reportFile, {
                stats: {
                    suites: 0,
                    tests: 0,
                    passes: 0,
                    pending: 0,
                    failures: 0,
                    passPercent: 0,
                    other: 0,
                    skipped: 0
                },
                suites: {}
            }, callback);
        }
    ], callback);
    function getReportFile() {
        let reportFile = path.join(reportDir, reportFilename);
        const { name } = path.parse(reportFile);
        reportFile = path.join(reportDir, `${name}.json`);
        return reportFile;
    }
}
function getHtmlReportPath(configuration) {
    const htmlReportPath = path.parse(scriptsUtil.mochaHtmlReport);
    return {
        reportDir: htmlReportPath.dir,
        reportFilename: `${htmlReportPath.name}-${configuration}${htmlReportPath.ext}`
    };
}
const remoteserver = {
    ...commandInfo.remoteserver,
    builder: {
        ...options.remoteserverOptionsCommon
    },
    handler(argv) {
        if (os.platform() !== 'linux') {
            yargs.showHelp();
            console.error('Must be on a linux operating system to run' +
                ' tests in remoteserver configuration');
        }
        else {
            argv.configuration = Config.REMOTESERVER;
            handler(argv);
        }
    }
};
const loadRemoteserver = {
    ...commandInfo.loadRemoteserver,
    builder: {
        ...options.loadRemoteserverOptionsCommon
    },
    handler(argv) {
        argv.configuration = Config.LOADREMOTESERVER;
        handler(argv);
    }
};
const serverIndependent = {
    ...commandInfo.serverIndependent,
    builder: {
        ...options.serverIndependentOptionsCommon
    },
    handler(argv) {
        argv.configuration = Config.SERVER_INDEPENDENT;
        handler(argv);
    }
};
function handler(argv) {
    _runMochaTests(argv, err => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        else {
            process.exit(0);
        }
    });
}
if (require.main === module) {
    yargs
        .usage('Usage: $0 <configuration>')
        .command(remoteserver)
        .command(loadRemoteserver)
        .command(serverIndependent)
        .demandCommand(1, 1)
        .help('h')
        .alias('h', 'help')
        .parse();
}
