/**
 * Type definitions for the data sent to the client
 *
 */
import { Compiler, Kernel, PlatformAttribute, ResourceSubClass, ModuleOf, NumericPlatformAttribute, ModuleGroup, PackageSubType, FeatureType } from '../../lib/dbBuilder/dbTypes';
export { Compiler, Kernel, ResourceClass } from '../../lib/dbBuilder/dbTypes';
export declare namespace TableView {
    interface TableItemVariant {
        compiler: Compiler;
        kernel: Kernel;
    }
    interface TableItem {
        tableItemDbId: string;
        name: string;
        shortDescription?: string;
        descriptor: Nodes.Descriptor;
        categoryContext: string;
        resourceSubClass: ResourceSubClass;
        packageName: string;
        variants: TableItemVariant[];
        deviceIds?: string[];
        templateIds?: {
            [compiler: string]: string;
        };
        outputTypeId?: string;
    }
    interface AvailableTableFilters {
        compilers: Compiler[];
        kernels: Kernel[];
    }
}
export declare namespace Nodes {
    export const enum ViewConstraint {
        DOWNLOAD_ONLY = "DownloadOnly",
        EXTERNAL_ONLY = "ExternalOnly",
        DESKTOP_EXTERNAL_ONLY = "DesktopExternalOnly"
    }
    export const enum ProgrammingLanguage {
        C = "C",
        ASM = "Asm"
    }
    export const enum Icon {
        SOURCE_CODE_C = "SourceCode_C",
        SOURCE_CODE_CPP = "SourceCode_CPP",
        SOURCE_CODE_H = "SourceCode_H",
        SOURCE_CODE_HPP = "SourceCode_HPP",
        SOURCE_CODE_ASM = "SourceCode_ASM",
        SOURCE_CODE_CMD = "SourceCode_CMD",
        PROJECT_CCS = "Project_CCS",
        PROJECT_ENERGIA = "Project_Energia",
        PROJECT_IAR = "Project_IAR",
        EXECUTABLE = "Executable",
        FILE = "File",
        FOLDER = "Folder",
        DOCUMENT = "Document",
        PACKAGE = "Package",
        PDF = "PDF",
        WEBPAGE = "WebPage",
        WEBAPP = "WebApp",
        HELP = "Help",
        MARKDOWN = "Markdown",
        NETWORK = "Network",
        POWERPOINT = "Powerpoint",
        SUPPORT = "Support",
        TRAINING = "Training",
        VIDEO = "Video",
        WIKI = "Wiki",
        BLUETOOTH = "Bluetooth",
        DEBUGGINGGUIDE = "DebuggingGuide",
        DESKTOPAPP = "DesktopApp",
        DEVBOARD = "Devboard",
        DEVICE = "Device",
        DEVTOOL = "Devtool",
        HTMLDOC = "HtmlDoc",
        IMAGE = "Image",
        JSON = "JSON",
        LIBRARY = "Library",
        ONLINEDATASHEET = "OnlineDataSheet",
        README = "Readme",
        REFERENCEDESIGN = "ReferenceDesign",
        TIPSANDTRICKS = "TipsAndTricks",
        WIFI = "Wifi"
    }
    export const enum ContentType {
        PDF = "PDF",
        MARKDOWN = "Markdown",
        SOURCE_CODE = "Code",
        OTHER = "Other"
    }
    export enum NodeType {
        FOLDER_NODE = "Folder",
        FOLDER_WITH_HIDDEN_RESOURCE_NODE = "FolderWithResource",
        PACKAGE_FOLDER_NODE = "PackageFolder",
        LEAF_NODE = "Leaf"
    }
    export const enum OverviewType {
        OVERVIEW = "Overview",
        OVERVIEW_LINK = "OverviewLink"
    }
    export const enum PackageType {
        MAIN_PACKAGE = "MainPackage",
        SUB_PACKAGE = "SubPackage",
        OTHER = "OtherPackage"
    }
    export const enum State {
        ONLINE = "Online",
        OFFLINE = "Offline"
    }
    export const enum LinkType {
        INTERNAL = "Internal",
        EXTERNAL = "External"
    }
    export interface Descriptor {
        icon: Icon;
        hasChildren: boolean;
        hasReadme?: boolean;
        isDownloadable?: boolean;
        isImportable?: boolean;
        programmingLanguage?: ProgrammingLanguage;
        viewConstraint?: ViewConstraint;
        downloadLinkType?: LinkType;
    }
    export interface Overview {
        overviewText?: string;
        overviewImage?: string;
        overviewType: OverviewType.OVERVIEW;
    }
    export interface OverviewLink {
        overviewLink: string;
        overviewType: OverviewType.OVERVIEW_LINK;
    }
    export interface BaseNode {
        nodeDbId: string;
        nodePublicId: string;
        name: string;
        shortDescription?: string;
        descriptor: Descriptor;
        contentType: ContentType;
        packagePublicUid: string | null;
        packageGroupPublicUid: string | null;
        readmeNodePublicId?: string;
    }
    export interface BaseNodeExtended {
        nodeDbId: string;
        nodeDbIdPath: string[];
        description?: string;
    }
    interface BaseLeafNodeExtended extends BaseNodeExtended {
        link: string;
        linkType: Nodes.LinkType;
    }
    interface BaseFolderNodeExtended extends BaseNodeExtended {
        overview?: Overview | OverviewLink;
    }
    export interface LeafNode extends BaseNode {
        nodeType: NodeType.LEAF_NODE;
    }
    export interface LeafNodeExtended extends BaseLeafNodeExtended {
        nodeType: NodeType.LEAF_NODE;
    }
    export interface FolderNode extends BaseNode {
        nodeType: NodeType.FOLDER_NODE;
    }
    export interface FolderNodeExtended extends BaseFolderNodeExtended {
        nodeType: NodeType.FOLDER_NODE;
    }
    export interface FolderWithResourceNode extends BaseNode {
        nodeType: NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE;
    }
    export interface FolderWithResourceNodeExtended extends BaseFolderNodeExtended {
        nodeType: NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE;
    }
    export interface PackageFolderNode extends BaseNode {
        nodeType: NodeType.PACKAGE_FOLDER_NODE;
    }
    export interface PackageFolderNodeExtended extends BaseFolderNodeExtended {
        nodeType: NodeType.PACKAGE_FOLDER_NODE;
    }
    type _Node = FolderNode | FolderWithResourceNode | PackageFolderNode | LeafNode;
    export type Node = Readonly<_Node>;
    type _NodeExtended = FolderNodeExtended | FolderWithResourceNodeExtended | PackageFolderNodeExtended | LeafNodeExtended;
    export type NodeExtended = Readonly<_NodeExtended>;
    export {};
}
export declare namespace FilterData {
    export interface Data {
        publicId: string;
        name: string;
    }
    interface DataWithOverview extends Data {
        overviewNodeDbId?: string;
    }
    export type CompilerData = Data;
    export type DeviceData = DataWithOverview;
    export type DevtoolData = DataWithOverview;
    export type IdeData = Data;
    export type KernelData = Data;
    export type LanguageData = Data;
    export type PackageGroupFilterData = Data;
    export type ResourceClassData = Data;
    export interface Options {
        compilers: CompilerData[];
        devices: DeviceData[];
        devtools: DevtoolData[];
        ides: IdeData[];
        kernels: KernelData[];
        languages: LanguageData[];
        packageGroups: PackageGroupFilterData[];
        resourceClasses: ResourceClassData[];
    }
    export {};
}
interface DataWithFeatureSupport {
    publicId: string;
    name: string;
    featureSupport: string[];
}
export type DeviceType = 'device' | 'family' | 'subfamily';
export interface ExtendedDeviceData extends DataWithFeatureSupport {
    type: DeviceType;
}
export interface ExtendedBoardData extends DataWithFeatureSupport {
    devices: string[];
}
export interface BoardsAndDevicesData {
    boards: ExtendedBoardData[];
    devices: ExtendedDeviceData[];
}
export interface PackageDependency {
    packagePublicId: string;
    versionRange: string;
    dependencyType: PackageDependencyType;
}
export interface PackageData {
    name: string;
    packageVersion: string;
    packageGroupPublicUids: string[];
    packagePublicId: string;
    packagePublicUid: string;
    packageType: Nodes.PackageType;
    dependencies: PackageDependency[];
    modules: PackageDependency[];
    moduleGroups: PackageDependency[];
    moduleGroup?: ModuleGroup;
    downloadUrl: PlatformAttribute;
    installCommand: PlatformAttribute | null;
    installSize?: NumericPlatformAttribute | null;
    isInstallable: boolean;
    moduleOf?: ModuleOf;
    licenses?: string[];
    hideNodeDirPanel?: boolean;
    aliases: string[];
    subType?: PackageSubType;
    featureType?: FeatureType;
    ccsVersion?: string;
    ccsInstallLocation?: string;
}
export interface PackageGroupData {
    packageGroupVersion: string;
    packageGroupPublicId: string;
    packageGroupPublicUid: string;
    packagesPublicUids: string[];
    mainPackagePublicUid: string | null;
    hideByDefault: boolean;
    packagesToListVersionsFrom: string[];
}
export declare const enum PackageDependencyType {
    MANDATORY = "mandatory",
    OPTIONAL = "optional"
}
export interface DownloadInfo {
    downloadFilename: string;
    downloadUrl: string;
    linkType: Nodes.LinkType;
}
export declare enum Platform {
    LINUX = "linux",
    MACOS = "macos",
    WINDOWS = "win"
}
