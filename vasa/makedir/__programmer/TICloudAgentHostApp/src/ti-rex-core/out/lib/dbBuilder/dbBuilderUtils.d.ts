import { BaseLogger } from '../../utils/logging';
import * as preproc from './preproc';
import { Bundle, Device, Devtool, PackageType, Resource, Dependencies, SupplementsAll } from './dbTypes';
import { IRexDB } from '../../rexdb/lib/irexdb';
import { AnyDefinition } from './resources';
export interface VersionId {
    packageVersion: string;
    packageId: string;
    metadataVersion?: string;
}
export interface PackageMetadata {
    metaDataVer: string;
    type: PackageType;
    version: string;
    id: string;
    typeName: string;
    supplements?: {
        packageId: string;
        semver: string;
    };
    moduleOf?: {
        packageId: string;
        semver: string;
    };
    moduleGroup?: {
        corePackage: {
            packageId: string;
            semver: string;
        };
        packages: string[];
        defaultModuleGroup: boolean;
    };
    rootCategory?: string[];
    dependencies: Dependencies[];
    name: string;
    hideByDefault?: boolean;
    packageIdAliases?: string[];
    modifiedValues: {
        rootCategory?: string[];
        name?: string;
        supplements?: SupplementsAll;
    };
}
export interface PackageAuxMetadata {
    [packageId: string]: {
        rootCategory?: string[];
        name?: string;
        hideByDefault?: boolean;
        packageIdAliases?: string[];
        defaultModuleGroup?: boolean;
        addDependences?: Dependencies[];
        removeSupplements?: boolean;
    };
}
export declare function isOverview(record: Bundle): boolean;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Convert a treeNodePath string to a 128 bit public id: 8-bit type field + 120 bit sha1
 *
 * The type can be used for future extensions. This function sets the id type to 0x00
 *
 * Return as a base64 string
 *
 * @param treeNodePath: full path incl. name, e.g. "Device Documentation/IWR1XXX/IWR1443/User's Guide
 */
export declare function createPublicIdFromTreeNodePath(treeNodePath: string): string;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Convert the custom public UID of a resource  to a 128 bit public id: 8-bit type field + 120 bit sha1
 *
 * The type can be used for future extensions. This function sets the id type to 0x01
 *
 * Return as a base64 string
 *
 */
export declare function createPublicIdFromCustomResourcePublicUid(customResourcePublicUid: string, resource: AnyDefinition, fullPathIndex: number): string;
/**
 * Helper function to support SQLDB with storing base64-UrlSafe encoded data
 * @param base64UrlSafe
 */
export declare function base64UrlSafeToHex(base64UrlSafe: string): string;
/**
 * Helper function to support SQLDB with storing base64-UrlSafe encoded data
 * @param hex
 */
export declare function hexToBase64UrlSafe(hex: string): string;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Convert packageGroupPublicId to a 42 bit base64 id
 * (for 1000 hash values this is about 1 in 10 billion chance of collision)
 *
 * @param s
 *
 * TODO: Could test this during hand-off/refresh to catch collisions, but unlikely, i.e. low priority
 */
export declare function encodePackageGroupPublicId(s: string): string;
export declare function formUid(id: string, version: string): string;
export declare function splitUid(uid: string): {
    id: string;
    version: string;
};
/**
 * Get the dir the metadata folder is located relative to the package folder.
 *
 * We expect all the .tirex.json files to be located
 * in the METADATA_DIR folder if it exists, otherwise they will all be
 * in the root of the package directory.
 *
 * @param contentBasePath
 * @param {string} packagePath - the package's path relative to the content folder.
 */
export declare function getMetadataDir(contentBasePath: string, packagePath: string): Promise<string>;
/**
 * Get the package metadata from package.tirex.json and resolve macros
 *
 */
export declare function getPackageMetadataAsync(contentBasePath: string, packagePath: string, metadataDir: string, packageMacros: preproc.Macros | null, modulePrefix: string | null, packageAuxDataFile: string | null, logger: BaseLogger): Promise<{
    vID: VersionId;
    packageMetadata: PackageMetadata;
}>;
export declare function validateShortDescription(record: Resource | Device | Devtool): string | undefined;
/**
 * 1. expand devices specified as regex
 * 2. expand any device family/sub-family/ect into variants
 *
 */
export declare function expandDevices(dbDevices: IRexDB<Device>, record: {
    name: string;
    children?: string[];
    devicesVariants?: string[];
}, deviceName: string, logger: BaseLogger): Promise<void>;
export declare function isImportableResource(resourceRecord: Resource): boolean;
export declare function mergeMissingArrayElements(array1: any[], array2: any[]): any[];
