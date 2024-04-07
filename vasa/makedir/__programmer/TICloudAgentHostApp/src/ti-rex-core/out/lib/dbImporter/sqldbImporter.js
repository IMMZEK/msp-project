"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDuplicatePackages = exports.discoverPackageGroups = exports.metadataImport = void 0;
const path = require("path");
const fse = require("fs-extra");
const p = require("p-iteration");
const XXH = require("xxhashjs");
const Replace_1 = require("stream-json/filters/Replace");
const Parser_1 = require("stream-json/Parser");
const StreamArray_1 = require("stream-json/streamers/StreamArray");
const stream_chain_1 = require("stream-chain");
const logger_1 = require("../../utils/logger");
const logging_1 = require("../../utils/logging");
const rexError_1 = require("../../utils/rexError");
const dbUpdateInfo_1 = require("./dbUpdateInfo");
const vars_1 = require("../vars");
const rexdb_1 = require("../../rexdb/lib/rexdb");
const findBundle_1 = require("../findBundle");
const manage_1 = require("../../sqldb/manage");
let logger;
async function metadataImport(dinfra, sqldb, dbPathToImport, dBPathPreviouslyImported, options) {
    if (!logger) {
        const dinfraLogger = (0, logger_1.createLogger)(dinfra, 'tirexDbImporter');
        dinfraLogger.setPriority(dinfra.dlog.PRIORITY.INFO);
        const loggerManager = new logging_1.LoggerManager(dinfraLogger);
        logger = loggerManager.createLogger('user');
    }
    logger.notice('Starting DB Metadata Import');
    const filterDevSetId = 'devset__1.0.0.0';
    // prepare incremental import
    let doIncremental = false;
    let importDelta;
    if (options.incremental) {
        if (!dBPathPreviouslyImported) {
            throw new rexError_1.RexError({
                message: 'Must specify the location of the previously imported Refresh DB'
            });
        }
        try {
            importDelta = await determineIncrementalList(dBPathPreviouslyImported, dbPathToImport);
        }
        catch (e) {
            throw new rexError_1.RexError({
                message: 'Failed to determine incremental package list',
                causeError: e
            });
        }
        if (!importDelta.fullImportNeeded) {
            if (importDelta.addPackageUids.length === 0 &&
                importDelta.replacePackageUids.length === 0 &&
                importDelta.deletePackageUids.length === 0) {
                logger.info('Incremental import detected no changes: Not importing anything');
                return false;
            }
            // if there are packages to delete, unpublish them
            let operationPerformed = false;
            if (importDelta.deletePackageUids.length > 0) {
                try {
                    let { packageGroupsDef } = await discoverPackageGroups(dBPathPreviouslyImported, importDelta.deletePackageUids);
                    // special case: a package group may be discovered that has a supplemental
                    // package deleted only. Then we need to add the main package uids of these
                    // groups to the replace list, if they are not already in there, and remove them
                    // from the package group list to delete
                    // note: technically adding the main package to the replace list may not be needed
                    // since deleting a supplemental package will cause the main package overview to be
                    // changed, i.e. it should already be in the replace list; but left it in
                    // for the sake of completeness of the logic
                    const mainPackagesWithSupplementalOnlyDeleted = packageGroupsDef
                        // note: mainPackage should always be defined here otherwise something is wrong
                        .filter(pgd => !importDelta.deletePackageUids.includes(pgd.mainPackage))
                        .map(pgd => pgd.mainPackage);
                    importDelta.replacePackageUids.push(...mainPackagesWithSupplementalOnlyDeleted.filter(uid => !importDelta.replacePackageUids.includes(uid)));
                    packageGroupsDef = packageGroupsDef.filter(pgd => !mainPackagesWithSupplementalOnlyDeleted.includes(pgd.mainPackage));
                    if (!options.dryRun) {
                        for (const packageGroup of packageGroupsDef) {
                            await sqldb.manage.unpublishPackageGroup(packageGroup.uid);
                            operationPerformed = true;
                        }
                    }
                }
                catch (e) {
                    throw new rexError_1.RexError({
                        message: 'Error while unpublishing package groups',
                        causeError: e
                    });
                }
            }
            if (importDelta.replacePackageUids.length > 0 ||
                importDelta.addPackageUids.length > 0) {
                // if there are packages to add/replace put them in the include list
                doIncremental = true;
                const addAndReplaceList = importDelta.addPackageUids.concat(importDelta.replacePackageUids);
                if (options.include) {
                    options.include = options.include.filter(uid => addAndReplaceList.includes(uid));
                }
                else {
                    options.include = addAndReplaceList;
                }
            }
            else {
                logger.info('Incremental import: No packages to add or replace. Finished');
                return operationPerformed;
            }
        }
        else {
            logger.info('Incremental import changed to full import');
        }
    }
    // now do the actual import: either full or incrementally of added/replaced packages
    let packageGroupsDef;
    if (vars_1.Vars.DB_PACKAGE_GROUP_CONFIG_FILE) {
        packageGroupsDef = require(vars_1.Vars.DB_PACKAGE_GROUP_CONFIG_FILE);
    }
    else {
        ({ packageGroupsDef } = await discoverPackageGroups(dbPathToImport, options.include, options.exclude));
    }
    if (options.dryRun) {
        logger.info('Dry run complete. Not importing metadata.');
        return false;
    }
    if (!doIncremental) {
        logger.info('Performing full import...');
        try {
            await sqldb.manage.createDb();
            await sqldb.manage.importFilterDevSet(dbPathToImport, filterDevSetId);
            await sqldb.manage.publishFilterDevSet(filterDevSetId);
            logger.info('New DB created and filter devset imported');
        }
        catch (e) {
            throw new rexError_1.RexError({ message: 'Error doing full import', causeError: e });
        }
    }
    else {
        logger.info('Performing incremental import...');
    }
    try {
        logger.info(`Importing package groups: ${JSON.stringify(packageGroupsDef)}`);
        await sqldb.manage.importPackageGroups(dbPathToImport, packageGroupsDef, filterDevSetId, {
            skipExistingPackages: false,
            verbosity: options.quiet ? manage_1.ConsoleVerbosity.ProgressOnly : manage_1.ConsoleVerbosity.Normal
        });
        sqldb.reset(); // TODO: what is this for?
        for (const packageGroup of packageGroupsDef) {
            await sqldb.manage.publishPackageGroup(packageGroup.uid);
        }
    }
    catch (e) {
        throw new rexError_1.RexError({ message: 'Error while importing package groups', causeError: e });
    }
    if (vars_1.Vars.DB_TABLE_PREFIX !== vars_1.Vars.DB_TABLE_PREFIX_AUTO || options.notify_forTestingOnly) {
        await (0, dbUpdateInfo_1.setLastUpdateInfo)(dinfra);
        await notifyDatabaseUpdated(dinfra, logger);
    }
    logger.info('Metadata import finished');
    let rootNodeId;
    try {
        rootNodeId = await sqldb.tree.getTreeRootId();
    }
    catch (e) {
        throw new rexError_1.RexError({ message: 'Error retrieving the root node', causeError: e });
    }
    logger.info('root node:' + rootNodeId);
    return true;
}
exports.metadataImport = metadataImport;
/**
 * Notify DB of update
 */
function notifyDatabaseUpdated(dinfra, logger) {
    return new Promise((resolve, reject) => {
        dinfra
            .registerService('default/tirexUpdateScript', '0.0.0')
            .on('error', reject)
            .on('registered', () => {
            logger.notice('Sending DatabaseUpdated event to server');
            (0, dbUpdateInfo_1.notifyDatabaseUpdated)(dinfra);
            resolve();
        });
    });
}
/**
 * Discover package groups from overviews.db
 *
 * Output format:
 * [
 *    {
 *      "uid": "devices",
 *      "packages": [ <package UIDs> ... ]
 *  },
 *  {
 *      "uid": "devtools",
 *      "packages": [ <package UIDs> ... ]
 *  },
 *  {
 *      "uid": <package UID of main software package>
 *      "packages": [
 *          <package UID of main software package>,
 *          <package UID of supplemental software package>,
 *          ...
 *      ]
 *  },
 *  ...
 */
async function discoverPackageGroups(dbPath, includedPackageUIds, excludedPackageUIds) {
    const dbOverviews = new rexdb_1.RexDB(logger, path.join(dbPath, 'overviews.db'));
    const _packageRecords = await dbOverviews.findAsync({
        resourceType: 'packageOverview'
    });
    const packageRecords = removeDuplicatePackages(_packageRecords);
    // if any device package is included, add the device package group with all its packages
    const hasDevicePackageRecordsIncluded = packageRecords.some(packageFilter('devices', includedPackageUIds, excludedPackageUIds));
    const devicePackageListAll = packageRecords
        .filter(packageFilter('devices'))
        .map(record => record.packageUId);
    const devicePackageList = hasDevicePackageRecordsIncluded ? devicePackageListAll : [];
    // if any devtool package is included, add the devtool package group with all its packages
    const hasDevtoolPackageRecordsIncluded = packageRecords.some(packageFilter('devtools', includedPackageUIds, excludedPackageUIds));
    const devtoolPackageListAll = packageRecords
        .filter(packageFilter('devtools'))
        .map(record => record.packageUId);
    const devtoolPackageList = hasDevtoolPackageRecordsIncluded ? devtoolPackageListAll : [];
    // handle software main and supplemental packages
    const softwarePackageRecordsAll = packageRecords.filter(packageFilter('software'));
    const softwarePackageListIncludedOnly = packageRecords
        .filter(packageFilter('software', includedPackageUIds, excludedPackageUIds))
        .map(record => record.packageUId);
    function packageFilter(packageType, includedPackageUIds, excludedPackageUIds) {
        return (packageRecord) => {
            // if no include specified, all packages are included by default
            const isIncluded = !includedPackageUIds ||
                (includedPackageUIds &&
                    includedPackageUIds.indexOf(packageRecord.packageUId) !== -1);
            const isNotExcluded = !excludedPackageUIds ||
                (excludedPackageUIds &&
                    excludedPackageUIds.indexOf(packageRecord.packageUId) === -1);
            return packageRecord.type === packageType && isIncluded && isNotExcluded;
        };
    }
    const softwarePackageGroups = [];
    for (const packageRecord of softwarePackageRecordsAll) {
        if (!packageRecord.supplements && !packageRecord.moduleOf) {
            // main software package
            const packageGroup = {
                uid: 'grp_' + packageRecord.packageUId,
                packages: [packageRecord.packageUId],
                mainPackage: packageRecord.packageUId // all other packages are supplemental
            };
            if (packageRecord.dependencies) {
                for (const dependency of packageRecord.dependencies) {
                    const depPackage = await (0, findBundle_1.findLatestBundle)(dependency.refId, dependency.versionRange, dbOverviews);
                    // add supplemental packages if there are any
                    if (depPackage && depPackage.supplements) {
                        packageGroup.packages.push(depPackage.packageUId);
                    }
                }
            }
            if (packageRecord.modules) {
                for (const moduleItem of packageRecord.modules) {
                    const modulePackage = await (0, findBundle_1.findLatestBundle)(moduleItem.refId, moduleItem.versionRange, dbOverviews);
                    // add module packages if there are any
                    if (modulePackage && modulePackage.moduleOf) {
                        packageGroup.packages.push(modulePackage.packageUId);
                    }
                }
            }
            const hasIncludedPackages = packageGroup.packages.some(p => softwarePackageListIncludedOnly.includes(p));
            if (hasIncludedPackages) {
                softwarePackageGroups.push(packageGroup);
            }
        }
    }
    const packageGroupsDef = [];
    if (devicePackageList.length > 0) {
        // TODO: how to version the device and devtool package groups? (REX-2319)
        packageGroupsDef.push({ uid: 'devices__0.0.0', packages: devicePackageList });
    }
    if (devtoolPackageList.length > 0) {
        packageGroupsDef.push({ uid: 'devtools__0.0.0', packages: devtoolPackageList });
    }
    packageGroupsDef.push(...softwarePackageGroups);
    return { packageGroupsDef };
}
exports.discoverPackageGroups = discoverPackageGroups;
/**
 * Remove duplicate packages
 */
function removeDuplicatePackages(packageRecords) {
    return packageRecords
        .sort((a, b) => {
        return a.packageUId > b.packageUId ? 1 : -1;
    })
        .filter((value, index, array) => {
        if (index !== 0 && value.packageUId === array[index - 1].packageUId) {
            logger.warning(`Duplicate package removed from list: ${value}`);
            return false;
        }
        else {
            return true;
        }
    });
}
exports.removeDuplicatePackages = removeDuplicatePackages;
/**
 *  Determine differences between previous and new Refresh DB
 */
async function determineIncrementalList(prevRefreshDBLocation, newRefreshDBLocation) {
    // if no previous DB exists, do full import
    if (!(await fse.pathExists(prevRefreshDBLocation))) {
        return {
            fullImportNeeded: true,
            addPackageUids: [],
            replacePackageUids: [],
            deletePackageUids: []
        };
    }
    // if devices or devtools DB are different, do full import
    // note: devices.db and devtools.db files always exist
    const prevRefreshDBDevices = path.join(prevRefreshDBLocation, 'devices.db');
    const newRefreshDBDevices = path.join(newRefreshDBLocation, 'devices.db');
    const prevRefreshDBDevtools = path.join(prevRefreshDBLocation, 'devtools.db');
    const newRefreshDBDevtools = path.join(newRefreshDBLocation, 'devtools.db');
    if ((await jsonDbFilesNotEqual(prevRefreshDBDevices, newRefreshDBDevices)) ||
        (await jsonDbFilesNotEqual(prevRefreshDBDevtools, newRefreshDBDevtools))) {
        return {
            fullImportNeeded: true,
            addPackageUids: [],
            replacePackageUids: [],
            deletePackageUids: []
        };
    }
    // we can do incremental import: determine which packages have changed
    const prevOverviewLocation = path.join(prevRefreshDBLocation, 'overviews_split.db');
    const newOverviewLocation = path.join(newRefreshDBLocation, 'overviews_split.db');
    const prevResourceLocation = path.join(prevRefreshDBLocation, 'resources_full.db');
    const newResourceLocation = path.join(newRefreshDBLocation, 'resources_full.db');
    const regexNotIndex = /^((?!index).)*$/;
    const prevOverviewFiles = (await fse.readdir(prevOverviewLocation)).filter(item => regexNotIndex.test(item));
    const newOverviewFiles = (await fse.readdir(newOverviewLocation)).filter(item => regexNotIndex.test(item));
    const addPackageUids = newOverviewFiles.filter(file => !prevOverviewFiles.includes(file));
    const deletePackageUids = prevOverviewFiles.filter(file => !newOverviewFiles.includes(file));
    const replacePackageUids = await p.filterSeries(prevOverviewFiles, async (file) => {
        // we use the overviews db file to determine if the same package exists in both locations
        // since a package may or may not have a resources db file, but the overview db file always exists
        if (!newOverviewFiles.includes(file)) {
            // not a replace, package was added or deleted
            return false;
        }
        // package is common to both DB locations
        if (await jsonDbFilesNotEqual(path.join(prevOverviewLocation, file), path.join(newOverviewLocation, file))) {
            // overviews changed: replace package
            return true;
        }
        // overviews are equal, check the resources
        const prevResourceFile = path.join(prevResourceLocation, file);
        const newResourceFile = path.join(newResourceLocation, file);
        const prevResourceFileExists = await fse.pathExists(prevResourceFile);
        const newResourceFileExists = await fse.pathExists(newResourceFile);
        if (prevResourceFileExists && newResourceFileExists) {
            // both resource db files exist, if contents changed replace package
            return jsonDbFilesNotEqual(prevResourceFile, newResourceFile);
        }
        else if (!prevResourceFileExists && !newResourceFileExists) {
            // neither resource file exists, i.e. no change: don't replace package
            return false;
        }
        else {
            // one of the resource db files does not exists, i.e. resources changed: replace package
            return true;
        }
    });
    return {
        fullImportNeeded: false,
        addPackageUids,
        replacePackageUids,
        deletePackageUids
    };
}
async function jsonDbFilesNotEqual(file1, file2) {
    const hash1 = await createHash(file1);
    const hash2 = await createHash(file2);
    return hash1 !== hash2;
    async function createHash(file) {
        const hash = XXH.h64(0);
        await new Promise((resolve, reject) => {
            try {
                const pipeline = (0, stream_chain_1.chain)([
                    fse.createReadStream(file),
                    (0, Parser_1.parser)(),
                    // Remove packageOrder field as it would cause a package to be determined falsely as different if only it's order changed.
                    (0, Replace_1.replace)({ filter: /\bpackageOrder\b/i }),
                    (0, StreamArray_1.streamArray)()
                ]);
                pipeline.on('data', data => {
                    if (data.value) {
                        hash.update(JSON.stringify(data.value));
                    }
                });
                pipeline.on('end', () => {
                    resolve();
                });
            }
            catch (e) {
                reject(e);
            }
        });
        return hash.digest().toString(16);
    }
}
