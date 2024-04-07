import { Db } from './db/db';
import { ResourceType, LinkType, ViewLimitation, Compiler, Kernel, AvailableTableViewFilters } from '../lib/dbBuilder/dbTypes';
import { Tree, Filters, PresentationNode } from './tree';
export interface TableViewItem {
    id: number;
    name: string;
    resourceType: ResourceType;
    subClass: string;
    fileType?: string;
    linkExt?: string;
    linkType?: LinkType;
    icon?: string;
    shortDescription?: string;
    viewLimitations?: ViewLimitation[];
    packageId?: number;
    categoryContext?: string;
    hasReadme: boolean;
    hasChildren: boolean;
    variants: {
        compiler: Compiler;
        kernel: Kernel;
    }[];
}
export type TableViewFilters = Filters;
export type DevFilters = Pick<Filters, 'devtoolId' | 'deviceId'>;
export declare class TableViews {
    private readonly db;
    private readonly tree;
    private readonly mysql;
    constructor(db: Db, dinfraLibPath: string, tree: Tree);
    /**
     * Get table view items for the given node, package groups, device/devtool and filters.
     *
     * NOTE: Package groups are ignored if node is within a package.
     *
     * @param nodeId - node id, defaults to root if undefined
     * @param packageGroupIds - package group to filter items on
     * @param filters - table view filters, must include a device or devtool
     *
     * @returns table view rows
     */
    getTableView(nodeId: number | undefined, packageGroupIds: number[], filters: TableViewFilters): Promise<TableViewItem[]>;
    /**
     * Get available table view filters for the given node, package groups, device/devtool and
     * selected filters.
     *
     * NOTE: Package groups are ignored if node is within a package.
     *
     * @param nodeId - node id, defaults to root if undefined
     * @param packageGroupIds - package group to filter on
     * @param filters - table view filter, must include a device or devtool
     *
     * @returns available filters
     */
    getAvailableTableViewFilters(nodeId: number | undefined, packageGroupIds: number[], filters: TableViewFilters): Promise<AvailableTableViewFilters>;
    /**
     * Get node for the given table view group, device/devtool, and variant.
     *
     * @param tableViewGroupId -- id of table view group
     * @param dev - id of device or devtool
     * @param variant - the variant
     *
     * @returns table view node
     */
    getNode(tableViewItemId: number, dev: {
        deviceId?: number;
        devtoolId?: number;
    }, variant: {
        compiler?: Compiler;
        kernel?: Kernel;
    }): Promise<PresentationNode | undefined>;
    /**
     * Retrieve the package subtree head nodes that are descendants of the given foundation node,
     * belong to the given package groups and that contain resource groups assigned the given
     * device/devtool.
     *
     * @param foundationNode - foundation node
     * @param packageGroupIds - package groups ids to filter on
     * @param devFilters - device or devtool id to filter on
     * @returns
     */
    private getHeadNodesWithResourceGroups;
    /**
     * Retrieve the id of the given node's package group.
     */
    private getNodePackageGroupId;
    private getTableViewItemsOnPackageNode;
    private getAvailableTableViewFiltersOnPackageNode;
}
