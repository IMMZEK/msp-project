'use strict';
const async = require('async');
const { doGetRequest } = require('../../shared/request-helpers');
const util = require('./util');
exports.testProject = function ({ ccsUrl, location, deviceId = null }, callback) {
    // process args
    if (!ccsUrl.endsWith('/')) {
        ccsUrl += '/';
    }
    async.series([
        callback => {
            // clear all the existing projects
            const deleteUrl = `${ccsUrl}deleteProjects`;
            doGetRequest(deleteUrl).then(() => callback(), err => callback(err));
        },
        callback => {
            // test the project
            util.testProject({
                importable: { location, coreTypes: deviceId && [deviceId] },
                ccsUrl,
                logStream: process.stdout,
                reportStream: null
            })
                .then(result => callback(null, result))
                .catch(callback);
        }
    ], callback);
};
///////////////////////////////////////////////////////////////////////////////
// Yargs Command config
///////////////////////////////////////////////////////////////////////////////
exports.command = 'test-project [options]';
exports.describe =
    'Test a specific project in either a cloud or desktop environment, verifying it imports and builds successfully.. Deletes all projects from the workspace then runs an import & build.';
exports.builder = {
    ccsUrl: {
        alias: 'c',
        describe: 'The url of the ccs http adapter to connect to',
        demandOption: true
    },
    location: {
        alias: 'l',
        describe: 'The absolute path to the project spec file',
        demandOption: true
    },
    deviceId: {
        alias: 'd',
        describe: 'The deviceId, if applicable'
    }
};
exports.handler = function (argv) {
    exports.testProject(argv, err => {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        else {
            console.log(`Finished testing project`);
            process.exit(0);
        }
    });
};
