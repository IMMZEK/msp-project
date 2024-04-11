import { APIControl } from './api-control';
import { BrowserUrlQuery, PackageScopedResourceIdUrlQuery, GlobalResourceIdUrlQuery } from './filter-types';
import { TableView } from '../../shared/routes/response-data';
import { LocalAPIs } from './local-apis';
import { OfflineBoardsAndDevices } from '../component-helpers/entry-point-helpers';
export declare class APIs {
    private apiControl;
    private apisInternal;
    private counter;
    initOffline(localApis: LocalAPIs, offlineDevices: OfflineBoardsAndDevices): void;
    getNodes(ids: string[], masterName?: string): Promise<import("../../shared/routes/response-data").Nodes.Node[]>;
    getExtendedNodes(id: string, masterName?: string): Promise<Readonly<import("../../shared/routes/response-data").Nodes.LeafNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderWithResourceNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.PackageFolderNodeExtended>>;
    getFilteredChildrenNodes(parentIds: string[], urlQuery: BrowserUrlQuery.Params, masterName?: string): Promise<import("../../shared/routes/response-data").Nodes.Node[][]>;
    getFilteredTableItems(parentId: string, urlQuery: BrowserUrlQuery.Params, isProjectWizard: boolean, masterName?: string): Promise<TableView.TableItem[]>;
    getNodeDataForTableItemVariant(tableItemId: string, urlQuery: BrowserUrlQuery.Params, variant: TableView.TableItemVariant, masterName?: string): Promise<Readonly<import("../../shared/routes/response-data").Nodes.LeafNode> | Readonly<import("../../shared/routes/response-data").Nodes.FolderNode> | Readonly<import("../../shared/routes/response-data").Nodes.FolderWithResourceNode> | Readonly<import("../../shared/routes/response-data").Nodes.PackageFolderNode>>;
    getTableViewFilters(parentId: string, urlQuery: BrowserUrlQuery.Params, isProjectWizard: boolean, masterName?: string): Promise<import("../../lib/dbBuilder/dbTypes").AvailableTableViewFilters>;
    expandNode(id: string, urlQuery: BrowserUrlQuery.Params, masterName?: string): Promise<void>;
    getSearchSuggestions(text: string, urlQuery: BrowserUrlQuery.Params, masterName?: string): Promise<import("../../shared/routes/request-response").Response.SearchSugestionsData>;
    getImportInfo(id: string, urlQuery: BrowserUrlQuery.Params, masterName?: string): Promise<import("../../shared/routes/request-response").Response.ImportInfoData>;
    getCustomPackageDownload(packages: string[], zipFilePrefix: string, masterName?: string): Promise<import("../../shared/routes/request-response").Response.CustomPackageDownloadData>;
    getCustomPackageDownloadStatus(requestToken: string, masterName?: string): Promise<import("../../shared/routes/request-response").Response.CustomPackageDownloadStatusData>;
    getPackages(masterName?: string): Promise<import("./filter-types").PackageData[]>;
    getPackageGroups(masterName?: string): Promise<import("./filter-types").PackageGroupData[]>;
    getFilterOptions(masterName?: string): Promise<import("./filter-types").FilterData.Options>;
    getNodeInfoForResourceId(query: PackageScopedResourceIdUrlQuery, masterName?: string): Promise<import("../../shared/routes/request-response").Response.NodeInfoForResourceIdData>;
    getNodeInfoForGlobalId(query: GlobalResourceIdUrlQuery, masterName?: string): Promise<import("../../shared/routes/request-response").Response.NodeInfoForResourceIdData>;
    getNodeDbId(nodePublicId: string, packageGroupPublicUid: string | null, packagePublicId: string | null, isLatest: boolean, masterName?: string): Promise<string>;
    getRex3LinkToDbId(link: string, masterName?: string): Promise<string>;
    getSearchResultsPage({ textSearch, pageNum, resultsPerPage, hiddenQuery, masterName }: {
        textSearch: string;
        pageNum: number;
        resultsPerPage: number;
        hiddenQuery: string[];
        masterName?: string;
    }): Promise<import("../component-helpers/util").GoogleSearchResultPage>;
    getAPIControl(): APIControl;
    _getServerInterface(): import("./server-interface").ServerInterface;
    _getCacheInterface(): import("./apis-cache-interface").ApisCacheInterface;
    private static measureTime;
    private apiWithFilterQuery;
    private apiNoQuery;
    /**
     * Register a tasks to be processed. If another master has control your
     * request will only be processed once it is finished.
     *
     */
    private registerTask;
}
