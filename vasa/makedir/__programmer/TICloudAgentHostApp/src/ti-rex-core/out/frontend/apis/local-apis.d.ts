/// <reference types="agent" />
import * as React from 'react';
import { EventListener } from 'event-emitter';
import { ModuleEvents, OnInstalledPackagesUpdated, OnInstallInfoUpdated, OnProgressUpdated } from '../../cloudagent/util';
import type { ProjectType } from '../../cloudagent/ccs-adapter';
import { PackageData } from '../../shared/routes/response-data';
import { ErrorContextValue } from '../component-helpers/context';
/**
 * This file is equivilent to APIs, but it is local-only actions.  It is implemented by calling into
 * cloud agent to handle everything.
 *
 */
export declare class LocalAPIs {
    private readonly errorCallback;
    private modulePromise;
    private cacheInterface;
    private emitter;
    constructor(errorCallback: React.RefObject<ErrorContextValue | null>);
    getPackageInstallInfo(agent: TICloudAgent.AgentModule): Promise<string[]>;
    getInstalledPackages(agent: TICloudAgent.AgentModule): Promise<import("../../cloudagent/response-data").InstalledPackage[]>;
    updateOfflineBoardsAndDevices(agent: TICloudAgent.AgentModule): Promise<void>;
    getOfflineBoardsAndDevices(agent: TICloudAgent.AgentModule): Promise<import("../../cloudagent/external-apis").BoardDeviceInfo>;
    getCcsDevices(agent: TICloudAgent.AgentModule, targetFilter: string | null): Promise<import("../../cloudagent/ccs-theia-request").CCSDevicesInfo>;
    getCcsDeviceDetail(agent: TICloudAgent.AgentModule, deviceId: string): Promise<import("../../cloudagent/ccs-theia-request").CCSDeviceDetail>;
    getProjectTemplates(agent: TICloudAgent.AgentModule, deviceId: string, toolVersion: string): Promise<import("../../cloudagent/ccs-theia-request").CCSTemplatesInfo>;
    getAgentMode(agent: TICloudAgent.AgentModule): Promise<"desktop" | "cloud">;
    getProgress(agent: TICloudAgent.AgentModule): Promise<{
        [x: string]: import("../../cloudagent/progress-manager").Progress;
    }>;
    getVersion(agent: TICloudAgent.AgentModule): Promise<string>;
    clearTaskProgress(agent: TICloudAgent.AgentModule, progressId: string): Promise<void>;
    importProject(agent: TICloudAgent.AgentModule, resourceType: ProjectType, packageUid: string, location: string, targetId: string | null, projectName: string | null): Promise<void>;
    importProjectTemplate(agent: TICloudAgent.AgentModule, templateId: string, targetId: string, projectName: string, toolVersion: string, outputTypeId: string): Promise<void>;
    installPackage(agent: TICloudAgent.AgentModule, pkg: PackageData, installLocation: string): Promise<string>;
    uninstallPackage(agent: TICloudAgent.AgentModule, pkg: PackageData): Promise<string>;
    openExternally(agent: TICloudAgent.AgentModule, link: string): Promise<boolean>;
    onInstalledPackagesUpdated(fn: OnInstalledPackagesUpdated): void;
    onInstallInfoUpdated(fn: OnInstallInfoUpdated): void;
    onProgressUpdated(fn: OnProgressUpdated): void;
    removeListener(event: ModuleEvents, listener: EventListener): void;
    _clearCachedData(): void;
    private handleInstalledPackagesUpdated;
    private handleInstallInfoUpdated;
    private handleProgressUpdated;
    private handleModuleError;
    private handleClose;
    private getLocalModule;
    private fetchLocalModule;
    private onModuleFetched;
    private doClose;
    private syncTheme;
}
