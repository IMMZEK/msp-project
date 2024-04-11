"use strict";
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockRexCloudAgentModule = void 0;
const progress_manager_1 = require("../../cloudagent/progress-manager");
const delay_1 = require("../../test/delay");
const data_1 = require("../../test/frontend/data");
const create_mock_logger_1 = require("../../test/create-mock-logger");
const util_1 = require("../../shared/util");
const event_emitter_1 = require("../component-helpers/event-emitter");
///////////////////////////////////////////////////////////////////////////////
// Code
///////////////////////////////////////////////////////////////////////////////
class MockRexCloudAgentModule {
    options;
    static DELAY = 2000;
    ENTRY_MODULE_TYPE = 'EntryModuleDesktop';
    emitter = new event_emitter_1.default();
    progressManager = new progress_manager_1.ProgressManager((eventName, eventData) => {
        this.emitter.emit(eventName, eventData);
    }, (0, create_mock_logger_1.createMockLogger)());
    installedPackages;
    installInfo;
    constructor(options) {
        this.options = options;
        this.installedPackages = this.options.localPackages || [];
        this.installInfo = this.options.installInfo || [];
        this.emitter.on("OnInstallInfoUpdated" /* ModuleEvents.ON_INSTALL_INFO_UPDATED */, (installInfo) => {
            this.installInfo = installInfo;
        });
        this.emitter.on("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */, (pkgs) => {
            this.installedPackages = MockRexCloudAgentModule.sortInstalledPackages(pkgs).map((pkg) => {
                return { ...pkg, isInstallable: true };
            });
        });
    }
    async init() { }
    async onClose() { }
    async getEntryModuleType() {
        return this.ENTRY_MODULE_TYPE;
    }
    async getCCSEclipseInitValues() {
        return { ccsPort: 0, httpProxy: '', httpsProxy: '' };
    }
    addListener(eventName, listener) {
        this.emitter.on(eventName, listener);
    }
    removeListener(eventName, listener) {
        this.emitter.off(eventName, listener);
    }
    // Getters
    async getPackageInstallInfo() {
        this.handleEvent("OnInstallInfoUpdated" /* ModuleEvents.ON_INSTALL_INFO_UPDATED */);
        return this.installInfo;
    }
    async getInstalledPackages() {
        this.handleEvent("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */);
        return MockRexCloudAgentModule.sortInstalledPackages(this.installedPackages).map((pkg) => {
            return { ...pkg, isInstallable: true };
        });
    }
    async getAgentMode() {
        return this.options.agentMode || 'desktop';
    }
    async getProgress() {
        return this.progressManager.getProgress();
    }
    async getVersion() {
        return '4.8.0';
    }
    // Actions
    async clearTaskProgress(progressId) {
        return this.progressManager.clearTaskProgress(progressId);
    }
    async installPackage(pkg, installLocation) {
        const { registerTask } = this.progressManager.createProgressTask({ progressType: "Indefinite" /* ProgressType.INDEFINITE */ }, `Installing ${pkg.packagePublicUid}`);
        return registerTask((0, delay_1.delay)(MockRexCloudAgentModule.DELAY).then(() => {
            const pkgs = this.installedPackages.concat((0, data_1.createInstalledPackageData)(pkg, installLocation));
            this.emitter.emit("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */, pkgs);
        }));
    }
    async uninstallPackage(pkg) {
        const { registerTask } = this.progressManager.createProgressTask({ progressType: "Indefinite" /* ProgressType.INDEFINITE */ }, `Removing ${pkg.packagePublicUid}`);
        return registerTask((0, delay_1.delay)(MockRexCloudAgentModule.DELAY).then(() => {
            const pkgs = this.installedPackages.filter((item) => item.packagePublicId === pkg.packagePublicUid);
            this.emitter.emit("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */, pkgs);
        }));
    }
    async importProject(_packageUid, _location) {
        await (0, delay_1.delay)(MockRexCloudAgentModule.DELAY);
    }
    async openExternally(_link) {
        await (0, delay_1.delay)(MockRexCloudAgentModule.DELAY);
    }
    async onProductsChanged() { }
    // External APIs, careful changing these
    async getBoardAndDeviceInfo() {
        return { devices: [], boards: [] };
    }
    async getInstallInfoForPackageDependencies(_packageInfo, _options) {
        return [];
    }
    async getInstallInfoForPackages(_options) {
        return [];
    }
    // For test purposes only
    async _addProgressTask() {
        const { registerTask } = this.progressManager.createProgressTask({ progressType: "Indefinite" /* ProgressType.INDEFINITE */ }, 'Test progress');
        return registerTask;
    }
    ///////////////////////////////////////////////////////////////////////////////
    // Private methods
    ///////////////////////////////////////////////////////////////////////////////
    handleEvent(eventName) {
        const events = this.options.tirexTriggerEvents && this.options.tirexTriggerEvents[eventName];
        if (!events) {
            return;
        }
        const { data, delay } = events;
        setTimeout(() => {
            this.emitter.emit(eventName, data);
        }, delay);
    }
    static sortInstalledPackages(pkgs) {
        return (0, util_1.sortVersionedItems)(pkgs, 'packagePublicId', 'packageVersion');
    }
}
exports.MockRexCloudAgentModule = MockRexCloudAgentModule;
