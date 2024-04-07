"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._refreshDatabase = exports.createOldOverviewsDBFile = exports._refreshDatabaseDelete = exports.getDbBackupBasePath = exports.removeBackup = exports.restoreFromBackupAndDelete = exports.createBackup = exports.packagePresentAndValidityChecks = exports.updateOption = exports.updateResultAsMap = exports.refreshMessageLevel = exports.Option = void 0;
const path = require("path");
const fs = require("fs-extra");
const vars_1 = require("../vars");
const rexdb_1 = require("../../rexdb/lib/rexdb");
const macrosBuilder = require("./macros");
const devicesBuilder = require("./devices");
const devtoolsBuilder = require("./devtools");
const resourcesBuilder = require("./resources");
const indexer_1 = require("./indexer");
const compacter_1 = require("./compacter");
const rexError_1 = require("../../utils/rexError");
const dbBuilderUtils_1 = require("./dbBuilderUtils");
const versioning = require("../versioning");
const package_helpers_1 = require("../../handoff/package-helpers");
var Option;
(function (Option) {
    Option[Option["URL"] = 0] = "URL";
    Option[Option["SCHEMA"] = 1] = "SCHEMA";
    Option[Option["REFRESH_SCHEMA"] = 2] = "REFRESH_SCHEMA";
    Option[Option["ALL"] = 3] = "ALL"; // all, with only latest versions
})(Option || (exports.Option = Option = {}));
exports.refreshMessageLevel = {
    [0 /* RefreshMessageLevel.NONE */]: 'info',
    [1 /* RefreshMessageLevel.WARNING */]: 'warning',
    [2 /* RefreshMessageLevel.ERROR_CONTINUE */]: 'error',
    [3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */]: 'critical',
    [4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */]: 'emergency'
};
async function updateResultAsMap(logger, operation, fullPackageList, refreshAll, resultAsMap, statusMap, dbBasePath) {
    const refreshPackageList = refreshAll
        ? fullPackageList
        : fullPackageList.filter((item) => item.operation === operation);
    const result = refreshPackageList.map((item) => {
        const msgLevel = statusMap.get(item.uid);
        let refreshResultEntry;
        switch (msgLevel) {
            case 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */:
            case 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */:
            case 2 /* RefreshMessageLevel.ERROR_CONTINUE */:
                refreshResultEntry = { actionResult: "failed" /* PackageRefreshResult.FAILED */, msgLevel };
                break;
            case 1 /* RefreshMessageLevel.WARNING */:
                refreshResultEntry = { actionResult: "succeeded" /* PackageRefreshResult.SUCCEEDED */, msgLevel };
                break;
            case 0 /* RefreshMessageLevel.NONE */:
                if (item.operation === "doNothing" /* RefreshOperation.DO_NOTHING */) {
                    if (refreshAll) {
                        refreshResultEntry = {
                            actionResult: "succeeded" /* PackageRefreshResult.SUCCEEDED */,
                            msgLevel
                        };
                    }
                    else {
                        refreshResultEntry = {
                            actionResult: "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */,
                            msgLevel
                        };
                    }
                }
                else {
                    refreshResultEntry = { actionResult: "succeeded" /* PackageRefreshResult.SUCCEEDED */, msgLevel };
                }
                break;
            default:
                refreshResultEntry = {
                    actionResult: "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */,
                    msgLevel
                };
        }
        const refreshResult = {
            package: item,
            status: refreshResultEntry
        };
        if (refreshAll && item.operation === "doNothing" /* RefreshOperation.DO_NOTHING */) {
            refreshResult.package.operation = "updatedPackage" /* RefreshOperation.UPDATED_PACKAGE */;
        }
        return refreshResult;
    });
    const refreshSucceeded = !result.some((entry) => entry.status.actionResult === "failed" /* PackageRefreshResult.FAILED */);
    // check if we have the status for all the packages that were requested; if not report them as NOTSTARTED
    const requestMap = new Map();
    refreshPackageList.forEach((item) => {
        requestMap.set(item.uid, item);
    });
    result.forEach((item) => {
        const uid = item.package.uid;
        resultAsMap.set(uid, item);
        requestMap.delete(uid);
    });
    for (const key of requestMap.keys()) {
        const refreshResultEntry = {
            actionResult: "not started" /* PackageRefreshResult.NOTSTARTED */
        };
        resultAsMap.set(key, {
            package: requestMap.get(key),
            status: refreshResultEntry
        });
    }
    if (!refreshSucceeded) {
        // print summary of failed packages
        logger.error(`Refresh result for ${operation || 'refreshAll'} phase failed:`);
        for (const key of resultAsMap.keys()) {
            const result = resultAsMap.get(key).status.actionResult;
            if (result !== "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */ &&
                result !== "succeeded" /* PackageRefreshResult.SUCCEEDED */) {
                logger.error(key + ' : ' + result);
            }
        }
        // TODO Oliver: move out of this function
        await restoreFromBackupAndDelete(logger, dbBasePath);
    }
    return refreshSucceeded;
}
exports.updateResultAsMap = updateResultAsMap;
function updateOption(validationType) {
    let option = Option.REFRESH_SCHEMA;
    if (!validationType) {
        option = Option.REFRESH_SCHEMA; // option stays the same
    }
    switch (validationType) {
        case 'url':
            option = Option.URL;
            break;
        case 'schema':
            option = Option.SCHEMA;
            break;
        case 'refresh':
            option = Option.REFRESH_SCHEMA;
            break;
        case 'all':
            option = Option.ALL;
            break;
    }
    return option;
}
exports.updateOption = updateOption;
async function packagePresentAndValidityChecks(originalFullPackageList, contentBasePath, logger, validationType) {
    let allValid = true;
    const resultAsMap = new Map();
    const pkgUIdToPathMap = new Map();
    const latestDevPkgMap = new Map();
    const latestSoftwarePkgMap = new Map();
    for (const packageEntry of originalFullPackageList) {
        // check if package folder exists
        const filepath = path.join(contentBasePath, packageEntry.content);
        const uid = packageEntry.uid;
        if (!(await fs.pathExists(filepath))) {
            if (packageEntry.operation === "removePackage" /* RefreshOperation.REMOVE_PACKAGE */) {
                logger.warning('Package path not found: ' + filepath);
                resultAsMap.set(uid, {
                    package: packageEntry,
                    status: {
                        actionResult: "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */
                        // TODO Oliver: The package should still be removed even though the package
                        //  folder no longer exists. Is this the case?
                    }
                });
            }
            else {
                logger.error('Package path not found: ' + filepath);
                resultAsMap.set(uid, {
                    package: packageEntry,
                    status: {
                        actionResult: "not found" /* PackageRefreshResult.NOTFOUND */
                    }
                });
                allValid = false;
            }
            continue;
        }
        // check if package.tirex.json exists
        const jsonPath = packageEntry.modulePrefix
            ? (await (0, package_helpers_1.getAllPackageTirexJsonPaths)(filepath)).find((item) => packageEntry.modulePrefix && item.includes(packageEntry.modulePrefix))
            : await (0, package_helpers_1.getPackageTirexJsonPath)(filepath);
        if (!jsonPath || !(await fs.pathExists(jsonPath))) {
            logger.error('package.tirex.json file not found: ' + jsonPath);
            resultAsMap.set(uid, {
                package: packageEntry,
                status: {
                    actionResult: "not found" /* PackageRefreshResult.NOTFOUND */
                }
            });
            allValid = false;
            continue;
        }
        // replace: check if package uids match
        const [data] = await fs.readJSON(jsonPath);
        const packageUId = (0, dbBuilderUtils_1.formUid)(data.id, data.version);
        if (packageEntry.operation === "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */ && packageUId !== uid) {
            const errmsg = 'UId requested: ' +
                uid +
                ' does not match the UId: ' +
                packageUId +
                ' in the package specified at ' +
                filepath;
            logger.error(errmsg);
            resultAsMap.set(uid, {
                package: packageEntry,
                status: {
                    actionResult: "not found" /* PackageRefreshResult.NOTFOUND */
                }
            });
            allValid = false;
            continue;
        }
        // device/devtool packages: only keep the latest versions
        // note: an attempt to add/replace an older h/w package version will result in an error
        // since it was likely done by mistake; an attempt to remove an older package will not
        // result in an error
        if (data.type === 'devices' || data.type === 'devtools') {
            if (latestDevPkgMap.has(data.id)) {
                let oldVersion;
                const devPkgInfo = latestDevPkgMap.get(data.id);
                let refreshOldDevPackageError;
                if (versioning.gtr(data.version, devPkgInfo.version)) {
                    // the current one is the more recent version
                    latestDevPkgMap.set(data.id, {
                        version: data.version,
                        operation: packageEntry.operation
                    });
                    // mark old package as excluded
                    oldVersion = devPkgInfo.version;
                    const packageUidOld = (0, dbBuilderUtils_1.formUid)(data.id, oldVersion);
                    const r = resultAsMap.get(packageUidOld);
                    if (r.package.operation === "doNothing" /* RefreshOperation.DO_NOTHING */ ||
                        r.package.operation === "removePackage" /* RefreshOperation.REMOVE_PACKAGE */) {
                        r.package.operation = "excludePackage" /* RefreshOperation.EXCLUDE_PACKAGE */;
                        r.status.actionResult = "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */;
                    }
                    else {
                        // disallow explicit add/replace of an older version since it would just be ignored
                        refreshOldDevPackageError = true;
                        r.status.actionResult = "failed" /* PackageRefreshResult.FAILED */;
                    }
                    // TODO Oliver: It would be nicer to set the actionResult as, say, EXCLUDED
                    // instead of changing the requested operation (mainly to get better logs of the
                    // result showing what was requested and what actually happened) but this would
                    // break assumptions elsewhere (and the tests) that expect NOTAPPLICABLE and
                    // changing this would require more extensive changes.
                }
                else {
                    // the one we already recorded is the more recent version
                    // mark current packaged as excluded
                    oldVersion = data.version;
                    if (packageEntry.operation === "doNothing" /* RefreshOperation.DO_NOTHING */ ||
                        packageEntry.operation === "removePackage" /* RefreshOperation.REMOVE_PACKAGE */) {
                        packageEntry.operation = "excludePackage" /* RefreshOperation.EXCLUDE_PACKAGE */;
                    }
                    else {
                        // disallow explicit add/replace of an older version since it would just be ignored
                        refreshOldDevPackageError = true;
                        resultAsMap.set(uid, {
                            package: packageEntry,
                            status: {
                                actionResult: "failed" /* PackageRefreshResult.FAILED */
                            }
                        });
                    }
                }
                logger.info(`Multiple versions of device/devtool package ${data.id} found. ` +
                    `Only the latest version will be used. Dropping old version ${oldVersion}`);
                if (refreshOldDevPackageError) {
                    allValid = false;
                    const packageUidForError = (0, dbBuilderUtils_1.formUid)(data.id, oldVersion);
                    logger.error(`A refresh operation was requested for device/devtool package ${packageUidForError}` +
                        ` but cannot be performed because it is an older version. Only the latest version can be refreshed.`);
                    continue;
                }
            }
            else {
                latestDevPkgMap.set(data.id, {
                    version: data.version,
                    operation: packageEntry.operation
                });
            }
        }
        else {
            if (validationType === 'url' || validationType === 'all') {
                // software packages: only keep the latest version for URL validation
                if (latestSoftwarePkgMap.has(data.id)) {
                    let oldVersion;
                    const PkgInfo = latestSoftwarePkgMap.get(data.id);
                    if (versioning.gtr(data.version, PkgInfo.version)) {
                        // the current one is the more recent version
                        latestSoftwarePkgMap.set(data.id, {
                            version: data.version,
                            operation: packageEntry.operation
                        });
                        oldVersion = PkgInfo.version;
                    }
                    else {
                        // the one we already recorded is the more recent version
                        oldVersion = data.version;
                    }
                    logger.info(`Multiple versions of software package ${data.id} found. Only the latest version will be used. Dropping old version ${oldVersion}`);
                }
                else {
                    latestSoftwarePkgMap.set(data.id, {
                        version: data.version,
                        operation: packageEntry.operation
                    });
                }
            }
        }
        if (pkgUIdToPathMap.has(packageUId)) {
            const errmsg = `Only one operation allowed per UId: ${packageUId}`;
            logger.error(errmsg);
            allValid = false;
        }
        else {
            pkgUIdToPathMap.set(packageUId, packageEntry.content);
        }
        resultAsMap.set(uid, {
            package: packageEntry,
            status: {
                actionResult: packageEntry.operation === "doNothing" /* RefreshOperation.DO_NOTHING */ ||
                    packageEntry.operation === "excludePackage" /* RefreshOperation.EXCLUDE_PACKAGE */
                    ? "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */
                    : "not started" /* PackageRefreshResult.NOTSTARTED */
            }
        });
    }
    const latestPkgMap = new Map([...latestSoftwarePkgMap, ...latestDevPkgMap]);
    // if there's any refresh operation on a latest device/devtool package, we have to do a full refresh
    // TODO Oliver: REMOVE_PACKAGE is handled by the calling function, ideally this code should be moved in here...
    const refreshAll = Array.from(latestDevPkgMap.values()).some((e) => ["addPackage" /* RefreshOperation.ADD_PACKAGE */, "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */].includes(e.operation));
    // remove excluded device/devtool packages from the package list to refresh
    const excludedPackageUids = Array.from(resultAsMap.values())
        .filter((r) => r.package.operation === "excludePackage" /* RefreshOperation.EXCLUDE_PACKAGE */)
        .map((r) => r.package.uid);
    const fullPackageList = originalFullPackageList.filter((e) => !excludedPackageUids.includes(e.uid));
    return { allValid, refreshAll, fullPackageList, latestDevPkgMap, resultAsMap, latestPkgMap };
}
exports.packagePresentAndValidityChecks = packagePresentAndValidityChecks;
async function createBackup(override, dbBasePath) {
    const dbBackupBasePath = getDbBackupBasePath(dbBasePath);
    if (!override && (await fs.pathExists(dbBackupBasePath))) {
        throw new rexError_1.RexError({
            message: `Refresh DB backup folder already exists (should not exist). Needs manual maintenance. Location: ${dbBackupBasePath}`
        });
    }
    try {
        await fs.emptyDir(dbBackupBasePath);
        await fs.copy(dbBasePath, dbBackupBasePath);
    }
    catch (err) {
        throw new rexError_1.RexError({
            message: `Failed to create backup by copying from ${dbBasePath} to ${dbBackupBasePath}`,
            causeError: err
        });
    }
}
exports.createBackup = createBackup;
async function restoreFromBackupAndDelete(logger, dbBasePath) {
    const dbBackupBasePath = getDbBackupBasePath(dbBasePath);
    if (!(await fs.pathExists(dbBackupBasePath))) {
        logger.warning(`Not restoring refresh DB from backup since no backup exists`);
        return;
    }
    try {
        await fs.emptyDir(dbBasePath);
        // copy instead of move so that if something goes wrong we don't lose the backup
        await fs.copy(dbBackupBasePath, dbBasePath);
        await fs.remove(dbBackupBasePath);
    }
    catch (err) {
        throw new rexError_1.RexError({
            message: `Failed to restore refresh DB from backup folder at ${dbBackupBasePath}`,
            causeError: err
        });
    }
    logger.info(`Restored refresh DB from backup`);
}
exports.restoreFromBackupAndDelete = restoreFromBackupAndDelete;
async function removeBackup(dbBasePath) {
    await fs.remove(getDbBackupBasePath(dbBasePath));
}
exports.removeBackup = removeBackup;
function getDbBackupBasePath(dbBasePath) {
    return dbBasePath + '-backup';
}
exports.getDbBackupBasePath = getDbBackupBasePath;
async function _refreshDatabaseDelete({ logger, packageUIds, dbs, dbBasePath }) {
    const { dbResources, dbOverviews } = dbs;
    logger.info('Refreshing databases (Delete). Please wait...');
    const statusResultMap = new Map();
    // We start with all being in EMERGENCY
    packageUIds.forEach((packageUId) => {
        statusResultMap.set(packageUId, 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */);
    });
    // The resources.db should be deleted in all conditions since it only contains compressed and
    // index files which we do at the end for all requests
    const rpath = path.join(dbBasePath, 'resources.db');
    if (fs.existsSync(rpath)) {
        await fs.remove(rpath);
    }
    for (const packageUId of packageUIds) {
        try {
            await dbResources.removeAsync({ packageUId });
            await dbOverviews.removeAsync({ packageUId });
            statusResultMap.set(packageUId, 0 /* RefreshMessageLevel.NONE */);
        }
        catch (err) {
            logger.emergency(`Fatal error while deleting package ${packageUId}`);
            logger.emergency(err.toString());
            throw err;
        }
    }
    // re-generate old overviews.db file for 3.x
    await createOldOverviewsDBFile(dbOverviews, dbBasePath, logger);
    // generate indices for resource and overview DBs (uses the saved db files)
    logger.info('Generating indices...');
    try {
        await (0, indexer_1.index)(dbBasePath);
    }
    catch (err) {
        logger.error('Indexing aborted due to error: ' + err.message);
        throw err;
    }
    // for tirex 3 we remove fields that are no longer needed after having indexed them
    // for tirex 4 we keep the original in resources_full.db which is then used by db-import (sqldb)
    logger.info('Compacting resources_full.db');
    try {
        await (0, compacter_1.compact)(dbBasePath);
    }
    catch (err) {
        logger.error('Compacting aborted due to error: ' + err.message);
        throw err;
    }
    logger.info('Success! Deleting from DB');
    return statusResultMap;
}
exports._refreshDatabaseDelete = _refreshDatabaseDelete;
async function createOldOverviewsDBFile(dbOverviews, dbBasePath, logger) {
    // When using SplitDB for Overviews we still need to create the old
    // single file overviews.db which we need for 3.x support
    const dir = dbOverviews.getDir();
    const files = fs.readdirSync(dir);
    const regex = new RegExp(indexer_1.regexNotIndex);
    const nonIndexFiles = files.filter((text) => {
        return regex.test(text);
    });
    let overviewArray = new Array();
    nonIndexFiles.map((file) => (overviewArray = overviewArray.concat(fs.readJsonSync(path.join(dir, file)))));
    const singleOverviewsFile = path.join(dbBasePath, 'overviews.db');
    await fs.remove(singleOverviewsFile);
    // Write the single file consisting of the aggregate of all the Overviews
    const dbOverviewsTemp = new rexdb_1.RexDB(logger, singleOverviewsFile);
    await dbOverviewsTemp.insertAsync(overviewArray);
    await dbOverviewsTemp.saveAsync();
}
exports.createOldOverviewsDBFile = createOldOverviewsDBFile;
/**
 * Refresh the database.
 *
 */
async function _refreshDatabase({ contentPackages, dbs, refreshAll, packageUids, contentBasePath, dbBasePath, logger }) {
    const statusResultMap = new Map();
    if (contentPackages.length === 0) {
        logger.info('No packages to refresh.');
        return statusResultMap;
    }
    const contentPathToUIdMap = new Map();
    for (let i = 0; i < contentPackages.length; i++) {
        contentPathToUIdMap.set(contentPackages[i].path, packageUids[i]);
    }
    const { dbDevices, dbDevtools, dbResources, dbOverviews, dbPureBundles } = dbs;
    const macros = {};
    logger.info('Refreshing databases. Please wait...');
    // The resources.db should be deleted in all conditions since it only contains compressed and index files which we
    // do at the end for all requests
    await fs.remove(path.join(dbBasePath, 'resources.db'));
    if (refreshAll) {
        logger.info(`Performing FULL refresh: deleting all databases`);
        for (const dbItem of [dbDevices, dbDevtools, dbResources, dbOverviews, dbPureBundles]) {
            await dbItem.removeAsync({});
        }
    }
    else {
        logger.info(`Performing INDIVIDUAL refresh`);
    }
    for (const contentPackage of contentPackages) {
        logger.info(`Refreshing macros from ${contentPackage.path}`);
        try {
            await macrosBuilder.refresh(contentPackage.path, macros, contentBasePath, logger);
        }
        catch (err) {
            const msgLevel = err.refreshMessageLevel;
            if (err.refreshMessageLevel === 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */) {
                logger.emergency('An error occurred while refreshing macros');
                logger.emergency((0, rexError_1.stringifyError)(err));
                throw err;
            }
            else if (err.refreshMessageLevel === 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */) {
                updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
                logger.critical('An error occurred while refreshing macros');
                logger.critical((0, rexError_1.stringifyError)(err));
                continue;
            }
            else {
                throw err;
            }
        }
        logger.info(`Done refreshing macros from ${contentPackage.path}`);
    }
    if (refreshAll) {
        for (const contentPackage of contentPackages) {
            logger.info(`Refreshing devices from ${contentPackage.path}`);
            try {
                const msgLevel = await devicesBuilder.refresh(contentPackage.path, dbs.dbDevices, macros[contentPackage.path], contentBasePath, contentPackage.modulePrefix, logger);
                updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
            }
            catch (err) {
                const msgLevel = err.refreshMessageLevel;
                if (err.refreshMessageLevel === 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */) {
                    updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
                    logger.critical('An error occurred while refreshing resources');
                    logger.critical((0, rexError_1.stringifyError)(err));
                }
                else {
                    logger.emergency('An error occurred while refreshing devices');
                    logger.emergency((0, rexError_1.stringifyError)(err));
                    throw err;
                }
            }
            logger.info(`Done refreshing devices from ${contentPackage.path}`);
        }
        for (const contentPackage of contentPackages) {
            logger.info(`Refreshing main devtools from ${contentPackage.path}`);
            try {
                const msgLevel = await devtoolsBuilder.refresh('main', contentPackage.path, dbs.dbDevtools, dbs.dbDevices, macros[contentPackage.path], contentBasePath, contentPackage.modulePrefix, logger);
                updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
            }
            catch (err) {
                const msgLevel = err.refreshMessageLevel;
                if (err.refreshMessageLevel === 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */) {
                    updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
                    logger.critical('An error occurred while refreshing resources');
                    logger.critical((0, rexError_1.stringifyError)(err));
                }
                else {
                    logger.emergency('An error occurred while refreshing devtools');
                    logger.emergency((0, rexError_1.stringifyError)(err));
                    throw err;
                }
            }
            logger.info(`Done refreshing main devtools from ${contentPackage.path}`);
        }
        for (const contentPackage of contentPackages) {
            logger.info(`Refreshing aux devtools from ${contentPackage.path}`);
            try {
                const msgLevel = await devtoolsBuilder.refresh('aux', contentPackage.path, dbs.dbDevtools, dbs.dbDevices, macros[contentPackage.path], contentBasePath, contentPackage.modulePrefix, logger);
                updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
            }
            catch (err) {
                const msgLevel = err.refreshMessageLevel;
                if (err.refreshMessageLevel === 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */) {
                    updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
                    logger.critical('An error occurred while refreshing resources');
                    logger.critical((0, rexError_1.stringifyError)(err));
                }
                else {
                    logger.emergency('An error occurred while refreshing devtools');
                    logger.emergency((0, rexError_1.stringifyError)(err));
                    throw err;
                }
            }
            logger.info(`Done refreshing aux devtools from ${contentPackage.path}`);
        }
    }
    let orderedPackages = contentPackages.slice();
    for (const contentPackage of contentPackages) {
        const metadataDir = await (0, dbBuilderUtils_1.getMetadataDir)(contentBasePath, contentPackage.path);
        const [{ supplements, moduleOf }] = await fs.readJson(path.join(contentBasePath, contentPackage.path, metadataDir, `${contentPackage.modulePrefix || ''}${vars_1.Vars.PACKAGE_TIREX_JSON}`));
        if (supplements || moduleOf) {
            // put supplemental & module packages at the end
            orderedPackages = orderedPackages.filter((pkg) => {
                const isContentPackage = pkg.path === contentPackage.path &&
                    pkg.modulePrefix === contentPackage.modulePrefix;
                return !isContentPackage;
            });
            orderedPackages.push(contentPackage);
        }
    }
    for (const contentPackage of contentPackages) {
        const metadataDir = await (0, dbBuilderUtils_1.getMetadataDir)(contentBasePath, contentPackage.path);
        const [{ moduleGroup }] = await fs.readJson(path.join(contentBasePath, contentPackage.path, metadataDir, `${contentPackage.modulePrefix || ''}${vars_1.Vars.PACKAGE_TIREX_JSON}`));
        if (moduleGroup) {
            // put moduleGroup packages at the end
            orderedPackages = orderedPackages.filter((pkg) => {
                const isContentPackage = pkg.path === contentPackage.path &&
                    pkg.modulePrefix === contentPackage.modulePrefix;
                return !isContentPackage;
            });
            orderedPackages.push(contentPackage);
        }
    }
    for (const contentPackage of orderedPackages) {
        logger.info(`Refreshing resources from ${contentPackage.path}`);
        try {
            const msgLevel = await resourcesBuilder.refresh(contentPackage.path, contentPackage.order, contentPackage.installPath, contentPackage.installCommand, contentPackage.installSize, contentPackage.modulePrefix, vars_1.Vars.PACKAGE_AUX_DATA_FILE, dbs.dbResources, dbs.dbOverviews, dbs.dbPureBundles, dbs.dbDevices, dbs.dbDevtools, macros[contentPackage.path], contentBasePath, logger);
            updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
        }
        catch (err) {
            const msgLevel = err.refreshMessageLevel;
            if (err.refreshMessageLevel === 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */) {
                logger.emergency('An error occurred while refreshing resources');
                logger.emergency((0, rexError_1.stringifyError)(err));
                throw err;
            }
            else if (err.refreshMessageLevel === 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */) {
                updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
                logger.critical('An error occurred while refreshing resources');
                logger.critical((0, rexError_1.stringifyError)(err));
                continue;
            }
            else {
                throw err;
            }
        }
        await dbResources.saveAsync();
        // unload refreshed resources to ease memory pressure
        await dbResources.useAsync([]);
        logger.info(`Done refreshing resources from ${contentPackage.path}`);
    }
    logger.info('Done refreshing all packages');
    // TINA: Check existance of dependent packages
    for (const contentPackage of contentPackages) {
        const packagePath = contentPackage.path;
        logger.info(`Start validating dependent packages for ${packagePath}`);
        const metadataDir = await (0, dbBuilderUtils_1.getMetadataDir)(contentBasePath, packagePath);
        let packageMetadata;
        try {
            const result = await (0, dbBuilderUtils_1.getPackageMetadataAsync)(contentBasePath, packagePath, metadataDir, macros[packagePath], contentPackage.modulePrefix, vars_1.Vars.PACKAGE_AUX_DATA_FILE, logger);
            packageMetadata = result.packageMetadata;
        }
        catch (err) {
            const msgLevel = err.refreshMessageLevel;
            if (err.refreshMessageLevel === 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */) {
                logger.emergency('An error occurred while checking dependencies');
                logger.emergency((0, rexError_1.stringifyError)(err));
                throw err;
            }
            else if (err.refreshMessageLevel === 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */) {
                updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap);
                logger.critical('An error occurred while checking dependencies');
                logger.critical((0, rexError_1.stringifyError)(err));
            }
            else {
                throw err;
            }
        }
        if (!packageMetadata) {
            continue;
        }
        const packageUId = (0, dbBuilderUtils_1.formUid)(packageMetadata.id, packageMetadata.version);
        const packageOverview = await dbOverviews.findOneAsync({
            packageUId,
            resourceType: 'packageOverview'
        });
        if (packageOverview !== null && packageOverview.dependencies) {
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < packageOverview.dependencies.length; i++) {
                const dependency = packageOverview.dependencies[i];
                if (dependency.require && dependency.require === 'mandatory') {
                    const dependencyPackageOverview = await dbOverviews.findOneAsync({
                        packageId: dependency.refId,
                        packageVersion: dependency.version,
                        resourceType: 'packageOverview'
                    });
                    if (dependencyPackageOverview == null) {
                        const dependencyPackageOverviews = await dbOverviews.findAsync({
                            resourceType: 'packageOverview',
                            packageId: dependency.refId
                        });
                        if (dependencyPackageOverviews.length !== 0) {
                            const compatibleDependencyPackageOverviews = dependencyPackageOverviews.filter((overview) => versioning.satisfies(overview.version, dependency.versionRange));
                            if (compatibleDependencyPackageOverviews.length !== 0) {
                                continue;
                            }
                            logger.warning(`[${path.join(packagePath, metadataDir, vars_1.Vars.PACKAGE_TIREX_JSON)}] Mandatory dependent package not found: ${dependency.refId}__${dependency.version}`);
                            let worstMessageLevel = statusResultMap.get(packageUId) || 0 /* RefreshMessageLevel.NONE */;
                            worstMessageLevel = Math.max(worstMessageLevel, 1 /* RefreshMessageLevel.WARNING */);
                            updateStatusMap(worstMessageLevel, contentPathToUIdMap, contentPackage, statusResultMap);
                        }
                    }
                }
            }
        }
        logger.info(`Done validating dependent packages for ${packagePath}`);
    }
    logger.info('Done validating all dependent packages');
    // save databases
    if (refreshAll) {
        await dbs.dbDevices.saveAsync();
        await dbs.dbDevtools.saveAsync();
    }
    for (const dbItem of [dbOverviews, dbPureBundles]) {
        await dbItem.saveAsync();
    }
    logger.info('Done saving all databases...');
    // TODO: why is this needed
    await dbOverviews.useAllAsync();
    // generate old overviews.db file for 3.x
    await createOldOverviewsDBFile(dbOverviews, dbBasePath, logger);
    // generate indices for resource and overview DBs (uses the saved db files)
    logger.info('Generating indices...');
    try {
        await (0, indexer_1.index)(dbBasePath);
    }
    catch (err) {
        logger.error('Indexing aborted due to error: ' + err.message);
        throw err;
    }
    // for tirex 3 we remove fields that are no longer needed after having indexed them
    // for tirex 4 we keep the original in resources_full.db which is then used by db-import (sqldb)
    logger.info('Compacting resources_full.db');
    try {
        await (0, compacter_1.compact)(dbBasePath);
    }
    catch (err) {
        logger.error('Compacting aborted due to error: ' + err.message);
        throw err;
    }
    return statusResultMap;
}
exports._refreshDatabase = _refreshDatabase;
function updateStatusMap(msgLevel, contentPathToUIdMap, contentPackage, statusResultMap) {
    const packageUid = contentPathToUIdMap.get(contentPackage.path);
    if (!packageUid) {
        throw new Error(`packageUid is unexpectedly undefined`);
    }
    if (!statusResultMap.has(packageUid) ||
        msgLevel > (statusResultMap.get(packageUid) || 0 /* RefreshMessageLevel.NONE */)) {
        statusResultMap.set(packageUid, msgLevel);
    }
}
