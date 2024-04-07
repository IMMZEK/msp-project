import { PlatformAttribute, PackageSubType, FeatureType } from '../lib/dbBuilder/dbTypes';
export interface PackageInfo {
    name: string;
    id: string;
    version: string;
    type: string;
    installCommand?: PlatformAttribute;
    moduleOf?: {
        packageId: string;
        semver: string;
    };
    subType?: PackageSubType;
    featureType?: FeatureType;
    ccsVersion?: string;
}
interface SetupPackageFolderSubfolderParams {
    packageFolder: string;
    extractFolder: string;
}
interface ZipsMirrorPackageFolderStructureParams {
    downloadFolder: string;
    extractFolder: string;
    zips: {
        platform: string;
        asset: string;
    }[];
    packageFolders: string[];
}
/**
 * Search the items for packages (folders containing a package.tirex.json file).
 *
 */
export declare function getPackageFolders(folder: string): Promise<{
    packageFolders: string[];
    nonPackageFolders: string[];
}>;
export declare function isPackageFolder(folderPath: string): Promise<boolean>;
/**
 * Get the package.tirex.json based package info
 *
 * @param packageFolder - absolute path to the package.
 * @param trueVersion - If true, return the actual version of the package. By default, some are altered.
 *
 * @returns packageInfo
 */
export declare function getPackageInfo(packageFolder: string, packageMetadataFile?: string): Promise<PackageInfo | null>;
/**
 * Get placeholder PackageInfo for the non tirex package folder, folder.
 *
 * @param folder - absolute path to the folder
 *
 * @returns placeholderPackageInfo
 */
export declare function getPlaceholderPackageInfo(folder: string): PackageInfo;
/**
 * Put the package folder into a subfolder under certain conditions.
 * Conditions:
 *  If it's a non-software package put it under the 'tirex-product-tree' subfolder
 *  If it's a feature package put it under a pacakgeId__packageVersion folder
 *
 */
export declare function movePackageToSubfolder({ packageFolder, extractFolder }: SetupPackageFolderSubfolderParams): Promise<string>;
/**
 * Create a folder structure in the downloadFolder which mirrors the
 * packages folder structure in the extractFolder, then move the zips into the folders structures in the downloadFolder.
 * Note: all paths are absolute
 *
 * @param args
 *  @param args.downloadFolder - Where the zips were downloaded.
 *  @param args.extractFolder - Where the packages were extracted.
 *  @param args.zips
 *  @param args.packageFolders - Subfolders of extractFolder which are packages.
 *    (absolute paths, must be in the extractFolder).
 *
 * @param {Promise} newZips
 */
export declare function zipsMirrorPackageFolderStructure({ downloadFolder, extractFolder, zips, packageFolders }: ZipsMirrorPackageFolderStructureParams): Promise<string[]>;
export declare function getPackageTirexJsonPath(packageFolder: string): Promise<string | undefined>;
export declare function getAllPackageTirexJsonPaths(packageFolder: string): Promise<string[]>;
export {};
