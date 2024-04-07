import { Log } from '../utils/logging';
import { PackageManager } from './package-manager';
import * as PackageHelpers from './package-helpers';
import { RefreshManager } from '../lib/dbBuilder/refresh';
import * as util from './util';
import { Omit } from '../shared/generic-types';
interface PackageManagerAdapterParams {
    packageManagerFile: string;
    contentFolder: string;
    zipsFolder: string;
    overridesDir: string;
    refreshManager: RefreshManager;
}
interface StageAddPackageParams {
    packageFolders: string[];
    zips: string[];
    submissionId: string;
    email: string;
    downloadFolder: string;
    extractFolder: string;
    showEntry: boolean;
    log: Log;
    isNonTirexPackage?: boolean;
}
interface AddPackageParams {
    entry: util.PackageEntry;
    log: Log;
}
interface StageRemovePackageParams {
    packageInfo: Omit<PackageHelpers.PackageInfo, 'type' | 'name'>;
    log: Log;
}
interface RemovePackageParams {
    packageInfo: Omit<PackageHelpers.PackageInfo, 'type' | 'name'>;
    log: Log;
    processingSuccess: boolean;
}
interface StageRollbackPackageParams {
    entry: util.PackageEntry;
    log: Log;
}
interface RollbackPackageParams {
    entry: util.PackageEntry;
    stagedEntry: util.PackageEntryStaged | null;
    log: Log;
    processingSuccess: boolean;
}
interface CleanupPackageSubmissionParams {
    downloadFolder: string | null;
    extractFolder: string | null;
}
/**
 * Wraps the PackageManager methods with handoff specific steps / logic
 * Note: the methods of this class always take / return absolute paths.
 *
 */
export declare class PackageManagerAdapter {
    private readonly contentFolder;
    private readonly zipsFolder;
    private readonly packageManager;
    private readonly overridesManager;
    constructor({ packageManagerFile, contentFolder, zipsFolder, overridesDir }: PackageManagerAdapterParams);
    /**
     * Stage the package.
     *
     * 1. Get the packageInfo and see if the entry exists
     * 2. If no old entry, ensure the content & zips do not exist already
     * 3. Stage packages file and backup old assets
     * 4. Move the content & zips from extract/download folders to final destination
     *
     */
    stageAddPackage({ packageFolders, zips, submissionId, email, downloadFolder, extractFolder, showEntry, log, isNonTirexPackage }: StageAddPackageParams): Promise<util.PackageEntryStaged>;
    addPackage({ entry, log }: AddPackageParams): Promise<util.PackageEntryStaged | util.PackageEntryValid>;
    stageRemovePackage({ packageInfo, log }: StageRemovePackageParams): Promise<void>;
    /**
     * Remove the package.
     *
     * @param args
     *  @param args.packageInfo
     *  @param args.log
     *  @param args.refreshLog
     *  @param args.submissionId
     *
     * @returns {Promise} deletedPackageEntry or null if we didn't delete it
     */
    removePackage({ packageInfo, log, processingSuccess }: RemovePackageParams): Promise<(util.PackageEntryStaged | util.PackageEntryValid)[] | null>;
    stageRollbackPackage({ entry, log }: StageRollbackPackageParams): Promise<{
        request: "add" | "remove";
        stagedEntry: util.PackageEntryStaged | null;
    }>;
    rollbackPackage({ entry, stagedEntry, log, processingSuccess }: RollbackPackageParams): Promise<void>;
    /**
     * Cleanup the submission after we are done with it.
     *
     * @param args
     *  @param args.downloadFolder
     *  @param args.extractFolder
     *
     * @returns {Promise} void
     */
    cleanupPackageSubmission({ downloadFolder, extractFolder }: CleanupPackageSubmissionParams): Promise<void>;
    /**
     * Scan the content folder for any packages which we do not know about
     *
     * @returns {Promise} newEntries
     */
    scanPackages(log: Log): Promise<{
        newEntires: util.PackageEntryValid[];
        deleteEntries: util.PackageEntry[];
    }>;
    /**
     * Import the set of packages. Note no processing is done on the packages
     *
     * @param items
     * @param log
     *
     * @returns {Promise} void
     */
    importPackages(items: util.PackageEntry[], log: Log): Promise<void>;
    getPackageEntry(id: string, version: string, log: Log): Promise<util.PackageEntry | null>;
    getStagedEntries(log: Log): Promise<util.PackageEntryStaged[]>;
    getAllEntries(log: Log): Promise<util.PackageEntry[]>;
    _getPackageManager(): PackageManager;
}
export {};
