import type { RexCloudAgentModule, AgentResponse } from '../../cloudagent/interface';
import { Omit } from '../../shared/generic-types';
import type { PackageData } from '../../shared/routes/response-data';
import { Options } from './util';
type ModuleListener = (data: any) => void;
export declare class MockRexCloudAgentModule implements Omit<RexCloudAgentModule, 'getSubModule' | 'close' | '_getLogger' | 'getConfig' | 'getCcsDevices' | 'getCcsDeviceDetail' | 'getProjectTemplates' | 'getBoardAndDeviceInfo' | 'updateOfflineBoardsAndDevices' | 'importProjectTemplate'> {
    private readonly options;
    static readonly DELAY = 2000;
    readonly ENTRY_MODULE_TYPE = "EntryModuleDesktop";
    private readonly emitter;
    private readonly progressManager;
    private installedPackages;
    private installInfo;
    constructor(options: Options);
    init(): Promise<void>;
    onClose(): Promise<void>;
    getEntryModuleType(): Promise<string>;
    getCCSEclipseInitValues(): Promise<{
        ccsPort: number;
        httpProxy: string;
        httpsProxy: string;
    }>;
    addListener(eventName: string, listener: ModuleListener): void;
    removeListener(eventName: string, listener: ModuleListener): void;
    getPackageInstallInfo(): Promise<string[]>;
    getInstalledPackages(): Promise<{
        isInstallable: boolean;
        name: string;
        packagePublicId: string;
        packageVersion: string;
        packagePublicUid: string;
        localPackagePath: string;
        subType: "ccsComponent" | "featureSupport" | null;
        featureType: "deviceSupport" | "tools" | "compiler" | "ccsCore" | null;
        ccsVersion: string | null;
    }[]>;
    getAgentMode(): Promise<"desktop" | "cloud">;
    getProgress(): AgentResponse<'getProgress'>;
    getVersion(): Promise<string>;
    clearTaskProgress(progressId: string): Promise<void>;
    installPackage(pkg: PackageData, installLocation: string): Promise<string>;
    uninstallPackage(pkg: PackageData): Promise<string>;
    importProject(_packageUid: string | null, _location: string): Promise<void>;
    openExternally(_link: string): Promise<void>;
    onProductsChanged(): Promise<void>;
    getBoardAndDeviceInfo(): Promise<{
        devices: never[];
        boards: never[];
    }>;
    getInstallInfoForPackageDependencies(_packageInfo: {
        packageId: string;
        version: string;
    }, _options: {
        ccsVersion: string;
    }): Promise<never[]>;
    getInstallInfoForPackages(_options: {
        ccsVersion: string;
    }): Promise<never[]>;
    _addProgressTask(): Promise<(task: Promise<any>) => string>;
    private handleEvent;
    private static sortInstalledPackages;
}
export {};
