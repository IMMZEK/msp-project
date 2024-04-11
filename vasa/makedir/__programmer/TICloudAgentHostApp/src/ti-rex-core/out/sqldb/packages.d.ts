import { Db } from './db/db';
import { ContentSourceState } from './db/types';
import { ModuleOf, Dependencies, NumericPlatformAttribute, PlatformAttribute, ModuleGroup, PackageSubType, FeatureType } from '../lib/dbBuilder/dbTypes';
export interface PackageGroup {
    id: number;
    publicVId: string;
    publicId: string;
    version: string;
    created: number;
    type: string;
    state: ContentSourceState;
    mainPackageId?: number;
    filterDevSetId?: number;
    headNodeIds?: number[];
    packageIds: number[];
    packagesToListVersionsFrom: string[];
}
export interface PackageGroupCriteria {
    packageGroupUids?: string[];
}
export type PackageCriteria = {
    packageUid: string;
} | {
    packagePublicId: string;
} | {
    resourceId: number;
};
export interface Package {
    id: number;
    jsonId: string;
    publicId: string;
    version: string;
    uid: string;
    installPath?: PlatformAttribute;
    installCommand?: PlatformAttribute;
    installSize?: NumericPlatformAttribute;
    type: string;
    subType?: PackageSubType;
    featureType?: FeatureType;
    ccsVersion?: string;
    ccsInstallLocation?: string;
    name: string;
    description?: string;
    path: string;
    image?: string;
    order?: number;
    semver: string;
    metadataVersion?: string;
    restrictions?: string;
    license?: string;
    hideNodeDirPanel: boolean;
    hideByDefault: boolean;
    dependencies: Dependencies[];
    modules: Dependencies[];
    moduleOf?: ModuleOf;
    moduleGroups?: Dependencies[];
    moduleGroup?: ModuleGroup;
    aliases: string[];
    devices?: string[];
    devtools?: string[];
}
export declare class Packages {
    private readonly db;
    private readonly mysql;
    constructor(db: Db, dinfraLibPath: string);
    /**
     * Get package overviews
     *
     * @param packageCriteria - package uid, public id, or database id
     * @param groupStates - package group states to filter packages on, defaults to ['published']
     *
     * @returns packages matching the given criteria
     */
    getOverviews(packageCriteria?: PackageCriteria, groupStates?: ContentSourceState[]): Promise<Package[]>;
    /**
     * Get package groups and their content head node IDs
     *
     * @param criteria - Criteria by which to retrieve package groups
     *   criteria.packageGroupUids - Package Groups' versioned public ids; all if empty
     *   criteria.states - States to filter on; defaults to 'published'
     * @param latest - Retreive latest package group per versioned public id; otherwise all
     * @param includeContentNodeHeads - Include content node heads?
     * @returns packageGroups
     */
    getPackageGroups(criteria: {
        packageGroupUids?: string[];
        states?: ContentSourceState[];
    }, latest?: boolean, includeNodeHeads?: boolean): Promise<PackageGroup[]>;
}
