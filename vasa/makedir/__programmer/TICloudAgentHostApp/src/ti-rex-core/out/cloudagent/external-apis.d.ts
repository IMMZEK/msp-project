import { CCSAdapter } from './ccs-adapter';
import { CommonParams } from './util';
import { PackageDependencyType, DeviceType } from '../shared/routes/response-data';
declare const enum PackageType {
    CCS_COMPONENT = "ccsComponent",
    SDK_COMPOSER = "sdkComposer",
    SOFTWARE = "software"
}
declare const enum InstallInfoType {
    AVAILABLE = "available",
    NOT_AVAILABLE = "notAvailable",
    INSTALLED = "installed",
    NOT_SUPPORTED_ON_CURRENT_PLATFORM = "notSupportedOnCurrentPlatform"
}
export declare const enum FeatureType {
    DEVICE_SUPPORT = "deviceSupport",
    TOOLS = "tools",
    COMPILER = "compiler",
    CCS_CORE = "ccsCore"
}
export declare const enum InstallLocation {
    CCS = "ccs",
    USER_FOLDER = "userFolder",
    PRODUCT_FOLDER = "productFolder"
}
interface InstallInfoBase {
    name: string;
    packageId: string;
    packageVersion: string;
    dependencyType: PackageDependencyType;
}
interface InstallInfoAvailable extends InstallInfoBase {
    installInfoType: InstallInfoType.AVAILABLE;
    packageType: PackageType;
    featureType: FeatureType | null;
    downloadUrl: string;
    installCommand: string | null;
    installSize: number;
    licenses: string[];
    updateAvaliableInNewerCCSVersion: boolean;
    installTo: InstallLocation;
}
interface InstallInfoInstalled extends InstallInfoBase {
    installInfoType: InstallInfoType.INSTALLED;
    packageId: string;
    packageType: PackageType | null;
    featureType: FeatureType | null;
    installLocation: string;
    updateAvaliable: {
        installInfo: InstallInfoAvailable;
    } | null;
    updateAvaliableInNewerCCSVersion: boolean;
}
interface InstallInfoNotAvailable extends InstallInfoBase {
    installInfoType: InstallInfoType.NOT_AVAILABLE;
}
interface InstallInfoNotSupportedOnCurrentPlatform extends InstallInfoBase {
    installInfoType: InstallInfoType.NOT_SUPPORTED_ON_CURRENT_PLATFORM;
}
export type InstallInfo = InstallInfoAvailable | InstallInfoNotAvailable | InstallInfoInstalled | InstallInfoInstalled | InstallInfoNotSupportedOnCurrentPlatform;
export interface DeviceInfo {
    publicId: string;
    name: string;
    type: DeviceType;
    featureSupport: string[];
}
export interface BoardInfo {
    publicId: string;
    name: string;
    devices: string[];
    featureSupport: string[];
}
export interface BoardDeviceInfo {
    boards: BoardInfo[];
    devices: DeviceInfo[];
}
export interface KeyedBoardDeviceInfo {
    boards: {
        [boardId: string]: BoardInfo;
    };
    devices: {
        [deviceId: string]: DeviceInfo;
    };
}
/**
 * Get board and device info from rex server or locally persisted data
 *
 * @param commonParams
 * @param offline - whether to retrieve locally or from server; if undefined attempt server
 * first with local data as fallback
 * @returns
 */
export declare function getBoardAndDeviceInfo(commonParams: CommonParams, options?: {
    offline?: boolean;
}): Promise<BoardDeviceInfo>;
/**
 * Get the recursive set of dependencies for a package (including the package itself).
 *
 */
export declare function getInstallInfoForPackageDependencies(packageInfo: {
    packageId: string;
    version: string;
}, ccsAdapter: CCSAdapter, commonParams: CommonParams, excludePacakgeAsDependency?: boolean): Promise<InstallInfo[]>;
export declare function getInstallInfoForPackages(ccsAdapter: CCSAdapter, commonParams: CommonParams, options: {
    targetDevice?: string;
    targetBoard?: string;
}): Promise<InstallInfo[]>;
export {};
