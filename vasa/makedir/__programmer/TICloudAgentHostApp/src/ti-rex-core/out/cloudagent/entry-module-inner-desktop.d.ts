import { PackageData } from '../frontend/apis/filter-types';
import { ProjectType } from './ccs-adapter';
import * as ExternalApis from './external-apis';
import { EntryModuleBase } from './entry-module-inner-base';
export declare const defaultBoardsAndDevicesFileName = "default-boards-and-devices.json";
export declare const latestBoardsAndDevicesFileName = "latest-boards-and-devices.json";
export declare const _IDE_SERVER_PORT = "ccs.ideServer.port";
/**
 * This is the cloud agent module that the browser talks to in order to do all local operations
 * Note:
 *  - all private functions must start with _ or will be exposed by agent.js (which uses
 *    run time reflection, not typescript)
 *  - all public functions must return a promise
 *
 */
export declare class EntryModuleDesktop extends EntryModuleBase {
    readonly ENTRY_MODULE_TYPE = "EntryModuleDesktop";
    private static readonly IDE_SERVER_PORT;
    private static readonly HTTP_PROXY;
    private static readonly HTTPS_PROXY;
    private progressManager;
    private offlineMetadataManager;
    private packageInstaller;
    private ccsAdapter;
    init(params: {
        ccsPort: number;
        proxy: string | null;
        isTheia: boolean;
    }): Promise<void>;
    /**
     * Called by cloud agent when the last client is gone to perform any clean up
     * Must be synchronous, or else cloud agent must be updated
     *
     */
    onClose(): void;
    getEntryModuleType(): Promise<string>;
    getCCSEclipseInitValues(): Promise<{
        ccsPort: any;
        httpProxy: any;
        httpsProxy: any;
    }>;
    getPackageInstallInfo(): Promise<string[]>;
    getInstalledPackages(): Promise<import("./response-data").InstalledPackage[]>;
    getProgress(): Promise<{
        [x: string]: import("./progress-manager").Progress;
    }>;
    clearTaskProgress(progressId: string): Promise<void>;
    installPackage(pkg: PackageData, installLocation: string): Promise<string>;
    uninstallPackage(pkg: PackageData): Promise<string>;
    updateOfflineBoardsAndDevices(): Promise<void>;
    getCcsDevices(targetFilter: string | null): Promise<import("./ccs-theia-request").CCSDevicesInfo>;
    getCcsDeviceDetail(deviceId: string): Promise<import("./ccs-theia-request").CCSDeviceDetail>;
    getProjectTemplates(deviceId: string, toolVersion: string): Promise<import("./ccs-theia-request").CCSTemplatesInfo>;
    importProject(resourceType: ProjectType, packageUid: string, location: string, targetId: string | null, projectName: string | null): Promise<void>;
    /**
     * Import a CCS Project template.
     *
     * This actually *creates* a new CCS Project based on a template, but we are treating it as an
     * import to align with importProject() which also creates projects based on templates in some
     * cases (resource types FILE and FOLDER).
     */
    importProjectTemplate(templateId: string, targetId: string, projectName: string, toolVersion: string | null, outputTypeId: string | null, location: string | null): Promise<void>;
    openExternally(link: string): Promise<void>;
    onProductsChanged(): Promise<void>;
    getBoardAndDeviceInfo(options?: {
        offline?: boolean;
    }): Promise<ExternalApis.BoardDeviceInfo>;
    getInstallInfoForPackageDependencies(packageInfo: {
        packageId: string;
        version: string;
    }, options: {
        ccsVersion?: string;
        excludePackageAsDependency?: boolean;
    }): Promise<ExternalApis.InstallInfo[]>;
    getInstallInfoForPackages(options: {
        ccsVersion?: string;
        targetDevice?: string;
        targetBoard?: string;
    }): Promise<ExternalApis.InstallInfo[]>;
    private _updateOfflineBoardsAndDevices;
}
