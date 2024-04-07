'use strict';
const scriptsUtil = require('../util');
const scriptsCommonArgs = require('../arguments');
const commonOptions = {
    dinfra: {
        ...scriptsCommonArgs.options.dinfra,
        demandOption: true
    },
    files: {
        describe: 'run mocha on the specified files (can be globs)',
        array: true
    },
    inspectBrk: {
        describe: "debug the tests (works the same as nodes's inspect-brk)"
    },
    remoteserverUrl: {
        describe: 'url of the remote server to test on',
        demandOption: true
    },
    testMode: {
        describe: 'The testing mode',
        default: scriptsUtil.TestMode.LIGHT_WEIGHT,
        choices: Object.values(scriptsUtil.TestMode)
    },
    customTest: {
        describe: 'custom test'
    },
    timeout: {
        describe: 'mocha timeout value',
        default: 5000
    },
    verbose: {
        describe: 'Show the mocha processes output in the console',
        default: true,
        boolean: true
    },
    testData: {
        describe: 'path to ti-rex-testData git repo (relative or absolute)',
        default: scriptsUtil.defaultTestdataPath
    }
};
exports.options = {
    remoteserverOptionsCommon: {
        dinfra: commonOptions.dinfra,
        files: commonOptions.files,
        testMode: commonOptions.testMode,
        timeout: commonOptions.timeout,
        testData: commonOptions.testData,
        consoleLog: {
            describe: 'TODO put a description here',
            default: false,
            boolean: true
        },
        verbose: commonOptions.verbose
    },
    remoteserverOptionsMainProcess: {
        inspectBrk: commonOptions.inspectBrk
    },
    loadRemoteserverOptionsCommon: {
        dinfra: commonOptions.dinfra,
        files: commonOptions.files,
        remoteserverUrl: commonOptions.remoteserverUrl,
        testData: commonOptions.testData,
        reqLimit: {
            describe: 'The number of concurrent requests to send during the test',
            default: 10,
            number: true
        },
        testMode: commonOptions.testMode,
        verbose: commonOptions.verbose
    },
    loadRemoteserverMainProcess: {
        inspectBrk: commonOptions.inspectBrk
    },
    serverIndependentOptionsCommon: {
        dinfra: commonOptions.dinfra,
        files: commonOptions.files,
        testMode: commonOptions.testMode,
        timeout: commonOptions.timeout,
        customTest: commonOptions.customTest,
        testData: commonOptions.testData,
        verbose: commonOptions.verbose
    },
    serverIndependentOptionsMainProcess: {
        inspectBrk: commonOptions.inspectBrk
    },
    e2eOptions: {
        inspectBrk: commonOptions.inspectBrk,
        remoteserverUrl: commonOptions.remoteserverUrl,
        testData: commonOptions.testData,
        testMode: commonOptions.testMode
    }
};
exports.commandInfo = {
    remoteserver: {
        command: `${scriptsUtil.TestConfig.REMOTESERVER} [options]`,
        describe: 'run tests with remote server configuration'
    },
    loadRemoteserver: {
        command: `${scriptsUtil.TestConfig.LOADREMOTESERVER} [options]`,
        describe: 'load test a remoteserver configuration'
    },
    serverIndependent: {
        command: `${scriptsUtil.TestConfig.SERVER_INDEPENDENT} [options]`,
        describe: 'run tests which do not depend on the server'
    },
    e2e: {
        command: `${scriptsUtil.TestConfig.E2E} [options]`,
        describe: 'run tests with end to end configuration'
    }
};
exports.getOptionsMainProcess = function (configuration) {
    if (configuration === scriptsUtil.TestConfig.REMOTESERVER) {
        return {
            ...exports.options.remoteserverOptionsMainProcess,
            ...exports.options.remoteserverOptionsCommon
        };
    }
    else if (configuration === scriptsUtil.TestConfig.LOADREMOTESERVER) {
        return {
            ...exports.options.loadRemoteserverMainProcess,
            ...exports.options.loadRemoteserverOptionsCommon
        };
    }
    else if (configuration === scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
        return {
            ...exports.options.serverIndependentOptionsMainProcess,
            ...exports.options.serverIndependentOptionsCommon
        };
    }
    else if (configuration === scriptsUtil.TestConfig.E2E) {
        return {
            ...exports.options.e2eOptions
        };
    }
    else {
        throw new Error('Invalid configuration');
    }
};
exports.getOptionsSubProcess = function (configuration) {
    if (configuration === scriptsUtil.TestConfig.REMOTESERVER) {
        return {
            ...exports.options.remoteserverOptionsCommon
        };
    }
    else if (configuration === scriptsUtil.TestConfig.LOADREMOTESERVER) {
        return {
            ...exports.options.loadRemoteserverOptionsCommon
        };
    }
    else if (configuration === scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
        return {
            ...exports.options.serverIndependentOptionsCommon
        };
    }
    else if (configuration === scriptsUtil.TestConfig.E2E) {
        throw new Error('E2E has no sub processes');
    }
    else {
        throw new Error('Invalid configuration');
    }
};
