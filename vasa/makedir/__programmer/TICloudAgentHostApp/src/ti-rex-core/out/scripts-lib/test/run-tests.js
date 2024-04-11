'use strict';
// native modules
const os = require('os');
const fs = require('fs-extra');
// 3rd party modules
const async = require('async');
const yargs = require('yargs');
// our modules
const { commandInfo, options, getOptionsMainProcess } = require('./arguments');
const { runMochaTests } = require('./run-mocha-tests');
const { runProtractorTests } = require('./run-protractor-tests');
const scriptsUtil = require('../util');
const Config = scriptsUtil.TestConfig;
function runTests(args, callback = () => { }) {
    const { configuration } = args;
    async.waterfall([
        callback => {
            prepareForTests(configuration, callback);
        },
        callback => {
            const { configuration, ...remainingArgs } = args;
            const options = getOptionsMainProcess(configuration);
            Object.keys(remainingArgs).forEach(item => {
                remainingArgs[item] = scriptsUtil.setOptionDefault(item, options, remainingArgs[item]);
            });
            if (configuration === Config.REMOTESERVER ||
                configuration === Config.LOADREMOTESERVER ||
                configuration === Config.SERVER_INDEPENDENT) {
                runMochaTests({ configuration, ...remainingArgs }, callback);
            }
            else if (configuration === Config.E2E) {
                runProtractorTests({ configuration, ...remainingArgs }, callback);
            }
            else {
                setImmediate(callback, new Error('Invalid configuration'));
            }
        }
    ], callback);
}
exports.runTests = runTests;
/**
 * Do any preparations for the tests
 *
 * @param {ErrorCallback} callback
 */
function prepareForTests(configuration, callback) {
    async.parallel([
        callback => {
            if (fs.existsSync(scriptsUtil.generatedDataFolder)) {
                fs.remove(scriptsUtil.generatedDataFolder, callback);
            }
            else {
                setImmediate(callback);
            }
        }
    ], err => callback(err));
}
//////////////////////////////////////////////////////////////////////////////
// Command Objects
//////////////////////////////////////////////////////////////////////////////
const e2e = {
    ...commandInfo.e2e,
    builder: {
        ...options.e2eOptions
    },
    handler: argv => {
        runTestsHandler({
            ...argv,
            configuration: Config.E2E
        });
    }
};
const remoteserver = {
    ...commandInfo.remoteserver,
    builder: {
        ...options.remoteserverOptionsCommon,
        ...options.remoteserverOptionsMainProcess
    },
    handler: argv => {
        if (os.platform() !== 'linux') {
            yargs.showHelp();
            console.error('Must be on a linux operating system to run tests in remoteserver configuration');
            process.exit(1);
        }
        else {
            runTestsHandler({
                ...argv,
                configuration: Config.REMOTESERVER
            });
        }
    }
};
const loadRemoteserver = {
    ...commandInfo.loadRemoteserver,
    builder: {
        ...options.loadRemoteserverOptionsCommon,
        ...options.loadRemoteserverMainProcess
    },
    handler: argv => {
        runTestsHandler({
            ...argv,
            configuration: Config.LOADREMOTESERVER
        });
    }
};
const serverIndepdendent = {
    ...commandInfo.serverIndependent,
    builder: {
        ...options.serverIndependentOptionsCommon,
        ...options.serverIndependentOptionsMainProcess
    },
    handler: argv => {
        runTestsHandler({
            ...argv,
            configuration: Config.SERVER_INDEPENDENT
        });
    }
};
function runTestsHandler(argv) {
    runTests(argv, err => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        else {
            process.exit(0);
        }
    });
}
//////////////////////////////////////////////////////////////////////////////
// Yargs Command config
//////////////////////////////////////////////////////////////////////////////
exports.command = 'test <configuration>';
exports.describe = 'Test ti-rex-core';
exports.builder = function () {
    return yargs
        .command(e2e)
        .command(remoteserver)
        .command(loadRemoteserver)
        .command(serverIndepdendent)
        .demandCommand(1, 1);
};
