import * as React from 'react';
import { BrowserUrlQuery, PackageScopedResourceIdUrlQuery, GlobalResourceIdUrlQuery } from '../apis/filter-types';
import { ErrorContextValue } from './context';
import { APIs } from '../apis/apis';
import { TableView } from '../../shared/routes/response-data';
import { Page } from '../../shared/routes/page';
interface UseApisBaseParams {
    apis: APIs;
    errorCallback: React.RefObject<ErrorContextValue | null>;
    masterName?: string;
    trigger?: boolean;
    manageControl?: boolean;
}
interface UseApiParams<T> extends UseApisBaseParams {
    api: () => Promise<T>;
    dependencies: React.DependencyList;
}
interface UseGetNodesParams extends UseApisBaseParams {
    ids: string[] | null;
}
interface UseGetExtendedNodesParams extends UseApisBaseParams {
    id: string | null;
}
interface UseGetFilteredChildrenNodesParams extends UseApisBaseParams {
    parentIds: string[];
    urlQuery: BrowserUrlQuery.Params;
}
interface UseGetFilteredTableItemsParams extends UseApisBaseParams {
    parentId: string;
    urlQuery: BrowserUrlQuery.Params;
    page: Page;
}
interface UseGetNodeDataForTableItemVariantParams extends UseApisBaseParams {
    id: string | null;
    urlQuery: BrowserUrlQuery.Params;
    variant: TableView.TableItemVariant | null;
}
interface UseGetTableViewFilters extends UseApisBaseParams {
    parentId: string | null;
    urlQuery: BrowserUrlQuery.Params;
    page: Page;
}
interface UseExpandNodeParams extends UseApisBaseParams {
    id: string | null;
    urlQuery: BrowserUrlQuery.Params;
}
interface UseGetSearchSuggestionsParams extends UseApisBaseParams {
    text: string;
    urlQuery: BrowserUrlQuery.Params;
}
interface UseGetImportInfoParams extends UseApisBaseParams {
    id: string;
    urlQuery: BrowserUrlQuery.Params;
}
interface UseGetCustomPackageDownloadParams extends UseApisBaseParams {
    packages: string[];
    zipFilePrefix: string;
}
interface UseGetCustomPackageDownloadStatusParams extends UseApisBaseParams {
    requestToken: string | null;
    progress: number;
}
type UseGetPackagesParams = UseApisBaseParams;
type UseGetPackageGroupsParams = UseApisBaseParams;
type UseGetFilterOptionsParams = UseApisBaseParams;
interface UseGetNodeInfoForResourceIdParams extends UseApisBaseParams {
    query: PackageScopedResourceIdUrlQuery;
}
interface UseGetNodeInfoForGlobalIdParams extends UseApisBaseParams {
    query: GlobalResourceIdUrlQuery;
}
interface UseGetNodeDbIdParams extends UseApisBaseParams {
    nodePublicId: string;
    packageGroupPublicUid: string | null;
    packagePublicId: string | null;
    isLatest: boolean;
}
interface UseGetRex3LinkToDbIdParams extends UseApisBaseParams {
    link: string;
}
interface UseGetSearchResultsPageParams extends UseApisBaseParams {
    textSearch: string | null;
    pageNum: number;
    resultsPerPage: number;
    hiddenQuery: string[];
}
export declare function useApi<T>(args: UseApiParams<T>): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: T | null;
};
export declare function useGetNodes(args: UseGetNodesParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../shared/routes/response-data").Nodes.Node[] | null;
};
export declare function useGetExtendedNodes(args: UseGetExtendedNodesParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: Readonly<import("../../shared/routes/response-data").Nodes.LeafNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderWithResourceNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.PackageFolderNodeExtended> | null;
};
export declare function useGetFilteredChildrenNodes(args: UseGetFilteredChildrenNodesParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../shared/routes/response-data").Nodes.Node[][] | null;
};
export declare function useGetFilteredTableItems(args: UseGetFilteredTableItemsParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: TableView.TableItem[] | null;
};
export declare function useGetNodeDataForTableItemVariant(args: UseGetNodeDataForTableItemVariantParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: Readonly<import("../../shared/routes/response-data").Nodes.LeafNode> | Readonly<import("../../shared/routes/response-data").Nodes.FolderNode> | Readonly<import("../../shared/routes/response-data").Nodes.FolderWithResourceNode> | Readonly<import("../../shared/routes/response-data").Nodes.PackageFolderNode> | null;
};
export declare function useGetTableViewFilters(args: UseGetTableViewFilters): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../lib/dbBuilder/dbTypes").AvailableTableViewFilters | null;
};
export declare function useExpandNode(args: UseExpandNodeParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: boolean | null;
};
export declare function useGetSearchSuggesgtions(args: UseGetSearchSuggestionsParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../shared/routes/request-response").Response.SearchSugestionsData | null;
};
export declare function useGetImportInfo(args: UseGetImportInfoParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../shared/routes/request-response").Response.ImportInfoData | null;
};
export declare function useGetCustomPackageDownload(args: UseGetCustomPackageDownloadParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../shared/routes/request-response").Response.CustomPackageDownloadData | null;
};
export declare function useGetCustomPackageDownloadStatus(args: UseGetCustomPackageDownloadStatusParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../shared/routes/request-response").Response.CustomPackageDownloadStatusData | null;
};
export declare function useGetPackages(args: UseGetPackagesParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../apis/filter-types").PackageData[] | null;
};
export declare function useGetPackageGroups(args: UseGetPackageGroupsParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../apis/filter-types").PackageGroupData[] | null;
};
export declare function useGetFilterOptions(args: UseGetFilterOptionsParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../apis/filter-types").FilterData.Options | null;
};
export declare function useGetNodeInfoForResourceId(args: UseGetNodeInfoForResourceIdParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../shared/routes/request-response").Response.NodeInfoForResourceIdData | null;
};
export declare function useGetNodeInfoForGlobalId(args: UseGetNodeInfoForGlobalIdParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../shared/routes/request-response").Response.NodeInfoForResourceIdData | null;
};
export declare function useGetNodeDbId(args: UseGetNodeDbIdParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: string | null;
};
export declare function useGetRex3LinkToDbId(args: UseGetRex3LinkToDbIdParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: string | null;
};
export declare function useGetSearchResultsPage(args: UseGetSearchResultsPageParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("./util").GoogleSearchResultPage | null;
};
export declare const _useApi: typeof useApi;
export {};
