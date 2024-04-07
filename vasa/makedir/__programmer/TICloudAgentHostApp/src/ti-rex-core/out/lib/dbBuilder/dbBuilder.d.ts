import { RexDB } from '../../rexdb/lib/rexdb';
import { Device, Devtool, Overview, PureBundle, Resource, PlatformAttribute, NumericPlatformAttribute } from './dbTypes';
import { BaseLogger } from '../../utils/logging';
import { Priority } from '../../utils/logging-types';
import { RexDBSplit } from '../../rexdb/lib/rexdb-split';
import { ValidationType } from '../appConfig';
export interface DBs {
    dbDevices: RexDB<Device>;
    dbDevtools: RexDB<Devtool>;
    dbResources: RexDBSplit<Resource>;
    dbOverviews: RexDBSplit<Overview>;
    dbPureBundles: RexDB<PureBundle>;
}
export interface ContentPackage {
    path: string;
    order: number;
    installPath: PlatformAttribute | null;
    installCommand: PlatformAttribute | null;
    installSize: NumericPlatformAttribute | null;
    modulePrefix: string | null;
}
export declare enum Option {
    URL = 0,
    SCHEMA = 1,
    REFRESH_SCHEMA = 2,
    ALL = 3
}
export declare const enum RefreshOperation {
    DO_NOTHING = "doNothing",
    ADD_PACKAGE = "addPackage",
    REMOVE_PACKAGE = "removePackage",
    REPLACE_PACKAGE = "replacePackage",
    EXCLUDE_PACKAGE = "excludePackage",
    UPDATED_PACKAGE = "updatedPackage"
}
export interface RefreshRequestEntry {
    installPath: PlatformAttribute;
    installCommand: PlatformAttribute | null;
    installSize: NumericPlatformAttribute;
    content: string;
    operation: RefreshOperation;
    uid: string;
    modulePrefix: string | null;
}
export declare const enum PackageRefreshResult {
    SUCCEEDED = "succeeded",
    FAILED = "failed",
    NOTFOUND = "not found",
    NOTSTARTED = "not started",
    NOTAPPLICABLE = "not applicable"
}
export interface RefreshResultEntry {
    actionResult: PackageRefreshResult;
    msgLevel?: RefreshMessageLevel;
}
export interface RefreshResult {
    package: RefreshRequestEntry;
    status: RefreshResultEntry;
}
export declare const enum RefreshMessageLevel {
    NONE = 0,
    WARNING = 1,
    ERROR_CONTINUE = 2,
    CRITICAL_ABORT_PACKAGE = 3,
    EMERGENCY_ABORT_REFRESH = 4
}
export declare const refreshMessageLevel: {
    [x in RefreshMessageLevel]: Priority;
};
export declare function updateResultAsMap(logger: BaseLogger, operation: RefreshOperation | null, fullPackageList: RefreshRequestEntry[], refreshAll: boolean, resultAsMap: Map<string, RefreshResult>, statusMap: Map<string, RefreshMessageLevel>, dbBasePath: string): Promise<boolean>;
export declare function updateOption(validationType?: ValidationType): Option;
export declare function packagePresentAndValidityChecks(originalFullPackageList: RefreshRequestEntry[], contentBasePath: string, logger: BaseLogger, validationType?: ValidationType): Promise<{
    allValid: boolean;
    refreshAll: boolean;
    fullPackageList: RefreshRequestEntry[];
    latestDevPkgMap: Map<string, {
        version: string;
        operation: RefreshOperation;
    }>;
    resultAsMap: Map<string, RefreshResult>;
    latestPkgMap: Map<string, {
        version: string;
        operation: RefreshOperation;
    }>;
}>;
export declare function createBackup(override: boolean, dbBasePath: string): Promise<void>;
export declare function restoreFromBackupAndDelete(logger: BaseLogger, dbBasePath: string): Promise<void>;
export declare function removeBackup(dbBasePath: string): Promise<void>;
export declare function getDbBackupBasePath(dbBasePath: string): string;
export declare function _refreshDatabaseDelete({ logger, packageUIds, dbs, dbBasePath }: {
    logger: BaseLogger;
    packageUIds: string[];
    dbs: DBs;
    dbBasePath: string;
}): Promise<Map<string, RefreshMessageLevel>>;
export declare function createOldOverviewsDBFile(dbOverviews: RexDBSplit<Overview>, dbBasePath: string, logger: BaseLogger): Promise<void>;
/**
 * Refresh the database.
 *
 */
export declare function _refreshDatabase({ contentPackages, dbs, refreshAll, packageUids, contentBasePath, dbBasePath, logger }: {
    contentPackages: ContentPackage[];
    dbs: DBs;
    refreshAll: boolean;
    packageUids: string[];
    contentBasePath: string;
    dbBasePath: string;
    logger: BaseLogger;
}): Promise<Map<string, RefreshMessageLevel>>;
