"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCSAdapter = void 0;
// 3rd party
const path = require("path");
const _ = require("lodash");
const fs = require("fs-extra");
// our modules
const versioning_1 = require("../lib/versioning");
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
const package_helpers_1 = require("../handoff/package-helpers");
const counter_1 = require("../frontend/component-helpers/counter");
const util_1 = require("./util");
const util_2 = require("../shared/util");
const path_helpers_1 = require("../shared/path-helpers");
const vars_1 = require("../lib/vars");
const response_data_1 = require("../shared/routes/response-data");
const ccs_eclipse_request_1 = require("./ccs-eclipse-request");
const ccs_theia_request_1 = require("./ccs-theia-request");
/**
 * This is a class that interfaces with CCS desktop to communicate
 * project/package information.  It can be used to:
 *  - discover what packages the IDE already knows about (which should trigger a meta-data download
 *    for any packages the rex doesn't know about)
 *  - list what search paths the IDE uses, and thus where rex should install packages to
 *  - notify the IDE that a new package has been installed (which should trigger it to re-discover
 *    packages)
 *  - import a project into the IDE
 *
 * In CCS Theia we will communicate to the browser, using the triggerEvent mechanism. The browser will talk to CCS and return the response via the same triggerEvent mechanism.
 * In CCS Eclipse we will use http apis to talk directly with CCS.
 */
class CCSAdapter {
    logger;
    desktopQueue;
    isTheia;
    offlineMetadataManager;
    progressManager;
    triggerEvent;
    ccsEclipseRequest;
    ccsTheiaRequest;
    syncCounter = new counter_1.Counter();
    defaultContentPath;
    constructor(logger, desktopQueue, ccsPort, isTheia, vars, offlineMetadataManager, progressManager, triggerEvent) {
        this.logger = logger;
        this.desktopQueue = desktopQueue;
        this.isTheia = isTheia;
        this.offlineMetadataManager = offlineMetadataManager;
        this.progressManager = progressManager;
        this.triggerEvent = triggerEvent;
        this.ccsEclipseRequest = new ccs_eclipse_request_1.CCSEclipseRequest(logger, ccsPort, (urlObj) => {
            if (urlObj.pathname === '/ccsEvent') {
                if (urlObj.query.name === 'productsChanged') {
                    this.onProductsChanged();
                }
            }
        });
        this.ccsTheiaRequest = new ccs_theia_request_1.CCSTheiaRequest(logger, ccsPort);
        this.defaultContentPath = vars.contentBasePath
            ? path_helpers_1.PathHelpers.normalize(vars.contentBasePath)
            : '';
        this.doInitialSync();
    }
    async start() {
        if (!this.isTheia) {
            await this.ccsEclipseRequest.start();
        }
    }
    close() {
        this.ccsEclipseRequest.close().catch((err) => {
            this.logger.error(err);
        });
    }
    /**
     * Call CCS IDE to rediscover products. Expected to be called after package download+install.
     */
    notifyIDEPackagesChanged() {
        if (this.isTheia) {
            return this.ccsTheiaRequest.rediscoverProducts();
        }
        else {
            return this.ccsEclipseRequest.rediscoverProducts();
        }
    }
    onProductsChanged() {
        // Send updated list of search paths
        this.runNonUserInitiatedTask(async () => {
            this.triggerEvent("OnInstallInfoUpdated" /* ModuleEvents.ON_INSTALL_INFO_UPDATED */, await this.getSearchPaths());
        }, 'Updating search paths');
        // Send updating list of packages
        this.runNonUserInitiatedTask(async () => {
            this.triggerEvent("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */, await this.getInstalledPackages());
        }, 'Updating list of installed packages');
        // Do a sync
        this.doSync();
    }
    /**
     * Get the list of search paths used by CCS.
     *
     * CCS Eclipse doesn't have an API to just get the paths entered by the user, so instead
     * we get the expanded search path, and then subtract the paths where products
     * exist. That should leave ONLY the paths that the user entered (plus install
     * and install/ccs)
     *
     * In addition, we move the "default" path (if it exists) to the top
     */
    async getSearchPaths() {
        if (this.isTheia) {
            const discoveryPaths = await this.ccsTheiaRequest.getProductDiscoveryPath();
            return _.sortBy(discoveryPaths, (folder) => pathsEqual(path_helpers_1.PathHelpers.normalize(folder), this.defaultContentPath)
                ? 'a' + folder
                : 'b' + folder);
        }
        else {
            const [discoveryPaths, products] = await Promise.all([
                this.ccsEclipseRequest.syncSearchPath(),
                this.ccsEclipseRequest.getProducts()
            ]);
            const productPaths = _.map(products, (product) => path_helpers_1.PathHelpers.normalize(product.location));
            return _.chain(discoveryPaths)
                .map((discovertyPath) => path_helpers_1.PathHelpers.normalize(discovertyPath))
                .difference(productPaths)
                .filter((searchPath) => !shouldExcludePath(searchPath))
                .sortBy((folder) => pathsEqual(folder, this.defaultContentPath) ? 'a' + folder : 'b' + folder)
                .value();
        }
    }
    async getInstalledPackages() {
        const idePackages = this.isTheia
            ? await this.ccsTheiaRequest.getProducts()
            : await this.ccsEclipseRequest.getProducts();
        const idePackagesPackageInfo = await this.getPackageInfoForProducts(idePackages);
        return idePackagesPackageInfo;
    }
    async getDevices(targetFilter) {
        if (!this.isTheia) {
            throw new Error('Not supported by CCS Eclipse');
        }
        return this.ccsTheiaRequest.getDevices(targetFilter || undefined);
    }
    async getDeviceDetail(deviceId) {
        if (!this.isTheia) {
            throw new Error('Not supported by CCS Eclipse');
        }
        return this.ccsTheiaRequest.getDeviceDetail(deviceId);
    }
    async getProjectTemplates(deviceId, toolVersion) {
        if (!this.isTheia) {
            throw new Error('Not supported by CCS Eclipse');
        }
        return this.ccsTheiaRequest.getProjectTemplates(deviceId, toolVersion);
    }
    /**
     * Import a resource-based project into CCS
     */
    async importProject(resourceType, packageUid, location, targetId, projectName) {
        // Verify package exists locally
        const installedPackages = await this.getInstalledPackages();
        const pkg = installedPackages.find((p) => {
            return p.packagePublicUid === packageUid;
        });
        if (!pkg) {
            throw new Error('Package not installed locally');
        }
        // update with local installed location
        location = path.join(path.dirname(path.normalize(pkg.localPackagePath)), path.normalize(location));
        // send request to CCS
        const ccsRequest = this.isTheia ? this.ccsTheiaRequest : this.ccsEclipseRequest;
        switch (resourceType) {
            case "project.ccs" /* ProjectType.CCS */:
                // no device ID
                await ccsRequest.importProject(location, undefined, projectName || undefined);
                break;
            case "projectSpec" /* ProjectType.SPEC */:
                // 0 or 1 device ID
                await ccsRequest.importProject(location, targetId || undefined, projectName || undefined);
                break;
            case "file.importable" /* ProjectType.FILE */:
            case "folder.importable" /* ProjectType.FOLDER */:
                // 0 or 1 device ID
                if (this.isTheia) {
                    await this.ccsTheiaRequest.createProject(location, targetId || undefined, projectName || undefined);
                }
                else {
                    await this.ccsEclipseRequest.createProject(location, targetId || undefined);
                }
                break;
            case "project.energia" /* ProjectType.ENERGIA */:
                // 1 board ID
                if (!targetId) {
                    throw new Error('Missing Energia board ID');
                }
                await ccsRequest.importSketch(location, targetId, projectName || undefined);
                break;
            default:
                (0, util_2.assertNever)(resourceType);
                throw new Error(`Unsupported project type: ${resourceType}`);
        }
    }
    /**
     * Import a project template into CCS
     */
    async importProjectTemplate(templateId, targetId, projectName, toolVersion, outputTypeId, location) {
        if (!this.isTheia) {
            throw new Error(`Unsupported for Eclipse`);
        }
        await this.ccsTheiaRequest.createProject(location || undefined, targetId, projectName, templateId, toolVersion || undefined, outputTypeId || undefined);
    }
    ///////////////////////////////////////////////////////////////////////////////
    /// Private methods
    ///////////////////////////////////////////////////////////////////////////////
    doInitialSync() {
        this.runNonUserInitiatedTask(async (onProgressUpdate) => {
            // Block install/uninstall while we update
            await this.desktopQueue.add(async () => {
                await this.removeDeletedPackages(onProgressUpdate);
                await this.addNewPackages(onProgressUpdate);
            });
        }, 'Scanning for file system changes');
    }
    doSync() {
        this.runNonUserInitiatedTask(async (onProgressUpdate) => {
            // Use a counter so that multiple calls around the same time from the UI only trigger once
            this.syncCounter.setValue();
            const syncId = this.syncCounter.getValue();
            await this.desktopQueue.add(async () => {
                if (syncId === this.syncCounter.getValue()) {
                    await this.addNewPackages(onProgressUpdate);
                }
            });
        }, 'Scanning for file system changes');
    }
    runNonUserInitiatedTask(taskFunction, name) {
        const { registerTask, onProgressUpdate } = this.progressManager.createProgressTask({
            progressType: "Indefinite" /* ProgressType.INDEFINITE */
        }, name, false);
        registerTask(taskFunction(onProgressUpdate));
    }
    /**
     * Add any packages CCS knows about that we don't
     *
     */
    async addNewPackages(onProgressUpdate) {
        const [idePackages, rexPackages] = await Promise.all([
            this.isTheia
                ? this.ccsTheiaRequest.getProducts()
                : this.ccsEclipseRequest.getProducts(),
            this.offlineMetadataManager.getInstalledPackages()
        ]);
        const idePackagesPackageInfo = await this.getPackageInfoForProducts(idePackages);
        this.logger.info(`Ide packages reported: ${JSON.stringify(idePackagesPackageInfo)}`);
        const newIdePackages = _.differenceWith(idePackagesPackageInfo, rexPackages, (idePackage, rexPackage) => {
            if (rexPackage.packagePublicId !== idePackage.packagePublicId) {
                return false;
            }
            else if (!(0, versioning_1.convertToSemver)(rexPackage.packageVersion) ||
                !(0, versioning_1.convertToSemver)(idePackage.packageVersion)) {
                this.logger.info(`Bad tirex package.tirex.json version, will not fetch offline metadata ${JSON.stringify(rexPackage)} ${JSON.stringify(idePackage)}`);
                return false;
            }
            return (0, versioning_1.compare)(rexPackage.packageVersion, idePackage.packageVersion) === 0;
        });
        for (const packageInfo of newIdePackages) {
            await this.offlineMetadataManager.offlinePackageMetadata((0, dbBuilderUtils_1.formUid)(packageInfo.packagePublicId, packageInfo.packageVersion), packageInfo.localPackagePath, onProgressUpdate, true);
        }
    }
    /**
     *  Remove packages that were deleted from the filesystem
     */
    async removeDeletedPackages(onProgressUpdate) {
        const installedPackages = await this.offlineMetadataManager.getInstalledPackages();
        for (const pkg of installedPackages) {
            if (!(await fs.pathExists(pkg.localPackagePath))) {
                await this.offlineMetadataManager.removePackageMetadata(pkg.packagePublicUid, onProgressUpdate);
            }
        }
    }
    async getPackageInfoForProducts(idePackages) {
        // Workaround for xdctools packages:
        // For XDCtools, CCS is extracting the version from the install folder name,
        // i.e. the package id won't match what tirex expects
        const idePackagesWithFixedXdctools = _.map(idePackages, (idePackage) => {
            if (idePackage.id === 'xdctools') {
                idePackage.version = idePackage.version.replace('_core', '');
            }
            return idePackage;
        });
        const idePackagesPackageInfo = [];
        for (const newIdePackage of idePackagesWithFixedXdctools) {
            // Workaround for CCS reported package version has a different format from tirex
            // (Baltasar: "CCS canonicalizes the version so that the first three increments
            // are integers."): get packageUId from installed package.tirex.json
            const allPackageTirexJson = await (0, package_helpers_1.getAllPackageTirexJsonPaths)(newIdePackage.location);
            const packageInfos = await Promise.all(allPackageTirexJson.map((item) => (0, package_helpers_1.getPackageInfo)(newIdePackage.location, item)));
            for (const packageInfo of packageInfos) {
                if (packageInfo) {
                    idePackagesPackageInfo.push({
                        ...packageInfo,
                        location: newIdePackage.location,
                        uid: (0, dbBuilderUtils_1.formUid)(packageInfo.id, packageInfo.version)
                    });
                }
                else {
                    this.logger.info(`Cannot offline newly discovered package at ${newIdePackage.location} since it is not a tirex package (no package.tirex.json found)`);
                }
            }
        }
        const ccsBaseItems = await this.getCCSBaseItems();
        return idePackagesPackageInfo.concat(ccsBaseItems).map((item) => {
            const { id, version, uid, location, name, subType, featureType, ccsVersion } = item;
            return {
                name,
                packagePublicId: id,
                packageVersion: version,
                packagePublicUid: uid,
                localPackagePath: location,
                subType: subType || null,
                featureType: featureType || null,
                ccsVersion: ccsVersion || null
            };
        });
    }
    async getCCSBaseItems() {
        // Note CCS does not detect these items currently
        const ccsBase = path.join(vars_1.Vars.PROJECT_ROOT, '..', '..', 'ccs_base').replace(/\\/g, '/'); // location field always uses '/' only, follow for consistency
        const paths = await (0, package_helpers_1.getAllPackageTirexJsonPaths)(ccsBase);
        const ccsBaseItems = await Promise.all(paths.map(async (pkgPath) => {
            const pkgInfo = await (0, package_helpers_1.getPackageInfo)(path.dirname(pkgPath), pkgPath);
            if (!pkgInfo) {
                throw new Error(`Cannot get packageInfo for ${pkgPath}`);
            }
            return { ...pkgInfo, location: ccsBase, uid: (0, dbBuilderUtils_1.formUid)(pkgInfo.id, pkgInfo.version) };
        }));
        return ccsBaseItems;
    }
}
exports.CCSAdapter = CCSAdapter;
function shouldExcludePath(searchPath) {
    // We want to explicitly exclude the ccs and xdctools paths
    // Ideally, CCS wouldn't include them, but we have to work with existing CCS APIs
    if (path.basename(searchPath).match(/^ccsv?\d?$/)) {
        return (!fs.pathExistsSync(searchPath) || fs.pathExistsSync(path.join(searchPath, 'eclipse')));
    }
    return path.basename(searchPath).match(/^xdctools_[0-9]+_[0-9]+_[0-9]+_[0-9]+$/);
}
function pathsEqual(a, b) {
    if ((0, util_1.getPlatform)() === response_data_1.Platform.WINDOWS) {
        return a.toLowerCase() === b.toLowerCase();
    }
    return a === b;
}
