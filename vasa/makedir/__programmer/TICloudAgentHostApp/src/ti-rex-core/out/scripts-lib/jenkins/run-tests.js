'use strict';
// native modules
const os = require('os');
// 3rd party modules
const async = require('async');
// our modules
const { runTests } = require('../test/run-tests');
const { TestConfig, TestMode, setOptionDefault } = require('../util');
const { options: scriptsCommonOptions } = require('../arguments');
function runJenkinsTests(args, callback) {
    // Process args
    Object.keys(args).forEach(item => {
        args[item] = setOptionDefault(item, exports.builder, args[item]);
    });
    // Turn off verbose logging so we don't put console formatting in the log files &
    // we don't put test output in the jenkins console
    args.verbose = false;
    // Run the tests
    async.series([
        callback => {
            // Mocha remoteserver tests
            if (os.platform() === 'linux') {
                runTests({
                    ...args,
                    configuration: TestConfig.REMOTESERVER
                }, callback);
            }
            else {
                setImmediate(callback);
            }
        },
        callback => {
            // Protractor tests
            if (args.testMode === TestMode.HEAVY) {
                runTests({
                    ...args,
                    configuration: TestConfig.E2E
                }, callback);
            }
            else {
                setImmediate(callback);
            }
        },
        callback => {
            // Load (mocha) remoteserver tests
            if (args.testMode === TestMode.HEAVY && os.platform() === 'linux') {
                runTests({
                    ...args,
                    configuration: TestConfig.LOADREMOTESERVER
                }, callback);
            }
            else {
                setImmediate(callback);
            }
        },
        callback => {
            // Server independent tests
            runTests({ ...args, configuration: TestConfig.SERVER_INDEPENDENT }, callback);
        }
    ], callback);
}
//////////////////////////////////////////////////////////////////////////////
//  Yargs Command config
//////////////////////////////////////////////////////////////////////////////
exports.command = 'run-tests [options]';
exports.describe = 'Run tests and figure out test configuration based on operating system';
exports.builder = {
    remoteserverUrl: {
        describe: 'url of the remote server to test on',
        demandOption: true
    },
    dinfra: {
        ...scriptsCommonOptions.dinfra,
        demandOption: true
    },
    testMode: {
        describe: 'The testing mode',
        choices: Object.values(TestMode),
        demandOption: true
    },
    testData: {
        describe: 'path to ti-rex-testData git repo (relative or absolute)'
    }
};
exports.handler = argv => {
    runJenkinsTests(argv, err => {
        if (err) {
            console.log('Failed to run tests');
            console.error(err);
            process.exit(1);
        }
        else {
            console.log('Ran tests successfully');
            process.exit(0);
        }
    });
};
