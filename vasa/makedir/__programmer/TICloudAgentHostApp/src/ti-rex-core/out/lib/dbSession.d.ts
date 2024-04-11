import { IRexDB } from '../rexdb/lib/irexdb';
import { BoardsAndDevicesData, FilterData } from '../shared/routes/response-data';
import { PresentationNode as PresentationNodeDB, PackageTreeNode } from '../sqldb/tree';
import { Device as DeviceDB } from '../sqldb/devices';
import { Devtool as DevtoolDB } from '../sqldb/devtools';
import { PackageGroup as PackageGroupDB, Package, PackageCriteria } from '../sqldb/packages';
import { Resource } from '../sqldb/resources';
import { Dependencies, PlatformAttribute, LandingPageNodeInfo, ModuleOf, NumericPlatformAttribute, ModuleGroup, AvailableTableViewFilters, PackageSubType, FeatureType } from './dbBuilder/dbTypes';
import { TableViewFilters, TableViewItem } from '../sqldb/table-views';
export interface FilterProps {
    deviceId?: number;
    devtoolId?: number;
    resourceClass?: string;
    compiler?: string | string[];
    ide?: string;
    kernel?: string;
    language?: string;
    os?: string;
    search?: string[];
}
export type PresentationData = PresentationNodeDB;
export type ResourceRecord = Resource;
export interface DeviceRecord extends DeviceDB {
    _id: string;
    ancestors?: string[];
    children?: null | string[];
}
export interface DevtoolRecord extends DevtoolDB {
    _id: string;
    devices: string[];
}
export type PackageGroupRecordDB = PackageGroupDB;
export interface PackageGroupRecord {
    packageGroupDbId: number;
    packageGroupPublicId: string;
    packageGroupVersion: string;
    packageGroupPublicUid: string;
    packagesPublicUids: string[];
    mainPackagePublicUid?: string;
    mainPackageName?: string;
    mainPackageHideByDefault?: boolean;
    packageGroupPublicIdEncoded: string;
    packagesToListVersionsFrom: string[];
}
export type PackageRecordDB = Package;
export declare const enum PackageRecordType {
    SOFTWARE_MAIN = "softwareMain",
    SOFTWARE_SUPPLEMENTAL = "softwareSupplemental",
    DEVICE = "device",
    DEVTOOL = "devtool"
}
export type PackageRecord = MainPackageRecord | SupplementalPackageRecord | DevicePackageRecord | DevtoolPackageRecord;
export interface MainPackageRecord extends PackageRecordBase {
    packageGroupDbId: number;
    packageType: PackageRecordType.SOFTWARE_MAIN;
}
export interface SupplementalPackageRecord extends PackageRecordBase {
    packageType: PackageRecordType.SOFTWARE_SUPPLEMENTAL;
}
export interface DevtoolPackageRecord extends PackageRecordBase {
    packageType: PackageRecordType.DEVTOOL;
}
export interface DevicePackageRecord extends PackageRecordBase {
    packageType: PackageRecordType.DEVICE;
}
export interface DevicePackageRecord extends PackageRecordBase {
    packageType: PackageRecordType.DEVICE;
}
export interface PackageRecordBase {
    packageDbId: number;
    packagePublicId: string;
    packageVersion: string;
    packagePublicUid: string;
    packagePath: string;
    name: string;
    license?: string;
    hideNodeDirPanel: boolean;
    hideByDefault: boolean;
    dependencies: Dependencies[];
    modules: Dependencies[];
    moduleOf?: ModuleOf;
    installPath?: PlatformAttribute;
    installCommand?: PlatformAttribute;
    installSize?: NumericPlatformAttribute;
    restrictions: string[];
    aliases: string[];
    moduleGroups?: Dependencies[];
    moduleGroup?: ModuleGroup;
    subType?: PackageSubType;
    featureType?: FeatureType;
    ccsVersion?: string;
    ccsInstallLocation?: string;
    devices?: string[];
    devtools?: string[];
}
export interface DevFilter {
    type: 'device' | 'devtool';
    publicId: string;
}
export type ParentToChildrenIdMap = Map<number, number[]>;
/**
 * Immutable Sqldb session that caches certain DB data
 *
 * A new session needs to be created whenever the DB changes
 */
export interface DbSession {
    dbDevices: IRexDB<DeviceRecord>;
    dbDevtools: IRexDB<DevtoolRecord>;
    getRootId(): number;
    getSessionId(): string;
    getDevicePackageGroup(): PackageGroupRecord | null;
    getDevtoolPackageGroup(): PackageGroupRecord | null;
    getSoftwarePackageGroups(): PackageGroupRecord[];
    getAllPackageGroups(): PackageGroupRecord[];
    getPackageRecords(): PackageRecord[];
    getPackageOverviews(criteria?: PackageCriteria): Promise<Package[]>;
    getNodePackageTree(): Promise<PackageTreeNode>;
    getDeviceVariantsSorted(): DeviceRecord[];
    getDevtoolBoardsSorted(): DevtoolRecord[];
    getAllDevices(): Promise<DeviceRecord[]>;
    getAllDevtools(): Promise<DevtoolRecord[]>;
    getBoardAndDeviceData(): BoardsAndDevicesData;
    getLanguages(): FilterData.Data[];
    getIdes(): FilterData.Data[];
    getKernels(): FilterData.Data[];
    getCompilers(): FilterData.Data[];
    getResourceClasses(): FilterData.Data[];
    getSearchSuggestions(substring: string, packageGroupDbIds: number[]): Promise<string[]>;
    getTableViewItems(parentNodeId: number, packageGroupIds: number[], filter: TableViewFilters): Promise<Map<number, TableViewItem[]>>;
    getAvailableTableViewFilters(nodeId: number, packageGroupIds: number[], filter: TableViewFilters): Promise<Map<number, AvailableTableViewFilters>>;
    getNodePresentationForTableViewItemVariant(tableViewItemId: number, filter: TableViewFilters, variant: {
        compiler?: string;
        kernel?: string;
    }): Promise<PresentationData>;
    lookupNodeDbIdOnPublicId(nodePublicId: string, packageGroup: {
        publicId: string;
        version: string;
    } | null, packagePublicId: string | null): Promise<number | null>;
    lookupNodesOnCustomResourceId(customResourceId: string, packageGroup: {
        publicId: string;
        version?: string;
    }, filter?: DevFilter, maxNodes?: number): Promise<LandingPageNodeInfo[]>;
    lookupNodesOnGlobalId(globalId: string, filter?: DevFilter, maxNodes?: number): Promise<LandingPageNodeInfo[]>;
    getNodeChildrenBulk(parentNodeIds: number[], packageSetIds: number[], filter?: FilterProps): Promise<ParentToChildrenIdMap>;
    getNodePresentation(nodeId: number): Promise<PresentationData>;
    getNodePresentationBulk(nodeIds: number[]): Promise<Map<number, PresentationData>>;
    getResourceOnNodeBulk(nodeIds: number[]): Promise<Map<number, ResourceRecord | null>>;
    getResourceOnNode(nodeId: number): Promise<ResourceRecord | null>;
    getDevicesOnResource(resourceId: number): Promise<number[]>;
    getDevtoolsOnResource(resourceId: number): Promise<number[]>;
    getDeviceNamesOnResource(resourceId: number): Promise<string[]>;
    getDevtoolNamesOnResource(resourceId: number): Promise<string[]>;
    getNodeAncestors(nodeId: number): Promise<number[]>;
}
/**
 * Class to create SqldbSession's.  It caches and saves a valid instance of that class that can be reused until
 * the next database update.
 */
export declare class DbSessionFactory {
    private readonly impl;
    /**
     * Constructor.  Promisifies the internal APIs and begins updating the schema
     *
     * @param dbConfig
     * @param callback
     */
    constructor(dinfraPath: string, tablePrefix: string);
    /**
     * Asynchronous function to fetch a valid SqldbSession interface.  If one hasn't been created,
     * it waits on the original updateSchema call to finish, and then asynchronously creates a
     * new instance.  All of that is associated with a promise, and that same promise is returned
     * each time so the operations only happen once.
     *
     * @returns Promise<SqldbSession | undefined>: Promise<undefined> if the DB is empty
     */
    getCurrentSessionPromise(): Promise<DbSession | undefined>;
    /**
     * Invalidates the current session.  Any copies of the current session will continue to work
     * with the old cached state, but any new requests will end up fetching a brand new session
     */
    invalidate(): void;
}
