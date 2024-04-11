import { PackageEntry, PackageEntryValid } from './util';
interface CreatePackageEntriesParams {
    entries: PackageEntry[];
    packageFolders: string[];
    nonPackageFolders: string[];
    contentFolder: string;
    zipsFolder: string;
    overridesDir: string;
}
interface MissingPackageInfo {
    id: string;
    version: string;
    content: string[];
    isNonTirexPackage: boolean;
}
/**
 * Create entries for the content folders provided which do not exist in the provided set of entries
 *
 * @param args
 *  @param args.entries - The already existing entries
 *  @param args.packageFolders - The set of package folders which may not already be in entries
 *  @param args.contentFolder - The location the entries content and the packageFolders exist (and the paths are relative to)
 *
 * @returns {Promise} missingPackages
 */
export declare function createPackageEntries(args: CreatePackageEntriesParams): Promise<PackageEntryValid[]>;
export declare function _getMissingPackages(args: CreatePackageEntriesParams): Promise<MissingPackageInfo[]>;
export declare function _deduceZips(missingPackage: MissingPackageInfo, zipsFolder: string): Promise<string[]>;
export declare function _getMissingNonPackageFolders(args: CreatePackageEntriesParams): Promise<MissingPackageInfo[]>;
export {};
