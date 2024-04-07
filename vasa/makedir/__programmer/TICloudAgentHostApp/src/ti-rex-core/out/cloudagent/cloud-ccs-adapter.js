"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudCCSAdapter = void 0;
// 3rd party
const path = require("path");
const _ = require("lodash");
const PQueue = require("p-queue");
const fs = require('fs-extra');

// our modules
const package_helpers_1 = require("../handoff/package-helpers");
const path_helpers_1 = require("../shared/path-helpers");
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
/**
 * This is a class that replaces the functionality that ccs normally provides, on the cloud (where we don't have CCS).
 * It's intended to be similar to ccs-adapter.
 *
 */
class CloudCCSAdapter {
    vars;
    logger;
    progressManager;
    triggerEvent;
    defaultContentPath;
    scanQueue = new PQueue({ concurrency: 1 });
    scanPromise = null;
    searchPaths;
    constructor(vars, logger, progressManager, triggerEvent) {
        this.vars = vars;
        this.logger = logger;
        this.progressManager = progressManager;
        this.triggerEvent = triggerEvent;
        this.defaultContentPath = this.vars.contentBasePath
            ? path_helpers_1.PathHelpers.normalize(this.vars.contentBasePath)
            : '';
        this.searchPaths = [this.defaultContentPath];
        this.getInstalledPackages().catch((err) => {
            this.logger.error(err.message || err);
        });
    }
    async getSearchPaths() {
        return this.searchPaths;
    }
    async getInstalledPackages() {
        return this.scanQueue.add(async () => {
            if (this.scanPromise) {
                return this.scanPromise;
            }
            else {
                await Promise.all(this.searchPaths.map(item => fs.ensureDir(item)));
                const discoveredPackageFolders = _.flatten(await Promise.all(this.searchPaths.map(async (searchPath) => {
                    const folders = await (0, package_helpers_1.getPackageFolders)(searchPath);
                    return folders.packageFolders.map((item) => path.join(searchPath, item));
                })));
                this.scanPromise = Promise.resolve(_.flatten(await Promise.all(discoveredPackageFolders.map(async (packageFolder) => {
                    const allPackageTirexJson = await (0, package_helpers_1.getAllPackageTirexJsonPaths)(packageFolder);
                    const packageInfos = await Promise.all(allPackageTirexJson.map((item) => (0, package_helpers_1.getPackageInfo)(packageFolder, item)));
                    const installedPackages = [];
                    for (const packageInfo of packageInfos) {
                        if (packageInfo) {
                            const installedPackage = {
                                name: packageInfo.name,
                                packagePublicId: packageInfo.id,
                                packageVersion: packageInfo.version,
                                packagePublicUid: (0, dbBuilderUtils_1.formUid)(packageInfo.id, packageInfo.version),
                                localPackagePath: packageFolder,
                                subType: packageInfo.subType || null,
                                featureType: packageInfo.featureType || null,
                                ccsVersion: packageInfo.ccsVersion || null
                            };
                            return installedPackage;
                        }
                        else {
                            this.logger.info(`Cannot offline newly discovered package at ${packageFolder} since it is not a tirex package (no package.tirex.json found)`);
                        }
                    }
                    return installedPackages;
                }))));
                return this.scanPromise;
            }
        });
    }
    // Should be called where CCSAdapter.notifyIDEPackagesChanged is normally called
    async onPackagesChanged() {
        this.scanPromise = null;
        // Send updating list of packages
        this.runNonUserInitiatedTask(async () => {
            this.triggerEvent("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */, await this.getInstalledPackages());
        }, 'Updating list of installed packages');
    }
    // These are methods without an equivalent in CCSAdapter.
    addSearchPath(path) {
        this.searchPaths.push(path_helpers_1.PathHelpers.normalize(path));
    }
    removeSearchPath(path) {
        this.searchPaths = this.searchPaths.filter((searchPath) => searchPath === path_helpers_1.PathHelpers.normalize(path));
    }
    runNonUserInitiatedTask(taskFunction, name) {
        const { registerTask, onProgressUpdate } = this.progressManager.createProgressTask({
            progressType: "Indefinite" /* ProgressType.INDEFINITE */
        }, name, false);
        registerTask(taskFunction(onProgressUpdate));
    }
}
exports.CloudCCSAdapter = CloudCCSAdapter;
