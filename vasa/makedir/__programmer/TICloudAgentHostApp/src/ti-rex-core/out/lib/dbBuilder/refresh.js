"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshManager = void 0;
// native modules
const path = require("path");
const fs = require("fs-extra");
// 3rd party modules
const PQueue = require("p-queue");
// our modules
const versioning = require("../versioning");
const rexdb_1 = require("../../rexdb/lib/rexdb");
const rexdb_split_1 = require("../../rexdb/lib/rexdb-split");
const dbBuilder_1 = require("./dbBuilder");
const callbackifyAny_1 = require("../../utils/callbackifyAny");
const rexError_1 = require("../../utils/rexError");
const dbBuilderUtils_1 = require("./dbBuilderUtils");
const vars_1 = require("../vars");
const schema_validator_3_0_1 = require("../../schema-validator/schema-validator-3-0");
const util_1 = require("../../schema-validator/util");
const url_validator_1 = require("../../schema-validator/url-validator");
const readJsonWithComments_1 = require("../../utils/readJsonWithComments");
/**
 * Manages DB Refreshes.
 */
class RefreshManager {
    dbBasePath;
    defaultLogger;
    refreshUsingConfigFileCb = (0, callbackifyAny_1.callbackifyAny)(this.refreshUsingConfigFile);
    refreshQueueP = new PQueue({ concurrency: 1 });
    dbs;
    /**
     * Create a refresh manager.
     * @param dbBasePath
     * @param defaultLogger: this logger is used by refresh except if a custom refresh logger is provided
     * when calling one of the refresh APIs; note though that rexdb will always use the default logger regardless
     * TODO: could enhance rexdb to allow setting a new logger (passed in with indiviudalRefresh) so that we get rexdb
     * logs as part of the refresh log for a handoff submission
     */
    constructor(dbBasePath, defaultLogger) {
        this.dbBasePath = dbBasePath;
        this.defaultLogger = defaultLogger;
        this.createDB();
    }
    createDB() {
        const dbDevices = new rexdb_1.RexDB(this.defaultLogger, path.join(this.dbBasePath, 'devices.db'));
        const dbDevtools = new rexdb_1.RexDB(this.defaultLogger, path.join(this.dbBasePath, 'devtools.db'));
        const dbResources = new rexdb_split_1.RexDBSplit(this.defaultLogger, path.join(this.dbBasePath, 'resources_full.db'));
        const dbOverviews = new rexdb_split_1.RexDBSplit(this.defaultLogger, path.join(this.dbBasePath, 'overviews_split.db'));
        const dbPureBundles = new rexdb_1.RexDB(this.defaultLogger, path.join(this.dbBasePath, 'bundles.db'));
        this.dbs = {
            dbDevices,
            dbDevtools,
            dbResources,
            dbOverviews,
            dbPureBundles
        };
    }
    /**
     * Refresh individual packages
     * Note: if a device/devtool package is in the list a full refresh is performed
     */
    async individualRefresh(fullPackageList, contentBasePath, overrideBackup, logger = this.defaultLogger, forceRefreshAll = false, validationType = 'refresh') {
        const { resultAsMap, success } = await this.refreshLayer(fullPackageList, contentBasePath, overrideBackup, this.dbBasePath, logger, forceRefreshAll, validationType);
        return { result: resultAsMap, success };
    }
    /**
     *
     * Refresh using a config file (e.g. default.json)
     *
     */
    async refreshUsingConfigFile(contentPackagesConfigFile, contentBasePath, validationType, logger = this.defaultLogger) {
        const refreshPackageList = [];
        let packages;
        try {
            packages = await (0, readJsonWithComments_1.readJsonWithComments)(contentPackagesConfigFile);
        }
        catch (err) {
            logger.error(`Failed to read and parse ${contentPackagesConfigFile}: ${err.message}`);
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                message: `Failed to read and parse ${contentPackagesConfigFile}: ${err.message}`,
                causeError: err
            });
        }
        for (const packageEntry of packages) {
            const dirpath = path.join(contentBasePath, packageEntry);
            await fs.stat(dirpath);
            const metadataDir = await (0, dbBuilderUtils_1.getMetadataDir)(contentBasePath, packageEntry);
            const [data] = await fs.readJson(path.join(dirpath, metadataDir, vars_1.Vars.PACKAGE_TIREX_JSON));
            refreshPackageList.push({
                uid: (0, dbBuilderUtils_1.formUid)(data.id, data.version),
                content: packageEntry,
                operation: "doNothing" /* RefreshOperation.DO_NOTHING */,
                installPath: {},
                installCommand: {},
                installSize: {},
                modulePrefix: null
            });
        }
        const overrideBackup = true;
        const result = await this.refreshLayer(refreshPackageList, contentBasePath, overrideBackup, this.dbBasePath, logger, true, // forcing a full refresh here,
        validationType);
        return result;
    }
    async removeBackup() {
        await (0, dbBuilder_1.removeBackup)(this.dbBasePath);
    }
    async queueRefresh(config) {
        config.logger.info('queuing refresh');
        const statusMap = await this.refreshQueueP.add(async () => {
            const statusMap = await this._refreshTask(config);
            return statusMap;
        });
        return statusMap;
    }
    /**
     * Handle a refresh task.
     *
     * No Unique package can be part of more than one list ie add/delete/replace
     * Check for device and devtool list
     */
    async refreshLayer(originalFullPackageList, contentBasePath, overrideBackup, dbBasePath, logger, forceRefreshAll, validationType) {
        const option = (0, dbBuilder_1.updateOption)(validationType);
        const validityResult = await (0, dbBuilder_1.packagePresentAndValidityChecks)(originalFullPackageList, contentBasePath, logger, validationType);
        const { allValid, fullPackageList, resultAsMap, latestDevPkgMap, latestPkgMap } = validityResult;
        let { refreshAll } = validityResult;
        if (!allValid) {
            // return the packageUids that were actually found and not necessarily requested
            // TODO Oliver: why do we do this?
            const foundMap = new Map();
            resultAsMap.forEach(item => {
                foundMap.set(item.package.uid, item);
            });
            return { resultAsMap: foundMap, success: false };
        }
        if (forceRefreshAll) {
            refreshAll = true;
        }
        // Copying db-stages takes extra time on tgrex13, so only back up db-staged for refresh
        if (validationType === 'refresh' || validationType === 'all') {
            await (0, dbBuilder_1.createBackup)(overrideBackup, dbBasePath);
        }
        await this.dbs.dbOverviews.useAllAsync();
        // TODO reintroduce the below condition, at the very least it is needed for remove or replace?
        // TODO Oliver: This looks like it belongs in packagePresentAndValidityChecks()
        // Check packages already in the database that are to be deleted; also update refreshAll if needed
        if (!refreshAll) {
            for (const packageEntry of fullPackageList) {
                if (packageEntry.operation === "removePackage" /* RefreshOperation.REMOVE_PACKAGE */ ||
                    packageEntry.operation === "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */) {
                    let packageOverview;
                    packageOverview = await this.dbs.dbOverviews.findOneAsync({
                        packageUId: packageEntry.uid,
                        resourceType: 'packageOverview'
                    });
                    if (!packageOverview) {
                        if (packageEntry.operation === "removePackage" /* RefreshOperation.REMOVE_PACKAGE */) {
                            logger.warning(`Package with UId ${packageEntry.uid} being deleted is not present in the database`);
                            packageEntry.operation = "doNothing" /* RefreshOperation.DO_NOTHING */;
                            resultAsMap.get(packageEntry.uid).status.actionResult =
                                "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */;
                        }
                        else {
                            logger.info(`Package with UId ${packageEntry.uid}
                                 being replaced is not present in the database. Adding package instead.`);
                            packageEntry.operation = "addPackage" /* RefreshOperation.ADD_PACKAGE */;
                        }
                    }
                    else if (packageOverview &&
                        (packageOverview.type === 'devices' || packageOverview.type === 'devtools')) {
                        refreshAll = true;
                    }
                }
            }
        }
        if (option === dbBuilder_1.Option.SCHEMA || option === dbBuilder_1.Option.REFRESH_SCHEMA || option === dbBuilder_1.Option.ALL) {
            const validationFailed = await schemaValidation(fullPackageList, contentBasePath, logger, refreshAll);
            if (validationFailed) {
                const msg = `Schema validation failed, the package(s) will not be processed.`;
                logger.critical(msg);
                return { resultAsMap, success: false };
            }
            if (option === dbBuilder_1.Option.SCHEMA) {
                return { resultAsMap, success: true };
            }
        }
        let success = true;
        if (option === dbBuilder_1.Option.REFRESH_SCHEMA || option === dbBuilder_1.Option.ALL) {
            if (refreshAll) {
                // Refresh all packages in the list
                const statusMap = await this.queueRefresh({
                    packagePaths: fullPackageList.map(item => item.content),
                    installPaths: fullPackageList.map(item => item.installPath),
                    installCommands: fullPackageList.map(item => item.installCommand),
                    installSizes: fullPackageList.map(item => item.installSize),
                    modulePrefixes: fullPackageList.map(item => item.modulePrefix),
                    packageUids: fullPackageList.map(item => item.uid),
                    refreshAll: true,
                    contentBasePath,
                    logger
                });
                const refreshAllSucceeded = await (0, dbBuilder_1.updateResultAsMap)(logger, null, fullPackageList, true, resultAsMap, statusMap, dbBasePath);
                if (!refreshAllSucceeded) {
                    return { resultAsMap, success: false };
                }
            }
            if (!refreshAll) {
                // Remove packages
                const deleteList = fullPackageList.filter(item => item.operation === "removePackage" /* RefreshOperation.REMOVE_PACKAGE */);
                if (deleteList.length !== 0) {
                    const deleteStatusMap = await this.queueRefresh({
                        packageUids: deleteList.map(p => p.uid),
                        refreshAll: false,
                        remove: true,
                        contentBasePath,
                        logger,
                        installPaths: deleteList.map(item => item.installPath),
                        installCommands: deleteList.map(item => item.installCommand),
                        installSizes: deleteList.map(item => item.installSize),
                        modulePrefixes: deleteList.map(item => item.modulePrefix)
                    });
                    const deleteRefreshSucceeded = await (0, dbBuilder_1.updateResultAsMap)(logger, "removePackage" /* RefreshOperation.REMOVE_PACKAGE */, fullPackageList, false, resultAsMap, deleteStatusMap, dbBasePath);
                    if (!deleteRefreshSucceeded) {
                        return { resultAsMap, success: false };
                    }
                }
                // Add packages
                const addList = fullPackageList.filter(item => item.operation === "addPackage" /* RefreshOperation.ADD_PACKAGE */);
                if (addList.length !== 0) {
                    const addStatusMap = await this.queueRefresh({
                        packagePaths: addList.map(p => p.content),
                        packageUids: addList.map(p => p.uid),
                        refreshAll: false,
                        remove: false,
                        contentBasePath,
                        logger,
                        installPaths: addList.map(item => item.installPath),
                        installCommands: addList.map(item => item.installCommand),
                        installSizes: addList.map(item => item.installSize),
                        modulePrefixes: addList.map(item => item.modulePrefix)
                    });
                    const addRefreshSucceeded = await (0, dbBuilder_1.updateResultAsMap)(logger, "addPackage" /* RefreshOperation.ADD_PACKAGE */, fullPackageList, false, resultAsMap, addStatusMap, dbBasePath);
                    if (!addRefreshSucceeded) {
                        return { resultAsMap, success: false };
                    }
                }
                // Replace packages
                const replaceList = fullPackageList.filter(item => item.operation === "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */);
                for (const item of replaceList) {
                    const deleteForReplaceStatusMap = await this.queueRefresh({
                        packageUids: [item.uid],
                        refreshAll: false,
                        remove: true,
                        contentBasePath,
                        logger,
                        installPaths: [item.installPath],
                        installCommands: [item.installCommand],
                        installSizes: [item.installSize],
                        modulePrefixes: [item.modulePrefix]
                    });
                    const deleteForReplaceRefreshSucceeded = await (0, dbBuilder_1.updateResultAsMap)(logger, "removePackage" /* RefreshOperation.REMOVE_PACKAGE */, fullPackageList, false, resultAsMap, deleteForReplaceStatusMap, dbBasePath);
                    if (!deleteForReplaceRefreshSucceeded) {
                        return { resultAsMap, success: false };
                    }
                    const replaceStatusMap = await this.queueRefresh({
                        packagePaths: [item.content],
                        packageUids: [item.uid],
                        refreshAll: false,
                        remove: false,
                        contentBasePath,
                        logger,
                        installPaths: [item.installPath],
                        installCommands: [item.installCommand],
                        installSizes: [item.installSize],
                        modulePrefixes: [item.modulePrefix]
                    });
                    const replaceRefreshSucceeded = await (0, dbBuilder_1.updateResultAsMap)(logger, "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */, fullPackageList, false, resultAsMap, replaceStatusMap, dbBasePath);
                    if (!replaceRefreshSucceeded) {
                        return { resultAsMap, success: false };
                    }
                }
            }
            // NOTE maybe some of this functionality is being redone in the case of replace operations
            // TODO Oliver: forces all DO_NOTHING to NOTAPPLICABLE... shouldn't need to do this but I remember
            // there was some corner case that made it necessary. Need to find what it was and handle this in
            // a better way...
            const refreshResult = fullPackageList
                .filter(item => item.operation === "doNothing" /* RefreshOperation.DO_NOTHING */)
                .map(item => {
                const entry = {
                    actionResult: "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */
                };
                return { package: item, status: entry };
            });
            // determine overall success of refresh
            success = true;
            refreshResult.forEach(item => {
                if (item.status.actionResult !== "succeeded" /* PackageRefreshResult.SUCCEEDED */ &&
                    item.status.actionResult !== "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */) {
                    success = false;
                }
                resultAsMap.set(item.package.uid, item);
            });
            // print summaries of packages refreshed
            if (refreshAll) {
                logger.info(`A Refresh All was performed`);
                logger.info(`Latest device/devtool packages used: ${[...latestDevPkgMap]
                    .map(([k, v]) => (0, dbBuilderUtils_1.formUid)(k, v.version))
                    .join(' ')}`);
                if (!success) {
                    // print summary of failed packages only
                    for (const key of resultAsMap.keys()) {
                        const result = resultAsMap.get(key).status.actionResult;
                        if (result !== "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */ &&
                            result !== "succeeded" /* PackageRefreshResult.SUCCEEDED */) {
                            logger.error(key + ' : ' + result);
                        }
                    }
                }
            }
            else {
                logger.info(`An Individual Refresh was performed`);
                // print summary of refreshed packages - succeeded and failed
                for (const key of resultAsMap.keys()) {
                    const result = resultAsMap.get(key).status.actionResult;
                    if (result !== "not applicable" /* PackageRefreshResult.NOTAPPLICABLE */) {
                        logger.error(key + ' : ' + result);
                    }
                }
            }
            if (!success) {
                logger.error('REFRESH FAILED');
                await (0, dbBuilder_1.restoreFromBackupAndDelete)(logger, dbBasePath);
            }
            else {
                await (0, dbBuilder_1.removeBackup)(dbBasePath);
                logger.info('REFRESH SUCCEEDED');
            }
        }
        // TINA: URL validation will be skipped unless users specify they want to check URLs.
        if (option === dbBuilder_1.Option.URL || option === dbBuilder_1.Option.ALL) {
            const checkURL = new url_validator_1.UrlValidator(logger, true);
            const startTime = new Date();
            logger.info(`${startTime.toLocaleTimeString()} Start URL checking`);
            (0, util_1.insertBlankLine)(logger);
            const packageMetadataList = new Map();
            for (const packageEntry of fullPackageList) {
                const metadataDir = await (0, dbBuilderUtils_1.getMetadataDir)(contentBasePath, packageEntry.content);
                const packageFile = path.join(contentBasePath, packageEntry.content, metadataDir, `${packageEntry.modulePrefix || ''}${vars_1.Vars.PACKAGE_TIREX_JSON}`);
                if (fs.existsSync(packageFile)) {
                    const [packageMetadata] = await fs.readJSON(packageFile);
                    const { id, version } = (0, dbBuilderUtils_1.splitUid)(packageEntry.uid);
                    (0, util_1.setPackageMetadataList)(packageMetadataList, packageEntry.content, id, version, packageMetadata.type);
                }
            }
            await checkURL.runFileValidation(contentBasePath, refreshAll ? latestPkgMap : getLatestPacakgesToValidate(latestPkgMap), packageMetadataList);
            const endTime = new Date();
            const timeSpent = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
            logger.info(`${endTime.toLocaleTimeString()} End URL Validation`);
            logger.info(`Time spent: ${timeSpent} seconds`);
        }
        return { resultAsMap, success };
    }
    /**
     * Handle a refresh task.
     *
     * @param {Object} config - same as refreshDatabase.
     */
    async _refreshTask({ packagePaths, installPaths, installCommands, installSizes, modulePrefixes, packageUids, refreshAll, remove = false, contentBasePath, logger }) {
        // remove trailing slash
        if (packagePaths) {
            packagePaths = packagePaths.map(pkg => {
                if (pkg.endsWith('/') || pkg.endsWith('\\')) {
                    return pkg.slice(0, pkg.length - 1);
                }
                else {
                    return pkg;
                }
            });
        }
        if (refreshAll) {
            // Refresh All: all device/devtool and software packages in the DB will be replaced with
            // packages listed in packagePaths
            if (!packagePaths) {
                throw new Error('Illegal API call: packagePaths must not be undefined');
            }
            if (remove) {
                throw new Error('Illegal API call: if refreshAll, remove must not be true');
            }
            logger.info('Start processing a Refresh All');
            const contentPackages = packagePaths.map((path, idx) => {
                return {
                    path,
                    order: idx,
                    installPath: installPaths[idx],
                    installCommand: installCommands[idx],
                    installSize: installSizes[idx],
                    modulePrefix: modulePrefixes[idx]
                };
            });
            try {
                const statusResultMap = await (0, dbBuilder_1._refreshDatabase)({
                    contentPackages,
                    packageUids,
                    refreshAll: true,
                    dbs: this.dbs,
                    contentBasePath,
                    dbBasePath: this.dbBasePath,
                    logger
                });
                return statusResultMap;
            }
            catch (err) {
                logger.emergency('Refresh All aborted with error: ');
                logger.critical((0, rexError_1.stringifyError)(err));
                throw err;
            }
        }
        else if (!remove) {
            // Refresh Add: software packages listed in packagePaths are added to the DB
            if (!packagePaths) {
                throw new Error('Illegal API call: packagePaths must not be undefined');
            }
            logger.info('Start processing a Refresh Add');
            await this.dbs.dbOverviews.useAllAsync(); // TODO: why is this needed but not dbResources.useAll()?
            const contentPackages = packagePaths.map((path, idx) => {
                return {
                    path,
                    order: idx,
                    installPath: installPaths[idx],
                    installCommand: installCommands[idx],
                    installSize: installSizes[idx],
                    modulePrefix: modulePrefixes[idx]
                };
            });
            let statusResultMap;
            try {
                statusResultMap = await (0, dbBuilder_1._refreshDatabase)({
                    contentPackages,
                    packageUids,
                    refreshAll: false,
                    dbs: this.dbs,
                    contentBasePath,
                    dbBasePath: this.dbBasePath,
                    logger
                });
            }
            catch (err) {
                logger.emergency('Refresh Add aborted with error' + err.message);
                logger.emergency(JSON.stringify(err, Object.getOwnPropertyNames(err)));
                throw err;
            }
            try {
                // re-establish dependencies to supplementals if needed
                await this.reEstablishDependencyLinks(this.dbs.dbOverviews, this.dbBasePath, logger);
            }
            catch (err) {
                logger.emergency('Error when re-establishing dependency links after adding packages ' +
                    packageUids);
                logger.emergency(err.message);
                throw err;
            }
            return statusResultMap;
        }
        else {
            // Refresh Delete: software packages listed in packageUids are removed from the DB
            const statusMap = new Map();
            for (const packageUid of packageUids) {
                try {
                    await this.deletePackagesHandlingOverview(packageUid, this.dbBasePath, logger);
                }
                catch (err) {
                    logger.emergency('Error when handling overviews while deleting package ' + packageUid);
                    logger.emergency(JSON.stringify(err, Object.getOwnPropertyNames(err)));
                    throw err;
                }
                try {
                    // re-establish dependencies to supplementals if needed
                    await this.reEstablishDependencyLinks(this.dbs.dbOverviews, this.dbBasePath, logger);
                }
                catch (err) {
                    logger.emergency('Error when re-establishing dependency links when deleting package ' +
                        packageUid);
                    logger.emergency(err.message);
                    throw err;
                }
                try {
                    const pieceStatusMap = await (0, dbBuilder_1._refreshDatabaseDelete)({
                        packageUIds: packageUids,
                        dbs: this.dbs,
                        dbBasePath: this.dbBasePath,
                        logger
                    });
                    statusMap.set(packageUid, pieceStatusMap.get(packageUid));
                }
                catch (err) {
                    logger.emergency('Error in refresh while deleting package ' + packageUid);
                    logger.emergency(JSON.stringify(err, Object.getOwnPropertyNames(err)));
                    throw err;
                }
            }
            return statusMap;
        }
    }
    /**
     * Fix up dependencies when deleting a package. Note: orphaned supplemental packages are ok.
     */
    async deletePackagesHandlingOverview(packageUId, dbBasePath, logger) {
        const { dbOverviews } = this.dbs;
        // load the DB into memory
        await dbOverviews.useAllAsync();
        // look up the packageOverview
        const packageOverview = await dbOverviews.findOneAsync({
            packageUId,
            resourceType: 'packageOverview'
        });
        if (!packageOverview) {
            logger.warning(`Package ${packageUId} to be deleted doesn't exist in the DB. Skipping.`);
            return;
        }
        if (!packageOverview.supplements) {
            // It's a main package being deleted
            // Note: supplemental packages that as a result are no longer referenced will not be
            // automatically deleted, i.e. they become orphaned
            await dbOverviews.removeAsync({ packageUId });
        }
        else {
            // It's a supplemental package being deleted
            // For each supplemental package find the main packages and modify their dependencies
            let mainPackages = await dbOverviews.findAsync({
                packageId: packageOverview.supplements.packageId,
                resourceType: 'packageOverview'
            });
            // Keep the ones that satisfy the supplemental package semver condition
            mainPackages = mainPackages.filter(mainPackage => versioning.satisfies(mainPackage.semver, packageOverview.supplements.versionRange));
            // Delete the appropriate entries in 'dependencies' from all the mainPackages where applicable
            mainPackages = mainPackages.map(mp => {
                return {
                    ...mp,
                    dependencies: mp.dependencies.filter(dependency => dependency.refId !== packageOverview.id)
                };
            });
            for (const mainPackage of mainPackages) {
                await dbOverviews.updateAsync({ _id: mainPackage._id }, mainPackage);
            }
            // remove the entry of the deleted package from the dbOverviews
            await dbOverviews.removeAsync({ packageUId });
        }
        // finally save the db
        await dbOverviews.saveAsync();
        // re-generate old overviews.db file for 3.x
        await (0, dbBuilder_1.createOldOverviewsDBFile)(dbOverviews, dbBasePath, logger);
    }
    /**
     * Cleanup of the dependency links for main and supplemental package deletions
     */
    async reEstablishDependencyLinks(dbOverviews, dbBasePath, logger) {
        const packageList = await dbOverviews.findNoDeepCopyAsync({
            resourceType: 'packageOverview'
        });
        const supplementPackageList = packageList.filter(pkg => pkg.supplements);
        const mainPackageList = packageList.filter(pkg => !pkg.supplements);
        for (const supplementPkg of supplementPackageList) {
            const satisfyingMainPackageList = mainPackageList.filter(mainPkg => supplementPkg.supplements &&
                mainPkg.id === supplementPkg.supplements.packageId &&
                versioning.satisfies(mainPkg.semver, supplementPkg.supplements.versionRange));
            for (const mainPkg of satisfyingMainPackageList) {
                let modified = false;
                let d;
                for (d = 0; d < mainPkg.dependencies.length; d++) {
                    if (mainPkg.dependencies[d].refId === supplementPkg.id) {
                        // Our semantics today allow us to have multiple supplemental packages,
                        // but not multiple versions of the same, so once we find a match we can break out, TODO: should report error if this happens
                        const dependency = mainPkg.dependencies[d];
                        if (supplementPkg.supplements &&
                            versioning.ltr(dependency.versionRange, // always a specific version in the case of supplements
                            supplementPkg.supplements.versionRange)) {
                            // Needs to be replaced
                            dependency.versionRange = supplementPkg.version;
                            // for b/w compatibility:
                            dependency.semver = supplementPkg.semver;
                            dependency.version = supplementPkg.version;
                            modified = true;
                        }
                        break;
                    }
                }
                if (d === mainPkg.dependencies.length) {
                    // There was no entry for this supplements in the dependencies, add this supplements
                    if (supplementPkg.supplements) {
                        const dependency = {
                            refId: supplementPkg.id,
                            versionRange: supplementPkg.version,
                            require: 'optional',
                            // for b/w compatibility:
                            semver: supplementPkg.semver,
                            version: supplementPkg.version
                        };
                        mainPkg.dependencies.push(dependency);
                        modified = true;
                    }
                }
                if (modified) {
                    // Write back the modifications of main package to the object referencing the dbOverview
                    let m;
                    for (m = 0; m < mainPackageList.length; m++) {
                        if (mainPackageList[m].packageUId === mainPkg.packageUId) {
                            mainPackageList[m].dependencies = mainPkg.dependencies;
                            break;
                        }
                    }
                    await dbOverviews.saveAsync();
                    // re-generate old overviews.db file for 3.x
                    await (0, dbBuilder_1.createOldOverviewsDBFile)(dbOverviews, dbBasePath, logger);
                }
            }
        }
    }
}
exports.RefreshManager = RefreshManager;
async function schemaValidation(fullPackageList, contentBasePath, logger, refreshAll) {
    // Setup validator
    const schemaValidator = new schema_validator_3_0_1.SchemaValidator();
    await schemaValidator.config(logger, {
        contentPath: vars_1.Vars.CONTENT_BASE_PATH,
        cfg: `${vars_1.Vars.PROJECT_ROOT}/config/contentPackages/schema3cfg.json`
    });
    const title = `TIREX metadata validator`;
    schemaValidator.logIntro(title);
    // Watch logs, if error during validation, mark the package as critical and don't processes.
    // Validate
    let failure = false;
    const validationList = refreshAll
        ? fullPackageList
        : fullPackageList.filter(item => item.operation === "addPackage" /* RefreshOperation.ADD_PACKAGE */ ||
            item.operation === "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */);
    for (const packageEntry of validationList) {
        const onFinishValidate = listenForError();
        // Create object to manage data across package
        const pkgData = { packageUids: new Set() };
        await schemaValidator.validatePackage(path.join(contentBasePath, packageEntry.content), pkgData, packageEntry.modulePrefix);
        const hasError = onFinishValidate();
        if (hasError) {
            failure = true;
            // Log error
            await logFailureAndWait(`Schema validation failed for ${packageEntry.uid}`);
        }
    }
    schemaValidator.logEnding(title);
    return failure;
    function listenForError() {
        let validatorError = false;
        const logDataHandler = (messageIn) => {
            const { type } = getMessageData(messageIn);
            if ((!validatorError && type === 'error') ||
                type === 'critical' ||
                type === 'emergency') {
                validatorError = true;
            }
        };
        logger.on('data', logDataHandler);
        return () => {
            logger.removeListener('data', logDataHandler);
            return validatorError;
        };
    }
    /**
     * Log the error, then wait for the message to get sent through the writestream
     *
     */
    function logFailureAndWait(msg) {
        return new Promise(resolve => {
            const logDataHandler = (messageIn) => {
                const { type } = getMessageData(messageIn);
                if (type === 'critical') {
                    logger.removeListener('data', logDataHandler);
                    resolve();
                }
            };
            logger.on('data', logDataHandler);
            logger.critical(msg);
        });
    }
    function getMessageData(messageIn) {
        messageIn = typeof messageIn === 'string' ? Buffer.from(messageIn, 'utf8') : messageIn;
        const message = messageIn;
        const { type, data } = JSON.parse(message.toString());
        return { type, message: data };
    }
}
function getLatestPacakgesToValidate(latestPkgMap) {
    const result = Array.from(latestPkgMap.entries()).filter(([_, { operation }]) => {
        return (operation === "addPackage" /* RefreshOperation.ADD_PACKAGE */ ||
            operation === "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */);
    });
    const filteredLastestPackageMap = new Map();
    result.forEach(([id]) => {
        const item = latestPkgMap.get(id);
        if (!item) {
            throw new Error(`${id} not found in ${JSON.stringify(latestPkgMap)}`);
        }
        filteredLastestPackageMap.set(id, item);
    });
    return filteredLastestPackageMap;
}
