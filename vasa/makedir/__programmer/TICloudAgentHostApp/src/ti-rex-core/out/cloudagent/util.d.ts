import * as PQueue from 'p-queue';
import { AgentResult } from './interface';
import { Logger } from '../utils/logging';
import { AppConfig } from '../lib/appConfig';
import { Vars } from '../lib/vars';
import { Platform } from '../shared/routes/response-data';
export interface CommonParams {
    logger: Logger;
    rex3Config: AppConfig;
    vars: Vars;
    triggerEvent: TriggerEvent;
    desktopQueue: PQueue;
}
export declare const enum ModuleEvents {
    ON_INSTALLED_PACKAGES_UPDATED = "OnInstalledPackagesUpdated",
    ON_INSTALL_INFO_UPDATED = "OnInstallInfoUpdated",
    ON_PROGRESS_UPDATED = "OnProgressUpdated",
    ON_ERROR = "OnError"
}
export type TriggerEvent = (eventName: ModuleEvents, eventData: any) => void;
export type OnInstalledPackagesUpdated = (packages: AgentResult<'getInstalledPackages'>) => void;
export type OnInstallInfoUpdated = (installLocations: AgentResult<'getPackageInstallInfo'>) => void;
export type OnProgressUpdated = (progress: AgentResult<'getProgress'>) => void;
export type OnError = (error: Error) => void;
/**
 * Data structure of discovered 'product' returned from CCS
 */
export interface CCSProduct {
    name: string;
    version: string;
    location: string;
    id: string;
    style: string;
}
export interface ProjectDependency {
    id: string;
    versionRange: string;
}
export declare function doTirex4Request<T>(url: string): Promise<T>;
export interface TempDirs {
    downloadDir: string;
    extractDir: string;
}
export declare function makeTempDirs(location: string, name: string): Promise<TempDirs>;
export declare function removeTempDirs(dirs: TempDirs): Promise<[void, void]>;
export declare function getPlatform(): Platform;
export declare function getConfigFolder(): string;
