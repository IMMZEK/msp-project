"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerFilterQueryFromBrowserUrlQuery = exports.getBrowserUrlQueryFromUpdatedFilterItems = exports.getFilterFromBrowserUrlQuery = exports.getBrowserUrlQueryFilterAsString = exports.hasBrowserUrlQueryFilterItemsChanged = exports.sortQuery = void 0;
// 3rd party
const _ = require("lodash");
const QueryString = require("query-string");
const get_package_groups_from_browser_url_query_1 = require("./get-package-groups-from-browser-url-query");
const response_data_1 = require("../../shared/routes/response-data");
const package_group_helpers_1 = require("./package-group-helpers");
const util_1 = require("../../shared/util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * For working with Filter.Options, ServerFilterQuery.Params, and BrowserUrlQuery.Params
 * and translating between them.
 *
 */
/**
 * Sort the query. Useful to improve cache performance
 */
function sortQuery(query) {
    // Note: query-string seems to sort the properties by key already
    // only need to sort the actual arrays
    const sorted = { ...query };
    (0, util_1.getObjectKeys)(query).forEach(key => {
        (0, util_1.setValueForPair)(sorted, query, key, item => (Array.isArray(item) ? item.sort() : item));
    });
    return sorted;
}
exports.sortQuery = sortQuery;
/**
 * Check if the filter based url query params have changed
 */
function hasBrowserUrlQueryFilterItemsChanged(previousUrlQuery, nextUrlQuery) {
    const previousFilterOnlyUrlQuery = {};
    const nextFilterOnlyUrlQuery = {};
    (0, util_1.getObjectKeys)({ ...previousUrlQuery, ...nextUrlQuery }).forEach(urlQueryKey => {
        switch (urlQueryKey) {
            case 'compilers':
            case 'devices':
            case 'devtools':
            case 'ides':
            case 'kernels':
            case 'languages':
            case 'resourceClasses':
            case 'a':
            case 'r':
            case 'search':
            case 'nodeType':
                if (previousUrlQuery[urlQueryKey]) {
                    (0, util_1.setValueForPair)(previousFilterOnlyUrlQuery, previousUrlQuery, urlQueryKey, item => item);
                }
                if (nextUrlQuery[urlQueryKey]) {
                    (0, util_1.setValueForPair)(nextFilterOnlyUrlQuery, nextUrlQuery, urlQueryKey, item => item);
                }
                break;
            // non-filter based keys
            case 'chapter':
            case 'link':
            case 'fullTextSearch':
            case 'fullTextSearchPage':
            case 'node':
            case 'tableViewNode':
            case 'modeTableView':
            case 'packageDependencies':
            case 'placeholder':
            case 'theiaPort':
            case 'theiaTheme':
                break;
            default:
                (0, util_1.assertNever)(urlQueryKey);
                throw new Error(`Unknown query item ${urlQueryKey}`);
        }
    });
    return !_.isEqual(previousFilterOnlyUrlQuery, nextFilterOnlyUrlQuery);
}
exports.hasBrowserUrlQueryFilterItemsChanged = hasBrowserUrlQueryFilterItemsChanged;
/**
 * Get the urlQuery as a string (sorted). Useful for comparing.
 *
 */
function getBrowserUrlQueryFilterAsString(urlQuery, includeSelectedNode = false, includeAll = false) {
    const filterOnlyUrlQuery = {};
    (0, util_1.getObjectKeys)(urlQuery).forEach(urlQueryKey => {
        switch (urlQueryKey) {
            case 'compilers':
            case 'devices':
            case 'devtools':
            case 'ides':
            case 'kernels':
            case 'languages':
            case 'resourceClasses':
            case 'nodeType':
            case 'a':
            case 'r':
            case 'search':
                (0, util_1.setValueForPair)(filterOnlyUrlQuery, urlQuery, urlQueryKey, item => item);
                break;
            case 'node':
                if (includeSelectedNode) {
                    (0, util_1.setValueForPair)(filterOnlyUrlQuery, urlQuery, urlQueryKey, item => item);
                }
                break;
            // non-filter based keys
            case 'chapter':
            case 'link':
            case 'fullTextSearch':
            case 'fullTextSearchPage':
            case 'tableViewNode':
            case 'modeTableView':
            case 'packageDependencies':
            case 'placeholder':
            case 'theiaPort':
            case 'theiaTheme':
                if (includeAll) {
                    (0, util_1.setValueForPair)(filterOnlyUrlQuery, urlQuery, urlQueryKey, item => item);
                }
                break;
            default:
                (0, util_1.assertNever)(urlQueryKey);
                throw new Error(`Unknown query item ${urlQueryKey}`);
        }
    });
    return QueryString.stringify(sortQuery(filterOnlyUrlQuery));
}
exports.getBrowserUrlQueryFilterAsString = getBrowserUrlQueryFilterAsString;
/// BrowserUrlQuery.Params -> Filter
function getFilterFromBrowserUrlQuery(urlQuery, allGroups, filterOptions) {
    const filter = {
        compilers: [],
        devices: [],
        devtools: [],
        ides: [],
        kernels: [],
        languages: [],
        resourceClasses: [],
        search: null,
        addedPackageGroups: [],
        removedPackageGroups: [],
        nodeType: []
    };
    (0, util_1.getObjectKeys)(urlQuery).forEach(urlQueryKey => {
        switch (urlQueryKey) {
            case 'compilers':
            case 'devices':
            case 'devtools':
            case 'ides':
            case 'kernels':
            case 'languages':
            case 'resourceClasses':
                filter[urlQueryKey] = getFilterItemFromBrowserUrlQueryItem(filterOptions, urlQuery, urlQueryKey, urlQueryKey);
                break;
            case 'nodeType':
                const nodeTypes = Object.values(response_data_1.Nodes.NodeType);
                const urlNodeTypes = urlQuery[urlQueryKey];
                const filteredNodeTypes = urlNodeTypes
                    ? urlNodeTypes.filter(item => nodeTypes.includes(item))
                    : null;
                filter[urlQueryKey] = filteredNodeTypes;
                break;
            case 'a':
            case 'r':
                const value = urlQuery[urlQueryKey];
                const filterKey = urlQueryKey === 'a' ? 'addedPackageGroups' : 'removedPackageGroups';
                filter[filterKey] = value ? (0, package_group_helpers_1.getPackageGroups)(value, allGroups) : [];
                break;
            case 'search':
                filter[urlQueryKey] = urlQuery[urlQueryKey] || null;
                break;
            // non-filter based keys
            case 'chapter':
            case 'link':
            case 'fullTextSearch':
            case 'fullTextSearchPage':
            case 'node':
            case 'tableViewNode':
            case 'modeTableView':
            case 'packageDependencies':
            case 'placeholder':
            case 'theiaPort':
            case 'theiaTheme':
                break;
            default:
                (0, util_1.assertNever)(urlQueryKey);
                throw new Error(`Unknown query item ${urlQueryKey}`);
        }
    });
    return filter;
}
exports.getFilterFromBrowserUrlQuery = getFilterFromBrowserUrlQuery;
/// UpdatedFilterItems -> BrowserUrlQuery.Params
function getBrowserUrlQueryFromUpdatedFilterItems(updatedFilterItems, urlQuery) {
    return getUpdatedBrowserUrlQuery(urlQuery, getUpdatedBrowserUrlQueryItemsFromUpdatedFilterItems(updatedFilterItems));
}
exports.getBrowserUrlQueryFromUpdatedFilterItems = getBrowserUrlQueryFromUpdatedFilterItems;
/// BrowserUrlQuery.Params -> ServerFilterQuery.Params
function getServerFilterQueryFromBrowserUrlQuery(urlQuery, allGroups, filterOptions) {
    const query = {
        filterPackageGroup: []
    };
    const filter = getFilterFromBrowserUrlQuery(urlQuery, allGroups, filterOptions);
    // Use the filter so we don't have to validate the urlQuery (getFilterFromBrowserUrlQuery takes care of this)
    (0, util_1.getObjectKeys)(urlQuery).forEach(urlQueryKey => {
        let serverFilterQueryKey = null;
        let filterKey = null;
        switch (urlQueryKey) {
            case 'compilers':
                serverFilterQueryKey = 'filterCompiler';
                filterKey = urlQueryKey;
                break;
            case 'devices':
                serverFilterQueryKey = 'filterDevice';
                filterKey = urlQueryKey;
                break;
            case 'devtools':
                serverFilterQueryKey = 'filterDevtool';
                filterKey = urlQueryKey;
                break;
            case 'ides':
                serverFilterQueryKey = 'filterIde';
                filterKey = urlQueryKey;
                break;
            case 'kernels':
                serverFilterQueryKey = 'filterKernel';
                filterKey = urlQueryKey;
                break;
            case 'languages':
                serverFilterQueryKey = 'filterLanguage';
                filterKey = urlQueryKey;
                break;
            case 'resourceClasses':
                serverFilterQueryKey = 'filterResourceClass';
                filterKey = urlQueryKey;
                break;
            case 'search':
                serverFilterQueryKey = 'filterSearch';
                filterKey = urlQueryKey;
                break;
            case 'nodeType':
                serverFilterQueryKey = 'filterNode';
                filterKey = urlQueryKey;
                break;
            case 'a':
            case 'r':
            // non-filter based keys
            case 'chapter':
            case 'link':
            case 'fullTextSearch':
            case 'fullTextSearchPage':
            case 'node':
            case 'tableViewNode':
            case 'modeTableView':
            case 'packageDependencies':
            case 'placeholder':
            case 'theiaPort':
            case 'theiaTheme':
                break;
            default:
                (0, util_1.assertNever)(urlQueryKey);
                throw new Error(`Unknown filter item ${urlQueryKey}`);
        }
        if (!serverFilterQueryKey || !filterKey) {
            return;
        }
        if (filterKey === 'search' || filterKey === 'nodeType') {
            const value = filter[filterKey] || undefined;
            if (value) {
                // @ts-ignore issue with query[serverFilterQueryKey] potentially being a string[]
                query[serverFilterQueryKey] = value;
            }
        }
        else {
            const value = _.map(filter[filterKey], item => item.publicId);
            if (!_.isEmpty(value)) {
                // @ts-ignore issue with query[serverFilterQueryKey] potentially being a string
                query[serverFilterQueryKey] = value;
            }
        }
    });
    const addedPackageGroups = urlQuery.a ? urlQuery.a : [];
    const removedPackageGroups = urlQuery.r ? urlQuery.r : [];
    query.filterPackageGroup = (0, get_package_groups_from_browser_url_query_1.getPackagesGroupsFromBrowserUrlQuery)(addedPackageGroups, removedPackageGroups, allGroups, filterOptions).map(group => group.packageGroupPublicUid);
    return query;
}
exports.getServerFilterQueryFromBrowserUrlQuery = getServerFilterQueryFromBrowserUrlQuery;
///////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////
/**
 * Get the Filter property filtered based on the BrowserUrlQuery.Params property.
 * This is only meant for the common use case where keys which map
 * 1:1 (1 filterKey to 1 urlQueryKey) with the Filter property only
 * using FilterData.Data (no additional fields).
 *
 * @param urlQuery
 * @param filterDataKey
 * @param urlQueryKey
 *
 * @returns {Promise} filteredFilterData
 */
function getFilterItemFromBrowserUrlQueryItem(filterOptions, urlQuery, filterDataKey, urlQueryKey) {
    const item = urlQuery[urlQueryKey] || [];
    const filterData = filterOptions[filterDataKey];
    return filterData.filter(({ publicId }) => item.includes(publicId));
}
function getUpdatedBrowserUrlQueryItemsFromUpdatedFilterItems(updatedFilterItems) {
    const updatedUrlQueryItems = {};
    (0, util_1.getObjectKeys)(updatedFilterItems).forEach(key => {
        switch (key) {
            case 'compilers':
            case 'devices':
            case 'devtools':
            case 'ides':
            case 'kernels':
            case 'languages':
            case 'resourceClasses': {
                const value = getUpdatedFilterItemFromUrlQueryItem(updatedFilterItems, key);
                updatedUrlQueryItems[key] = value;
                break;
            }
            case 'addedPackageGroups':
            case 'removedPackageGroups': {
                const browserUrlQueryKey = key === 'addedPackageGroups' ? 'a' : 'r';
                const items = updatedFilterItems[key];
                const value = items
                    ? items.map(item => `${item.packageGroupPublicId}__${item.packageGroupVersion}`)
                    : items;
                updatedUrlQueryItems[browserUrlQueryKey] = value;
                break;
            }
            case 'search':
                updatedUrlQueryItems[key] = updatedFilterItems[key];
                break;
            case 'nodeType':
                updatedUrlQueryItems[key] = updatedFilterItems[key];
                break;
            default:
                (0, util_1.assertNever)(key);
                throw new Error(`Unknown filter item ${key}`);
        }
    });
    return updatedUrlQueryItems;
}
/**
 * Get an updated url query which combines the current url query with the keys you updated.
 * Note: to delete a key from the url query set the value of an updatedItem to null.
 *
 * @param updatedItems - The set of keys to update.
 * @param currentUrlQuery - The current url query
 *
 * @returns urlQuery - The updated url query.
 */
function getUpdatedBrowserUrlQuery(currentUrlQuery, updatedItems) {
    const urlQuery = { ...currentUrlQuery };
    (0, util_1.getObjectKeys)(updatedItems).forEach(filterKey => {
        const item = updatedItems[filterKey];
        if (item) {
            (0, util_1.setValueForPair)(urlQuery, updatedItems, filterKey, item => item);
        }
        else if (item === null) {
            delete urlQuery[filterKey];
        }
    });
    return urlQuery;
}
function getUpdatedFilterItemFromUrlQueryItem(updatedFilterItems, updatedFilterItemKey) {
    const items = updatedFilterItems[updatedFilterItemKey];
    // Return items instead of null because if it was passed as null it means delete this key.
    // If it was undefined then that just means skip it (don't update) -
    // it may be an artifact of how it was created.
    return items ? items.map(item => item.publicId) : items;
}
