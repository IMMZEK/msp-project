import { LinkForDownload, LinkType, ResourceType, Dependencies, Compiler, Kernel, ViewLimitation, PlatformAttribute, ModuleOf, SortType, NumericPlatformAttribute, ModuleGroup, PackageSubType, FeatureType, ProjectRestriction } from '../../lib/dbBuilder/dbTypes';
import { Omit } from '../../shared/generic-types';
export interface DbObj {
    id?: number;
}
export interface PersistentDbObj extends DbObj {
    id: number;
}
export type DbValue = string | number | boolean | null | undefined;
export type ContentSourceType = 'pkggrp' | 'devset';
export interface ContentSourceRow {
    id: number;
    public_id: string;
    version: string;
    type: ContentSourceType;
    state: string;
    created: number;
    state_updated: number;
    main_package_id: number | null;
    devset_id: number | null;
    priority: number | null;
    packages_to_list_versions_from: string | null;
}
export interface DbContentSource extends PersistentDbObj {
    publicVId: string;
    publicId: string;
    version: string;
    type: ContentSourceType;
    state: ContentSourceState;
    created: number;
    stateUpdated: number;
    mainPackageId: number | null;
    filterDevSetId: number | null;
    priority: number | null;
    packagesToListVersionsFrom: string[];
}
export type ContentSourceState = 'incomplete' | 'imported' | 'published' | 'unpublished' | 'deleting' | 'deleted';
export type DbPackageGroup = Omit<DbContentSource, 'priority'>;
export type DbFilterDevSet = Omit<DbContentSource, 'mainPackageId' | 'filterDevSetId' | 'packagesToListVersionsFrom'>;
export type PartialDbContentSource = Partial<DbContentSource> & {
    publicVId: string;
    publicId: string;
    version: string;
};
export type PartialDbPackageGroup = Omit<PartialDbContentSource, 'priority'>;
export type PartialDbFilterDevSet = Omit<PartialDbContentSource, 'mainPackageId' | 'filterDevSetId'>;
export declare function rowToContentSource(row: ContentSourceRow): DbContentSource;
export declare function rowToPackageGroup(row: ContentSourceRow): DbPackageGroup;
export declare function rowToFilterDevSet(row: ContentSourceRow): DbFilterDevSet;
export interface PackageRow {
    id: number;
    json_id: string;
    public_id: string;
    version: string;
    uid: string;
    install_path: string;
    install_command: string | null;
    install_size_win: number | null;
    install_size_linux: number | null;
    install_size_macos: number | null;
    type: string;
    sub_type: string | null;
    feature_type: string | null;
    ccs_version: string | null;
    ccs_install_loc: string | null;
    name: string;
    descr: string | null;
    path: string;
    image: string | null;
    ordinal: number | null;
    semver: string;
    metadata_version: string | null;
    restrictions: string | null;
    license: string | null;
    hide_node_dir_panel: 1 | 0;
    package_dependencies: string;
    module_of_package_id: string;
    module_of_version_range: string;
    hide_by_default: 1 | 0;
    module_grp_core_pkg_pid: string;
    module_grp_core_pkg_vrange: string;
    module_grp_packages: string | null;
    default_module_group: boolean;
    devices: string | null;
    devtools: string | null;
}
export type DbDependencies = Dependencies & {
    type: DependType;
};
export interface DbPackage extends PersistentDbObj {
    jsonId: string;
    publicId: string;
    version: string;
    uid: string;
    installPath: PlatformAttribute | null;
    installCommand: PlatformAttribute | null;
    installSize: NumericPlatformAttribute | null;
    type: string;
    subType: PackageSubType | null;
    featureType: FeatureType | null;
    ccsVersion: string | null;
    ccsInstallLocation: string | null;
    name: string;
    description: string | null;
    path: string;
    image: string | null;
    order: number | null;
    semver: string;
    metadataVersion: string | null;
    restrictions: string | null;
    license: string | null;
    hideNodeDirPanel: boolean;
    moduleOf: ModuleOf | null;
    hideByDefault: boolean;
    moduleGroup: ModuleGroup | null;
    devices: string[] | null;
    devtools: string[] | null;
}
export type PartialDbPackage = Partial<DbPackage> & {
    uid: string;
};
export declare function rowToPackage(row: PackageRow): DbPackage;
/**
 * Recompose a string array stored in database to a PlatformAttribute or null
 * @param data - string from database to recompose as PlatformAttribute or null
 */
export declare function recomposePlatformAttributeObject(data: string | null): any;
/**
 * Decompose a PlatformAttribute for storage in database as a stringified object
 * @param attr - PlatformAttribute to store. Can be null
 */
export declare function decomposePlatformAttribute(attr?: PlatformAttribute | NumericPlatformAttribute | null): string | null;
export type RequireType = 'optional' | 'mandatory' | 'implicit';
export type DependType = 'd' | 'm' | 'g';
export interface PackageDependRow {
    id: number;
    package_id: number;
    type: DependType;
    ref_id?: string;
    version_range: string;
    required?: RequireType;
    message?: string;
}
export interface DbPackageDepend extends PersistentDbObj {
    packageId: number;
    type: DependType;
    refId?: string;
    versionRange: string;
    require?: RequireType;
    message?: string;
}
export declare function rowToPackageDepend(row: PackageDependRow): DbPackageDepend;
export interface NodeRow {
    id: number;
    parent_id: number | null;
    public_id_w0: string | number;
    public_id_w1: string | number;
    name: string;
    is_foundation: number;
    is_content_subtree_head: number;
    content_source_id: number | null;
    resource_id: number | null;
    descendant_count: number | null;
    is_leaf: number;
    parent_sort: 'string';
    leaf_order: number;
    implicit_order: number | null;
    custom_order: string | null;
    resource_type: string | null;
    file_type: string | null;
    package_id: number | null;
    link_ext: string | null;
    link_type: string | null;
    icon: string | null;
    short_descr: string | null;
    view_limitations: string | null;
    readme_public_id_w0: string | number | null;
    readme_public_id_w1: string | number | null;
}
export type NodeRowWithPackageInfo = NodeRow & {
    pgrp_public_id?: string | null;
    pgrp_version?: string | null;
    pkg_public_id?: string | null;
    pkg_version?: string | null;
    pkg_restrictions?: string | null;
};
export type MinimalNodeRow = Pick<NodeRow, 'public_id_w0' | 'public_id_w1'>;
export interface DbNode extends PersistentDbObj {
    parentId: number | null;
    publicId: string;
    readmeNodePublicId: string | null;
    name: string;
    isFoundation: boolean;
    isContentSubTreeHead: boolean;
    contentSourceId: number | null;
    resourceId: number | null;
    descendantCount: number | null;
    isLeaf: boolean;
    parentSort: SortType;
    implicitOrder: number | null;
    customOrder: string | null;
    leafOrder: number;
    resourceType: ResourceType | null;
    fileType: string | null;
    packageId: number | null;
    linkExt: string | null;
    linkType: LinkType | null;
    icon: string | null;
    shortDescription: string | null;
    viewLimitations: string[] | null;
}
export type PartialDbNode = Partial<DbNode>;
export declare function rowToNode(row: NodeRow): DbNode;
/**
 * Convert public id from a 128 bit base64 string to two 64-bit words (big-endian) in decimal
 * string form. The numbers have to be represented as strings instead of numbers due to Javascript
 * only supporting 52 bit precision.
 *
 * If the public id is *not* a 128 bit base64 string then a best attempt is made to convert it,
 * with non-base64 characters ignored and each 64-bit word returned as '0' if no characters are
 * valid.
 *
 * @param publicId
 */
export declare function nodePublicIdToDbWords(publicId: string): {
    publicIdWord0: string;
    publicIdWord1: string;
};
/**
 * Get the node's public id from its record, where it is stored as two 64 bit
 * words.
 *
 * Each word is represented using a number if <= 52 bits, and a string if > 52 bits.
 *
 * @param row node record containing the public id's words
 */
export declare function nodeRowToPublicId(row: MinimalNodeRow): string;
/**
 * Convert a public id from two 64 bit words (in mysql node form) to base 64.
 *
 * @param publicIdWord0  public id word #0
 * @param publicIdWord1  public id word #1
 *
 * Each public id word is represented using a number if <= 52 bits, and a string if > 52 bits.
 */
export declare function mysqlWordsToPublicId(publicIdWord0: string | number, publicIdWord1: string | number): string;
/**
 * Recompose a string array stored in database as a comma-delimited list
 * @param data - string from database to recompose as array
 * @param nullDistinct - treat null/undefined and [] distinctly
 *
 * NOTE: By default, null/undefined and [] are treated distinctly and stored differently in the
 * database, with null/undefined stored as null and [] stored as an empty string. This is due to
 * undefined meaning "don't care" and [] meaning "none" in BU metadata. To override this behavior
 * and treat both as [] and store them both as null, set nullDistinct to false.
 */
export declare function recomposeStringArray(data: string | null, nullDistinct?: boolean): string[] | null;
/**
 * Decompose a string array for storage in database as a comma-delimited list
 * @param array - array of strings to store
 * @param nullDistinct - treat null/undefined and [] distinctly
 *
 * NOTE: By default, null/undefined and [] are treated distinctly and stored differently in the
 * database, with null/undefined stored as null and [] stored as an empty string. This is due to
 * undefined meaning "don't care" and [] meaning "none" in BU metadata. To override this behavior
 * and treat both as [] and store them both as null, set nullDistinct to false.
 */
export declare function decomposeStringArray(array?: string[] | null, nullDistinct?: boolean): string | null;
export interface ResourceRow {
    id: number;
    parent_id: number | null;
    package_id: number;
    json_id: string;
    type: string;
    name: string;
    implicit_order: number | null;
    custom_order: string | null;
    sort: string;
    descr: string | null;
    short_descr: string | null;
    view_limitations: string | null;
    proj_restriction: string | null;
    kernel: string | null;
    compiler: string | null;
    override_projspec_device: boolean | null;
    link: string | null;
    link_type: string | null;
    icon: string | null;
    file_type: string | null;
    has_includes: number | null;
    is_included_file: number | null;
    image: string | null;
    root0: string | null;
    is_counted: number;
    json: string | null;
}
export interface ResourceJson {
    importProjectCCS: string | null;
    createProjectCCS: string | null;
    linkForDownload: LinkForDownload | null;
}
export interface DbResource extends PersistentDbObj {
    parentId: number | null;
    packageId: number;
    jsonId: string;
    type: ResourceType;
    name: string;
    implicitOrder: number | null;
    customOrder: string | null;
    sort: SortType | null;
    description: string | null;
    shortDescription: string | null;
    viewLimitations: ViewLimitation[] | null;
    projectRestriction: ProjectRestriction | null;
    kernels: Kernel[];
    compilers: Compiler[];
    overrideProjectSpecDeviceId?: boolean | null;
    link: string | null;
    linkType: LinkType | null;
    icon: string | null;
    fileType: string | null;
    hasIncludes: boolean | null;
    isIncludedFile: boolean | null;
    image: string | null;
    root0: string | null;
    isCounted?: boolean;
    kitsAndBoards?: boolean;
    importProjectCCS: string | null;
    createProjectCCS: string | null;
    linkForDownload: LinkForDownload | null;
}
export declare function rowToResource(row: ResourceRow): DbResource;
export declare function dbToResourceSort(s: string): SortType;
export declare function resourceSortToDb(s?: SortType | null): "a" | "d" | "m";
export declare function dbToProjectRestriction(s: string | null): ProjectRestriction | null;
export declare function projectRestrictionToDb(restriction: ProjectRestriction | null): "c" | "d" | null;
export type PartialDbResource = Partial<DbResource> & {
    jsonId: string;
};
export interface FilterRow {
    id: number;
    package_group_id: number;
    type: string;
    name: string;
    name_search: string;
    device_id: number | null;
    devtool_id: number | null;
}
export type FilterType = 'compiler' | 'descr' | 'device' | 'devtool' | 'freq-chunk' | 'ide' | 'kernel' | 'language' | 'node' | 'resClass' | 'tag';
export interface DbFilter extends PersistentDbObj {
    packageGroupId: number;
    type: FilterType;
    name: string;
    nameSearch: string;
    deviceId: number | null;
    devtoolId: number | null;
}
export type PartialDbFilter = Partial<DbFilter> & {
    type: FilterType;
    name: string;
};
export declare function rowToFilter(row: FilterRow): DbFilter;
export interface FilterChunkRow {
    id: number;
    package_group_id: number;
    chunk: string;
}
export interface DbFilterChunk extends PersistentDbObj {
    packageGroupId: number;
    chunk: string;
}
export type PartialDbFilterChunk = Partial<DbFilterChunk> & {
    chunk: string;
};
export declare function rowToFilterChunk(row: FilterChunkRow): DbFilterChunk;
export interface FilterXChunkRow {
    filter_id: number;
    chunk_id: number;
    chunk_type: string;
    search_on_filter: boolean;
    filter_type: string;
    filter_segment: string;
}
export interface DevtoolRow {
    id: number;
    devset_id: number;
    public_id: string;
    json_id: string;
    type: string;
    overview_public_id: string | null;
    name: string;
    package_uid: string;
    descr: string | null;
    buy_link: string | null;
    image: string | null;
    tools_page: string | null;
    json: string | null;
}
export interface DevtoolJson {
    connections: string[];
    energiaBoards: {
        id: string;
    }[];
}
export interface DbDevtool extends PersistentDbObj {
    devSetId: number;
    publicId: string;
    jsonId: string;
    type: string;
    overviewPublicId: string | null;
    name: string;
    packageUid: string;
    description: string | null;
    buyLink: string | null;
    image: string | null;
    toolsPage: string | null;
    connections: string[];
    energiaBoards: {
        id: string;
    }[];
}
export type PartialDbDevtool = Partial<DbDevtool> & {
    name: string;
};
export declare function rowToDevtool(row: DevtoolRow): DbDevtool;
export interface DeviceRow {
    id: number;
    devset_id: number;
    parent_id: number | null;
    public_id: string;
    json_id: string;
    type: string;
    overview_public_id: string | null;
    name: string;
    package_uid: string;
    descr: string | null;
    image: string | null;
    json: string | null;
}
export interface DeviceJson {
    coreTypes: CoreType[];
}
export interface DbDevice extends PersistentDbObj {
    parentId: number | null;
    devSetId: number;
    publicId: string;
    jsonId: string;
    type: string;
    overviewPublicId: string | null;
    name: string;
    packageUid: string;
    description: string | null;
    image: string | null;
    coreTypes: CoreType[];
}
export interface CoreType {
    id: string;
    name: string;
}
export type PartialDbDevice = Partial<DbDevice> & {
    publicId: string;
};
export declare function rowToDevice(row: DeviceRow): DbDevice;
export type DbResourceGroup = DbObj & Pick<DbResource, 'type' | 'name' | 'shortDescription' | 'fileType' | 'packageId' | 'link' | 'linkType' | 'icon' | 'viewLimitations'> & {
    resourceGroupPath: string;
    groupCategoryContext: string;
    subClass: string | null;
};
export interface DbResourceGroupNode {
    resourceGroupId: number;
    isDevtool: boolean;
    devId: number;
    kernel: number | null;
    compiler: number | null;
    nodeId: number;
    resourceId: number;
    hasReadme: boolean;
    hasChildren: boolean;
}
export declare function dbToCompiler(s: string): Compiler;
export declare function compilerToDb(compiler?: Compiler): number | null;
export declare function dbToKernel(s: string): Kernel;
export declare function kernelToDb(kernel?: Kernel): number | null;
export interface VersionedPublicId {
    publicId: string;
    version: string;
}
export type InternalId = VersionedPublicId & {
    created: number;
};
export declare function stringToVPublicId(versionedPublicId: string): VersionedPublicId;
export declare function stringToInternalId(internalId: string): InternalId;
export declare function publicVIdToString(publicVId: VersionedPublicId): string;
export declare function internalIdToString(internalId: InternalId): string;
