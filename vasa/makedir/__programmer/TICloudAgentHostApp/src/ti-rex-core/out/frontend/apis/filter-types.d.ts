import { Common } from '../../shared/generic-types';
import { FilterData, PackageGroupData } from '../../shared/routes/response-data';
import { Filter as ServerQuery } from '../../shared/routes/request-response';
/**
 * What the backend sends in the api/filterOptions response.
 *
 */
export { FilterData, PackageData, PackageGroupData, Compiler, Kernel, ResourceClass } from '../../shared/routes/response-data';
/**
 * What the backend consumes and uses in its code.
 * Passed to HTTP APIs
 *
 */
export { Filter as ServerFilterQuery } from '../../shared/routes/request-response';
/**
 * What's stored in the browser's url query params.
 *
 */
export declare namespace BrowserUrlQuery {
    type Compilers = ServerQuery.Compilers;
    type Devices = ServerQuery.Devices;
    type Devtools = ServerQuery.Devtools;
    type Ides = ServerQuery.Ides;
    type Kernels = ServerQuery.Kernels;
    type Languages = ServerQuery.Language;
    type PackageGroups = string[];
    type ResourceClasses = ServerQuery.ResourceClasses;
    type Search = ServerQuery.Search;
    type NodeType = ServerQuery.Node;
    type chapter = string;
    type LegacyLink = string;
    type Node = string;
    type PackageDependencies = string[];
    interface FilterParams {
        compilers?: Compilers;
        devices?: Devices;
        devtools?: Devtools;
        ides?: Ides;
        kernels?: Kernels;
        languages?: Languages;
        resourceClasses?: ResourceClasses;
        search?: Search;
        a?: PackageGroups;
        r?: PackageGroups;
        nodeType?: NodeType;
    }
    interface PageParams {
        chapter?: chapter;
        link?: LegacyLink;
        node?: Node;
        tableViewNode?: Node;
        fullTextSearch?: string;
        fullTextSearchPage?: string;
        packageDependencies?: PackageDependencies;
        modeTableView?: string;
        theiaPort?: string;
        theiaTheme?: string;
        placeholder?: string;
    }
    type Params = FilterParams & PageParams;
}
export type UpdatedBrowserUrlQueryItems = {
    [K in keyof BrowserUrlQuery.Params]?: BrowserUrlQuery.Params[K] | null;
};
export interface Filter {
    compilers: FilterData.CompilerData[] | null;
    devices: FilterData.DeviceData[] | null;
    devtools: FilterData.DevtoolData[] | null;
    ides: FilterData.IdeData[] | null;
    kernels: FilterData.KernelData[] | null;
    languages: FilterData.LanguageData[] | null;
    resourceClasses: FilterData.ResourceClassData[] | null;
    search: string | null;
    addedPackageGroups: PackageGroupData[] | null;
    removedPackageGroups: PackageGroupData[] | null;
    nodeType: ServerQuery.Node | null;
}
export type UpdatedFilterItems = Partial<Filter>;
export type FilterCommon = Common<Filter, FilterData.Options>;
export interface PackageScopedResourceIdUrlQuery {
    resourceId?: string;
    packageId?: string;
    packageVersion?: string;
    device?: string;
    devtool?: string;
}
export interface GlobalResourceIdUrlQuery {
    globalId?: string;
    device?: string;
    devtool?: string;
}
