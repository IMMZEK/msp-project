import { Vars } from '../lib/vars';
import { Log, LoggerManager } from '../utils/logging';
import * as util from './util';
import { PackageManagerAdapter } from './package-manager-adapter';
import { RefreshManager } from '../lib/dbBuilder/refresh';
import { PackageInfo } from './package-helpers';
import { Omit } from '../shared/generic-types';
import { AddPackage } from './add-package';
import { RemovePackage } from './remove-package';
export declare const enum HandoffManagerState {
    UP = "up",
    TEARDOWN = "teardown",
    MAINTANCE_MODE = "maintanceMode"
}
export interface HandoffManagerParams {
    defaultLog: Log;
    loggerManager: LoggerManager;
    vars: Vars;
}
interface AddPackageParams {
    serverHost: string | null;
    entries: util.UploadedEntry[];
    submissionId: string;
    assetUploads: util.AssetUpload[];
}
interface RemovePackageParams {
    packageInfo: Omit<PackageInfo, 'type' | 'name'>;
    submissionId: string;
    email: string;
}
/**
 * For managing handoffs.
 *
 */
export declare class HandoffManager {
    private readonly refreshManager;
    private readonly defaultLog;
    private readonly handoffManagerEventEmitter;
    private readonly loggerManager;
    private readonly refreshFn;
    private readonly packageManagerAdapter;
    private readonly updateQueue;
    private readonly vars;
    private readonly addPackageHelper;
    private readonly removePackageHelper;
    private handoffManagerState;
    constructor({ defaultLog, loggerManager, vars }: HandoffManagerParams);
    getRefreshManager(): RefreshManager;
    addPackage(params: AddPackageParams): Promise<void>;
    removePackage(params: RemovePackageParams): Promise<void>;
    isAcceptingSubmissions(): boolean;
    getHandoffManagerState(): HandoffManagerState;
    /**
     * Turn on maintenance mode. This will finish any ongoing processing and when done will return.
     * Block any submissions after calling this function.
     *
     * @param {Promise} void
     */
    maintenanceModeEnable(): Promise<void>;
    /**
     * Resume handoff services. It will take us out of maintenance mode and accept submissions again.
     *
     * @param {Promise} void
     */
    maintenanceModeDisable(): Promise<void>;
    /**
     * Imports any packages which we do not know about.
     * Removes any which don't have any valid content folders.
     * Note this does not do any processing on the packages, only tracks them.
     */
    syncPackages(): Promise<{
        addedEntries: {
            id: string;
            version: string;
        }[];
        removedEntries: {
            id: string;
            version: string;
        }[];
    }>;
    /**
     * Applies a rollback on all packages which are currently staged
     */
    cleanupStagedPackages(): Promise<void>;
    _getPackageManagerAdapter(): PackageManagerAdapter;
    _getAddPackageHelper(): AddPackage;
    _getRemovePackageHelper(): RemovePackage;
    private syncPackagesInternal;
    private cleanupStagedPackagesInternal;
}
export {};
