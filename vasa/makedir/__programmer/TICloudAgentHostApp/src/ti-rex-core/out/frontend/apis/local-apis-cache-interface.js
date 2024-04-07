"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalApisCacheInterface = void 0;
// our modules
const cache_1 = require("./cache");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class LocalApisCacheInterface {
    // Key for cache values that were provided without a key
    static EMPTY_KEY = '__EMPTY__';
    static MINOR_CACHE_SIZE = 10;
    static PROJ_TEMPLATE_CACHE_SIZE = 100;
    installInfo = null;
    installedPackages = null;
    progress = null;
    version = null;
    boardAndDeviceInfo = null;
    // TODO These cache sizes were could use some optimization
    ccsDevicesCache = new cache_1.Cache(LocalApisCacheInterface.MINOR_CACHE_SIZE);
    ccsDeviceDetailCache = new cache_1.Cache(LocalApisCacheInterface.MINOR_CACHE_SIZE);
    projectTemplatesCache = new cache_1.Cache(LocalApisCacheInterface.PROJ_TEMPLATE_CACHE_SIZE);
    clearCache() {
        this.installInfo = null;
        this.installedPackages = null;
        this.progress = null;
        this.version = null;
        this.boardAndDeviceInfo = null;
        this.ccsDevicesCache.clear();
        this.ccsDeviceDetailCache.clear();
        this.projectTemplatesCache.clear();
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Getters
    ///////////////////////////////////////////////////////////////////////////
    getInstallInfo() {
        return this.installInfo;
    }
    getInstalledPackages() {
        return this.installedPackages;
    }
    getProgress() {
        return this.progress;
    }
    getVersion() {
        return this.version;
    }
    getBoardAndDeviceInfo() {
        return this.boardAndDeviceInfo;
    }
    getCcsDevices(targetFilter) {
        return this.ccsDevicesCache.get(LocalApisCacheInterface.getCcsDevicesKey(targetFilter));
    }
    getCcsDeviceDetail(deviceId) {
        return this.ccsDeviceDetailCache.get(deviceId);
    }
    getProjectTemplates(deviceId, toolVersion) {
        return this.projectTemplatesCache.get(LocalApisCacheInterface.getProjectTemplatesKey(deviceId, toolVersion));
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Setters
    ///////////////////////////////////////////////////////////////////////////
    setInstallInfo(info) {
        return (this.installInfo = info);
    }
    setInstalledPackages(packages) {
        return (this.installedPackages = packages);
    }
    setProgress(progress) {
        return (this.progress = progress);
    }
    setVersion(version) {
        return (this.version = version);
    }
    setBoardAndDeviceInfo(info) {
        return (this.boardAndDeviceInfo = info);
    }
    setCcsDevices(targetFilter, devices) {
        return this.ccsDevicesCache.insert(LocalApisCacheInterface.getCcsDevicesKey(targetFilter), devices);
    }
    setCcsDeviceDetail(deviceId, detail) {
        return this.ccsDeviceDetailCache.insert(deviceId, detail);
    }
    setProjectTemplates(deviceId, toolVersion, templates) {
        return this.projectTemplatesCache.insert(LocalApisCacheInterface.getProjectTemplatesKey(deviceId, toolVersion), templates);
    }
    //
    // Internal: Cache string-based key generation from non-string cache entry keys
    //
    static getCcsDevicesKey(targetFilter) {
        return targetFilter || LocalApisCacheInterface.EMPTY_KEY;
    }
    static getProjectTemplatesKey(deviceId, toolVersion) {
        return `${deviceId}__${toolVersion}`;
    }
}
exports.LocalApisCacheInterface = LocalApisCacheInterface;
