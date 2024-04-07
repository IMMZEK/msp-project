import { ServerFilterQuery, FilterData, PackageData } from '../../frontend/apis/filter-types';
import { Omit } from '../../shared/generic-types';
import { Nodes, PackageGroupData, PackageDependencyType, TableView } from '../../shared/routes/response-data';
import { ServerData } from './server-harness';
import { ResourceSubClass, PlatformAttribute, NumericPlatformAttribute } from '../../lib/dbBuilder/dbTypes';
export declare namespace NodesHarness {
    type NodeFilterOptions = ServerFilterQuery.Params;
    interface BaseNodeData {
        nodeDbId: string;
        nodePublicId: string;
        name: string;
        descriptor: {
            isDownloadable?: boolean;
            isImportable?: boolean;
            programmingLanguage?: Nodes.ProgrammingLanguage;
            icon?: Nodes.Icon;
        };
        contentType: Nodes.ContentType;
        packagePublicUid: string | null;
        packageGroupPublicUid: string | null;
        filterData: NodeFilterOptions;
    }
    interface LeafNode extends BaseNodeData {
        description: string;
        link: string;
    }
    export interface LeafNodeData extends LeafNode {
        nodeType: Nodes.NodeType.LEAF_NODE;
    }
    interface FolderNode extends BaseNodeData {
        overview?: Nodes.Overview | Nodes.OverviewLink;
    }
    export interface FolderNodeData extends FolderNode {
        nodeType: Nodes.NodeType.FOLDER_NODE;
    }
    export interface FolderWithResourceNodeData extends FolderNode {
        nodeType: Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE;
    }
    export interface PackageFolderNodeData extends FolderNode {
        nodeType: Nodes.NodeType.PACKAGE_FOLDER_NODE;
        packagePublicUid: string;
        dependencies?: {
            packagePublicId: string;
            versionRange: string;
            dependencyType: PackageDependencyType;
        }[];
        packageType?: Nodes.PackageType;
        isInstallable?: boolean;
        installCommand?: PlatformAttribute;
        downloadUrl?: PlatformAttribute;
        installSize?: NumericPlatformAttribute;
    }
    export type NodeData = FolderNodeData | FolderWithResourceNodeData | PackageFolderNodeData | LeafNodeData;
    interface BaseNodeFilterData {
        nodeDbId: string;
        filterData: NodeFilterOptions;
    }
    export interface LeafNodeFilterData extends BaseNodeFilterData {
        nodeType: Nodes.NodeType.LEAF_NODE;
    }
    export interface FolderNodeFilterData extends BaseNodeFilterData {
        nodeType: Nodes.NodeType.FOLDER_NODE;
    }
    export interface FolderWithResourceNodeFilterData extends BaseNodeFilterData {
        nodeType: Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE;
    }
    export interface PackageFolderNodeFilterData extends BaseNodeFilterData {
        nodeType: Nodes.NodeType.PACKAGE_FOLDER_NODE;
    }
    export type NodeFilterData = FolderNodeFilterData | FolderWithResourceNodeFilterData | PackageFolderNodeFilterData | LeafNodeFilterData;
    export {};
}
export declare namespace TableItemHarness {
    type TableItemFilterOptions = ServerFilterQuery.Params;
    export type Variant = TableItemData['variants'][number];
    export interface TableItemData {
        tableItemDbId: string;
        tableItemPublicId: string;
        tableItemNodeDbId: string;
        name: string;
        descriptor: {
            isDownloadable?: boolean;
            isImportable?: boolean;
            programmingLanguage?: Nodes.ProgrammingLanguage;
            icon?: Nodes.Icon;
        };
        filterData: TableItemFilterOptions;
        variants: {
            variant: TableView.TableItemVariant;
            nodeDbId: string;
        }[];
        resourceSubClass?: ResourceSubClass;
        packageName?: string;
    }
    export interface TableItemFilterData {
        tableItemNodeDbId: string;
        tableItemDbId: string;
        variants: {
            [variant: string]: string;
        };
        filterData: TableItemFilterOptions;
    }
    export {};
}
export declare namespace ServerDataInput {
    export interface FilterData extends Omit<FilterData.Options, 'packageGroups'> {
        packages: PackageData[];
        packageGroups?: PackageGroupData[];
    }
    export type RootNode = string;
    export interface Hierarchy {
        [parentId: string]: string[];
    }
    export interface TableItemHierarchy {
        [parentId: string]: string[];
    }
    interface NodeDataProperty {
        [id: string]: NodesHarness.NodeData;
    }
    interface TableItemDataProperty {
        [id: string]: TableItemHarness.TableItemData;
    }
    export enum InputType {
        FILTER_DATA_ONLY = "FilterDataOnly",
        NODE_DATA = "NodeData",
        TABLE_ITEM_DATA = "TableItemData"
    }
    interface BaseDataInput {
        filterData: FilterData;
        rex3Links?: {
            [link: string]: string;
        };
    }
    export interface FilterDataOnly extends BaseDataInput {
        inputType: InputType.FILTER_DATA_ONLY;
    }
    export interface NodeData extends BaseDataInput {
        inputType: InputType.NODE_DATA;
        rootNode: RootNode;
        softwareNodePublicId?: string;
        hierarchy: Hierarchy;
        nodeData: NodeDataProperty;
    }
    export interface TableItemData extends BaseDataInput {
        inputType: InputType.TABLE_ITEM_DATA;
        rootNode: RootNode;
        softwareNodePublicId?: string;
        hierarchy: Hierarchy;
        tableItemHierarchy: TableItemHierarchy;
        nodeData: NodeDataProperty;
        tableItemData: TableItemDataProperty;
    }
    export type Input = FilterDataOnly | NodeData | TableItemData;
    export {};
}
/**
 * Initializes the server data received (set any defaults, etc).
 *
 * @param data
 *
 * @returns initializedServerData
 */
export declare function initializeServerHarnessData(data: ServerDataInput.Input): ServerData;
