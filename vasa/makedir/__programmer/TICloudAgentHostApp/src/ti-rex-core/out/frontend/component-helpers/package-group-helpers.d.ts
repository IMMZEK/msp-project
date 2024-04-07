import { BrowserUrlQuery } from '../apis/filter-types';
import { PackageGroupData } from '../../shared/routes/response-data';
export declare const enum PackageGroupSelectionUpdate {
    Added = "Added",
    Removed = "Removed"
}
/**
 * For working with package groups. Note these functions rely on the ordering in allGroups being
 * grouped by version then from newest to oldest version
 *
 */
/**
 * Return true if the packageGroup is latest
 * (it's the highest version and not explicitly included in the url query).
 *
 * @param group
 * @param urlQuery
 * @param allGroups
 *
 * @returns isLatest
 */
export declare function isLatest(group: PackageGroupData, urlQuery: BrowserUrlQuery.Params, allGroups: PackageGroupData[]): boolean;
/**
 * Return true if the packageGroup is the highest version.
 *
 * @param group
 * @param allGroups
 *
 * @returns isHighestVersion
 */
export declare function isHighestVersion(group: PackageGroupData, allGroups: PackageGroupData[]): boolean;
/**
 * BrowserUrlQuery.Packages -> PackageGroupData[]
 *
 * @param packageGroups
 * @param allGroups
 *
 * @returns packageGroups
 */
export declare function getPackageGroups(packageGroups: BrowserUrlQuery.PackageGroups, allGroups: PackageGroupData[]): (PackageGroupData & {
    isLatest: boolean;
})[];
