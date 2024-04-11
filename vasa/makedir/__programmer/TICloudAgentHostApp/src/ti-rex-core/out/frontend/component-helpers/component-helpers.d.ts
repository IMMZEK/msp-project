import { History } from 'history';
import { APIs } from '../apis/apis';
import { UpdatedFilterItems, BrowserUrlQuery } from '../apis/filter-types';
import { Nodes, PackageGroupData } from '../../shared/routes/response-data';
import { AppProps } from './util';
/**
 * Simplifies interacting with props and other helper files in this folder. Focus is on common patterns.
 *
 */
/**
 * Get the node and node extended data for a node, return null if the node does not exist
 *
 * @param id
 * @param apis
 * @param masterName
 *
 * @returns nodeData
 */
export declare function getNodeData(id: string | null, apis: APIs, masterName?: string): Promise<{
    node: Nodes.Node;
    nodeExtended: Readonly<Nodes.LeafNodeExtended> | Readonly<Nodes.FolderNodeExtended> | Readonly<Nodes.FolderWithResourceNodeExtended> | Readonly<Nodes.PackageFolderNodeExtended>;
} | null>;
export declare function getNodePackageAndGroupData(node: Nodes.PackageFolderNode, appProps: AppProps): {
    groupData: PackageGroupData;
    packageData: import("../apis/filter-types").PackageData;
};
/**
 * Get the node name and package version, return node name if package version does not exist
 *
 * @param appProps
 * @param node
 *
 * @returns string
 */
export declare function getNodeLabel(appProps: AppProps, node: Nodes.Node): string;
/**
 * Get some useful lists of groups based on appProps. This list holds
 * - selectedGroups: the list of selected groups based on the urlQuery (sorted)
 * - unSelectedGroups: the list of un-selected groups based on the urlQuery (sorted)
 * - latestGroups: this list of groups with the highest version for each group (sorted)
 *
 * Note this function and it's helpers assumes appProps.packageGroups is grouped by
 * groupId and sorted in descending version order.
 *
 * @param appProps
 *
 * @returns groupLists
 */
export declare function getPackageGroupsLists(appProps: AppProps): {
    selectedGroups: PackageGroupData[];
    unSelectedGroups: PackageGroupData[];
    latestGroups: {
        [packageGroupPublicId: string]: string;
    };
};
/**
 * Update the filter; along with the url.
 * Note: to delete a key from the filter set the value of an updatedItem to null.
 *
 */
export declare function updateFilter(updatedItems: UpdatedFilterItems, urlQuery: BrowserUrlQuery.Params, history: History): void;
