import * as preproc from './preproc';
import * as utils from './dbBuilderUtils';
import { IRexDB } from '../../rexdb/lib/irexdb';
import { Dependencies, DependenciesAll, Device, Devtool, Overview, PackageType, PureBundle, Resource, SupplementsAll, PlatformAttribute, NumericPlatformAttribute, PackageSubType, FeatureType } from './dbTypes';
import { BaseLogger } from '../../utils/logging';
import { RefreshMessageLevel } from './dbBuilder';
export interface ResourceDefinition extends Resource {
    mainCategories?: string[][];
    subCategories?: string[];
    dependencies: DependenciesAll[];
}
type PureBundleDefinition = PureBundle;
export interface OverviewDefinition extends Overview {
    supplements?: SupplementsAll;
    moduleOf?: {
        packageId: string;
        semver: string;
        versionRange: string;
    };
    moduleGroup?: {
        corePackage: {
            packageId: string;
            semver: string;
            versionRange: string;
        };
        packages: string[];
        defaultModuleGroup: boolean;
    };
}
export interface PackageHeaderDefinition {
    _id: string;
    allowPartialDownload: boolean;
    ccsInstallLocation?: string;
    ccsVersion?: string;
    coreDependencies?: Dependencies[];
    deprecates: string;
    devices: string[];
    devtools: string[];
    devtools_category: string[];
    featureType?: FeatureType;
    id: string;
    license: string;
    hideNodeDirPanel: boolean;
    name: string;
    package: string;
    restrictions: string[];
    rootCategory: string[];
    semver: string;
    subType?: PackageSubType;
    tags: string[];
    type?: PackageType;
    version: string;
}
type DBDefinition = ResourceDefinition & PureBundleDefinition & OverviewDefinition;
export type AnyDefinition = DBDefinition & PackageHeaderDefinition;
export interface PackageHeader {
    package: string;
    packageVersion: string;
    packageId: string;
    packageUId: string;
    root: string[];
    packageLicense: string;
    hideNodeDirPanel: boolean;
    devices: string[];
    devtools: string[];
    devtools_category: string[];
    tags: string[];
    coreDependencies?: Dependencies[];
    allowPartialDownload: boolean;
    deprecates: string;
    restrictions: string[];
    name: string;
    rootCategory: string[];
    subType?: PackageSubType;
    featureType?: FeatureType;
    ccsVersion?: string;
    ccsInstallLocation?: string;
}
interface FullPathsMapFolders {
    [path: string]: FullPathsMapFoldersValue;
}
export interface LeafInfo {
    defaultPublicId: string;
    resourceLink: string;
}
interface FullPathsMapFoldersValue {
    hasOverview: boolean;
    _idOverview?: string[];
    fromResource: boolean;
    defaultPublicId: string;
    leafs?: {
        [name: string]: LeafInfo;
    };
    overviewRef: Overview | null;
}
/**
 * Refresh the resource database
 */
export declare function refresh(packagePath: string, packageOrder: number | undefined, installPath: PlatformAttribute | null, installCommand: PlatformAttribute | null, installSize: NumericPlatformAttribute | null, modulePrefix: string | null, packageAuxDataFile: string | null, dbResources: IRexDB<Resource>, dbOverviews: IRexDB<Overview>, dbPureBundles: IRexDB<PureBundle>, dbDevices: IRexDB<Device>, dbDevtools: IRexDB<Devtool>, packageMacros: preproc.Macros, contentBasePath: string, logger: BaseLogger): Promise<RefreshMessageLevel>;
export declare function _process(resourceList: AnyDefinition[], packagePath: string, packageOrder: number | undefined, jsonDir: string, jsonFile: string, dbOverviews: IRexDB<Overview>, dbDevices: IRexDB<Device>, dbDevtools: IRexDB<Devtool>, packageHeader: PackageHeader | null, packageMetadata: utils.PackageMetadata, resources: Resource[], overviews: Overview[], pureBundles: PureBundle[], fullPathsMapFolders: FullPathsMapFolders, contentBasePath: string, logger: BaseLogger, installPath: PlatformAttribute | null, installCommand: PlatformAttribute | null, installSize: NumericPlatformAttribute | null): Promise<{
    worstMessageLevel: RefreshMessageLevel;
    packageHeader: PackageHeader | null;
}>;
/**
 * check record for includedFiles info in this order:
 * 1) inlined array
 *      Paths of files to be included are relative to the package root (TODO: should be
 *      content.tirex.json file location, but could break package core)
 * 2) explicit dependency file: file path specified
 *      Paths of files to be included are relative to the dep file location
 * 3) implicit dependency file:
 *      - same filename as link with extension replaced with '.dependency',
 *      OR
 *      - filename is specified in the dependency mapping file (flat dep
 *        files in same folder) In both cases the paths of files to be included are relative to the
 *        resource link
 *
 * Simple format:  One file path per line, paths must be relative to location of the dep file (for
 * 1 and 2) or relative to the content file (for 3). The first char of each line should be +, -, or
 * space.
 *
 * +|-|<space>file_path [-> category_path]
 *
 * <space>: the file or dir is designated for downloading
 * -: applies to dirs only: only the immediate files in this dir are designated for downloading
 * +: the file or dir is designated for downloading and displaying
 *
 * Note: Instead of <space> the path string may be started at the first column, but then any
 * filenames starting with + or - would not be found
 *
 * Example:
 *  +../../../Profiles -> PROFILES
 *  +../../../common/cc26xx/board_lcd.c -> Application/board_lcd.c
 *
 * - using either '/' or '\' separators
 * - DOS and UNIX line endings are handled
 * - Paths on either side can be files or dirs
 * - category_path is optional
 *
 * JSON format: The file list can also be wrapped inside a json file generated based on the
 * configurations of a project In this case the JSON is an array of configurations with the file
 * list specified in the 'file' property
 *
 * @param record
 * @param packageHeader
 * @returns {forDisplay: for creating new resources to show in tree, fullUnrescursed: for download}
 *     all paths relative to CONTENT_BASE_PATH
 * @private
 */
export declare function _processIncludedFiles(record: {
    includedFiles?: string[];
    packagePath: string;
    implictDependencyFile?: string;
    link?: string;
}, packageHeader: PackageHeader | null, contentBasePath: string, logger: BaseLogger, makeLogMsg: (msg: string) => string): {
    forDisplay: ({
        file: string;
        mapTo: string;
    } | {
        error: Error;
    })[];
    forDownload: (string | {
        error: Error;
    })[];
};
/**
 * Return the json files we need to processes, with
 * their paths relative to the package directory.
 *
 * @param {string} metadataDir - The metadata directory.
 * @param {string} contentBasePath - The contentBase directory.
 * @param {string} PackagePath - The package directory.
 *
 * @returns {Array.<string>} files - A list of files with their paths
 * relative to the package directory.
 */
export declare function getFiles(metadataDir: string, contentBasePath: string, packagePath: string, modulePrefix: string | null): Promise<string[]>;
export {};
