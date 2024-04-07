import { ApisCacheInterface } from './apis-cache-interface';
import { ServerFilterQuery, GlobalResourceIdUrlQuery, PackageScopedResourceIdUrlQuery } from './filter-types';
import { Response } from '../../shared/routes/request-response';
import { ServerInterface } from './server-interface';
import { TableView, PackageData } from '../../shared/routes/response-data';
import { LocalAPIs } from './local-apis';
import { OfflineBoardsAndDevices } from '../component-helpers/entry-point-helpers';
export declare class APIsInternal {
    private serverInterface;
    private cacheInterface;
    private counter;
    initOffline(localApis: LocalAPIs, offlineDevices: OfflineBoardsAndDevices): void;
    getNodes(ids: string[]): Promise<import("../../shared/routes/response-data").Nodes.Node[]>;
    getExtendedNodes(id: string): Promise<Readonly<import("../../shared/routes/response-data").Nodes.LeafNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderWithResourceNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.PackageFolderNodeExtended>>;
    getFilteredChildrenNodes(parentIds: string[], query: ServerFilterQuery.Params): Promise<import("../../shared/routes/response-data").Nodes.Node[][]>;
    getFilteredTableItems(parentId: string, query: ServerFilterQuery.Params, isProjectWizard: boolean): Promise<TableView.TableItem[]>;
    getNodeDataForTableItemVariant(tableItemId: string, query: ServerFilterQuery.Params, variant: TableView.TableItemVariant): Promise<Readonly<import("../../shared/routes/response-data").Nodes.LeafNode> | Readonly<import("../../shared/routes/response-data").Nodes.FolderNode> | Readonly<import("../../shared/routes/response-data").Nodes.FolderWithResourceNode> | Readonly<import("../../shared/routes/response-data").Nodes.PackageFolderNode>>;
    getTableViewFilters(parentId: string, query: ServerFilterQuery.Params, isProjectWizard: boolean): Promise<import("../../lib/dbBuilder/dbTypes").AvailableTableViewFilters>;
    /**
     * Call this when the user expands a node.
     * This will prefetch data from the server to avoid unnecessary round trips while auto expanding.
     *
     * @param id
     * @param query
     *
     * @returns {Promise} (void)
     */
    expandNode(id: string, query: ServerFilterQuery.Params): Promise<void>;
    getSearchSugestions(text: string, query: ServerFilterQuery.Params): Promise<Response.SearchSugestionsData>;
    getImportInfo(id: string, query: ServerFilterQuery.Params): Promise<Response.ImportInfoData>;
    getCustomPackageDownload(packages: string[], zipFilePrefix: string): Promise<Response.CustomPackageDownloadData>;
    getCustomPackageDownloadStatus(requestToken: string): Promise<Response.CustomPackageDownloadStatusData>;
    getPackages(): Promise<PackageData[]>;
    getPackageGroups(): Promise<import("./filter-types").PackageGroupData[]>;
    getFilterOptions(): Promise<import("./filter-types").FilterData.Options>;
    getNodeInfoForResourceId(query: PackageScopedResourceIdUrlQuery): Promise<Response.NodeInfoForResourceIdData>;
    getNodeInfoForGlobalId(query: GlobalResourceIdUrlQuery): Promise<Response.NodeInfoForResourceIdData>;
    getNodeDbId(nodePublicId: string, packageGroupPublicUid: string | null, packagePublicId: string | null, isLatest: boolean): Promise<string>;
    getRex3LinkToDbId(link: string): Promise<string>;
    getSearchResultsPage({ textSearch, pageNum, resultsPerPage, hiddenQuery }: {
        textSearch: string;
        pageNum: number;
        resultsPerPage: number;
        hiddenQuery: string[];
    }): Promise<import("../component-helpers/util").GoogleSearchResultPage>;
    _getServerInterface(): ServerInterface;
    _getCacheInterface(): ApisCacheInterface;
    /**
     * Wraps promise with shared/util.measureTime method if the DEBUG flag is set
     *
     * @param promise
     * @param label
     *
     * @returns {Promise} result
     */
    private static measureTime;
    /**
     * Get the nodes data for the children.
     *
     * @param childrenNodeIds
     *
     * @returns {Promise} childrenNodesData
     */
    private getChildrenNodesData;
    /**
     * Get the filtered children nodes for the parents which do not have
     * the mapping parentId -> filteredChildrenNodeIds in cache.
     *
     * @param missingParentIds
     * @param query
     *
     * @returns {Promise} missingFilteredChildrenNodes
     */
    private getMissingFilteredChildrenNodes;
    /**
     * Call the server to get the filteredChildrenNodeIds.
     * Fill the caches with the responses.
     *
     * @param parentIds
     * @param query
     * @param cacheKeys
     *
     * @returns {Promise} filteredChildrenNodeIds
     */
    private getFilteredChildrenNodeIds;
    /**
     * Fill the caches with the result
     *
     * @param result
     * @param cacheKey
     * @param query
     */
    private expandNodeFillCaches;
    private getCacheKeyForTableItemVariant;
    private isPackageAnAlias;
}
export declare const _PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY = "placeholder";
export declare const _PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY = "placeholder2";
