import { Vars } from '../lib/vars';
import { InstalledPackage } from './response-data';
import { Logger } from '../utils/logging';
import { ProgressManager } from './progress-manager';
import { TriggerEvent } from './util';
/**
 * This is a class that replaces the functionality that ccs normally provides, on the cloud (where we don't have CCS).
 * It's intended to be similar to ccs-adapter.
 *
 */
export declare class CloudCCSAdapter {
    private readonly vars;
    private readonly logger;
    private readonly progressManager;
    private readonly triggerEvent;
    private readonly defaultContentPath;
    private readonly scanQueue;
    private scanPromise;
    private searchPaths;
    constructor(vars: Vars, logger: Logger, progressManager: ProgressManager, triggerEvent: TriggerEvent);
    getSearchPaths(): Promise<string[]>;
    getInstalledPackages(): Promise<InstalledPackage[]>;
    onPackagesChanged(): Promise<void>;
    addSearchPath(path: string): void;
    removeSearchPath(path: string): void;
    private runNonUserInitiatedTask;
}
