import { RexDB } from '../rexdb/lib/rexdb';
import { DbSession, DevFilter, DeviceRecord, DevtoolRecord, FilterProps, PackageGroupRecord, PackageRecord, ParentToChildrenIdMap, PresentationData, ResourceRecord } from './dbSession';
import { FilterData, Compiler, Kernel, BoardsAndDevicesData } from '../shared/routes/response-data';
import { SqlDb } from '../sqldb/sqldb';
import { PackageCriteria } from '../sqldb/packages';
import { TableViewFilters, TableViewItem } from '../sqldb/table-views';
import * as dbTypes from './dbBuilder/dbTypes';
/**
 * Immutable Sqldb session that caches certain DB data
 *
 * A new session needs to be created whenever the DB changes
 */
declare class SqldbSession implements DbSession {
    private readonly sqldb;
    private readonly rootId;
    private readonly devicePackageGroup;
    private readonly devtoolPackageGroup;
    private readonly softwarePackageGroups;
    private readonly packageRecords;
    readonly dbDevices: RexDB<DeviceRecord>;
    readonly dbDevtools: RexDB<DevtoolRecord>;
    private readonly deviceVariantsSorted;
    private readonly devtoolBoardsSorted;
    private readonly extraBoardAndDeviceData;
    private readonly sessionId;
    private constructor();
    /**
     * Public static function to create a new instance.
     * @param sqldb
     * @param sessionId
     * @returns SqldbSession instance, or undefined if DB is empty
     * @throws RexError if error creating an instance
     */
    static create(sqldb: SqlDb, sessionId: number): Promise<SqldbSession | undefined>;
    /**
     * Cache package group info from the DB. Must only be called once at create time.
     */
    private static cachePackageGroupInfo;
    /**
     * Cache package info from the DB. Must only be called once at create time.
     *
     * Note: the same supplemental package may occur multiple times since it could be associated
     * with multiple main packages
     */
    private static cachePackageRecordInfo;
    /**
     * Cache device and devtool info from the DB. Only called once at create time.
     */
    private static cacheDevicesAndDevtoolsInfo;
    getRootId(): number;
    getSessionId(): string;
    getDevicePackageGroup(): PackageGroupRecord | null;
    getDevtoolPackageGroup(): PackageGroupRecord | null;
    getDeviceVariantsSorted(): DeviceRecord[];
    getBoardAndDeviceData(): BoardsAndDevicesData;
    getDevtoolBoardsSorted(): DevtoolRecord[];
    getSoftwarePackageGroups(): PackageGroupRecord[];
    getAllPackageGroups(): PackageGroupRecord[];
    getPackageRecords(): PackageRecord[];
    getResourceClasses(): FilterData.Data[];
    getCompilers(): FilterData.Data[];
    getKernels(): FilterData.Data[];
    getIdes(): FilterData.Data[];
    getLanguages(): FilterData.Data[];
    lookupNodeDbIdOnPublicId(nodePublicId: string, packageGroup: {
        publicId: string;
        version: string;
    } | null, packagePublicId: string | null): Promise<number | null>;
    lookupNodesOnCustomResourceId(customResourceId: string, packageGroup: {
        publicId: string;
        version?: string;
    }, filter?: DevFilter, maxNodes?: number): Promise<dbTypes.LandingPageNodeInfo[]>;
    lookupNodesOnGlobalId(globalId: string, filter?: DevFilter, maxNodes?: number): Promise<dbTypes.LandingPageNodeInfo[]>;
    getPackageOverviews(criteria?: PackageCriteria): Promise<import("../sqldb/packages").Package[]>;
    getNodePackageTree(): Promise<import("../sqldb/tree").PackageTreeNode>;
    /**
     *
     * @param {number[]} parentNodeIds
     * @param {number[]} packageGroupIds
     * @param {FilterProps} filter
     * @returns {Promise<ParentToChildrenIdMap>} parent -> children
     */
    getNodeChildrenBulk(parentNodeIds: number[], packageGroupIds: number[], filter?: FilterProps): Promise<ParentToChildrenIdMap>;
    /**
     *
     */
    getTableViewItems(parentNodeId: number, packageGroupIds: number[], filter: TableViewFilters): Promise<Map<number, TableViewItem[]>>;
    /**
     *
     */
    getAvailableTableViewFilters(nodeId: number, packageGroupIds: number[], filter: TableViewFilters): Promise<Map<number, dbTypes.AvailableTableViewFilters>>;
    /**
     *
     */
    getNodePresentationForTableViewItemVariant(tableViewItemId: number, filter: TableViewFilters, variant: {
        compiler?: Compiler;
        kernel?: Kernel;
    }): Promise<PresentationData>;
    /**
     *
     * @param {number[]} nodeIds
     * @returns {Promise<IdToPresentationDataMap>}
     */
    getNodePresentation(nodeId: number): Promise<PresentationData>;
    /**
     *
     * @param {number[]} nodeIds
     * @returns {Promise<IdToPresentationDataMap>}
     */
    getNodePresentationBulk(nodeIds: number[]): Promise<Map<number, PresentationData>>;
    /**
     *
     * @param {number[]} nodeIds
     * @returns {Promise<IdToResourceRecordMap>}
     */
    getResourceOnNodeBulk(nodeIds: number[]): Promise<Map<number, import("../sqldb/resources").Resource | null>>;
    /**
     *
     * @param {number} nodeId
     * @returns {Promise<ResourceRecord>}
     */
    getResourceOnNode(nodeId: number): Promise<ResourceRecord | null>;
    /**
     *
     * @param {number} resourceId
     * @returns {Promise<number[]>}
     */
    getDevicesOnResource(resourceId: number): Promise<number[]>;
    /**
     *
     * @param {number} resourceId
     * @returns {Promise<number[]>}
     */
    getDevtoolsOnResource(resourceId: number): Promise<number[]>;
    /**
     *
     * @param {number} resourceId
     * @returns {Promise<string[]>}
     */
    getDeviceNamesOnResource(resourceId: number): Promise<string[]>;
    /**
     *
     * @param {number} resourceId
     * @returns {Promise<string[]>}
     */
    getDevtoolNamesOnResource(resourceId: number): Promise<string[]>;
    /**
     *
     * @param {number} nodeId
     * @returns {Promise<number[]>}
     */
    getNodeAncestors(nodeId: number): Promise<number[]>;
    /**
     *
     * @param {string} substring
     * @param packageGroupDbIds
     * @returns {Promise<string[]>}
     */
    getSearchSuggestions(substring: string, packageGroupDbIds: number[]): Promise<string[]>;
    /**
     *
     * @returns {Promise<DeviceRecord[]>}
     */
    getAllDevices(): Promise<DeviceRecord[]>;
    /**
     *
     * @returns {Promise<DevtoolRecord[]>}
     */
    getAllDevtools(): Promise<DevtoolRecord[]>;
    /**
     * This sorting is for the benefit of the client:
     *   in package picker show order of packages alphabetically by name with decreasing version
     *
     * @param packages
     */
    private static sortPackagesByNameAndVersion;
    /**
     * Sort software package groups in the same order as their main packages
     *
     * @param softwareGroups: i.e. every group must have a main package
     * @param packages: used as the reference for ordering
     */
    private static sortGroupsByMainPackageOrder;
    /**
     * Entries of the packageGroup.packagesPublicUids field are sorted in the same order as the
     * packages array
     *
     * @param groups
     * @param packages: used as the reference for ordering
     */
    private static sortGroupsPackagesListByPackageOrder;
    private static findIndexOfPackage;
    private static removeRestrictedPackages;
}
/**
 * Class to create SqldbSession's.  It caches and saves a valid instance of that class that can be
 * reused until the next database update.
 */
export declare class SqldbSessionFactory {
    private readonly dinfraPath;
    private readonly tablePrefix;
    private currentSessionPromise?;
    private sqldb?;
    /**
     * Constructor
     *
     * @param dinfraPath
     * @param tablePrefix
     */
    constructor(dinfraPath: string, tablePrefix: string);
    /**
     * Asynchronous function to fetch a valid SqldbSession interface.  First creates the Sqldb
     * instance and updates the database schema if not yet performed, and then asynchronously
     * creates a new SqldbSession instance.
     *
     * @returns Promise<SqldbSession | undefined>: Promise<undefined> if the DB is empty
     */
    getCurrentSessionPromise(): Promise<SqldbSession | undefined>;
    /**
     * Invalidates the current session.  Any copies of the current session will continue to work
     * with the old cached state, but any new requests will end up fetching a brand new session
     */
    invalidate(): void;
}
export {};
