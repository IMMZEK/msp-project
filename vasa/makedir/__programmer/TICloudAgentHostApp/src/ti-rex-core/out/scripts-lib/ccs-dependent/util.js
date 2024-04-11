/**
 * @module scripts/ccs-dependent/util
 *
 */
'use strict';
// 3rd party modules
const async = require('async');
const JSONStream = require('JSONStream');
const path = require('path');
const _ = require('lodash');
// our modules
const scriptsUtil = require('../util');
const { doGetRequest } = require('../../shared/request-helpers');
const { mapSerially } = require('../../utils/promise-utils');
/**
 * @readonly
 * @enum {String} BuildType
 */
const BuildType = {
    /**  */
    FULL: 'full',
    /**  */
    INCREMENTAL: 'incremental',
    /**  */
    CLEAN: 'clean'
};
exports.BuildType = BuildType;
/**
 * @readonly
 * @enum {string} ResourceType
 */
const ResourceType = {
    /** A project spec file */
    PROJECT_SPEC: 'projectSpec',
    /** A folder containing an energia project */
    PROJECT_ENERGIA: 'project.energia',
    /** A folder containing a ccs project */
    PROJECT_CCS: 'project.ccs',
    /** An importable file */
    FILE_IMPORTABLE: 'file.importable'
};
let counter = 0;
exports.testProjects = function ({ tirexUrl, ccsUrl, logFile, reportFile, exclude = [], backupLocation = null, packages = null, device = null, devtool = null }, callback) {
    // process args
    if (!tirexUrl.endsWith('/')) {
        tirexUrl += '/';
    }
    if (!ccsUrl.endsWith('/')) {
        ccsUrl += '/';
    }
    logFile = scriptsUtil.resolvePath(logFile);
    reportFile = scriptsUtil.resolvePath(reportFile);
    backupLocation = backupLocation && scriptsUtil.resolvePath(backupLocation);
    const args = {};
    async.waterfall([
        callback => {
            async.waterfall([
                callback => {
                    async.parallel([
                        callback => {
                            getImportables({
                                tirexUrl,
                                device,
                                devtool,
                                packages: packages || []
                            }, callback);
                        },
                        callback => {
                            scriptsUtil.setupLog(logFile, callback);
                        },
                        callback => {
                            scriptsUtil.setupLog(reportFile, callback);
                        }
                    ], callback);
                },
                ([importables, logStream, reportFileStream], callback) => {
                    // Setup args
                    args.importables = importables.filter(({ resourceType }) => {
                        return (resourceType === ResourceType.PROJECT_CCS ||
                            resourceType === ResourceType.PROJECT_SPEC);
                    });
                    args.logStream = logStream;
                    args.reportStream = JSONStream.stringify();
                    args.reportFileStream = reportFileStream;
                    // Pipe the json being fed from JSONStream to the file
                    args.reportStream.pipe(reportFileStream);
                    // clear all the existing projects
                    const deleteUrl = `${ccsUrl}deleteProjects`;
                    doGetRequest(deleteUrl).then(() => callback(), callback);
                },
                callback => {
                    // For testing (so you don't have to import every project)
                    // args.importables = args.importables.slice(0, 10);
                    async.mapSeries(args.importables, (importable, callback) => {
                        testProject({
                            importable,
                            ccsUrl,
                            exclude,
                            logStream: args.logStream,
                            reportStream: args.reportStream,
                            backupLocation
                        })
                            .then(result => callback(null, result))
                            .catch(callback);
                    }, (err, result) => {
                        if (err) {
                            return callback(err);
                        }
                        const sum = result.reduce((item1, item2) => {
                            return {
                                total: item1.total + item2.total,
                                failed: item1.failed + item2.failed,
                                error: item1.error + item2.error,
                                skipped: item1.skipped + item2.skipped
                            };
                        }, { total: 0, failed: 0, error: 0, skipped: 0 });
                        callback(err, sum);
                    });
                }
            ], (err, { total = 0, failed = 0, error = 0, skipped = 0 } = {}) => {
                setImmediate(callback, null, err, { total, failed, error, skipped });
            });
        },
        (err, { total, failed, error, skipped }, callback) => {
            // Hack - at this point the only thing left in the event queue is the writestreams,
            // once we call .end() nothing is in the event queue so the process exits.
            // Leverage setInterval to keep the process alive.
            let done = false;
            let intervalFn = null;
            intervalFn = setInterval(() => {
                if (done && intervalFn) {
                    clearInterval(intervalFn);
                }
            }, 200);
            async.parallel([
                callback => {
                    if (args.reportFileStream && args.reportStream) {
                        args.reportFileStream.once('finish', () => {
                            callback();
                        });
                        args.reportStream.end();
                    }
                    else {
                        setImmediate(callback);
                    }
                },
                callback => {
                    if (args.logStream) {
                        args.logStream.once('finish', () => {
                            callback();
                        });
                        args.logStream.end();
                    }
                    else {
                        setImmediate(callback);
                    }
                }
            ], err2 => {
                const errFinal = err || err2;
                if (err) {
                    callback(errFinal);
                }
                else {
                    callback(errFinal, { total, failed, error, skipped, log: logFile });
                }
                done = true;
            });
        }
    ], callback);
};
/**
 * @callback getImportablesCallback
 * @param {Error} error
 * @param {Array.module:scripts/ccs-dependent/test-projects~Importable} importables
 */
/**
 * Get the importables for all devtools
 *
 * @param {Object} args
 *  @param {String} args.tirexUrl
 *  @param {Array.String} args.packages
 * @param {module:scripts/ccs-dependent/util~getImportablesCallback} callback
 */
function getImportables({ tirexUrl, packages, device, devtool }, callback) {
    packages = packages.join('::');
    async.waterfall([
        callback => {
            let url = `${tirexUrl}api/resources?dumpImportables=true`;
            if (packages.length > 0) {
                url += `&package=${packages}`;
            }
            if (device) {
                url += `&device=${device}`;
            }
            if (devtool) {
                url += `&devtool=${devtool}`;
            }
            doGetRequest(url, true).then(({ data }) => {
                callback(null, data);
            }, callback);
        },
        ({ result: importables }, callback) => {
            const locations = importables.map(({ location }) => {
                return location;
            });
            const uniqueImportables = importables.filter(({ location }, index) => {
                // unique by location (indexOf always returns the first index)
                return locations.indexOf(location) === index;
            });
            setImmediate(callback, null, uniqueImportables);
        }
    ], callback);
}
async function testProject({ importable: { location, coreTypes }, ccsUrl, exclude = [], logStream, reportStream, backupLocation }) {
    // results = (
    // {error: string, projectLocation: string, deviceId: string | null} |
    // {error: string,
    // projectLocation: string, deviceId: string | null, configurationName: string, projectName: string}
    // {failed, total, output
    // projectLocation: string, deviceId: string | null, configurationName: string, projectName: string}
    // )[]
    const results = _.flatten(await mapSerially(_.isEmpty(coreTypes) ? [null] : coreTypes, async (deviceId) => {
        let result;
        try {
            result = await testProjectInner({ location, ccsUrl, exclude, deviceId });
        }
        catch (e) {
            console.error(`Error while testing against projectSpec ${location}`);
            console.error(e);
            result = [
                {
                    error: e.toString(),
                    projectLocation: location,
                    deviceId
                }
            ];
        }
        try {
            await cleanWs({ ccsUrl, backupLocation });
        }
        catch (e) {
            console.error(e);
        }
        return result;
    }));
    // Write output + result to logStream + reportStream
    results.forEach(result => {
        if (result.error) {
            logStream.write(`\n Error while testing against projectSpec ${location} \n ${result.error} \n`);
        }
        else {
            logStream.write(result.output);
        }
        if (reportStream) {
            const { error, output, projectLocation, deviceId, configurationName, projectName } = result;
            reportStream.write({
                output: error || output,
                projectLocation,
                deviceId,
                projectName,
                configurationName
            });
        }
    });
    // Sum up the total, failed, error, skipped
    return results
        .map(result => {
        if (result.error) {
            return result.error === 'skipped'
                ? { total: 0, failed: 0, error: 0, skipped: 1 }
                : { total: 0, failed: 0, error: 1, skipped: 0 };
        }
        else {
            return { total: result.total, failed: result.failed, error: 0, skipped: 0 };
        }
    })
        .reduce((item1, item2) => {
        return {
            total: item1.total + item2.total,
            failed: item1.failed + item2.failed,
            error: item1.error + item2.error,
            skipped: item1.skipped + item2.skipped
        };
    }, { total: 0, failed: 0, error: 0, skipped: 0 });
}
exports.testProject = testProject;
///////////////////////////////////////////////////////////////////////////////
/// Internal functions
///////////////////////////////////////////////////////////////////////////////
async function testProjectInner({ location, ccsUrl, exclude, deviceId }) {
    const importData = await importProject({ ccsUrl, location, deviceId, exclude });
    if (importData.error) {
        return [{ error: importData.error }];
    }
    const variants = await getVariants({ ccsUrl });
    if (variants.error) {
        return [{ error: importData.error }];
    }
    return mapSerially(variants, async ({ configurationName, projectName }) => {
        let result;
        try {
            result = await buildProject({ ccsUrl, configurationName, projectName });
            console.log(`Finished ${projectName} for device ${deviceId} with configuration ${configurationName} and projectSpec ${location}`);
        }
        catch (e) {
            console.error(`Error while building ${projectName}`);
            console.error(e);
            result = { error: e.toString() };
        }
        result = {
            ...result,
            projectLocation: location,
            deviceId,
            configurationName,
            projectName
        };
        return result;
    });
}
async function importProject({ ccsUrl, location, exclude, deviceId = null }) {
    let importUrl = `${ccsUrl}importProject?location=${location}&sync=true`;
    if (deviceId) {
        importUrl += `&deviceId=${deviceId}`;
    }
    if (shouldExcludeProject(importUrl, exclude)) {
        return { error: 'skipped' };
    }
    else {
        return doGetRequest(importUrl).then(({ data }) => data);
    }
}
async function getVariants({ ccsUrl }) {
    const listProjectsUrl = `${ccsUrl}listProjects`;
    return doGetRequest(listProjectsUrl).then(({ data }) => {
        if (data.error) {
            return { error: data.error };
        }
        const { projects } = data;
        return _.flattenDeep(projects.map(({ name, buildConfigurations }) => {
            return buildConfigurations.map(configurationName => {
                return {
                    configurationName,
                    projectName: name
                };
            });
        }));
    });
}
async function buildProject({ ccsUrl, configurationName, projectName }) {
    const buildUrl = `${ccsUrl}buildProjects?buildType=${BuildType.FULL}&configurationName=${configurationName}&projectNames=${projectName}&sync=true`;
    return doGetRequest(buildUrl).then(({ data }) => {
        if (data.error) {
            return { error: data.error };
        }
        const { verdict: { failed, total }, output } = data;
        return { failed, total, output };
    });
}
async function cleanWs({ ccsUrl, backupLocation }) {
    const backupLocationInner = backupLocation && path.join(backupLocation, (counter++).toString());
    const deleteUrl = backupLocationInner
        ? `${ccsUrl}deleteProjects?backupLocation=${backupLocationInner}&sync=true`
        : `${ccsUrl}deleteProjects?sync=true`;
    return doGetRequest(deleteUrl).then(({ data }) => data);
}
/**
 * Return true if importUrl matches any of the keywords in excludeList
 *
 * @param {String} importUrl
 * @param {Array.String} excludeList
 *
 * @returns {Boolean} shouldExclude
 */
function shouldExcludeProject(importUrl, excludeList) {
    if (excludeList.length === 0) {
        return false;
    }
    const regex = new RegExp(excludeList.join('|'), 'i');
    return regex.test(importUrl);
}
