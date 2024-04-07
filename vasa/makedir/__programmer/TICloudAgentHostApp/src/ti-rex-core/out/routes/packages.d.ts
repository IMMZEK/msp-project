import { Request } from 'express';
import { DbSession, PackageRecordType } from '../lib/dbSession';
import { Nodes, PackageDependencyType } from '../shared/routes/response-data';
import { PlatformAttribute } from '../lib/dbBuilder/dbTypes';
export declare function getRoutes(): import("express-serve-static-core").Router;
export declare function getPackages(sqldb: DbSession, reqQuery: void, req: Request): Promise<{
    name: string;
    packageVersion: string;
    packagePublicId: string;
    packagePublicUid: string;
    packageGroupPublicUids: string[];
    packageType: Nodes.PackageType;
    licenses: string[];
    hideNodeDirPanel: boolean;
    hideByDefault: boolean;
    isInstallable: boolean;
    downloadUrl: PlatformAttribute;
    installCommand: PlatformAttribute | null;
    installSize: import("../lib/dbBuilder/dbTypes").NumericPlatformAttribute | null;
    dependencies: {
        packagePublicId: string;
        versionRange: string;
        dependencyType: PackageDependencyType;
    }[];
    modules: {
        packagePublicId: string;
        versionRange: string;
        dependencyType: PackageDependencyType;
    }[];
    moduleOf: import("../lib/dbBuilder/dbTypes").ModuleOf | undefined;
    aliases: string[];
    moduleGroups: {
        packagePublicId: string;
        versionRange: string;
        dependencyType: PackageDependencyType;
    }[];
    moduleGroup: import("../lib/dbBuilder/dbTypes").ModuleGroup | undefined;
    subType: import("../lib/dbBuilder/dbTypes").PackageSubType | undefined;
    featureType: import("../lib/dbBuilder/dbTypes").FeatureType | undefined;
    ccsVersion: string | undefined;
    ccsInstallLocation: string | undefined;
}[]>;
export declare function getPackageGroups(sqldb: DbSession, _reqQuery: void, _req: Request): Promise<{
    packageGroupVersion: string;
    packageGroupPublicId: string;
    packageGroupPublicUid: string;
    packagesPublicUids: string[];
    mainPackagePublicUid: string | null;
    hideByDefault: boolean;
    packagesToListVersionsFrom: string[];
}[]>;
export declare function decodePackageType(packageType: PackageRecordType): Nodes.PackageType;
