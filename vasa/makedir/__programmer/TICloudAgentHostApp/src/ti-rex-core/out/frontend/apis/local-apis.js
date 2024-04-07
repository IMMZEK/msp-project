"use strict";
// agent.js namespace
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalAPIs = void 0;
const all_off_1 = require("event-emitter/all-off");
const _ = require("lodash");
// our modules
const interface_1 = require("../../cloudagent/interface");
const errors_1 = require("../../shared/errors");
const Versioning = require("../../lib/versioning");
const event_emitter_1 = require("../component-helpers/event-emitter");
const util_1 = require("../component-helpers/util");
const theme_config_1 = require("../component-helpers/theme-config");
const local_apis_cache_interface_1 = require("./local-apis-cache-interface");
/**
 * This file is equivilent to APIs, but it is local-only actions.  It is implemented by calling into
 * cloud agent to handle everything.
 *
 */
class LocalAPIs {
    errorCallback;
    modulePromise = null;
    cacheInterface = new local_apis_cache_interface_1.LocalApisCacheInterface();
    emitter = new event_emitter_1.default();
    constructor(errorCallback) {
        this.errorCallback = errorCallback;
    }
    // APIs
    async getPackageInstallInfo(agent) {
        const cachedResult = this.cacheInterface.getInstallInfo();
        if (cachedResult) {
            return cachedResult;
        }
        const tirexModule = await this.getLocalModule(agent);
        return this.cacheInterface.setInstallInfo(tirexModule ? tirexModule.getPackageInstallInfo() : Promise.resolve([]));
    }
    async getInstalledPackages(agent) {
        const cachedResult = this.cacheInterface.getInstalledPackages();
        if (cachedResult) {
            return cachedResult;
        }
        const tirexModule = await this.getLocalModule(agent);
        return this.cacheInterface.setInstalledPackages(tirexModule ? tirexModule.getInstalledPackages() : Promise.resolve([]));
    }
    async updateOfflineBoardsAndDevices(agent) {
        const tirexModule = await this.getLocalModule(agent);
        if (tirexModule.ENTRY_MODULE_TYPE !== 'EntryModuleDesktop') {
            throw new Error(`Calling updateOfflineBoardsAndDevices on cloud`);
        }
        try {
            return await tirexModule.updateOfflineBoardsAndDevices();
        }
        catch (e) {
            // Catching and simply logging error as we could run into an issue writing to the latest
            // boards-and-devices file (e.g. dir could be read-only), which should never be fatal.
            //
            // TODO? Consider instead reporting error to user in a non-intrusive way and with
            // instructions on how to change its location (once this is actually configurable); if
            // it becomes so before we move to a longer-term local persistence solution (although
            // possible that we may end up having to do this for that as well)
            console.error('Error persisting boards and devices data locally:', e);
        }
    }
    async getOfflineBoardsAndDevices(agent) {
        const cachedResult = this.cacheInterface.getBoardAndDeviceInfo();
        if (cachedResult) {
            return cachedResult;
        }
        const tirexModule = await this.getLocalModule(agent);
        if (tirexModule.ENTRY_MODULE_TYPE !== 'EntryModuleDesktop') {
            throw new Error(`Calling getOfflineBoardsAndDevices on cloud`);
        }
        const placeholder = {
            boards: [],
            devices: []
        };
        return this.cacheInterface.setBoardAndDeviceInfo(tirexModule
            ? tirexModule.getBoardAndDeviceInfo({ offline: true })
            : Promise.resolve(placeholder));
    }
    async getCcsDevices(agent, targetFilter) {
        const cachedResult = this.cacheInterface.getCcsDevices(targetFilter);
        if (cachedResult) {
            return cachedResult;
        }
        const tirexModule = await this.getLocalModule(agent);
        if (tirexModule.ENTRY_MODULE_TYPE !== 'EntryModuleDesktop') {
            throw new Error(`Calling getCcsDevices on cloud`);
        }
        const placeholder = {
            devices: [],
            targetFilters: []
        };
        return this.cacheInterface.setCcsDevices(targetFilter, tirexModule ? tirexModule.getCcsDevices(targetFilter) : Promise.resolve(placeholder));
    }
    async getCcsDeviceDetail(agent, deviceId) {
        const cachedResult = this.cacheInterface.getCcsDeviceDetail(deviceId);
        if (cachedResult) {
            return cachedResult;
        }
        const tirexModule = await this.getLocalModule(agent);
        if (tirexModule.ENTRY_MODULE_TYPE !== 'EntryModuleDesktop') {
            throw new Error(`Calling getCcsDeviceDetail on cloud`);
        }
        const placeholder = {
            id: '',
            name: '',
            family: '',
            variant: '',
            isa: '',
            isReal: false,
            toolVersions: []
        };
        return this.cacheInterface.setCcsDeviceDetail(deviceId, tirexModule ? tirexModule.getCcsDeviceDetail(deviceId) : Promise.resolve(placeholder));
    }
    async getProjectTemplates(agent, deviceId, toolVersion) {
        const cachedResult = this.cacheInterface.getProjectTemplates(deviceId, toolVersion);
        if (cachedResult) {
            return cachedResult;
        }
        const tirexModule = await this.getLocalModule(agent);
        if (tirexModule.ENTRY_MODULE_TYPE !== 'EntryModuleDesktop') {
            throw new Error(`Calling getProjectTemplates on cloud`);
        }
        const placeholder = {
            outputTypes: [],
            templateIndex: {}
        };
        return this.cacheInterface.setProjectTemplates(deviceId, toolVersion, tirexModule
            ? tirexModule.getProjectTemplates(deviceId, toolVersion)
            : Promise.resolve(placeholder));
    }
    async getAgentMode(agent) {
        const tirexModule = await this.getLocalModule(agent);
        return tirexModule.ENTRY_MODULE_TYPE === 'EntryModuleDesktop' ? 'desktop' : 'cloud';
    }
    async getProgress(agent) {
        const cachedResult = this.cacheInterface.getProgress();
        if (cachedResult) {
            return cachedResult;
        }
        const tirexModule = await this.getLocalModule(agent);
        return this.cacheInterface.setProgress(tirexModule ? tirexModule.getProgress() : Promise.resolve({}));
    }
    async getVersion(agent) {
        const cachedResult = this.cacheInterface.getVersion();
        if (cachedResult) {
            return cachedResult;
        }
        const tirexModule = await this.getLocalModule(agent);
        return this.cacheInterface.setVersion(tirexModule ? tirexModule.getVersion() : Promise.resolve(''));
    }
    async clearTaskProgress(agent, progressId) {
        const tirexModule = await this.getLocalModule(agent);
        await tirexModule.clearTaskProgress(progressId);
    }
    async importProject(agent, resourceType, packageUid, location, targetId, projectName) {
        const tirexModule = await this.getLocalModule(agent);
        const version = await this.getVersion(agent);
        if (tirexModule.ENTRY_MODULE_TYPE !== 'EntryModuleDesktop') {
            throw new Error(`importProject not supported on cloud`);
        }
        if (Versioning.satisfies(version, '^4.14.0')) {
            await tirexModule.importProject(resourceType, packageUid, location, targetId, projectName);
        }
        else {
            // @ts-ignore - for older tirex versions projectName isn't supported; will be addressed as part of REX-3587
            await tirexModule.importProject(resourceType, packageUid, location, targetId);
        }
    }
    async importProjectTemplate(agent, templateId, targetId, projectName, toolVersion, outputTypeId) {
        const tirexModule = await this.getLocalModule(agent);
        const version = await this.getVersion(agent);
        if (!Versioning.satisfies(version, '^4.14.0')) {
            throw new Error(`importProjectTemplate not supported on tirex module v${version}`);
        }
        if (tirexModule.ENTRY_MODULE_TYPE !== 'EntryModuleDesktop') {
            throw new Error(`Calling importProjectTemplate on cloud`);
        }
        await tirexModule.importProjectTemplate(templateId, targetId, projectName, toolVersion, outputTypeId, null);
    }
    async installPackage(agent, pkg, installLocation) {
        const tirexModule = await this.getLocalModule(agent);
        return tirexModule.installPackage(pkg, installLocation);
    }
    async uninstallPackage(agent, pkg) {
        const tirexModule = await this.getLocalModule(agent);
        return tirexModule.uninstallPackage(pkg);
    }
    async openExternally(agent, link) {
        const tirexModule = await this.getLocalModule(agent);
        if (tirexModule.ENTRY_MODULE_TYPE !== 'EntryModuleDesktop') {
            throw new Error(`Calling openExternally on cloud`);
        }
        await tirexModule.openExternally(link);
        return true;
    }
    // Events
    onInstalledPackagesUpdated(fn) {
        return this.emitter.on("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */, fn);
    }
    onInstallInfoUpdated(fn) {
        return this.emitter.on("OnInstallInfoUpdated" /* ModuleEvents.ON_INSTALL_INFO_UPDATED */, fn);
    }
    onProgressUpdated(fn) {
        return this.emitter.on("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, fn);
    }
    removeListener(event, listener) {
        this.emitter.off(event, listener);
    }
    // For test purposes only
    _clearCachedData() {
        this.cacheInterface.clearCache();
        this.modulePromise = null;
        (0, all_off_1.default)(this.emitter);
    }
    // Handling Events
    handleInstalledPackagesUpdated = async (packages) => {
        try {
            const data = await this.cacheInterface.setInstalledPackages(Promise.resolve(packages));
            this.emitter.emit("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */, data);
        }
        catch (e) {
            (0, util_1.handleError)(e, this.errorCallback);
        }
        // tslint:disable-next-line:semicolon - bug in our version of tslint
    };
    handleInstallInfoUpdated = async (installInfo) => {
        try {
            const data = await this.cacheInterface.setInstallInfo(Promise.resolve(installInfo));
            this.emitter.emit("OnInstallInfoUpdated" /* ModuleEvents.ON_INSTALL_INFO_UPDATED */, data);
        }
        catch (e) {
            (0, util_1.handleError)(e, this.errorCallback);
        }
        // tslint:disable-next-line:semicolon - bug in our version of tslint
    };
    handleProgressUpdated = async (progress) => {
        try {
            const data = await this.cacheInterface.setProgress(Promise.resolve(progress));
            this.emitter.emit("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, data);
        }
        catch (e) {
            (0, util_1.handleError)(e, this.errorCallback);
        }
        // tslint:disable-next-line:semicolon - bug in our version of tslint
    };
    handleModuleError = async (error) => {
        try {
            // We got an error from the tirex submodule.
            // Call close then let error boundary prompt the user to refresh the page which will launch a new instance.
            await this.doClose();
        }
        catch (e) {
            // Log this error, let the passed in error go to errorCallback
            console.error(e);
        }
        finally {
            (0, util_1.handleError)((0, util_1.convertToCloudAgentError)(error), this.errorCallback);
        }
        // tslint:disable-next-line:semicolon - bug in our version of tslint
    };
    handleClose = async () => {
        try {
            // Call close then let error boundary prompt the user to refresh the page which will launch a new instance.
            await this.doClose();
        }
        catch (e) {
            // Log this error, let the passed in error go to errorCallback
            console.error(e);
        }
        finally {
            (0, util_1.handleError)(new errors_1.CloudAgentError('Connection closed'), this.errorCallback);
        }
        // tslint:disable-next-line:semicolon - bug in our version of tslint
    };
    // Cloud agent interaction
    getLocalModule(agent) {
        if (!this.modulePromise) {
            this.modulePromise = this.fetchLocalModule(agent);
        }
        return this.modulePromise;
    }
    async fetchLocalModule(agent) {
        try {
            let proxy = null;
            const theiaPort = (0, util_1.getTheiaPort)();
            const tirexModule = await agent.getSubModule(interface_1.rexCloudAgentModuleName);
            // @ts-ignore populate ENTRY_MODULE_TYPE (ticloudagent only configures public methods)
            tirexModule.ENTRY_MODULE_TYPE = tirexModule.getEntryModuleType
                ? await tirexModule.getEntryModuleType()
                : 'EntryModuleDesktop';
            const isTheia = theiaPort > 0 && tirexModule.ENTRY_MODULE_TYPE === 'EntryModuleDesktop';
            if (isTheia) {
                // CCS Theia communication
                const result = await Promise.resolve(`${
                /* webpackIgnore: true */ `http://localhost:${theiaPort}/ccs-webview/ccs-plugin-api.js`}`).then(s => require(s));
                if (result && result.init) {
                    // Events
                    const ccs = await result.init();
                    ccs.ide.addEventListener('products-refreshed', () => {
                        if (tirexModule.ENTRY_MODULE_TYPE === 'EntryModuleDesktop') {
                            tirexModule.onProductsChanged().catch((err) => console.error(err));
                        }
                    });
                    ccs.ide.addEventListener('theme-changed', (themeId) => {
                        this.syncTheme(themeId);
                    });
                    // Get the proxy
                    proxy = await ccs.ide.resolveProxy(window.location.origin);
                    if (proxy && typeof proxy === 'string') {
                        const proxyPieces = proxy.split(' ');
                        proxy = proxyPieces.length > 1 ? _.last(proxyPieces) || null : null;
                        proxy = proxy && !proxy.includes('://') ? `http://${proxy}` : proxy;
                    }
                    // Get & set the theme
                    const themeId = await ccs.ide.getCurrentThemeId();
                    this.syncTheme(themeId);
                }
            }
            else if (tirexModule.ENTRY_MODULE_TYPE === 'EntryModuleDesktop') {
                // CCS Eclipse communication
                await new Promise((resolve) => {
                    if (window.rexRegisterDataCallback) {
                        throw new Error('rexRegisterDataCallback already set');
                    }
                    if (window.rexRegisterData) {
                        window.rexRegisterDataCallback = () => {
                            resolve();
                        };
                        window.rexRegisterData('rexRegisterDataCallback');
                    }
                    else {
                        resolve();
                    }
                });
                const windowTi = window.ti;
                if (windowTi && windowTi.ui && windowTi.ui.theme) {
                    this.syncTheme(windowTi.ui.theme.endsWith('dark') ? 'dark' : 'light');
                }
                document.addEventListener('theme-changed', (event) => {
                    const eventDetail = event.detail;
                    if (eventDetail && eventDetail.theme) {
                        this.syncTheme(eventDetail.theme.endsWith('dark') ? 'dark' : 'light');
                    }
                });
            }
            // @ts-ignore Older releases did not have this method.
            if (tirexModule.init) {
                if (isTheia) {
                    await tirexModule.init({ ccsPort: theiaPort, proxy, isTheia: true });
                }
                else if (tirexModule.ENTRY_MODULE_TYPE === 'EntryModuleDesktop') {
                    const { ccsPort, httpsProxy, httpProxy } = await tirexModule.getCCSEclipseInitValues();
                    await tirexModule.init({
                        ccsPort,
                        proxy: httpsProxy || httpProxy,
                        isTheia: false
                    });
                }
                else {
                    await tirexModule.init({ ccsPort: 0, proxy: null, isTheia: false });
                }
            }
            this.onModuleFetched(tirexModule);
            return tirexModule;
        }
        catch (err) {
            throw (0, util_1.convertToCloudAgentError)(err);
        }
    }
    onModuleFetched(module) {
        // These listeners never get removed, we assume only one instance of this page is created and is always used.
        // Otherwise we would need to clean these up
        module.addListener("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */, this.handleInstalledPackagesUpdated);
        module.addListener("OnInstallInfoUpdated" /* ModuleEvents.ON_INSTALL_INFO_UPDATED */, this.handleInstallInfoUpdated);
        module.addListener("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, this.handleProgressUpdated);
        module.addListener("OnError" /* ModuleEvents.ON_ERROR */, this.handleModuleError);
        module.addListener('close', this.handleClose);
    }
    async doClose() {
        const CloudAgent = await (0, util_1.getTICloudAgentObject)();
        if (CloudAgent) {
            const agent = await CloudAgent.Init();
            try {
                const module = await this.fetchLocalModule(agent);
                if (module) {
                    module.removeListener('close', this.handleClose);
                    await module.close();
                }
            }
            finally {
                await agent.close();
            }
        }
    }
    syncTheme(themeId) {
        const targetTheme = themeId === 'dark' ? 'dark' : 'light';
        const currentTheme = (0, theme_config_1.getTheme)();
        if (currentTheme !== targetTheme) {
            (0, theme_config_1.setTheme)(targetTheme);
            (0, theme_config_1.loadTheme)();
        }
    }
}
exports.LocalAPIs = LocalAPIs;
