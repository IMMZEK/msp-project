"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryModuleDesktop = exports._IDE_SERVER_PORT = exports.latestBoardsAndDevicesFileName = exports.defaultBoardsAndDevicesFileName = void 0;
// native modules
const path = require("path");
// 3rd party
const fs = require("fs-extra");
const open = require("open");
// our modules
const util_1 = require("./util");
const package_installer_1 = require("./package-installer");
const progress_manager_1 = require("./progress-manager");
const offline_metadata_manager_1 = require("./offline-metadata-manager");
const ccs_adapter_1 = require("./ccs-adapter");
const ExternalApis = require("./external-apis");
const request_helpers_1 = require("../shared/request-helpers");
const entry_module_inner_base_1 = require("./entry-module-inner-base");
///////////////////////////////////////////////////////////////////////////////
/// Types
///////////////////////////////////////////////////////////////////////////////
// TODO? Move these filename constants somewhere more appropriate?
exports.defaultBoardsAndDevicesFileName = 'default-boards-and-devices.json';
exports.latestBoardsAndDevicesFileName = 'latest-boards-and-devices.json';
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
// Exported for tests, TODO consider making data names an enum
exports._IDE_SERVER_PORT = 'ccs.ideServer.port';
/**
 * This is the cloud agent module that the browser talks to in order to do all local operations
 * Note:
 *  - all private functions must start with _ or will be exposed by agent.js (which uses
 *    run time reflection, not typescript)
 *  - all public functions must return a promise
 *
 */
class EntryModuleDesktop extends entry_module_inner_base_1.EntryModuleBase {
    // Use this to determine the type of EntryModule without instanceof,
    // so you don't need to pull in all the dependencies in this file (useful for frontend).
    ENTRY_MODULE_TYPE = 'EntryModuleDesktop';
    static IDE_SERVER_PORT = exports._IDE_SERVER_PORT;
    static HTTP_PROXY = 'HTTP_PROXY';
    static HTTPS_PROXY = 'HTTPS_PROXY';
    progressManager;
    offlineMetadataManager;
    packageInstaller;
    ccsAdapter;
    async init(params) {
        const { ccsPort, isTheia } = params;
        await super.init(params);
        // Setup helper classes
        this.progressManager = new progress_manager_1.ProgressManager(this.triggerEvent, this.logger);
        this.offlineMetadataManager = new offline_metadata_manager_1.OfflineMetadataManager(this.commonParams);
        this.ccsAdapter = new ccs_adapter_1.CCSAdapter(this.commonParams.logger, this.commonParams.desktopQueue, ccsPort, isTheia, this.vars, this.offlineMetadataManager, this.progressManager, this.triggerEvent);
        await this.ccsAdapter.start();
        this.packageInstaller = new package_installer_1.PackageInstaller(this.commonParams, this.progressManager, this.ccsAdapter);
    }
    /**
     * Called by cloud agent when the last client is gone to perform any clean up
     * Must be synchronous, or else cloud agent must be updated
     *
     */
    onClose() {
        super.onClose();
        this.progressManager.close();
        this.ccsAdapter.close();
    }
    // Getters
    async getEntryModuleType() {
        return this.ENTRY_MODULE_TYPE;
    }
    async getCCSEclipseInitValues() {
        const ccsPort = this.eventBroker.fetchData(EntryModuleDesktop.IDE_SERVER_PORT);
        const httpProxy = this.eventBroker.hasData(EntryModuleDesktop.HTTP_PROXY)
            ? this.eventBroker.fetchData(EntryModuleDesktop.HTTP_PROXY)
            : '';
        const httpsProxy = this.eventBroker.hasData(EntryModuleDesktop.HTTPS_PROXY)
            ? this.eventBroker.fetchData(EntryModuleDesktop.HTTPS_PROXY)
            : '';
        return { ccsPort, httpProxy, httpsProxy };
    }
    async getPackageInstallInfo() {
        return (0, entry_module_inner_base_1.handleResponse)(this.ccsAdapter.getSearchPaths());
    }
    async getInstalledPackages() {
        return (0, entry_module_inner_base_1.handleResponse)(this.ccsAdapter.getInstalledPackages());
    }
    async getProgress() {
        return (0, entry_module_inner_base_1.handleResponse)(Promise.resolve(this.progressManager.getProgress()));
    }
    // Actions
    async clearTaskProgress(progressId) {
        return (0, entry_module_inner_base_1.handleResponse)(Promise.resolve(this.progressManager.clearTaskProgress(progressId)));
    }
    async installPackage(pkg, installLocation) {
        return (0, entry_module_inner_base_1.handleResponse)(this.packageInstaller.installPackage(pkg, installLocation));
    }
    async uninstallPackage(pkg) {
        return (0, entry_module_inner_base_1.handleResponse)(this.packageInstaller.uninstallPackage(pkg));
    }
    async updateOfflineBoardsAndDevices() {
        return (0, entry_module_inner_base_1.handleResponse)(this._updateOfflineBoardsAndDevices());
    }
    async getCcsDevices(targetFilter) {
        return (0, entry_module_inner_base_1.handleResponse)(this.ccsAdapter.getDevices(targetFilter));
    }
    async getCcsDeviceDetail(deviceId) {
        return (0, entry_module_inner_base_1.handleResponse)(this.ccsAdapter.getDeviceDetail(deviceId));
    }
    async getProjectTemplates(deviceId, toolVersion) {
        return (0, entry_module_inner_base_1.handleResponse)(this.ccsAdapter.getProjectTemplates(deviceId, toolVersion));
    }
    async importProject(resourceType, packageUid, location, targetId, projectName) {
        return (0, entry_module_inner_base_1.handleResponse)(this.ccsAdapter.importProject(resourceType, packageUid, location, targetId, projectName));
    }
    /**
     * Import a CCS Project template.
     *
     * This actually *creates* a new CCS Project based on a template, but we are treating it as an
     * import to align with importProject() which also creates projects based on templates in some
     * cases (resource types FILE and FOLDER).
     */
    async importProjectTemplate(templateId, targetId, projectName, toolVersion, outputTypeId, location) {
        return (0, entry_module_inner_base_1.handleResponse)(this.ccsAdapter.importProjectTemplate(templateId, targetId, projectName, toolVersion, outputTypeId, location));
    }
    async openExternally(link) {
        return (0, entry_module_inner_base_1.handleResponse)(open(`${new URL(this.vars.remoteserverUrl)}${link}`).then(() => { }));
    }
    async onProductsChanged() {
        this.ccsAdapter.onProductsChanged();
        return (0, entry_module_inner_base_1.handleResponse)(Promise.resolve());
    }
    //
    // External APIs, careful changing these!! These will be called by other services, beyond tirex.
    //
    async getBoardAndDeviceInfo(options) {
        return (0, entry_module_inner_base_1.handleResponse)(ExternalApis.getBoardAndDeviceInfo(this.commonParams, options));
    }
    async getInstallInfoForPackageDependencies(packageInfo, options) {
        return (0, entry_module_inner_base_1.handleResponse)(ExternalApis.getInstallInfoForPackageDependencies(packageInfo, this.ccsAdapter, this.commonParams, options.excludePackageAsDependency));
    }
    async getInstallInfoForPackages(options) {
        return (0, entry_module_inner_base_1.handleResponse)(ExternalApis.getInstallInfoForPackages(this.ccsAdapter, this.commonParams, {
            targetDevice: options.targetDevice || undefined,
            targetBoard: options.targetBoard || undefined
        }));
    }
    // TODO! Move implementation deeper, maybe into a dedicated ts for offline (similarly to offline-metadata-manager.ts)
    async _updateOfflineBoardsAndDevices() {
        // Get latest board and device data from server as well as sessionId
        const tirex4RemoteserverUrl = this.commonParams.vars.remoteserverUrl;
        const responseData = await (0, request_helpers_1.doGetRequest)(`${tirex4RemoteserverUrl}${"api/boardsDevices" /* RemoteserverAPI.GET_BOARDS_AND_DEVICES */}`);
        const boardAndDeviceData = responseData.data.payload;
        const sessionId = responseData.data.sideBand.sessionId;
        // TODO!! Config dir should just for fallback, with a new config var used instead as the preferred location; did
        // consider dbPath, but since its used for the resource database better to distinguish it. Another option is to
        // use an externally defined data dir (possibly as the primary preferred dir).
        const latestBoardsAndDevicesFilePath = path.join((0, util_1.getConfigFolder)(), exports.latestBoardsAndDevicesFileName);
        // Determine if the offlined board and device data is out of date and if so persist it
        // locally
        let updateNeeded = true;
        if (await fs.pathExists(latestBoardsAndDevicesFilePath)) {
            const json = await fs.readJSON(latestBoardsAndDevicesFilePath);
            if (json && json.sessionId && json.sessionId === sessionId) {
                updateNeeded = false;
            }
        }
        if (updateNeeded) {
            // Session id has changed, meaning that there's been a database update since. So we need
            // to update.
            await fs.writeJSON(latestBoardsAndDevicesFilePath, {
                ...boardAndDeviceData,
                sessionId
            });
        }
    }
}
exports.EntryModuleDesktop = EntryModuleDesktop;
