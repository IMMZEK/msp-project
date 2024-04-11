"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryModuleCloud = void 0;
// our modules
const package_installer_1 = require("./package-installer");
const progress_manager_1 = require("./progress-manager");
const entry_module_inner_base_1 = require("./entry-module-inner-base");
const cloud_ccs_adapter_1 = require("./cloud-ccs-adapter");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * This is the cloud agent module that the browser talks to in order to do all local operations
 * Note:
 *  - all private functions must start with _ or will be exposed by agent.js (which uses
 *    run time reflection, not typescript)
 *  - all public functions must return a promise
 *
 */
class EntryModuleCloud extends entry_module_inner_base_1.EntryModuleBase {
    // Use this to determine the type of EntryModule without instanceof,
    // so you don't need to pull in all the dependencies in this file (useful for frontend).
    ENTRY_MODULE_TYPE = 'EntryModuleCloud';
    progressManager;
    packageInstaller;
    cloudCCsAdapter;
    async init(params) {
        await super.init(params);
        // Setup helper classes
        this.progressManager = new progress_manager_1.ProgressManager(this.triggerEvent, this.logger);
        this.cloudCCsAdapter = new cloud_ccs_adapter_1.CloudCCSAdapter(this.vars, this.logger, this.progressManager, this.triggerEvent);
        this.packageInstaller = new package_installer_1.PackageInstaller(this.commonParams, this.progressManager, this.cloudCCsAdapter);
    }
    /**
     * Called by cloud agent when the last client is gone to perform any clean up
     * Must be synchronous, or else cloud agent must be updated
     *
     */
    onClose() {
        super.onClose();
        this.progressManager.close();
    }
    // Getters
    async getEntryModuleType() {
        // Use this to determine the type of EntryModule without instanceof,
        // so you don't need to pull in all the dependencies in this file (useful for frontend).
        return this.ENTRY_MODULE_TYPE;
    }
    async getPackageInstallInfo() {
        return (0, entry_module_inner_base_1.handleResponse)(this.cloudCCsAdapter.getSearchPaths());
    }
    async getInstalledPackages() {
        return (0, entry_module_inner_base_1.handleResponse)(this.cloudCCsAdapter.getInstalledPackages());
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
}
exports.EntryModuleCloud = EntryModuleCloud;
