import DinfraType = require('dinfra');
import { Overview } from '../dbBuilder/dbTypes';
import { SqlDb } from '../../sqldb/sqldb';
import { PackageGroupJson } from '../../sqldb/manage';
interface Options {
    include?: string[];
    exclude?: string[];
    incremental?: boolean;
    verboseLogging?: boolean;
    notify_forTestingOnly?: boolean;
    dryRun?: boolean;
    quiet?: boolean;
}
export declare function metadataImport(dinfra: typeof DinfraType, sqldb: SqlDb, dbPathToImport: string, dBPathPreviouslyImported: string | null, options: Options): Promise<boolean>;
/**
 * Discover package groups from overviews.db
 *
 * Output format:
 * [
 *    {
 *      "uid": "devices",
 *      "packages": [ <package UIDs> ... ]
 *  },
 *  {
 *      "uid": "devtools",
 *      "packages": [ <package UIDs> ... ]
 *  },
 *  {
 *      "uid": <package UID of main software package>
 *      "packages": [
 *          <package UID of main software package>,
 *          <package UID of supplemental software package>,
 *          ...
 *      ]
 *  },
 *  ...
 */
export declare function discoverPackageGroups(dbPath: string, includedPackageUIds?: string[], excludedPackageUIds?: string[]): Promise<{
    packageGroupsDef: PackageGroupJson[];
}>;
/**
 * Remove duplicate packages
 */
export declare function removeDuplicatePackages(packageRecords: Overview[]): Overview[];
export {};
