/// <reference types="sinon" />
import { ServerDataInput } from '../server-harness/initialize-server-harness-data';
import { Options } from '../../frontend/mock-agent/util';
export declare function setupFakeServer(data: ServerDataInput.Input, initialPage: string): Promise<void>;
export declare function cleanupFakeServer(): Promise<void>;
export declare function getFakeServerRequests(): Promise<import("sinon").SinonFakeXMLHttpRequest[]>;
export declare function installCloudAgent(options: Options): Promise<void>;
export declare function uninstallCloudAgent(): Promise<void>;
export declare function getRexCloudAgentModuleSpies(): Promise<{
    readonly ENTRY_MODULE_TYPE: {
        callCount: string;
        args: any[][];
    };
    init: {
        callCount: string;
        args: any[][];
    };
    onClose: {
        callCount: string;
        args: any[][];
    };
    getEntryModuleType: {
        callCount: string;
        args: any[][];
    };
    getCCSEclipseInitValues: {
        callCount: string;
        args: any[][];
    };
    addListener: {
        callCount: string;
        args: any[][];
    };
    removeListener: {
        callCount: string;
        args: any[][];
    };
    getPackageInstallInfo: {
        callCount: string;
        args: any[][];
    };
    getInstalledPackages: {
        callCount: string;
        args: any[][];
    };
    getAgentMode: {
        callCount: string;
        args: any[][];
    };
    getProgress: {
        callCount: string;
        args: any[][];
    };
    getVersion: {
        callCount: string;
        args: any[][];
    };
    clearTaskProgress: {
        callCount: string;
        args: any[][];
    };
    installPackage: {
        callCount: string;
        args: any[][];
    };
    uninstallPackage: {
        callCount: string;
        args: any[][];
    };
    importProject: {
        callCount: string;
        args: any[][];
    };
    openExternally: {
        callCount: string;
        args: any[][];
    };
    onProductsChanged: {
        callCount: string;
        args: any[][];
    };
    getBoardAndDeviceInfo: {
        callCount: string;
        args: any[][];
    };
    getInstallInfoForPackageDependencies: {
        callCount: string;
        args: any[][];
    };
    getInstallInfoForPackages: {
        callCount: string;
        args: any[][];
    };
    _addProgressTask: {
        callCount: string;
        args: any[][];
    };
}>;
export declare function waitForPromisesToResolve(indicies: string[]): Promise<void>;
export declare function setupPromiseSyncronization(): Promise<void>;
export declare function cleanupPromiseSyncronization(): Promise<void>;
export declare function getActivePromiseIndicies(): Promise<string[]>;
export declare function updateUrlForTesting(link: string): Promise<void>;
export declare function clearCaches(): Promise<void>;
