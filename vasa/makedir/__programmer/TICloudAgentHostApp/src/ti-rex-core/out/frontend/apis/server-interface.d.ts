import { ServerFilterQuery, PackageScopedResourceIdUrlQuery, GlobalResourceIdUrlQuery } from './filter-types';
import { Response } from '../../shared/routes/request-response';
import { Compiler, FilterData, TableView } from '../../shared/routes/response-data';
import { GoogleSearchResultPage } from '../component-helpers/util';
import type { IDEToolchain } from '../../cloudagent/ccs-theia-request';
import { LocalAPIs } from './local-apis';
import { OfflineBoardsAndDevices } from '../component-helpers/entry-point-helpers';
export declare class ServerInterface {
    private lastSessionId;
    private nodesDataPromises;
    private extendedNodesDataPromises;
    private filteredChildrenNodesPromises;
    private filteredTableItemsDataPromises;
    private nodeDataForTableItemVariantPromises;
    private tableViewFiltersPromises;
    private expandedFilteredDescendantNodesDataPromises;
    private searchSuggestionsPromises;
    private importInfoPromises;
    private customPackageDownloadPromises;
    private customPackageDownloadStatusPromises;
    private packagesPromises;
    private packageGroupsPromises;
    private filterOptionsPromises;
    private nodePublicIdToDbIdPromises;
    private rex3LinkToDbIdPromises;
    private searchResultsPagePromises;
    private nodeInfoForResourceIdPromises;
    private nodeInfoForGlobalIdPromises;
    private localApis;
    private offlineBoardsAndDevices;
    initOffline(localApis: LocalAPIs, offlineDevices: OfflineBoardsAndDevices): void;
    getNodesData(ids: string[]): Promise<Response.NodesData>;
    getExtendedNodesData(id: string): Promise<Response.NodeExtendedData>;
    getFilteredChildrenNodeIds(parentIds: string[], query: ServerFilterQuery.Params): Promise<Response.FilteredChildrenNodeIds>;
    getExpandedFilteredDescendantNodesData(parentId: string, query: ServerFilterQuery.Params): Promise<Response.ExpandedFilteredDescendantNodesData>;
    getFilteredTableItemsData(parentId: string, query: ServerFilterQuery.Params, isProjectWizard: boolean): Promise<Response.FilteredTableItemsData>;
    getTableViewFilters(parentId: string, query: ServerFilterQuery.Params, isProjectWizard: boolean): Promise<Response.TableViewFiltersData>;
    getNodeDataForTableItemVariant(tableItemDbId: string, query: ServerFilterQuery.Params, variant: TableView.TableItemVariant): Promise<Response.NodesData>;
    getSearchSuggestions(text: string, query: ServerFilterQuery.Params): Promise<Response.SearchSugestionsData>;
    getImportInfo(id: string, query: ServerFilterQuery.Params): Promise<Response.ImportInfoData>;
    getCustomPackageDownload(packages: string[], zipFilePrefix: string): Promise<Response.CustomPackageDownloadData>;
    getCustomPackageDownloadStatus(requestToken: string): Promise<Response.CustomPackageDownloadStatusData>;
    getPackages(): Promise<Response.PackagesData>;
    getPackageGroups(): Promise<Response.PackageGroupsData>;
    getFilterOptions(): Promise<FilterData.Options>;
    getNodeInfoForResourceId({ resourceId, packageId, packageVersion, device, devtool }: PackageScopedResourceIdUrlQuery): Promise<Response.NodeInfoForResourceIdData>;
    getNodeInfoForGlobalId({ globalId, device, devtool }: GlobalResourceIdUrlQuery): Promise<Response.NodeInfoForGlobalIdData>;
    getNodePublicIdToDbId(nodePublicId: string, packageGroupPublicUid: string | null, packagePublicId: string | null, isLatest: boolean): Promise<string>;
    getRex3LinkToDbId(linkField: string): Promise<string>;
    getSearchResultsPage({ textSearch, pageNum, resultsPerPage, hiddenQuery }: {
        textSearch: string;
        pageNum: number;
        resultsPerPage: number;
        hiddenQuery: string[];
    }): Promise<GoogleSearchResultPage>;
    /**
     * Do an ajax.get on the url.
     * Ensures there isn't an identical request outgoing using the promise tracker.
     * Return the registered promise.
     *
     * @param urls
     * @param promiseTracker
     *
     * @returns {Promise} registeredPromise
     */
    private getFromUrl;
    private getDevicePublicIdFromQueryOffline;
    private toolVersionsToToolchains;
}
export declare function toolVersionToToolchain(toolVersion: string): IDEToolchain;
export declare const toolchainToCompiler: {
    [toolchain in IDEToolchain]: Exclude<Compiler, 'iar'>;
};
