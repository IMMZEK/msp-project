import { Db, Tables } from './db/db';
import { Config } from './config';
import { Packages } from './packages';
import { ContentSourceType, ContentSourceState, InternalId } from './db/types.js';
import { DbLogger } from './dblogger';
import { ConsoleLogger } from './console';
export interface PackageGroupJson {
    uid?: string;
    packages: string[];
    mainPackage?: string;
}
export declare enum ConsoleVerbosity {
    Quiet = 0,
    ProgressOnly = 1,
    Normal = 2,
    Verbose = 3,
    VeryVerbose = 4
}
interface ImportOptions {
    writeToDb?: boolean;
    skipExistingPackages?: boolean;
    verbosity?: ConsoleVerbosity;
}
export type TrunkNodeType = 'foundation' | 'packageGroupHead';
export interface TrunkJsonNode {
    name: string;
    publicId: string;
    children: TrunkJsonNode[];
    type?: TrunkNodeType;
}
/**
 * Criteria by which content sources are selected for deletion
 *
 * @prop types  - Types to delete ('pkggrp' for Package Group, 'devset' for Dev Set).
 * @prop states - States to delete. Deletion of published Content Sources is not permitted.
 * @prop age    - Minimum age of last state change (in seconds).
 */
interface ContentSourceDeleteOptions {
    types?: ContentSourceType[];
    states?: Exclude<ContentSourceState, 'published' | 'deleting' | 'deleted'>[];
    age?: number;
}
export declare class Manage {
    private readonly db;
    private readonly logger;
    private readonly console;
    private readonly config;
    private readonly packages;
    private readonly dinfra;
    private readonly TRACE0;
    private readonly TRACE;
    private readonly dbSession;
    private treeRoot;
    private filterCache;
    private filterDevSetCache;
    private freqChunkFiltersByStdFilters;
    constructor(db: Db, logger: DbLogger, console: ConsoleLogger, config: Config, dinfraLibPath: string, packages: Packages);
    reset(): void;
    /**
     * Create new database, clearing database if it already exists.
     */
    createDb(): Promise<void>;
    updateSchema(): Promise<void>;
    /**
     * Create and persist the top-level REX Foundation Tree
     */
    importFoundationTree(): Promise<void>;
    /**
     * Import a new Package Group.
     *
     * @param {Object} packageGroupJsons - the Package Group definitions
     * @param {string} dir - where packages are located
     * @param {string} filterDevSetId - Device/devtool Set id (defaults to current default if null)
     * @param {Object} options
     *
     * Fails if a Package Group with the same Public ID has already been imported.
     */
    importPackageGroups(dir: string, packageGroupJsons: PackageGroupJson[], filterDevSetId: string, options?: ImportOptions): Promise<InternalId[]>;
    /**
     * Re-import a Package Group.
     *
     * @param {Object} packageGroups - the Package Groups
     * @param {string} dir - where packages are located
     * @param {string} filterDevSetId - Device/devtool Set id (defaults to current default if null)
     *
     * Fails if a Package Group with the same Public ID hasn't already been imported.
     */
    reimportPackageGroups(_dir: string, _packageGroups: PackageGroupJson[], _filterDevSetId: string): void;
    /**
     * Publish a Package Group. If another earlier Package Group exists with the
     * same vpublic id, unpublish it. If multiple Package Group exist with the
     * same vpublic id, publish the latest.
     *
     * @param {string} packageGroupVPublicId - package group's versioned public id
     */
    publishPackageGroup(publicVId: string): Promise<void>;
    /**
     * Publish a FilterDevSet. If another earlier FilterDevSet exists with the same vpublic
     * id, unpublish it. If multiple FilterDevSets exist with the same vpublic id,
     * publish the latest.
     *
     * @param {string} filterDevSetVPublicId - FilterDevSet's versioned public id
     */
    publishFilterDevSet(publicVId: string): Promise<void>;
    /**
     * Unpublish a Package Group.
     *
     * @param {string} packageGroupVPublicId - package group's versioned public id
     */
    unpublishPackageGroup(publicVId: string): Promise<void>;
    /**
     * Unpublish a FilterDevSet.
     *
     * @param {string} filterDevSetVPublicId - FilterDevSet's versioned public id
     */
    unpublishFilterDevSet(publicVId: string): Promise<void>;
    /**
     * Import a Device/Devtool Set.
     *
     * @param {string} dir - where devices and devtool DB JSON files are located
     * @param {string} filterDevSetId - the new set's Public ID
     * @param {string} devicesFilename - defaults to devices.db if null
     * @param {string} devtoolsFilename - defaults to devtools.db if null
     *
     * Fails if a device/devtool set already exists with the same public id.
     */
    importFilterDevSet(dir: string, filterDevSetPubId: string, devicesFilename?: string, devtoolsFilename?: string): Promise<void>;
    /**
     * Legacy Import - import all of the given package groups in the given directory
     * matching the given filters.
     */
    import(dir: string, _filters: {
        include: string;
        exclude: string;
    } | null, packageGroups: PackageGroupJson[], options?: ImportOptions): Promise<void>;
    /**
     * Delete from the database Content Sources matching the given criteria.
     *
     * All rows belonging to the Content Source are deleted, except for its row in table
     * content_sources which is marked 'deleted'.
     *
     * Deletions are performed in batches and not transactionally for performance.
     *
     * Default options were chosen for cloud maintenance operations, due to the high potential
     * impact of an erroneous option while deleting from the cloud.
     *
     * @param options - Criteria by which content sources are selected for deletion. See
     *   {@link defaultContentSourceDeleteOptions} for defaults.
     */
    deleteContentSource(options?: ContentSourceDeleteOptions): Promise<void>;
    /**
     * Check the database's referential integrity by ensuring all rows referenced by foreign keys
     * exist.
     *
     * @returns Array of foreign keys with broken references. Empty if none found.
     */
    checkDatabaseReferentialIntegrity(): Promise<{
        table: keyof Tables;
        column: string;
    }[]>;
    /**
     * Delete rows from tables belonging to the given package group, in batches, using the given
     * SQL statements to determine the batch id range and perform deletions.
     *
     * Primarily targets the rows of a table belonging to the package group, and optionally rows of
     * other secondary tables that efficiently reference the first table (i.e. with an indexed
     * column).
     *
     * @param packageGroupId - The id of the package group.
     * @param tableGroupName - Short name for the table grouping, used in logging.
     * @param idRangeQuery - SQL query statement used to get the minimum and maximum ids of primary
     *      table rows belonging to the given package group. Query must have a single '?' parameter
     *      for the package group id.
     * @param deleteStatement - SQL delete statement used to delete rows in batches from the
     *      primary table and optionally others as well. Must have 3 '?' parameters: package group
     *      id, primary table batch start id, primary table batch end id
     * @param batchSize - The delete batch size, with batches being of the primary table. Deletions
     *      can be much greater due to associated table deletions.
     * @returns deletedRows - The total number of deleted rows from all tables.
     */
    private deletePackageGroupChildRows;
    /**
     * Publish a Content Source. If another earlier published content source
     * exists with the same vpublic id, unpublish it. If multiple content
     * sources exist with the same vpublic id, publish the latest.
     *
     * @param {string} publicVId - Package Group's versioned public id
     */
    private publishContentSource;
    /**
     * Unpublish a Content Source.
     *
     * @param {string} publicVId - Package Group's versioned public id
     */
    private unpublishContentSource;
    private getContentSources;
    private getOptions;
    private displayNodeChildren;
    private writeDevicesToDb;
    private writeDevToolsToDb;
    private writeDevtoolHasDevicesToDb;
    private importPackageGroup;
    private assignDevsToNodes;
    private updateContentSourceState;
    /**
     * Prune Foudation Tree, removing non-foundation nodes.
     *
     * @param node the node to prune from non-foundation nodes from
     */
    private pruneFoundationTree;
    private writePackageOverviewsToDb;
    private writePackageAliasesToDb;
    private writeFoundationTreeToDb;
    private writePackageGroupToDb;
    private writePackageGroupPackagesToDb;
    /**
     * Merge Package Group's subtrees into the Foundation Tree
     *
     * @param packageGroup
     */
    private mergePackageGroupTree;
    private writeContentTreeToDb;
    private writeResourcesToDb;
    private writeAliasNodePublicIdsToDb;
    private writeNodeCustomResourceIds;
    private writeResourceDevicesToDb;
    private writeResourceDevtoolsToDb;
    private writeResourceGroupsToDb;
    private writeNodesAndAncestorsToDb;
    private writePackageNodeFiltersToDb;
    private writePackageNodeAncestorFiltersToDb;
    /**
     * Determine node-filter associations for the given nodes and their filters, for later
     * persistence to database.
     *
     * @param nodes - the nodes
     * @param contentHeadNode - the content head node at the root of the content tree to which
     *     the given nodes belong
     */
    private prepareNodeFilters;
    /**
     * Load Foundation Tree
     */
    private loadFoundationTree;
    /**
     * Recursively create child nodes as defined in the foundation tree's definition and add them
     * to the given foundation tree node.
     *
     * @param toParent - the parent node to add the children to
     * @param childrenDef - the child nodes to create and add
     * @param addPackageGroupHeadsOnly - add only package group subtree head nodes; foundation
     * nodes are expected to already exist in this case
     */
    private addChildrenToFoundationTree;
    private addFoundationChildren;
    private createFilterDevSet;
    /**
     * Lookup FilterDevSet in database. Return as null if not found.
     */
    private lookupFilterDevSetInDb;
    /**
     * Get FilterDevSet. Read from database if not in cache.
     */
    private getFilterDevSet;
    private parseDeviceFile;
    private parseDevtoolFile;
    /**
     * Create the Package Group's tree by parsing it from the given Package
     * Group files
     *
     * @param packageGroup
     * @param packages
     * @param packageFiles
     * @param filterDevSet
     */
    private buildPackageGroupTree;
    private parseResourceJsonFile;
    private addResourcesToTree;
    /**
     * Add a new node to the package tree for the given resource and at the given path, with
     * additional resource-less nodes added to the path where missing.
     *
     * @param resource
     * @param pathInfo
     * @param packageGroup
     * @param duplicateNodeNameFound
     */
    private addResourcePathToTree;
    /**
     * Parse keywords from the given string, with single letter words and words on the keyword
     * exclusion list skipped.
     */
    private parseFilterKeywords;
    private preloadCaches;
    private writeFilterDevSet;
    /**
     * Add filters with the given filter type and values to the given resource,
     * creating any filters that don't yet exist.
     *
     * @param resource
     * @param filterType
     * @param filterValues
     */
    private addResourceFilters;
    private createNodeNameFilters;
    /**
     * Get filter
     */
    private getFilter;
    /**
     * Has filter?
     */
    private hasFilter;
    /**
     * Add filter to cache. Overwrites filter if one already exists; check isn't
     * performed for performance.
     */
    private addFilter;
    /**
     * Flush pending filter writes to db.
     */
    private flushFiltersToDb;
    private chunkifyFilter;
    private reportMemUsage;
}
export {};
