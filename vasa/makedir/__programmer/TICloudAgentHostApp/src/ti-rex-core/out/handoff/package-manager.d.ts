import { Log } from '../utils/logging';
import { PackageEntry, PackageEntryStaged } from './util';
interface GetPackageEntryParams {
    id: string;
    version: string;
    log: Log;
}
interface AddPackageParams {
    entry: PackageEntry;
    log: Log;
}
interface UpdatePackageParams {
    entry: PackageEntry;
    log: Log;
    deletePackage?: boolean;
    keepItems?: boolean;
    allowValid?: boolean;
}
interface StageRollbackPackageParams {
    id: string;
    version: string;
    submissionId: string;
    log: Log;
}
interface RollbackPackageParams {
    entry: PackageEntryStaged;
    log: Log;
}
interface DeletePackageParams {
    id: string;
    version: string;
    log: Log;
}
/**
 * Manages packages in a content folder.
 *
 */
export declare class PackageManager {
    private readonly packageFile;
    private readonly contentFolder;
    private readonly zipsFolder;
    private readonly updateQueue;
    /**
     * Note: All paths are absolute.
     *
     * @param packageManagerFile - i.e tirex.json
     * @param contentFolder
     * @param zipsFolder
     */
    constructor(packageManagerFile: string, contentFolder: string, zipsFolder: string);
    getEntryFromPackagesFile(args: GetPackageEntryParams): Promise<{
        entry: PackageEntry | null;
        idx: number;
    }>;
    /**
     * Stage the package for adding (may be a new package or replace an existing package).
     * Note: you cannot stage a package that is already staged.
     *
     * @param args
     *  @param args.entry - The entry to stage.
     *  @param args.log
     *
     * @returns stagedEntry
     */
    stagePackagesFileAndBackupOldAssets(args: AddPackageParams): Promise<PackageEntryStaged>;
    updatePackagesFileAndRemoveOldAssets(args: UpdatePackageParams): Promise<PackageEntryStaged | import("./util").PackageEntryValid>;
    /**
     * Revert the entry to the backup.
     * Returns an error if the package is not staged.
     * Returns null if there is no valid backup to revert to
     *
     * @param args
     *
     * @returns originalEntry or null
     */
    stageRollbackPackage(args: StageRollbackPackageParams): Promise<PackageEntryStaged | null>;
    rollbackPackage(args: RollbackPackageParams): Promise<{
        oldEntry: PackageEntry | null;
        entry: PackageEntry;
    }>;
    /**
     * Stage a delete. Only marks the package as to be deleted at this point.
     *
     * @param args
     *  @param args.id
     *  @param args.version - specify 'all' for version to delete all versions
     *  @param args.log
     */
    stageDeletePackage(args: DeletePackageParams): Promise<void>;
    deletePackage(args: DeletePackageParams): Promise<PackageEntry>;
    getPackageEntries(log: Log): Promise<PackageEntry[]>;
    getDeleteEntries(id: string, version: string, log: Log): Promise<PackageEntry[] | null>;
    initPackagesFiles(): Promise<void>;
    _stagePackagesFileAndBackupAssets(args: AddPackageParams): Promise<{
        entry: PackageEntryStaged;
        oldEntry: import("./util").PackageEntryValid | null;
    }>;
    _updatePackagesFileAndRemoveOldAssets(args: AddPackageParams): Promise<{
        oldEntry: PackageEntry | null;
        entry: PackageEntry;
    }>;
    private getEntryFromPackagesFileInner;
    private stagePackagesFileAndBackupOldAssetsInner;
    private stageRollbackPackageInner;
    private rollbackPackageInner;
    private stageDeletePackageInner;
    private deletePackageInner;
    /**
     * Update the package entry and it's content / zips (it may be a new entry).
     * By default this will:
     *    Update the package entry.
     *    If the entry already existed & it is staged delete the backup content / zips. Also make it valid
     *    If it isn't staged delete the content / zips.
     *
     * @param args
     *  @param args.entry
     *  @param args.log
     *  @param args.deletePackage - If true, delete the package entry along with it's content / zips.
     *  @param args.keepItems  - If true, don't delete the content / zips.
     *  @param args.allowValid - If true, allow updating an entry which is already valid
     *
     * @returns result
     */
    private updatePackagesFileAndRemoveOldAssetsInner;
    private getPackagesFileData;
    /**
     * Read json from the file. Handles the case where the file is empty.
     *
     * @param file
     * @param emptyValue - The value of the json if the file is empty.
     */
    private static readJson;
    /**
     * Update the list of packages with a placeholder entry
     * This way if we crash during fs manipulation we know
     * we're in a irrecoverable state and will delete the entry
     *
     * @param placeholderEntry
     *
     */
    private updatePackagesFileWithPlaceholderEntry;
    private getDeleteEntriesInner;
    private updatePackageEntries;
}
export {};
