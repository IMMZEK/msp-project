import { Db } from './db/db';
import { DbResource, NodeRow, DbNode } from './db/types.js';
import { Omit } from '../shared/generic-types';
import { ResourceType, LinkType, ViewLimitation, LandingPageNodeInfo } from '../lib/dbBuilder/dbTypes';
import { DevFilter } from '../lib/dbSession';
export interface QueryMetrics {
    [key: string]: QueryCallMetrics;
}
interface QueryCallMetrics {
    [nodeId: number]: NodeCallMetrics;
}
interface NodeCallMetrics {
    calls: CallMetrics[];
    nodeInfo: {
        childCount?: number;
    };
}
type hrtime = [number, number];
interface CallMetrics {
    callTime: hrtime;
    q1Time: hrtime | null;
    q2Time: hrtime | null;
}
export type Resource = DbResource;
export interface PresentationNode {
    id: number;
    publicId: string;
    name: string;
    packageGroupId?: number;
    isLeaf: boolean;
    resourceType?: ResourceType;
    fileType?: string;
    packageId?: number;
    linkExt?: string;
    linkType?: LinkType;
    icon?: string;
    shortDescription?: string;
    viewLimitations?: ViewLimitation[];
    readmeNodePublicId?: string;
}
export type PackageTreeNode = PresentationNode & {
    packageGroupPublicId?: string;
    packageGroupVersion?: string;
    packagePublicId?: string;
    packageVersion?: string;
    children: PackageTreeNode[];
};
export interface Filters {
    devtoolId?: number;
    deviceId?: number;
    compiler?: string | string[];
    resourceClass?: string;
    ide?: string;
    kernel?: string;
    language?: string;
    os?: string;
    search?: string[];
}
interface FilterSqlClauses {
    fromClauses: string;
    whereClauses: string;
    onFilters: boolean;
    statNameSuffix: string | null;
    statParams: {
        [key: string]: boolean;
    };
}
export declare class Tree {
    private readonly db;
    static readonly LATEST_VERSION = "LATEST";
    private readonly mysql;
    private initialized;
    private foundationNodes;
    private treeTopNodes;
    private rootNode;
    private queryMetrics;
    constructor(db: Db, dinfraLibPath: string);
    reset(): void;
    resetMetrics(): void;
    getMetrics(): QueryMetrics;
    enableMetrics(enable: boolean): void;
    /**
     * Initialize and populate caches.
     */
    init(): Promise<void>;
    /**
     * Is tree empty?
     */
    isEmpty(): Promise<boolean>;
    /**
     * Get root node id
     */
    getTreeRootId(): Promise<number | undefined>;
    /**
     * Get node package tree, consisting of just foundation nodes and top-level package-overview
     * nodes.
     *
     * @param nodeId - the node's id
     * @returns ids of the node's foundation and package node
     */
    getNodePackageTree(): Promise<PackageTreeNode>;
    private getNodePackageSubTree;
    /**
     * Get node's children, optionally filtered
     *
     * @param nodeId - the node's id
     * @param packageGroupIds - array of package group ids, to filter on
     * @param filters - filters to apply
     *
     * @returns node's children ids
     */
    getNodeChildren(nodeId: number, packageGroupIds: number[], filters: Filters): Promise<number[]>;
    /**
     * Get node's descendant count, optionally filtered
     * @param nodeId - the node's id
     * @param packageGroupIds - array of package group ids, to filter on
     * @param filters  filters to apply
     * @returns node's decendant count
     */
    getNodeDescendantCount(nodeId: number, packageGroupIds: number[], filters: Filters): Promise<number>;
    /**
     * Get node's parent
     *
     * @param nodeId - the node's id
     * @returns parent node id
     */
    getNodeParent(nodeId: number): Promise<number | null>;
    /**
     * Get node's ancestor IDs, in distant-to-near order (i.e. root first, parent last)
     *
     * @param nodeId - the node's id
     * @returns ancestor node ids
     */
    getNodeAncestors(nodeId: number): Promise<number[]>;
    /**
     * Get presentation attributes for the given node IDs
     *
     * @param nodeIds - array of node IDs
     * @returns array of node presentation info; in the same order as nodeIds
     */
    getNodePresentation(nodeIds: number[]): Promise<PresentationNode[]>;
    /**
     * Look up a node on its public node id, and optionally package group public id and version
     * and package public id.
     *
     * The package group id and version are both expected to be null for foundation nodes, and
     * non-null otherwise.
     *
     * Package group version may be an exact version or 'LATEST' for the latest version.
     *
     * @param nodePublicId
     * @param packageGroupPublicId
     * @param packageGroupVersion
     *
     * @returns node id or null if not found
     */
    lookupNodeOnPublicId(nodePublicId: string, packageGroup?: {
        publicId: string;
        version: string;
    }, packagePublicId?: string): Promise<number | null>;
    lookupNodeOnPublicIdInternal(nodePublicId: string, packageGroup?: {
        publicId: string;
        version: string;
    }, packagePublicId?: string, widenToAllGroups?: boolean): Promise<number | null>;
    /**
     * Look up nodes on custom resource public id, package and optionally a device or devtool
     */
    lookupNodesOnCustomResourceId(customResourceId: string, pkg: {
        publicId: string;
        version?: string;
    }, filter?: DevFilter, maxNodes?: number): Promise<LandingPageNodeInfo[]>;
    /**
     * Look up nodes on a global public id and optionally a device or devtool
     */
    lookupNodesOnGlobalId(globalId: string, filter?: DevFilter, maxNodes?: number): Promise<LandingPageNodeInfo[]>;
    /**
     * Look up nodes on a resource public id, package (if and only if public id is package-scoped)
     * and optionally device or devtool.
     *
     * Resource public ids are all custom ids provided by BUs and either:
     *   package-scoped - which are unique to a single resource within a package; or
     *   global-scoped - which can be assigned to multiple resources within a package and across
     *     packages
     *
     * The resource public id is assumed to be package-scoped if a package is provided, and
     * global-scoped if not.
     *
     * For devices and devtools, both device/devtool public ids and aliases are supported.
     */
    private lookupNodesOnResourcePublicId;
    /**
     * Get resource's nodes
     *
     * @param resourceId - the resource's id
     * @param filters - filters to apply
     * {
     *     compiler : compiler name
     *     resourceClass : resource class
     *     ide : ide
     *     kernel : kernel
     *     language : language
     *     os : os
     *     search : search strings, as an array of arrays, with the inner arrays OR'd,
     *         and their individual strings AND'd
     * }
     * @returns node ids
     */
    getNodesOnResource(resourceId: number, filters: Omit<Filters, 'deviceId' | 'devtoolId'>): Promise<number[]>;
    /**
     * Get board, device, and keyword filter suggestions matching the given search string.
     *
     * @param search - the search string
     * @param options
     *   maxTotal            - maximum number of total suggestions to return
     *   maxBoardsAndDevices - maximum number of total board and device suggestions
     *
     * @returns search suggestions for boards, devices, and keywords
     */
    getSearchSuggestions(search: string, packageGroupIds?: number[], options?: {
        maxTotal: number;
        maxBoardsAndDevices: number;
    }): Promise<string[]>;
    /**
     * Get the children of the given foundation node, and the heads of their package subtree,
     * filtered on the given given package groups.
     */
    getChildrenAndSubtreeHeads(node: TopNode, packageGroupIds: number[]): {
        child: TopNode;
        heads: TopNode[];
    }[];
    private addFoundationAndContentHeadChildren;
    /**
     * Return the Content Head Nodes of the given node (either on the node itself or a
     * descendant), that belong to the given Package Groups.
     */
    private getContentHeadsBelongingToPackageGroups;
    /**
     * Get SQL clauses for querying on nodes in the given package groups and restricted to the
     * given filters
     *
     * @param filteredEntity - the targeted entity type that's being filtered
     * @param entityIdField - the id field name of the nodes to be filtered
     * @param forDescendantCount - true if SQL statement is node descendant count retrieval
     * @param filters - filters to apply to the nodes
     * @param packageGroupIds - ids of the selected package groups in the content view
     *
     * @returns {FilterSqlClauses}
     *
     * If multiple filters are specified, then conjunction is used in merging results (i.e.
     * they are AND'd). This also applies to multiple keywords in the search filter.
     *
     */
    buildFilterSqlClauses(filteredEntity: 'node' | 'resource', entityIdField: string | number, forDescendantCount: boolean, filters: Filters, packageGroupIds: number[]): Promise<FilterSqlClauses>;
    private createFilterWhereClauses;
    /**
     * Return the ids of the devices belonging to the devsets of the given package groups, that
     * have the same public id as that of the given device.
     *
     * Necessary because there may be multiple devsets in a content view (since its package groups
     * can have different devsets), and the same device needs to work across all of them.
     *
     * @param deviceId
     */
    private getPackageGroupDeviceIds;
    /**
     * Return the ids of the devtools belonging to the devsets of the given package groups, that
     * have the same public id as that of the given devtool.
     *
     * Necessary because there may be multiple devsets in a content view (since its package groups
     * can have different devsets), and the same devtool needs to work across all of them.
     *
     * @param devtoolId
     */
    private getPackageGroupDevtoolIds;
    /**
     * Return the package group id of the given node
     */
    private getNodePackageGroupId;
    /**
     * Get foundation nodes
     */
    getFoundationNodes(): Promise<{
        [key: number]: TopNode;
    }>;
    /**
     * Get root node
     */
    getRootNode(): Promise<TopNode>;
    nodeToPresentationNode(node: TopNode | NestedPackageOverviewNode): PresentationNode;
    nodeToPackageTreeNode(node: TopNode | NestedPackageOverviewNode): PackageTreeNode;
}
type PresentationNodeRow = Pick<NodeRow, 'id' | 'public_id_w0' | 'public_id_w1' | 'name' | 'content_source_id' | 'is_leaf' | 'resource_type' | 'file_type' | 'package_id' | 'link_ext' | 'link_type' | 'icon' | 'short_descr' | 'view_limitations' | 'readme_public_id_w0' | 'readme_public_id_w1'>;
export declare function rowToPresentationNode(row: PresentationNodeRow): PresentationNode;
export interface TopNode extends DbNode {
    descendantContentHeads: TopNode[];
    children: TopNode[];
    nestedPackageOverviews: NestedPackageOverviewNode[];
    parent: TopNode | null;
    packageGroupPublicId: string | null;
    packageGroupVersion: string | null;
    packagePublicId: string | null;
    packageVersion: string | null;
    packageRestrictions: string | null;
}
interface NestedPackageOverviewNode extends DbNode {
    packageGroupPublicId: string | null;
    packageGroupVersion: string | null;
    packagePublicId: string | null;
    packageVersion: string | null;
    packageRestrictions: string | null;
}
export {};
