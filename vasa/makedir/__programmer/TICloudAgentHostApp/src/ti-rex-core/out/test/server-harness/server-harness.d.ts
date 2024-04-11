import { DatabaseResponse } from '../../shared/routes/database-response';
import { ServerFilterQuery, FilterData } from '../../frontend/apis/filter-types';
import { Response } from '../../shared/routes/request-response';
import { Nodes, PackageData, PackageGroupData, TableView, Kernel, Compiler } from '../../shared/routes/response-data';
import { NodesHarness, TableItemHarness, ServerDataInput } from './initialize-server-harness-data';
import { Omit } from '../../shared/generic-types';
import { Mode } from '../../lib/appConfig';
import { ProjectType } from '../../cloudagent/ccs-adapter';
export interface ServerData {
    filterData: FilterData.Options;
    packages: PackageData[];
    packageGroups: PackageGroupData[];
    rootNode: string;
    softwareNodePublicId: string;
    hierarchy: ServerDataInput.Hierarchy;
    nodeData: {
        [id: string]: Nodes.Node;
    };
    nodeDataExtended: {
        [id: string]: Nodes.NodeExtended;
    };
    nodeFilterData: {
        [id: string]: NodesHarness.NodeFilterData;
    };
    tableItemData: {
        [id: string]: TableView.TableItem;
    };
    tableItemFilterData: {
        [id: string]: TableItemHarness.TableItemFilterData;
    };
    tableItemHierarchy: ServerDataInput.TableItemHierarchy;
    sessionId: string;
    rex3Links: {
        [link: string]: string;
    };
}
interface GetNodesParams {
    ids: string[];
    data: ServerData;
}
interface GetNodesExtendedParams {
    id: string;
    data: ServerData;
}
interface GetFilteredChildrenNodeIdsParams {
    parentIds: string[];
    data: ServerData;
    filter: ServerFilterQuery.Params;
}
interface GetExpandedFilteredDescendantNodesDataParams {
    parentId: string;
    data: ServerData;
    filter: ServerFilterQuery.Params;
}
interface GetFilteredTableItemsData {
    parentNodeDbId: string;
    data: ServerData;
    filter: ServerFilterQuery.Params;
}
interface GetNodeDataForTableItemVariant {
    tableItemDbId: string;
    variantCompiler: Compiler;
    variantKernel: Kernel;
    data: ServerData;
}
interface GetSearchSuggestionsParams {
    data: ServerData;
    filter: Omit<ServerFilterQuery.Params, 'filterSearch'>;
    text: string;
}
interface GetNodeDownloadParams {
    data: ServerData;
    dbId: string;
}
interface GetImportProjectParams {
    data: ServerData;
    location: string;
    projectType: ProjectType;
    targetId?: string;
    projectName?: string;
}
interface GetImportInfoParams {
    id: string;
    data: ServerData;
    filter: ServerFilterQuery.Params;
}
interface GetServerConfigParams {
    data: ServerData;
}
interface GetRootNodeParams {
    data: ServerData;
}
interface GetPackagesParams {
    data: ServerData;
}
interface GetPackageGroupsParams {
    data: ServerData;
}
interface GetFilterOptionsParams {
    data: ServerData;
}
interface GetNodePublicIdToDbIdParams {
    nodePublicId: string;
    packageGroupPublicUid: string | null;
    data: ServerData;
}
interface GetRex3LinkToDbIdParams {
    linkField: string;
    data: ServerData;
}
export declare class ServerHarness {
    private readonly mode;
    private readonly role;
    constructor({ mode, role }: {
        mode: Mode;
        role: string;
    });
    getNodes({ ids, data }: GetNodesParams): DatabaseResponse<Response.NodesData>;
    getNodesExtended({ id, data }: GetNodesExtendedParams): DatabaseResponse<Response.NodeExtendedData>;
    getFilteredChildrenNodeIds({ parentIds, data, filter }: GetFilteredChildrenNodeIdsParams): DatabaseResponse<Response.FilteredChildrenNodeIds>;
    getExpandedFilteredDescendantNodesData({ parentId, data, filter }: GetExpandedFilteredDescendantNodesDataParams): DatabaseResponse<Response.ExpandedFilteredDescendantNodesData>;
    getFilteredTableItemsData({ parentNodeDbId, data, filter }: GetFilteredTableItemsData): DatabaseResponse<Response.FilteredTableItemsData>;
    getNodeDataForTableItemVariant({ tableItemDbId, variantCompiler, variantKernel, data }: GetNodeDataForTableItemVariant): DatabaseResponse<Response.NodesData>;
    getSearchSuggestions({ text, data }: GetSearchSuggestionsParams): DatabaseResponse<Response.SearchSugestionsData>;
    getNodeDownload({}: GetNodeDownloadParams): DatabaseResponse<Response.DownloadNodeInfoData>;
    getImportProject({}: GetImportProjectParams): DatabaseResponse<Response.ImportInfoData>;
    getImportInfo({ id, data, filter }: GetImportInfoParams): DatabaseResponse<Response.ImportInfoData>;
    getServerConfig({ data }: GetServerConfigParams): DatabaseResponse<Response.ServerConfigData>;
    getRootNode({ data }: GetRootNodeParams): DatabaseResponse<Response.RootNodeData>;
    getPackages({ data }: GetPackagesParams): DatabaseResponse<Response.PackagesData>;
    getPackageGroups({ data }: GetPackageGroupsParams): DatabaseResponse<Response.PackageGroupsData>;
    getFilterOptions({ data }: GetFilterOptionsParams): DatabaseResponse<Response.FilterOptionsData>;
    getNodePublicIdToDbId({ nodePublicId, packageGroupPublicUid, data }: GetNodePublicIdToDbIdParams): DatabaseResponse<string>;
    getRex3LinkToDbId({ linkField, data }: GetRex3LinkToDbIdParams): DatabaseResponse<string>;
    private getSingleNodePath;
    private static asPayload;
    private static isValidArrayParam;
    /**
     * Filter the node.
     * It passes the filter if it or one of it's descendants is the correct node type.
     *
     * @param id
     * @param nodeTypes
     * @param data
     *
     * @returns passesFilter
     */
    private static filterNode;
    private static filterTableItem;
    private static passesFilter;
}
export {};
