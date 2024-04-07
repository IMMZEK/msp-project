'use strict';
const path = require('path');
const util = require('./util');
/**
 * @callback testProjectsCloudCallback
 * @param {Error} error
 * @param {Object} result
 *  @param {number} result.total - The total number of projects tested.
 *  @param {number} result.failed - The total number of projects that failed to import / build.
 *  @param {String} result.log - The log file with all import and build output.
 */
/**
 * Test projects by importing and building them.
 *
 * @param {Object} args
 *  @param {String} args.tirexUrl
 *  @param {String} args.ccsHttpAdapterUrl
 *  @param {Array.String} args.packages - The set of packages we want to test.
 *  @param {Array.String} args.exclude - Set of projects to exclude.
 *  @param {String} args.backupLocation
 *  @param {String} args.device
 *  @param {String} args.devtool
 *  @param {String} args.logFile
 *  @param {String} args.reportFile
 * @param {module:scripts/ccs-dependent/test-projects~testProjectsCloudCallback} callback
 */
exports.testProjectsCloud = function ({ ccsHttpAdapterUrl, ...rest }, callback) {
    util.testProjects({ ccsUrl: ccsHttpAdapterUrl, ...rest }, callback);
};
///////////////////////////////////////////////////////////////////////////////
// Yargs Command config
///////////////////////////////////////////////////////////////////////////////
exports.command = 'test-projects-cloud [options]';
exports.describe =
    'Test all the projects in tirex in a cloud environment, verifying they import and build successfully. Deletes all projects from the workspace then runs an import & build on each project, deleting all projects from the workspace in between each import & build.';
exports.builder = {
    tirexUrl: {
        alias: 't',
        describe: 'The url of the tirex server to connect to',
        demandOption: true
    },
    ccsHttpAdapterUrl: {
        alias: 'c',
        describe: 'The url of the ccs http adapter to connect to',
        demandOption: true
    },
    packages: {
        alias: 'p',
        describe: 'A space separated list of packages in the format packageId__packageVersion (i,.e com.ti.CORE_MSP432_SDK__3.01.00.11_eng)',
        array: true
    },
    exclude: {
        describe: 'A space separated list of project keywords to exclude (i.e., freertos)',
        array: true
    },
    backupLocation: {
        describe: 'Path (absolute or relative) to the location to copy the projects to, before deleting them from workspace. If omitted, no copy is made.'
    },
    device: {
        describe: 'A device name'
    },
    devtool: {
        alias: 'board',
        describe: 'A board name'
    },
    logFile: {
        describe: 'The log file (absolute path or file name)',
        default: path.join(process.cwd(), 'result.log')
    },
    reportFile: {
        describe: 'The report file (absolute path or file name)',
        default: path.join(process.cwd(), 'report.json')
    }
};
exports.handler = function (argv) {
    exports.testProjectsCloud(argv, (err, { total, failed, error, skipped, log } = {}) => {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        else {
            console.log(`Total items imported and built (including dependent items): ${total}`);
            console.log(`Number of items that failed to import and build (including dependent items): ${failed}`);
            console.log(`Number of projects that were not imported and/or built (i.e invalid projectspec, missing dependent product, etc): ${error}`);
            console.log(`Total items skipped intentionally: ${skipped}`);
            console.log(`Finished testing projects; see ${log} for details`);
            process.exit(0);
        }
    });
};
