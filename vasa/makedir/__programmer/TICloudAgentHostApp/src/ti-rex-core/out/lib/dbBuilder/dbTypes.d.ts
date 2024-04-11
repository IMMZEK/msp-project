/**
 * resourceType
 */
import { FeatureType as FeatureTypeEnum } from '../../cloudagent/external-apis';
import { LeafInfo } from './resources';
declare const resourceTypes: {
    app: string;
    bundle: string;
    category: string;
    categoryInfo: string;
    energiaSketch: string;
    executable: string;
    folder: string;
    'folder.importable': string;
    file: string;
    'file.executable': string;
    'file.importable': string;
    other: string;
    overview: string;
    package: string;
    packageOverview: string;
    project: string;
    'project.ccs': string;
    'project.energia': string;
    'project.iar': string;
    projectSpec: string;
    'web.app': string;
    'web.page': string;
    weblink: string;
};
export type ResourceType = keyof typeof resourceTypes;
export declare function isResourceType(s: string): s is ResourceType;
export declare function isResourceTypeImportableByCCS(resourceType: ResourceType): boolean;
/**
 * compilers - allowed ids and public names
 */
export declare const compilers: {
    ccs: string;
    ticlang: string;
    gcc: string;
    iar: string;
};
export type Compiler = keyof typeof compilers;
export declare function isCompiler(s: string): s is Compiler;
/**
 * kernels - allowed ids and public names
 */
export declare const kernels: {
    tirtos: string;
    freertos: string;
    nortos: string;
    tirtos7: string;
};
export type Kernel = keyof typeof kernels;
export declare function isKernel(s: string): s is Kernel;
/**
 * resourceClass
 */
export declare const resourceClasses: {
    example: string;
    document: string;
    other: string;
};
export type ResourceClass = keyof typeof resourceClasses;
export declare function isResourceClass(s: string): s is ResourceClass;
/**
 * resourceSubClass
 */
export declare const resourceSubClasses: {
    'example.general': string;
    'example.empty': string;
    'example.gettingstarted': string;
    'example.outofbox': string;
    'example.helloworld': string;
};
export type ResourceSubClass = keyof typeof resourceSubClasses;
export declare function isResourceSubClass(s: string): s is ResourceSubClass;
export type PackageType = 'devices' | 'devtools' | 'software' | 'software_tools' | 'full';
export type LinkType = 'local' | 'external';
export type SortType = 'filesAndFoldersAlphabetical' | 'manual' | 'default';
export interface PlatformAttribute {
    win?: string;
    linux?: string;
    macos?: string;
    [platform: string]: string | undefined;
}
export interface NumericPlatformAttribute {
    win?: number;
    linux?: number;
    macos?: number;
}
export interface MinimalDBObject {
    _id: string;
    name?: string;
}
export interface DBObject extends MinimalDBObject {
    name: string;
    packageId: string;
    packagePath: string;
    packageUId: string;
    packageVersion: string;
}
export interface Bundle extends DBObject {
    id?: string;
    includedFiles?: string[];
    includedFilesForDownload?: string[];
    includedResources?: {
        package: string;
    }[];
    includedUrls?: string[];
    message?: string;
    require?: string;
    devices?: string[];
    devtools?: string[];
    devtools_category?: string[];
    kernel?: string[];
    ide?: string[];
    compiler?: string[];
    language?: string[];
    resourceClass?: string[];
    resourceSubClass?: ResourceSubClass[];
    tags?: string[];
    resourceType: ResourceType;
    semver: string;
    version: string;
    supplements?: Supplements;
    moduleOf?: ModuleOf;
    restrictions?: string;
}
export interface Supplements {
    packageId: string;
    versionRange: string;
}
export interface ModuleOf {
    packageId: string;
    versionRange: string;
}
export interface ModuleGroupOf {
    packageId: string;
    versionRange: string;
}
export interface ModuleGroup {
    corePackage: ModuleGroupOf;
    packages: string[];
    defaultModuleGroup: boolean;
}
interface SupplementsDefinition {
    packageId: string;
    semver: string;
}
interface SupplementsLegacy {
    id: string;
    version?: string;
}
export type SupplementsAll = Supplements & SupplementsDefinition & SupplementsLegacy;
export interface Dependencies {
    refId?: string;
    versionRange: string;
    require?: 'optional' | 'mandatory' | 'implicit';
    message?: string;
}
interface DependenciesDefinition {
    packageId?: string;
    version?: string;
}
interface DependenciesLegacy {
    semver?: string;
}
export type DependenciesAll = Dependencies & DependenciesDefinition & DependenciesLegacy;
interface AdvancedProperties {
    overrideProjectSpecDeviceId?: boolean;
}
export interface ResourceGroup {
    id: string;
    categoryContext: string;
}
export interface PureBundle extends Bundle {
    id: string;
    includedFiles: string[];
    includedFilesForDownload: string[];
    message: string;
    require: string;
    resourceType: ResourceType;
}
export interface Device extends DBObject {
    ancestors: string[];
    children: string[] | null;
    coreTypes_id: string[];
    coreTypes_name: string[];
    description?: string;
    descriptionLocation?: string;
    shortDescription?: string;
    id: string;
    image?: string;
    parent?: string;
    type: string;
    overviewPublicId?: string;
    aliases?: string[];
    idAliases?: string[];
}
export interface Devtool extends DBObject {
    buyLink?: string;
    connections?: string[];
    description?: string;
    descriptionLocation?: string;
    shortDescription?: string;
    device?: string[];
    devices?: string[] | null;
    devicesVariants?: string[];
    devicesAncestors?: string[];
    id: string;
    image?: string;
    parent?: string;
    toolsPage?: string;
    type: 'probe' | 'board';
    overviewPublicId?: string;
    aliases?: string[];
    idAliases?: string[];
    energiaBoards?: {
        id: string;
    }[];
}
export type ViewLimitation = 'aws' | 'e2e' | 'guicomposer' | 'h264codec' | 'nohttps' | 'parasoft' | 'elprotronic' | 'xeltex' | 'hilosystems' | 'tlsmbed' | 'tiSensortag' | 'tiTraining' | 'tiC2000' | 'tiWiki';
export type ProjectRestriction = 'desktopOnly' | 'cloudOnly';
export type PackageSubType = 'ccsComponent' | 'featureSupport';
export type FeatureType = 'deviceSupport' | 'tools' | 'compiler' | 'ccsCore';
export declare const enum PackageSubTypeEnum {
    CCS_COMPONENT = "ccsComponent",
    FEATURE_SUPPORT = "featureSupport"
}
export declare const packageSubTypeEnumsOnUnion: {
    [K in PackageSubType]: PackageSubTypeEnum;
};
export declare const featureTypeEnumsOnUnion: {
    [K in FeatureType]: FeatureTypeEnum;
};
export interface Overview extends Bundle {
    advanced: AdvancedProperties;
    allowPartialDownload: boolean;
    categories: string[][];
    coreDependencies?: Dependencies[];
    customGlobalResourceUids?: string[];
    customResourceUid?: string;
    customResourceAliasUids?: string[];
    dependencies: Dependencies[];
    modules: Dependencies[];
    description?: string;
    shortDescription?: string;
    viewLimitations?: ViewLimitation[];
    projectRestriction?: ProjectRestriction;
    devicesVariants?: string[];
    fullPaths: string[][];
    fullPathsPublicIds: string[];
    fullPathsCustomPublicIds?: string[];
    fullPathsCustomAliasPublicIds?: string[][];
    icon?: string;
    id?: string;
    image?: string;
    installFolder?: {};
    installPath?: PlatformAttribute;
    installCommand?: PlatformAttribute;
    installSize?: NumericPlatformAttribute;
    license?: string;
    hideNodeDirPanel?: boolean;
    link?: string;
    linkType?: LinkType;
    metadataVersion?: string;
    moduleGroup?: ModuleGroup;
    moduleGroups?: Dependencies[];
    order?: number;
    customOrder?: string;
    sort?: SortType;
    package: string;
    packageIdAliases?: string[];
    hideByDefault?: boolean;
    packageOrder?: number;
    root0?: string;
    rootCategory?: string[];
    rootCatergory?: string[];
    type?: PackageType;
    subType?: PackageSubType;
    featureType?: FeatureType;
    ccsVersion?: string;
    ccsInstallLocation?: string;
    modifiedValues?: {
        rootCategory?: string[];
        name?: string;
        supplements?: SupplementsAll;
    };
}
export interface LinkForDownload {
    any?: string;
    win?: string;
    win32?: string;
    win64?: string;
    linux?: string;
    linux32?: string;
    linux64?: string;
    macos?: string;
}
export interface Resource extends Bundle {
    _createProjectCCS?: string;
    _importProjectCCS?: string;
    _originalJsonFile?: string;
    advanced: AdvancedProperties;
    allowPartialDownload: boolean;
    categories: string[][];
    coreTypes?: string[] | null;
    localId?: string;
    localAliases?: string[];
    globalAliases?: string[];
    aliases?: string[];
    customGlobalResourceUids?: string[];
    customResourceUid?: string;
    customResourceAliasUids?: string[];
    sort?: SortType;
    customOrder?: string;
    dependencies: Dependencies[];
    modules: Dependencies[];
    description?: string;
    shortDescription?: string;
    viewLimitations?: ViewLimitation[];
    projectRestriction?: ProjectRestriction;
    kernel?: string[];
    compiler?: string[];
    resourceGroup?: ResourceGroup[];
    devicesVariants: string[];
    devicesAncestors?: string[];
    doNotCount?: boolean;
    fileType?: string;
    fullPaths: string[][];
    fullPathsDevId: (string | undefined)[];
    fullPathsCoreTypeId: (string | undefined)[];
    fullPathsPublicIds: string[];
    fullPathsCustomPublicIds?: string[];
    fullPathsCustomAliasPublicIds?: string[][];
    readmeInfo?: LeafInfo;
    readmeFullPathsPublicIds?: string[];
    hasReadme?: boolean;
    hasIncludes?: boolean;
    icon?: string;
    implictDependencyFile?: string;
    isIncludedFile?: boolean;
    license?: string;
    hideNodeDirPanel?: boolean;
    link: string;
    linkForDownload?: LinkForDownload;
    linkType: LinkType;
    order: number;
    package: string;
    parentID?: string;
    root0: string;
    modifiedValues?: {
        rootCategory?: string[];
        name?: string;
        supplements?: SupplementsAll;
    };
    kitsAndBoards?: boolean;
}
export interface LandingPageNodeInfo {
    nodeDbId: number;
    hashedNodePublicId: string;
    packageGroup: {
        dbId: number;
        publicId: string;
        version: string;
    };
    package: {
        publicId: string;
        version: string;
    };
}
export interface AvailableTableViewFilters {
    kernels: Kernel[];
    compilers: Compiler[];
}
export {};
