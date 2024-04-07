import { Device, Devtool, Overview, Resource } from '../../lib/dbBuilder/dbTypes';
export declare const firstFolderInAllPackages = "Software";
export type MinimalContentDevice = Pick<Device, 'name' | 'id' | 'type' | 'description'> & Partial<Device>;
export type MinimalContentDevtool = Pick<Devtool, 'name' | 'id' | 'type' | 'description'> & Partial<Devtool>;
export type MinimalContentPackageOverview = Partial<Overview> & Pick<Overview, 'name' | 'version' | 'type' | 'id' | 'description' | 'devices' | 'devtools' | 'metadataVersion' | 'supplements' | 'link'>;
export type MinimalContentResource = Partial<Resource> & Pick<Resource, 'name' | 'resourceType' | 'fileType' | 'link' | 'categories' | 'description' | 'devices' | 'devtools'>;
export type MinimalContentOverview = MinimalContentPackageOverview & {
    resourceType: 'overview';
};
export type MinimalContentCategory = MinimalContentPackageOverview & {
    resourceType: 'category';
};
export interface MinimalContentPackage {
    packageOverview: MinimalContentPackageOverview;
    resources: MinimalContentResource[];
    overviews: MinimalContentOverview[];
    simpleCategories: MinimalContentCategory[];
}
export interface Metadata {
    devices: MinimalContentDevice[];
    devtools: MinimalContentDevtool[];
    packages: MinimalContentPackage[];
}
interface CoreTypesContent {
    name: string;
    id: string;
}
interface DeviceContent {
    name: string;
    id: string;
    type: string;
    description?: string;
    coreTypes: CoreTypesContent[];
    parent?: string;
}
interface DevtoolContent {
    name: string;
    id: string;
    type: string;
    description?: string;
}
export interface DependencyContent {
    version: string;
    packageId: string;
}
export interface SupplementContent {
    packageId: string;
    semver: string;
}
interface PackageOverviewContent {
    name: string;
    id: string;
    version: string;
    type: string;
    description: string;
    dependencies?: DependencyContent[];
    supplements?: SupplementContent;
    allowPartialDownload: false;
    devices?: string[];
    metadataVersion: string;
}
interface ResourceContent {
    name: string;
    resourceType: string;
    fileType: string;
    location: string;
    description: string;
    categories: string[];
    devices: string[];
    devtools: string[];
}
export interface SoftwarePackageProperties {
    folder: string;
    id: string;
    version: string;
    dependencies?: DependencyContent[];
    supplements?: SupplementContent;
}
export declare function generateDeviceContent(name: string, id: string): DeviceContent;
export declare function generateDevtoolContent(name: string, id: string): DevtoolContent;
export declare function generatePackageOverviewContent(name: string, id: string, version: string, type: string, dependencies?: DependencyContent[], supplements?: SupplementContent): PackageOverviewContent;
export declare function generateResourceContent(name: string, devices: string[], devtools: string[]): ResourceContent;
export {};
