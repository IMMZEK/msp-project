import * as React from 'react';
import { AppProps, CommonProps, UseStylesClasses } from '../component-helpers/util';
import { PackageData } from '../apis/filter-types';
import type { InstalledPackage } from '../../cloudagent/response-data';
import { ModuleGroup } from '../../lib/dbBuilder/dbTypes';
export declare const enum InstallItemType {
    MANDATORY = "mandatory",
    OPTIONAL = "optional",
    MAIN = "main",
    MODULE = "module",
    MODULE_GROUP = "moduleGroup",
    SELECTED_MODULE_GROUP = "selectedModuleGroup",
    NA = "na"
}
export declare const enum PackageOrigin {
    LOCAL = "Local",
    REMOTE = "Remote",
    NOT_FOUND = "NotFound"
}
export interface LocalPackage {
    origin: PackageOrigin.LOCAL;
    data: InstalledPackage;
    installItemType: InstallItemType;
}
export interface RemotePackage {
    origin: PackageOrigin.REMOTE;
    data: PackageData;
    installItemType: InstallItemType;
}
export interface NotFoundPackage {
    origin: PackageOrigin.NOT_FOUND;
    data: InstallItem;
    installItemType: InstallItemType;
}
export interface InstallItem {
    packagePublicId: string;
    versionRange: string;
    installItemType: InstallItemType;
}
interface ConfirmInstallProps extends CommonProps {
    appProps: AppProps;
    installedPackages: InstalledPackage[];
    installLocations: string[];
    onSelectionUpdate: (packageUids: string[], installLocation: string) => void;
    installItems: InstallItem[];
    classes?: UseStylesClasses<typeof useConfirmInstallStyles>;
}
declare const useConfirmInstallStyles: (props?: any) => import("@material-ui/styles").ClassNameMap<"root" | "downloadSizeContainer" | "footerContainer" | "footerItem" | "messageContainer" | "modulesContainer" | "tableCellPackageName">;
export declare const ConfirmInstall: React.ForwardRefExoticComponent<Pick<ConfirmInstallProps, "key" | "id" | "style" | "appProps" | "className" | "classes" | "installedPackages" | "installLocations" | "onSelectionUpdate" | "installItems"> & React.RefAttributes<any>>;
export declare function getModulesFromModuleGroup(moduleGroup: ModuleGroup, allPackages: PackageData[], installedPackages: InstalledPackage[]): (LocalPackage | RemotePackage)[];
export {};
