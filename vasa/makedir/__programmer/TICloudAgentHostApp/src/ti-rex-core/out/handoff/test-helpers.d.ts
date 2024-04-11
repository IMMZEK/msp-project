import { PackageInfo } from './package-helpers';
import { PackageManager } from './package-manager';
import { PackageEntryStaged, PackageEntryValid, PackageEntry } from './util';
interface VerifyContentAndZipsParams {
    contentFolder: string;
    zipsFolder: string;
    zips: string[];
    content: string[];
}
interface CreatePackagesParams {
    packages: string[];
    packagesJson?: PackageInfo[];
    packageJsonPrefix?: string;
}
interface CreatePackageEntryParams {
    id: string;
    version: string;
    content: string[];
    zips: string[];
}
interface PrepareFilesParams {
    packageManagerFileJson?: {
        packages: PackageEntry[];
    };
    contentFolder?: string;
    zipsFolder?: string;
}
interface PrepareContentAndZipsParams {
    contentFolder: string;
    zipsFolder: string;
    zips: string[];
    content: string[];
    contentJson?: PackageInfo[];
}
/**
 * Verify the content folders and zip files no longer exist.
 *
 * @param args
 *  @param args.contentFolder
 *  @param args.zipsFolder
 *  @param args.zips - relative to the content folder.
 *  @param args.content - relative to the zips folder.
 *
 * @returns {Promise} void
 */
export declare function verifyContentAndZipsGone({ contentFolder, zipsFolder, zips, content }: VerifyContentAndZipsParams): Promise<void>;
/**
 * Verify the content folders and zip files exist.
 *
 * @param args
 *  @param args.contentFolder
 *  @param args.zipsFolder
 *  @param args.zips - relative to the content folder.
 *  @param args.content - relative to the zips folder.
 *
 * @returns {Promise} void
 */
export declare function verifyContentAndZipsPresent({ contentFolder, zipsFolder, zips, content }: VerifyContentAndZipsParams): Promise<void>;
/**
 * Create the packages
 *
 * @param args
 *  @param packages - Absolute paths to the package folders.
 *  @param packagesJson - Each element is the json to add to the packgaes package.tirex.json.
 *
 * @returns {Promise} void
 */
export declare function createPackages({ packages, packagesJson, packageJsonPrefix }: CreatePackagesParams): Promise<void[]>;
export declare function createPackageEntryValid(subEntry: CreatePackageEntryParams): PackageEntryValid;
export declare function createPackageEntryStaged(subEntry: CreatePackageEntryParams): PackageEntryStaged;
/**
 * Prepare the PackageManager - its files / folders, and the object itself
 *
 * @param args
 *
 * @returns {Promise} result
 */
export declare function preparePackageManager({ packageManagerFileJson, contentFolder, zipsFolder }: PrepareFilesParams): Promise<{
    packageManagerFile: string;
    pm: PackageManager;
    contentFolder: string;
    zipsFolder: string;
}>;
/**
 * Create the content folders and zip files.
 *
 * @param args
 *  @param args.contentFolder
 *  @param args.zips - relative to the zips folder.
 *  @param args.content - relative to the content folder.
 *  @param args.contentJson
 *
 * @param {Promise} void
 */
export declare function prepareContentAndZips({ contentFolder, zipsFolder, zips, content, contentJson }: PrepareContentAndZipsParams): Promise<[void[], void[]]>;
export {};
