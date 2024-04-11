/// <reference types="lodash" />
import { ServerFilterQuery } from './filter-types';
import { Nodes, FilterData, PackageData, PackageGroupData, TableView } from '../../shared/routes/response-data';
import { Response } from '../../shared/routes/request-response';
import { GoogleSearchResultPage } from '../component-helpers/util';
import { AvailableTableViewFilters } from '../../lib/dbBuilder/dbTypes';
export declare class ApisCacheInterface {
    private static readonly FILTER_OPTIONS_KEY;
    private static readonly PACKAGES_KEY;
    private static readonly PACKAGE_GROUPS_KEY;
    private static readonly DATA_CACHE_SIZE;
    private static readonly MINOR_DATA_SIZE;
    private static readonly RELATION_CACHE_SIZE;
    private nodesDataCache;
    private extendedNodesDataCache;
    private filterOptionsCache;
    private searchSugestionsCache;
    private packagesCache;
    private packageGroupsCache;
    private importInfoCache;
    private tableItemDataCache;
    private tableViewFiltersDataCache;
    private searchResultsPageCache;
    private nodeInfoForLandingPageId;
    private filteredChildrenNodeIdsCache;
    private filteredDescendentNodeIdsCache;
    private nodeDbIdCache;
    private rex3LinkToDbIdCache;
    private filteredChildrenTableItemIdsCache;
    private nodeDbIdForTableItemVariantCache;
    static getUrlQueryCacheKeys(ids: string[], query: ServerFilterQuery.Params): import("lodash").Dictionary<string>;
    static urlQueryCacheKey(id: string, query: ServerFilterQuery.Params): string;
    clearCache(): void;
    _clearFilteredDescendentNodeIdsCache(): void;
    _clearNodesDataCache(): void;
    getNodesData(id: string): Nodes.Node | null;
    getNodesDataBulk(ids: string[]): {
        nodesData: import("lodash").Dictionary<Nodes.Node>;
        missingIds: string[];
    };
    getExtendedNodesData(id: string): Nodes.NodeExtended | null;
    getExtendedNodesDataBulk(ids: string[]): {
        extendedNodesData: import("lodash").Dictionary<Nodes.NodeExtended>;
        missingIds: string[];
    };
    getFilteredChildrenNodeIds(cacheKey: string): string[] | null;
    getFilteredChildrenNodeIdsBulk(parentIds: string[], query: ServerFilterQuery.Params): {
        filteredChildrenNodeIds: import("lodash").Dictionary<string[]>;
        missingIds: string[];
    };
    getFilteredDescendentNodeIds(cacheKey: string): string[] | null;
    getSearchSugestions(cacheKey: string): Response.SearchSugestionsData | null;
    getImportInfo(cacheKey: string): Response.ImportInfoData | null;
    getPackages(): PackageData[] | null;
    getPackageGroups(): PackageGroupData[] | null;
    getFilterOptions(): FilterData.Options | null;
    getNodeDbId({ nodePublicId, packageGroupPublicUid, packagePublicId, isLatest }: {
        nodePublicId: string;
        packageGroupPublicUid: string;
        packagePublicId: string;
        isLatest: boolean;
    }): string | null;
    getRex3LinkToDbId(link: string): string | null;
    getTableItemData(tableItemId: string): TableView.TableItem | null;
    getTableViewFiltersData(cacheKey: string): AvailableTableViewFilters | null;
    getSearchResultsPage(cacheKey: string): GoogleSearchResultPage | null;
    getNodeInfoForId(cacheKey: string): Response.NodeInfoForResourceIdData | null;
    getFilterChildrenTableItemIds(cacheKey: string): string[] | null;
    getNodeDbIdForTableItemVariant(cacheKey: string): string | null;
    setNode(nodes: Nodes.Node): Nodes.Node;
    setNodes(nodes: Nodes.Node[]): Nodes.Node[];
    setNodeExtended(nodes: Nodes.NodeExtended): Nodes.NodeExtended;
    setNodesExtended(nodes: Nodes.NodeExtended[]): void[];
    setFilteredChildrenNodeIds(cacheKey: string, childrenIds: string[]): string[];
    setFilteredDescendentNodeIds(cacheKey: string, childrenIds: string[]): string[];
    setSearchSuggestions(cacheKey: string, suggestions: string[]): Response.SearchSugestionsData;
    setImportInfo(cacheKey: string, info: Response.ImportInfoData): Response.ImportInfoData;
    setPackages(packages: PackageData[]): PackageData[];
    setPackageGroups(packageGroups: PackageGroupData[]): PackageGroupData[];
    setFilterOptions(filterOptions: FilterData.Options): FilterData.Options;
    setNodeDbId({ nodeDbId, nodePublicId, packagePublicId, packageGroupPublicUid, isLatest }: {
        nodeDbId: string;
        nodePublicId: string;
        packagePublicId: string;
        packageGroupPublicUid: string;
        isLatest: boolean;
    }): string;
    setRex3LinkToDbId({ rex3Link, dbId }: {
        rex3Link: string;
        dbId: string;
    }): string;
    setTableItems(tableItems: TableView.TableItem[]): TableView.TableItem[];
    setTableViewFiltersData(cacheKey: string, data: AvailableTableViewFilters): AvailableTableViewFilters;
    setSearchResultsPage(cacheKey: string, page: GoogleSearchResultPage): GoogleSearchResultPage;
    setNodeInfoForId(cacheKey: string, result: Response.NodeInfoForResourceIdData): Response.NodeInfoForResourceIdData;
    setFilteredChildrenTableItemIds(cacheKey: string, tableItemIds: string[]): string[];
    setNodeDbIdForTableItemVariant({ cacheKey, nodeDbId }: {
        cacheKey: string;
        nodeDbId: string;
    }): string;
    private static getBulk;
    private _setNodesExtended;
    private _setNodes;
    private getNodeDbIdCacheKey;
}
