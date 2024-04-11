import { BrowserUrlQuery } from '../apis/filter-types';
import { FilterData, PackageGroupData } from '../../shared/routes/response-data';
export declare const enum PackageGroupSelectionUpdate {
    Added = "Added",
    Removed = "Removed"
}
/**
 * Get the updated url after applying the package group selection update
 *
 * @param query
 * @param pkgGroup
 * @param update
 * @param useLatest - use the special 'latest' pointer
 * @param allGroups
 *
 * returns urlQuery
 */
export declare function getBrowserUrlQueryFromPackageGroupSelectionUpdate(query: BrowserUrlQuery.Params, pkgGroup: PackageGroupData, update: PackageGroupSelectionUpdate, useLatest: boolean, allGroups: PackageGroupData[], _filterOptions: FilterData.Options): BrowserUrlQuery.Params;
