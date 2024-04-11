import { PackageData } from '../shared/routes/response-data';
import { ProgressManager } from './progress-manager';
import { CommonParams } from './util';
import { CCSAdapter } from './ccs-adapter';
import { CloudCCSAdapter } from './cloud-ccs-adapter';
/**
 * This class is responsible for managing the file content of packages (ie stuff installed to c:\ti)
 *  - installing/uninstalling package content
 *  - notifying the rest of the system that content was added/removed
 */
export declare class PackageInstaller {
    private readonly commonParams;
    private readonly progressManager;
    private readonly ccsAdapter;
    private readonly activeItems;
    private readonly notifyIDECounter;
    constructor(commonParams: CommonParams, progressManager: ProgressManager, ccsAdapter: CCSAdapter | CloudCCSAdapter);
    installPackage(pkg: PackageData, installLocation: string): Promise<string>;
    uninstallPackage(pkg: PackageData): Promise<string>;
    /**
     * Queue a task that
     *  - download package (via tirex4) to specified install location
     *  - fetches its metadata (from tirex3) and add it to the tirex3 offline DB
     *  - notify CCS of the new package
     */
    private doInstallPackage;
    /**
     * Queue task that
     */
    private doUninstallPackage;
    /**
     * Download and extract package zip files into temporary folders
     * The package zip is requested via tirex 4
     */
    private downloadAndExtractPackageFiles;
    private cleanupActiveItem;
}
