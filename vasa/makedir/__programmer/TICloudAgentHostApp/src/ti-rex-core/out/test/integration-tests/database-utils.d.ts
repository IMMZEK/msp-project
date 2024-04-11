import { Device, Devtool, Overview, Resource } from '../../lib/dbBuilder/dbTypes';
export declare const firstFolderInAllPackages = "Software";
export type MinimalDevice = Pick<Device, 'name' | 'id' | '_id' | 'packageUId'> & Partial<Device>;
export type MinimalDevtool = Pick<Devtool, 'name' | 'id' | 'type' | '_id' | 'packageUId'> & Partial<Devtool>;
export type MinimalPackageOverview = Partial<Overview> & Pick<Overview, 'name' | 'version' | 'type' | '_id' | 'packagePath' | 'resourceType' | 'packageVersion' | 'packageUId' | 'fullPaths' | 'fullPathsPublicIds' | 'id' | 'packageId' | 'semver'> & {
    localPackagePath?: string;
};
export type MinimalResource = Partial<Resource> & Pick<Resource, 'name' | '_id' | 'categories' | 'fullPaths' | 'fullPathsPublicIds' | 'linkType' | 'package' | 'resourceType'>;
export type MinimalOverview = MinimalPackageOverview & {
    resourceType: 'overview';
};
export type MinimalCategory = MinimalPackageOverview & {
    resourceType: 'category';
};
export interface MinimalPackage {
    packageOverview: MinimalPackageOverview;
    resources: MinimalResource[];
    overviews: MinimalOverview[];
    simpleCategories: MinimalCategory[];
}
export interface Metadata {
    devices: MinimalDevice[];
    devtools: MinimalDevtool[];
    packages: MinimalPackage[];
}
export declare function generateId(): string;
export declare function generateDevice(id: string, name: string): MinimalDevice;
export declare function generateDevtool(id: string, name: string): MinimalDevtool;
export declare function generatePackageOverview(name: string, version: string, overrides?: Partial<MinimalPackageOverview>): MinimalPackageOverview;
export declare function generateResource(name: string, packageOverview: MinimalPackageOverview, device: MinimalDevice, devtool: MinimalDevtool, overrides?: Partial<MinimalResource>): MinimalResource;
export declare function generateOverview(folderName: string, packageOverview: MinimalPackageOverview, overrides?: Partial<MinimalOverview>): MinimalOverview;
/**
 * Generate a category record for each not yet encountered ancestor path in fullPaths
 * @param records
 * @param packageOverview
 */
export declare function generateSimpleCategories(records: FullPathAndName[], packageOverview: MinimalPackageOverview, overviews?: FullPathAndName[]): MinimalCategory[];
export declare function writeMetadata(data: Metadata): Promise<string>;
type FullPathAndName = Pick<MinimalResource, 'fullPaths' | 'name'>;
/**
 * Update the database in process
 * @param data
 */
export declare function updateDatabaseImpl(data: Metadata): Promise<string>;
/**
 * Update the database spawning the db-import script in another process
 * @param data
 */
export declare function updateDatabaseWithScriptImpl(data: Metadata): Promise<string>;
export declare function expectValidDbId(id: string): void;
export {};
