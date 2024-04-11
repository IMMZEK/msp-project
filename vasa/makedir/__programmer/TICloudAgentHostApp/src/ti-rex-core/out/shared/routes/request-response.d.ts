/**
 * Type definitions for the server's HTTP API request & response format
 *
 */
import { Omit } from '../generic-types';
import { Nodes, FilterData, PackageData, PackageGroupData, DownloadInfo, TableView, Platform } from './response-data';
import { ServerConfig } from '../server-config';
import { Compiler, Kernel, LandingPageNodeInfo, AvailableTableViewFilters } from '../../lib/dbBuilder/dbTypes';
import { ProjectType } from '../../cloudagent/ccs-adapter';
export declare namespace Filter {
    type Compilers = string[];
    type Devices = string[];
    type Devtools = string[];
    type Ides = string[];
    type Kernels = string[];
    type Language = string[];
    type PackageGroups = string[];
    type ResourceClasses = string[];
    type Search = string;
    type Node = Nodes.NodeType[];
    interface Params {
        filterPackageGroup: PackageGroups;
        filterCompiler?: Compilers;
        filterDevice?: Devices;
        filterDevtool?: Devtools;
        filterIde?: Ides;
        filterKernel?: Kernels;
        filterLanguage?: Language;
        filterResourceClass?: ResourceClasses;
        filterSearch?: Search;
        filterNode?: Node;
    }
}
export declare namespace RequestQuery {
    export interface NodesData {
        dbId: string[];
    }
    export interface NodeExtendedData {
        dbId: string;
    }
    export interface FilteredChildrenNodeIds extends Filter.Params {
        parentDbId: string[];
    }
    export interface ExpandedFilteredDescendantNodesData extends Filter.Params {
        parentDbId: string;
    }
    export interface FilteredTableItemsData extends Filter.Params {
        parentDbId: string;
        isProjectWizard: boolean;
    }
    export interface TableViewFilters extends Filter.Params {
        parentDbId: string;
        isProjectWizard: boolean;
    }
    export interface NodeDataForTableItemVariant extends Filter.Params {
        tableItemDbId: string;
        variantCompiler: Compiler;
        variantKernel: Kernel;
    }
    export interface SearchSuggestions extends Omit<Filter.Params, 'filterSearch'> {
        text: string;
    }
    export interface NodeDownload {
        dbId: string;
    }
    export interface ImportProject {
        projectType: ProjectType;
        location: string;
        targetId?: string;
        projectName?: string;
    }
    export interface ImportInfo extends Filter.Params {
        dbId: string;
    }
    export interface PackageDownload {
        packageId: string;
        packageVersion: string;
    }
    export interface FileDownloadData {
        path: string;
    }
    export type FilesDownload = FileDownloadData[];
    export interface CustomPackageDownload {
        packages: string[];
        zipFilePrefix: string;
        platform?: Platform;
    }
    export interface CustomPackageDownloadStatus {
        requestToken: string;
    }
    export interface NodeInfoForResourceId {
        resourceId: string;
        packageId: string;
        packageVersion?: string;
        device?: string;
        devtool?: string;
    }
    export interface NodeInfoForGlobalId {
        globalId: string;
        device?: string;
        devtool?: string;
    }
    export const enum NodePublicIdToDbIdType {
        TO_DB_ID_NO_GROUP = "ToDbIdNoGroup",
        TO_DB_ID_GROUP_NOT_LATEST = "ToDbIdNotLatest",
        TO_DB_ID_GROUP_LATEST = "ToDbIdLatest"
    }
    interface NodePublicIdToDbIdNoGroup {
        nodePublicId: string;
        toDbIdType: NodePublicIdToDbIdType.TO_DB_ID_NO_GROUP;
    }
    interface NodePublicIdToDbIdGroupNotLatest {
        nodePublicId: string;
        packageGroupPublicUid: string;
        packagePublicId: string | null;
        toDbIdType: NodePublicIdToDbIdType.TO_DB_ID_GROUP_NOT_LATEST;
    }
    interface NodePublicIdToDbIdGroupLatest {
        nodePublicId: string;
        packageGroupPublicUid: string;
        packagePublicId: string | null;
        toDbIdType: NodePublicIdToDbIdType.TO_DB_ID_GROUP_LATEST;
    }
    export type NodePublicIdToDbId = NodePublicIdToDbIdNoGroup | NodePublicIdToDbIdGroupNotLatest | NodePublicIdToDbIdGroupLatest;
    export interface Rex3LinkToDbId {
        linkField: string;
    }
    export {};
}
export declare namespace RequestQueryInput {
    type ExpandedFilteredDescendantNodesData = RequestQuery.ExpandedFilteredDescendantNodesData;
    type FilteredTableItemsData = RequestQuery.FilteredTableItemsData;
    type TableViewFilters = RequestQuery.TableViewFilters;
    type NodeDataForTableItemVariant = RequestQuery.NodeDataForTableItemVariant;
    type NodeExtendedData = RequestQuery.NodeExtendedData;
    type NodeDownloadInfo = RequestQuery.NodeDownload;
    type ImportProject = RequestQuery.ImportProject;
    type ImportInfo = RequestQuery.ImportInfo;
    type PackageDownload = RequestQuery.PackageDownload;
    type CustomPackageDownload = RequestQuery.CustomPackageDownload;
    type CustomPackageDownloadStatus = RequestQuery.CustomPackageDownloadStatus;
    type SearchSuggestions = RequestQuery.SearchSuggestions;
    type NodeInfoForResourceId = RequestQuery.NodeInfoForResourceId;
    type NodeInfoForGlobalId = RequestQuery.NodeInfoForGlobalId;
    type NodePublicIdToToDbId = RequestQuery.NodePublicIdToDbId;
    type NodeDbIdRex3 = RequestQuery.Rex3LinkToDbId;
    interface FilteredChildrenNodeIds extends Filter.Params {
        parentDbId: string[] | string;
    }
    interface NodesData {
        dbId: string[] | string;
    }
}
export declare namespace Response {
    interface NodesData {
        dbIdToData: {
            [dbId: string]: Nodes.Node;
        };
    }
    interface NodeExtendedData {
        dbIdToChildExtData: {
            [dbId: string]: Nodes.NodeExtended;
        };
    }
    interface FilteredChildrenNodeIds {
        parentToChildDbId: {
            [parentdbId: string]: string[];
        };
    }
    interface FilteredTableItemsData {
        parentToChildDbId: {
            [parentdbId: string]: TableView.TableItem[];
        };
    }
    interface TableViewFiltersData {
        parentToTableFilters: {
            [parentDbId: string]: AvailableTableViewFilters;
        };
    }
    /**
     * Structure:
     *   {
     *      data: {
     *          <parent node id>: [ {child node 1.0}, { child node 1.1}, .. ],
     *          <child node 1.0 id>: [ {child node 1.0.0}, {child node 1.0.1} ],
     *          <child node 1.1 id>: [ {child node 1.1.0}, {child node 1.1.1} ],
     *          ...
     *          <child node 1.0.0 id>: [ {child node 1.0.0.0}, {child node 1.0.0.1} ],
     *          ...
     *      }
     *   }
     */
    interface ExpandedFilteredDescendantNodesData {
        parentToChildData: {
            [dbId: string]: Nodes.Node[];
        };
    }
    type FilterOptionsData = FilterData.Options;
    type RootNodeData = string;
    type SearchSugestionsData = string[];
    type PackagesData = PackageData[];
    type PackageGroupsData = PackageGroupData[];
    type ImportProjectData = string;
    interface ImportInfoData {
        projectType: ProjectType;
        targets: string[];
        location: string;
    }
    type DownloadNodeInfoData = DownloadInfo;
    type DownloadPackageInfoData = DownloadInfo;
    type CustomPackageDownloadData = {
        requestToken: string;
        downloadUrl: string | null;
    };
    type CustomPackageDownloadStatusData = {
        downloadUrl: string | null;
    };
    type NodeInfoForResourceIdData = LandingPageNodeInfo[];
    type NodeInfoForGlobalIdData = LandingPageNodeInfo[];
    type ServerConfigData = ServerConfig;
    type NodePublicIdToDbId = string;
    type NodePublicIdToDbIdNoGroup = string;
    type Rex3LinkToDbId = string;
}
