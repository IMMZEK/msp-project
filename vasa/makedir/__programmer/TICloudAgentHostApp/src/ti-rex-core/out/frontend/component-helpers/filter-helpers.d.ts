import { Filter, FilterData, ServerFilterQuery, BrowserUrlQuery, UpdatedFilterItems } from '../apis/filter-types';
import { PackageGroupData } from '../../shared/routes/response-data';
/**
 * For working with Filter.Options, ServerFilterQuery.Params, and BrowserUrlQuery.Params
 * and translating between them.
 *
 */
/**
 * Sort the query. Useful to improve cache performance
 */
export declare function sortQuery<T extends object>(query: T): T;
/**
 * Check if the filter based url query params have changed
 */
export declare function hasBrowserUrlQueryFilterItemsChanged(previousUrlQuery: BrowserUrlQuery.Params, nextUrlQuery: BrowserUrlQuery.Params): boolean;
/**
 * Get the urlQuery as a string (sorted). Useful for comparing.
 *
 */
export declare function getBrowserUrlQueryFilterAsString(urlQuery: BrowserUrlQuery.Params, includeSelectedNode?: boolean, includeAll?: boolean): string;
export declare function getFilterFromBrowserUrlQuery(urlQuery: BrowserUrlQuery.Params, allGroups: PackageGroupData[], filterOptions: FilterData.Options): Filter;
export declare function getBrowserUrlQueryFromUpdatedFilterItems(updatedFilterItems: UpdatedFilterItems, urlQuery: BrowserUrlQuery.Params): BrowserUrlQuery.Params;
export declare function getServerFilterQueryFromBrowserUrlQuery(urlQuery: BrowserUrlQuery.Params, allGroups: PackageGroupData[], filterOptions: FilterData.Options): ServerFilterQuery.Params;
