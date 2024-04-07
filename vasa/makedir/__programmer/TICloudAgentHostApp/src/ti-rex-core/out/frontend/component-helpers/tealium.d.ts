interface SbeData {
    sbe_0: string;
    sbe_1: string;
    sbe_2: string;
}
interface PackageData {
    product_category: string;
    package_opn: string;
    package_name: string;
    package_version: string;
    package_type: string;
    device_gpn: string | null;
    devtools_gpn: string | null;
}
interface EmptyPackageData {
    product_category: null;
    package_opn: null;
    package_name: null;
    package_version: null;
    package_type: null;
    device_gpn: null;
    devtools_gpn: null;
}
interface ResourceData {
    resource_id: string;
    resource_name: string;
    resource_path: string;
    resource_type: string;
}
interface CommonData {
    tool: 'tirex' | 'sdkComposer' | 'projectWizard' | 'dependencyManager';
    environment: 'cloud' | 'desktop';
    ccs_version: string | null;
}
interface FilterData {
    device_gpn: string | null;
    devtools_gpn: string | null;
    kernel: string | null;
    compiler: string | null;
    search_key: string | null;
}
export declare const enum TirexEventType {
    PAGE_VIEW = "tirex page view",
    SEARCH = "tirex search",
    FILTER = "tirex filter",
    PACKAGE_DOWNLOAD = "tirex package download",
    FILE_DONWLOAD = "tirex file download",
    PACKAGE_INSTALL = "tirex package install",
    PROJECT_IMPORT = "tirex project import"
}
interface PageViewEventBase extends SbeData, ResourceData, CommonData {
}
interface PageViewEventWithoutPackage extends PageViewEventBase, EmptyPackageData {
    event_name: TirexEventType.PAGE_VIEW;
}
interface PageViewEventWithPackage extends PageViewEventBase, PackageData {
    event_name: TirexEventType.PAGE_VIEW;
}
export type PageViewEvent = PageViewEventWithoutPackage | PageViewEventWithPackage;
export interface SearchEvent extends CommonData {
    event_name: TirexEventType.SEARCH;
    search_key: string;
}
export interface FilterEvent extends FilterData, CommonData {
    event_name: TirexEventType.FILTER;
}
export interface PackageDownloadEvent extends SbeData, PackageData, CommonData {
    event_name: TirexEventType.PACKAGE_DOWNLOAD;
}
interface FileDownloadEventBase extends SbeData, ResourceData, CommonData {
}
interface FileDownloadEventWithoutPackage extends FileDownloadEventBase, EmptyPackageData {
    event_name: TirexEventType.FILE_DONWLOAD;
}
interface FileDownloadEventWithPackage extends FileDownloadEventBase, PackageData {
    event_name: TirexEventType.FILE_DONWLOAD;
}
export type FileDownloadEvent = FileDownloadEventWithoutPackage | FileDownloadEventWithPackage;
export interface PackageInstallEvent extends SbeData, PackageData, CommonData {
    event_name: TirexEventType.PACKAGE_INSTALL;
}
interface ProjectImportEventBase extends SbeData, ResourceData, CommonData {
}
interface ProjectImportEventWithoutPackage extends ProjectImportEventBase, EmptyPackageData {
    event_name: TirexEventType.PROJECT_IMPORT;
}
interface ProjectImportEventWithPackage extends ProjectImportEventBase, PackageData {
    event_name: TirexEventType.PROJECT_IMPORT;
}
export type ProjectImportEvent = ProjectImportEventWithoutPackage | ProjectImportEventWithPackage;
export type TirexEvent = PageViewEvent | SearchEvent | FilterEvent | PackageDownloadEvent | FileDownloadEvent | PackageInstallEvent | ProjectImportEvent;
export declare function sendTirexEventToTealium(event: TirexEvent): Promise<void>;
export {};
