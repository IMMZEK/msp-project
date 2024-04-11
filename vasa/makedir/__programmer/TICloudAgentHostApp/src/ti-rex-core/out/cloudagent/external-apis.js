"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstallInfoForPackages = exports.getInstallInfoForPackageDependencies = exports.getBoardAndDeviceInfo = void 0;
// native modules
const path = require("path");
// 3rd party
const _ = require("lodash");
const fs = require("fs-extra");
const util_1 = require("./util");
const Versioning = require("../lib/versioning");
const util_2 = require("../shared/util");
const entry_module_inner_desktop_1 = require("./entry-module-inner-desktop");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Get board and device info from rex server or locally persisted data
 *
 * @param commonParams
 * @param offline - whether to retrieve locally or from server; if undefined attempt server
 * first with local data as fallback
 * @returns
 */
async function getBoardAndDeviceInfo(commonParams, options) {
    const offline = options && options.offline;
    if (offline) {
        return getOfflineBoardAndDeviceInfo();
    }
    else {
        let boardAndDeviceData;
        try {
            const tirex4RemoteserverUrl = commonParams.vars.remoteserverUrl;
            boardAndDeviceData = await (0, util_1.doTirex4Request)(`${tirex4RemoteserverUrl}${"api/boardsDevices" /* RemoteserverAPI.GET_BOARDS_AND_DEVICES */}`);
        }
        catch (e) {
            // Assuming that exception was due to server being unavailable.
            // TODO! Better to interpret exception and rethrow if it doesn't mean that server is unavailable. Or maybe
            // even better, use a more direct and faster way to determine if server is available such as:
            // doRequest(`${server}/api/serverState`, 'HEAD')
            if (offline === undefined) {
                // Try again but locally
                return getOfflineBoardAndDeviceInfo();
            }
            else {
                throw e;
            }
        }
        return boardAndDeviceData;
    }
    async function getOfflineBoardAndDeviceInfo() {
        // Get boards and devices from offlined devices/boards JSON
        const configPath = (0, util_1.getConfigFolder)();
        const latestBoardsAndDevicesPath = path.join(configPath, entry_module_inner_desktop_1.latestBoardsAndDevicesFileName);
        const defaultBoardsAndDevicesPath = path.join(configPath, entry_module_inner_desktop_1.defaultBoardsAndDevicesFileName);
        let boardsAndDevicesPath;
        if (await fs.pathExists(latestBoardsAndDevicesPath)) {
            boardsAndDevicesPath = latestBoardsAndDevicesPath;
        }
        else if (await fs.pathExists(defaultBoardsAndDevicesPath)) {
            boardsAndDevicesPath = defaultBoardsAndDevicesPath;
        }
        else {
            throw new Error(`Default boards and devices file missing: ${defaultBoardsAndDevicesPath}`);
        }
        // TODO! Add error checking and verification of JSON format
        return fs.readJSON(boardsAndDevicesPath);
    }
}
exports.getBoardAndDeviceInfo = getBoardAndDeviceInfo;
/**
 * Get the recursive set of dependencies for a package (including the package itself).
 *
 */
async function getInstallInfoForPackageDependencies(packageInfo, ccsAdapter, commonParams, excludePacakgeAsDependency = false) {
    const tirex4RemoteserverUrl = commonParams.vars.remoteserverUrl;
    const pkgs = await (0, util_1.doTirex4Request)(`${tirex4RemoteserverUrl}${"api/packages" /* RemoteserverAPI.GET_PACKAGES */}`);
    const installPackages = await ccsAdapter.getInstalledPackages();
    const pkg = pkgs.find((item) => item.packagePublicId === packageInfo.packageId &&
        item.packageVersion === packageInfo.version);
    if (!pkg) {
        throw new Error(`Could not find package ${packageInfo.packageId} ${packageInfo.version}`);
    }
    const dependencies = await getRecursiveDependencies(pkg, installPackages, pkgs, commonParams.logger);
    const installInfo = dependencies
        .map((item) => {
        if (excludePacakgeAsDependency && item.packagePublicId === packageInfo.packageId) {
            return null;
        }
        else {
            return getInstallInfoForDependency(item, installPackages, pkgs, commonParams.logger);
        }
    })
        .filter((item) => {
        return !!item;
    });
    return installInfo;
}
exports.getInstallInfoForPackageDependencies = getInstallInfoForPackageDependencies;
async function getInstallInfoForPackages(ccsAdapter, commonParams, options) {
    const tirex4RemoteserverUrl = commonParams.vars.remoteserverUrl;
    const pkgs = await (0, util_1.doTirex4Request)(`${tirex4RemoteserverUrl}${"api/packages" /* RemoteserverAPI.GET_PACKAGES */}`);
    const installPackages = await ccsAdapter.getInstalledPackages();
    const boardAndDeviceInfo = await getBoardsAndDevicesKeyedOnPublicId(commonParams);
    let filteredPackages = pkgs;
    if (options.targetDevice) {
        filteredPackages = getFeatureSupportPackagesForDevice(options.targetDevice, filteredPackages, boardAndDeviceInfo);
    }
    else if (options.targetBoard) {
        filteredPackages = getFeatureSupportPackagesForBoard(options.targetBoard, filteredPackages, boardAndDeviceInfo);
    }
    const installInfo = filteredPackages.map((item) => {
        const itemAsDependency = {
            packagePublicId: item.packagePublicId,
            versionRange: item.packageVersion,
            dependencyType: "mandatory" /* PackageDependencyType.MANDATORY */
        };
        return getInstallInfoForDependency(itemAsDependency, installPackages, pkgs, commonParams.logger);
    });
    return installInfo;
}
exports.getInstallInfoForPackages = getInstallInfoForPackages;
async function getRecursiveDependencies(pkg, installedPackages, onlinePackages, logger, dependencies = [], installInfoForDeps = []) {
    const deps = _.uniqBy(dependencies.concat(pkg.dependencies), (item1) => `${item1.packagePublicId}__${item1.versionRange}`).concat(_.isEmpty(dependencies)
        ? [
            {
                packagePublicId: pkg.packagePublicId,
                versionRange: pkg.packageVersion,
                dependencyType: "mandatory" /* PackageDependencyType.MANDATORY */
            }
        ]
        : []);
    const installInfos = await Promise.all(deps.map((item) => getInstallInfoForDependency(item, installedPackages, onlinePackages, logger)));
    const { newDeps, newInstallInfoForDeps, newPkgs } = getDepDataForCurrentPkg();
    if (_.isEmpty(newPkgs)) {
        return newDeps;
    }
    else {
        const depsRecursive = await Promise.all(newPkgs.map((newPkg) => getRecursiveDependencies(newPkg, installedPackages, onlinePackages, logger, newDeps, newInstallInfoForDeps)));
        const groupedDeps = _.groupBy(_.flatten(depsRecursive), (dep) => `${dep.packagePublicId}__${dep.versionRange}`);
        return Object.values(groupedDeps).map((deps) => {
            const sortedDeps = deps.sort((item1, _item2) => {
                if (item1.dependencyType === "mandatory" /* PackageDependencyType.MANDATORY */) {
                    return -1;
                }
                else {
                    return 1;
                }
            });
            return sortedDeps[0];
        });
    }
    function getNameOrIdForInstallInfoData(installInfo) {
        if (installInfo.installInfoType === "available" /* InstallInfoType.AVAILABLE */ ||
            installInfo.installInfoType === "installed" /* InstallInfoType.INSTALLED */) {
            return installInfo.packageId;
        }
        else {
            return installInfo.name;
        }
    }
    function getDepDataForCurrentPkg() {
        const newPkgs = [];
        const newDeps = dependencies;
        const newInstallInfoForDeps = installInfoForDeps;
        installInfos.map((installInfo, idx) => {
            const depInfo = deps[idx];
            const nameOrIdOfCurrent = getNameOrIdForInstallInfoData(installInfo);
            const isAlreadyListed = newInstallInfoForDeps.find((item) => {
                const nameOrId = getNameOrIdForInstallInfoData(item);
                return nameOrId === nameOrIdOfCurrent;
            });
            if (!isAlreadyListed) {
                newInstallInfoForDeps.push(installInfo);
                newDeps.push(depInfo);
                const newPkg = onlinePackages.find((item) => {
                    return item.packagePublicId === nameOrIdOfCurrent;
                });
                if (newPkg) {
                    newPkgs.push(newPkg);
                }
            }
        });
        return { newDeps, newInstallInfoForDeps, newPkgs };
    }
}
function getInstallInfoForDependency(dependency, installedPackages, onlinePackages, _logger) {
    const onlinePkg = onlinePackages.find((item) => item.packagePublicId === dependency.packagePublicId &&
        Versioning.satisfies(item.packageVersion, dependency.versionRange));
    const installedPkg = installedPackages.find((item) => item.packagePublicId === dependency.packagePublicId &&
        Versioning.satisfies(item.packageVersion, dependency.versionRange));
    const resultBase = {
        name: dependency.packagePublicId,
        packageId: dependency.packagePublicId,
        packageVersion: dependency.versionRange,
        dependencyType: dependency.dependencyType
    };
    if (installedPkg) {
        return getInstalledPkgInstallInfo(installedPkg);
    }
    else if (onlinePkg) {
        return getOnlinePkgInstallInfo(onlinePkg);
    }
    else {
        const result = {
            ...resultBase,
            installInfoType: "notAvailable" /* InstallInfoType.NOT_AVAILABLE */
        };
        return result;
    }
    function getInstalledPkgInstallInfo(installPkg) {
        let updateAvaliable = null;
        const latestOnline = onlinePackages.find((item) => item.packagePublicId === installPkg.packagePublicId);
        if (latestOnline && latestOnline.packageVersion !== installPkg.packageVersion) {
            const latestOnlineInstallInfo = getOnlinePkgInstallInfo(latestOnline);
            if (latestOnlineInstallInfo.installInfoType === "available" /* InstallInfoType.AVAILABLE */) {
                updateAvaliable = {
                    installInfo: latestOnlineInstallInfo
                };
            }
        }
        const onlineInstallInfo = onlinePkg ? getOnlinePkgInstallInfo(onlinePkg) : null;
        const packageType = onlineInstallInfo && onlineInstallInfo.installInfoType === "available" /* InstallInfoType.AVAILABLE */
            ? onlineInstallInfo.packageType
            : null;
        const result = {
            ...resultBase,
            packageVersion: installPkg.packageVersion,
            installInfoType: "installed" /* InstallInfoType.INSTALLED */,
            packageType,
            featureType: getFeatureType(installPkg.featureType),
            installLocation: installPkg.localPackagePath,
            updateAvaliable,
            updateAvaliableInNewerCCSVersion: false
        };
        return result;
    }
    function getOnlinePkgInstallInfo(onlinePkg) {
        const downloadUrl = onlinePkg.downloadUrl[(0, util_1.getPlatform)()];
        const installCommand = (onlinePkg.installCommand || {})[(0, util_1.getPlatform)()] || null;
        const installSize = (onlinePkg.installSize || {})[(0, util_1.getPlatform)()] || 0;
        if (!downloadUrl) {
            const result = {
                ...resultBase,
                installInfoType: "notSupportedOnCurrentPlatform" /* InstallInfoType.NOT_SUPPORTED_ON_CURRENT_PLATFORM */
            };
            return result;
        }
        let packageType;
        if (!_.isEmpty(onlinePkg.modules)) {
            packageType = "sdkComposer" /* PackageType.SDK_COMPOSER */;
        }
        else if (onlinePkg.subType &&
            (onlinePkg.subType === 'ccsComponent' || onlinePkg.subType === 'featureSupport')) {
            packageType = "ccsComponent" /* PackageType.CCS_COMPONENT */;
        }
        else {
            packageType = "software" /* PackageType.SOFTWARE */;
        }
        const featureType = getFeatureType(onlinePkg.featureType || null);
        let installTo = "userFolder" /* InstallLocation.USER_FOLDER */;
        if (featureType === "ccsCore" /* FeatureType.CCS_CORE */) {
            installTo = "productFolder" /* InstallLocation.PRODUCT_FOLDER */;
        }
        else if (packageType === "ccsComponent" /* PackageType.CCS_COMPONENT */) {
            installTo = "ccs" /* InstallLocation.CCS */;
        }
        const result = {
            ...resultBase,
            packageVersion: onlinePkg.packageVersion,
            installInfoType: "available" /* InstallInfoType.AVAILABLE */,
            packageType,
            featureType,
            downloadUrl,
            installCommand,
            installSize,
            licenses: onlinePkg.licenses || [],
            updateAvaliableInNewerCCSVersion: false,
            installTo
        };
        return result;
    }
}
async function getBoardsAndDevicesKeyedOnPublicId(commonParams) {
    // TODO!! May want to cache this, either here or deeper on the server side. And if not just get rid of it and search
    // on them in arrays instead (far faster than building this everytime). Also, this function is only really needed
    // for getting device/board featureSupport, so may be better to just store (and cache) publicId->featureSupport
    // maps instead.
    // TODO! Duplicate code, also in getBoardAndDeviceInfo()
    const tirex4RemoteserverUrl = commonParams.vars.remoteserverUrl;
    const boardAndDeviceData = await (0, util_1.doTirex4Request)(`${tirex4RemoteserverUrl}${"api/boardsDevices" /* RemoteserverAPI.GET_BOARDS_AND_DEVICES */}`);
    const devices = _.keyBy(boardAndDeviceData.devices, (device) => device.publicId);
    const boards = _.keyBy(boardAndDeviceData.boards, (board) => board.publicId);
    return {
        devices,
        boards
    };
}
function getFeatureSupportPackagesForDevice(deviceId, pkgs, boardDeviceInfo) {
    const deviceInfo = boardDeviceInfo.devices[deviceId];
    if (!deviceInfo || !deviceInfo.featureSupport) {
        return [];
    }
    else {
        return pkgs.filter((pkg) => deviceInfo.featureSupport.includes(pkg.packagePublicId));
    }
}
function getFeatureSupportPackagesForBoard(boardId, pkgs, boardDeviceInfo) {
    const boardInfo = boardDeviceInfo.boards[boardId];
    if (!boardInfo || !boardInfo.featureSupport) {
        return [];
    }
    else {
        return pkgs.filter((pkg) => boardInfo.featureSupport.includes(pkg.packagePublicId));
    }
}
function getFeatureType(inputFeatureType) {
    let featureType = null;
    if (inputFeatureType) {
        switch (inputFeatureType) {
            case 'deviceSupport':
                featureType = "deviceSupport" /* FeatureType.DEVICE_SUPPORT */;
                break;
            case 'tools':
                featureType = "tools" /* FeatureType.TOOLS */;
                break;
            case 'compiler':
                featureType = "compiler" /* FeatureType.COMPILER */;
                break;
            case 'ccsCore':
                featureType = "ccsCore" /* FeatureType.CCS_CORE */;
                break;
            default:
                (0, util_2.assertNever)(inputFeatureType);
                // don't throw so we don't break older desktop releases
                featureType = "tools" /* FeatureType.TOOLS */;
        }
    }
    return featureType;
}
