import * as PQueue from 'p-queue';
import { ProgressManager } from './progress-manager';
import { OfflineMetadataManager } from './offline-metadata-manager';
import { Logger } from '../utils/logging';
import { TriggerEvent } from './util';
import { Vars } from '../lib/vars';
import { InstalledPackage } from './response-data';
export declare const enum ProjectType {
    CCS = "project.ccs",
    SPEC = "projectSpec",
    ENERGIA = "project.energia",
    FILE = "file.importable",
    FOLDER = "folder.importable"
}
/**
 * This is a class that interfaces with CCS desktop to communicate
 * project/package information.  It can be used to:
 *  - discover what packages the IDE already knows about (which should trigger a meta-data download
 *    for any packages the rex doesn't know about)
 *  - list what search paths the IDE uses, and thus where rex should install packages to
 *  - notify the IDE that a new package has been installed (which should trigger it to re-discover
 *    packages)
 *  - import a project into the IDE
 *
 * In CCS Theia we will communicate to the browser, using the triggerEvent mechanism. The browser will talk to CCS and return the response via the same triggerEvent mechanism.
 * In CCS Eclipse we will use http apis to talk directly with CCS.
 */
export declare class CCSAdapter {
    private readonly logger;
    private readonly desktopQueue;
    private readonly isTheia;
    private readonly offlineMetadataManager;
    private readonly progressManager;
    private readonly triggerEvent;
    private readonly ccsEclipseRequest;
    private readonly ccsTheiaRequest;
    private readonly syncCounter;
    private readonly defaultContentPath;
    constructor(logger: Logger, desktopQueue: PQueue, ccsPort: number, isTheia: boolean, vars: Vars, offlineMetadataManager: OfflineMetadataManager, progressManager: ProgressManager, triggerEvent: TriggerEvent);
    start(): Promise<void>;
    close(): void;
    /**
     * Call CCS IDE to rediscover products. Expected to be called after package download+install.
     */
    notifyIDEPackagesChanged(): Promise<void>;
    onProductsChanged(): void;
    /**
     * Get the list of search paths used by CCS.
     *
     * CCS Eclipse doesn't have an API to just get the paths entered by the user, so instead
     * we get the expanded search path, and then subtract the paths where products
     * exist. That should leave ONLY the paths that the user entered (plus install
     * and install/ccs)
     *
     * In addition, we move the "default" path (if it exists) to the top
     */
    getSearchPaths(): Promise<string[]>;
    getInstalledPackages(): Promise<InstalledPackage[]>;
    getDevices(targetFilter: string | null): Promise<import("./ccs-theia-request").CCSDevicesInfo>;
    getDeviceDetail(deviceId: string): Promise<import("./ccs-theia-request").CCSDeviceDetail>;
    getProjectTemplates(deviceId: string, toolVersion: string): Promise<import("./ccs-theia-request").CCSTemplatesInfo>;
    /**
     * Import a resource-based project into CCS
     */
    importProject(resourceType: ProjectType, packageUid: string, location: string, targetId: string | null, projectName: string | null): Promise<void>;
    /**
     * Import a project template into CCS
     */
    importProjectTemplate(templateId: string, targetId: string, projectName: string, toolVersion: string | null, outputTypeId: string | null, location: string | null): Promise<void>;
    private doInitialSync;
    private doSync;
    private runNonUserInitiatedTask;
    /**
     * Add any packages CCS knows about that we don't
     *
     */
    private addNewPackages;
    /**
     *  Remove packages that were deleted from the filesystem
     */
    private removeDeletedPackages;
    private getPackageInfoForProducts;
    private getCCSBaseItems;
}
