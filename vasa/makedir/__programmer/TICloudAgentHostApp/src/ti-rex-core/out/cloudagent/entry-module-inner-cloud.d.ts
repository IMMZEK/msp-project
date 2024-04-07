import { PackageData } from '../frontend/apis/filter-types';
import { EntryModuleBase } from './entry-module-inner-base';
/**
 * This is the cloud agent module that the browser talks to in order to do all local operations
 * Note:
 *  - all private functions must start with _ or will be exposed by agent.js (which uses
 *    run time reflection, not typescript)
 *  - all public functions must return a promise
 *
 */
export declare class EntryModuleCloud extends EntryModuleBase {
    readonly ENTRY_MODULE_TYPE = "EntryModuleCloud";
    private progressManager;
    private packageInstaller;
    private cloudCCsAdapter;
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
    getPackageInstallInfo(): Promise<string[]>;
    getInstalledPackages(): Promise<import("./response-data").InstalledPackage[]>;
    getProgress(): Promise<{
        [x: string]: import("./progress-manager").Progress;
    }>;
    clearTaskProgress(progressId: string): Promise<void>;
    installPackage(pkg: PackageData, installLocation: string): Promise<string>;
    uninstallPackage(pkg: PackageData): Promise<string>;
}
