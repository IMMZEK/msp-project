import type { AgentResponse, AgentResponseDesktop } from '../../cloudagent/interface';
export declare class LocalApisCacheInterface {
    private static readonly EMPTY_KEY;
    private static readonly MINOR_CACHE_SIZE;
    private static readonly PROJ_TEMPLATE_CACHE_SIZE;
    private installInfo;
    private installedPackages;
    private progress;
    private version;
    private boardAndDeviceInfo;
    private ccsDevicesCache;
    private ccsDeviceDetailCache;
    private projectTemplatesCache;
    clearCache(): void;
    getInstallInfo(): Promise<string[]> | null;
    getInstalledPackages(): Promise<import("../../cloudagent/response-data").InstalledPackage[]> | null;
    getProgress(): Promise<{
        [x: string]: import("../../cloudagent/progress-manager").Progress;
    }> | null;
    getVersion(): Promise<string> | null;
    getBoardAndDeviceInfo(): Promise<import("../../cloudagent/external-apis").BoardDeviceInfo> | null;
    getCcsDevices(targetFilter: string | null): Promise<import("../../cloudagent/ccs-theia-request").CCSDevicesInfo> | null;
    getCcsDeviceDetail(deviceId: string): Promise<import("../../cloudagent/ccs-theia-request").CCSDeviceDetail> | null;
    getProjectTemplates(deviceId: string, toolVersion: string): Promise<import("../../cloudagent/ccs-theia-request").CCSTemplatesInfo> | null;
    setInstallInfo(info: AgentResponse<'getPackageInstallInfo'>): Promise<string[]>;
    setInstalledPackages(packages: AgentResponse<'getInstalledPackages'>): Promise<import("../../cloudagent/response-data").InstalledPackage[]>;
    setProgress(progress: AgentResponse<'getProgress'>): Promise<{
        [x: string]: import("../../cloudagent/progress-manager").Progress;
    }>;
    setVersion(version: AgentResponse<'getVersion'>): Promise<string>;
    setBoardAndDeviceInfo(info: AgentResponseDesktop<'getBoardAndDeviceInfo'>): Promise<import("../../cloudagent/external-apis").BoardDeviceInfo>;
    setCcsDevices(targetFilter: string | null, devices: AgentResponseDesktop<'getCcsDevices'>): Promise<import("../../cloudagent/ccs-theia-request").CCSDevicesInfo>;
    setCcsDeviceDetail(deviceId: string, detail: AgentResponseDesktop<'getCcsDeviceDetail'>): Promise<import("../../cloudagent/ccs-theia-request").CCSDeviceDetail>;
    setProjectTemplates(deviceId: string, toolVersion: string, templates: AgentResponseDesktop<'getProjectTemplates'>): Promise<import("../../cloudagent/ccs-theia-request").CCSTemplatesInfo>;
    private static getCcsDevicesKey;
    private static getProjectTemplatesKey;
}
