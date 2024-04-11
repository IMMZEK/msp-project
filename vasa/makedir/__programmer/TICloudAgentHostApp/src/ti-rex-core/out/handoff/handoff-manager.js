"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandoffManager = void 0;
// 3rd party
const asyncLib = require("async");
const EventEmitter = require("events");
const PQueue = require("p-queue");
const util = require("./util");
const package_manager_adapter_1 = require("./package-manager-adapter");
const refresh_1 = require("../lib/dbBuilder/refresh");
const add_package_1 = require("./add-package");
const remove_package_1 = require("./remove-package");
const promise_utils_1 = require("../utils/promise-utils");
// Events
class HandoffManagerEventEmitter extends EventEmitter {
}
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * For managing handoffs.
 *
 */
class HandoffManager {
    refreshManager;
    defaultLog;
    handoffManagerEventEmitter = new HandoffManagerEventEmitter();
    loggerManager;
    refreshFn;
    packageManagerAdapter;
    updateQueue = new PQueue({ concurrency: 1 });
    vars;
    addPackageHelper;
    removePackageHelper;
    handoffManagerState = "up" /* HandoffManagerState.UP */;
    constructor({ defaultLog, loggerManager, vars }) {
        this.refreshManager = new refresh_1.RefreshManager(vars.dbBasePath, defaultLog.userLogger);
        this.defaultLog = defaultLog;
        this.loggerManager = loggerManager;
        this.vars = vars;
        this.packageManagerAdapter = new package_manager_adapter_1.PackageManagerAdapter({
            refreshManager: this.refreshManager,
            packageManagerFile: vars.packageManagerFile,
            contentFolder: vars.contentBasePath,
            zipsFolder: vars.zipsFolder,
            overridesDir: vars.overridesDir
        });
        this.refreshFn = async (refreshInput, refreshLog) => {
            refreshLog.debugLogger.info(`Refreshing with params ${JSON.stringify(refreshInput)}`);
            const resultObj = await this.refreshManager.individualRefresh(refreshInput, vars.contentBasePath, true, refreshLog.userLogger);
            return resultObj.success;
        };
        this.addPackageHelper = new add_package_1.AddPackage(this.packageManagerAdapter, this.refreshFn, this.loggerManager, this.defaultLog, this.vars);
        this.removePackageHelper = new remove_package_1.RemovePackage(this.packageManagerAdapter, this.refreshFn, this.loggerManager, this.defaultLog, this.vars);
    }
    getRefreshManager() {
        // TODO revisit why we do this
        return this.refreshManager;
    }
    async addPackage(params) {
        if (!this.isAcceptingSubmissions()) {
            throw new Error('Called addPackage while in maintenance mode');
        }
        const result = await this.addPackageHelper.preAddPackage({
            ...params,
            handoffQueued: () => this.updateQueue.pending > 0
        });
        await this.updateQueue.add(async () => {
            if (!this.isAcceptingSubmissions()) {
                throw new Error('Called addPackage while in maintenance mode');
            }
            return this.addPackageHelper.addPackage({
                serverHost: params.serverHost,
                ...result,
                submissionId: params.submissionId
            });
        });
    }
    async removePackage(params) {
        await this.updateQueue.add(async () => {
            if (!this.isAcceptingSubmissions()) {
                throw new Error('Called removePackage while in maintenance mode');
            }
            return this.removePackageHelper.removePackage(params);
        });
    }
    // Maintenance mode methods
    isAcceptingSubmissions() {
        return this.handoffManagerState === "up" /* HandoffManagerState.UP */;
    }
    getHandoffManagerState() {
        return this.handoffManagerState;
    }
    /**
     * Turn on maintenance mode. This will finish any ongoing processing and when done will return.
     * Block any submissions after calling this function.
     *
     * @param {Promise} void
     */
    async maintenanceModeEnable() {
        if (this.handoffManagerState !== "up" /* HandoffManagerState.UP */) {
            throw new Error(`Already in ${this.handoffManagerState}`);
        }
        this.handoffManagerState = "teardown" /* HandoffManagerState.TEARDOWN */;
        this.handoffManagerEventEmitter.emit("stateChange" /* HandoffManagerEvents.STATE_CHANGE */);
        await this.updateQueue.add(async () => {
            this.handoffManagerState = "maintanceMode" /* HandoffManagerState.MAINTANCE_MODE */;
            this.handoffManagerEventEmitter.emit("stateChange" /* HandoffManagerEvents.STATE_CHANGE */);
        });
    }
    /**
     * Resume handoff services. It will take us out of maintenance mode and accept submissions again.
     *
     * @param {Promise} void
     */
    async maintenanceModeDisable() {
        if (this.handoffManagerState === "up" /* HandoffManagerState.UP */) {
            throw new Error('Already accepting submissions');
        }
        else if (this.handoffManagerState === "maintanceMode" /* HandoffManagerState.MAINTANCE_MODE */) {
            this.handoffManagerState = "up" /* HandoffManagerState.UP */;
            this.handoffManagerEventEmitter.emit("stateChange" /* HandoffManagerEvents.STATE_CHANGE */);
        }
        else {
            return new Promise((resolve, reject) => {
                asyncLib.doUntil((callback) => {
                    this.handoffManagerEventEmitter.once("stateChange" /* HandoffManagerEvents.STATE_CHANGE */, callback);
                }, () => {
                    return this.handoffManagerState !== "teardown" /* HandoffManagerState.TEARDOWN */;
                }, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    this.handoffManagerState = "up" /* HandoffManagerState.UP */;
                    this.handoffManagerEventEmitter.emit("stateChange" /* HandoffManagerEvents.STATE_CHANGE */);
                    resolve();
                });
            });
        }
    }
    // Admin / server maintenance APIs
    /**
     * Imports any packages which we do not know about.
     * Removes any which don't have any valid content folders.
     * Note this does not do any processing on the packages, only tracks them.
     */
    async syncPackages() {
        return this.updateQueue.add(() => this.syncPackagesInternal());
    }
    /**
     * Applies a rollback on all packages which are currently staged
     */
    async cleanupStagedPackages() {
        await this.updateQueue.add(() => this.cleanupStagedPackagesInternal());
    }
    // For test purposes only
    _getPackageManagerAdapter() {
        return this.packageManagerAdapter;
    }
    _getAddPackageHelper() {
        return this.addPackageHelper;
    }
    _getRemovePackageHelper() {
        return this.removePackageHelper;
    }
    ///////////////////////////////////////////////////////////////////////////////
    // Private Functions
    ///////////////////////////////////////////////////////////////////////////////
    async syncPackagesInternal() {
        const { newEntires, deleteEntries } = await this.packageManagerAdapter.scanPackages(this.defaultLog);
        await this.packageManagerAdapter.importPackages(newEntires, this.defaultLog);
        await Promise.all(deleteEntries.map((item) => {
            return this.packageManagerAdapter.removePackage({
                packageInfo: item,
                log: this.defaultLog,
                processingSuccess: true
            });
        }));
        return {
            addedEntries: newEntires.map((entry) => ({
                id: entry.id,
                version: entry.version
            })),
            removedEntries: deleteEntries.map((entry) => ({
                id: entry.id,
                version: entry.version
            }))
        };
    }
    async cleanupStagedPackagesInternal() {
        // Stage
        const initialStagedEntires = await this.packageManagerAdapter.getStagedEntries(this.defaultLog);
        const rollbackEntries = await (0, promise_utils_1.mapSerially)(initialStagedEntires, async (stagedEntry) => {
            const { stagedEntry: rollbackEntry, request } = await this.packageManagerAdapter.stageRollbackPackage({
                entry: stagedEntry,
                log: this.defaultLog
            });
            return { rollbackEntry, stagedEntry, request };
        });
        // Process
        await this.refreshManager.removeBackup();
        const refreshParams = await util.getRefreshParams(rollbackEntries.map((item) => ({
            // - Set showEntry = true so everything is processed
            // - We set request to add / remove based on the showEntry value
            // - If there's no rollbackEntry then we are deleting, so using the old stagedEntry is fine
            entry: item.rollbackEntry
                ? { ...item.rollbackEntry, showEntry: true }
                : { ...item.stagedEntry, showEntry: true },
            request: item.request
        })), await this.packageManagerAdapter.getAllEntries(this.defaultLog), this.vars.contentBasePath, this.vars.zipsFolder);
        const processingSuccess = await this.refreshFn(refreshParams, this.defaultLog);
        // Rollback
        await (0, promise_utils_1.mapSerially)(rollbackEntries, async ({ stagedEntry: entry, rollbackEntry }) => {
            await this.packageManagerAdapter.rollbackPackage({
                entry,
                stagedEntry: rollbackEntry,
                log: this.defaultLog,
                processingSuccess
            });
        });
    }
}
exports.HandoffManager = HandoffManager;
