import { BrowserUrlQuery } from '../apis/filter-types';
import { FilterData, PackageGroupData } from '../../shared/routes/response-data';
/**
 * Get the set of package groups for the given url query.
 *
 * @param addedPackageGroups
 * @param removedPackageGroups
 * @param allGroups
 * @param filterOptions
 *
 * @returns packageGroups
 */
export declare function getPackagesGroupsFromBrowserUrlQuery(addedPackageGroups: BrowserUrlQuery.PackageGroups, removedPackageGroups: BrowserUrlQuery.PackageGroups, allGroups: PackageGroupData[], filterOptions: FilterData.Options): PackageGroupData[];
