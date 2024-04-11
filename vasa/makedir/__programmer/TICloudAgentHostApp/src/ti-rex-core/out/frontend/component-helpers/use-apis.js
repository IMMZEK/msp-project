"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._useApi = exports.useGetSearchResultsPage = exports.useGetRex3LinkToDbId = exports.useGetNodeDbId = exports.useGetNodeInfoForGlobalId = exports.useGetNodeInfoForResourceId = exports.useGetFilterOptions = exports.useGetPackageGroups = exports.useGetPackages = exports.useGetCustomPackageDownloadStatus = exports.useGetCustomPackageDownload = exports.useGetImportInfo = exports.useGetSearchSuggesgtions = exports.useExpandNode = exports.useGetTableViewFilters = exports.useGetNodeDataForTableItemVariant = exports.useGetFilteredTableItems = exports.useGetFilteredChildrenNodes = exports.useGetExtendedNodes = exports.useGetNodes = exports.useApi = void 0;
const use_async_operation_1 = require("./use-async-operation");
const use_previous_1 = require("./use-previous");
const filter_helpers_1 = require("./filter-helpers");
const util_1 = require("./util");
const page_1 = require("../../shared/routes/page");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function useApi(args) {
    const { errorCallback, dependencies, api, apis, trigger = true, manageControl = false, masterName = null } = args;
    const result = (0, use_async_operation_1.useAsyncOperation)({
        operation: async () => {
            if (!trigger) {
                return null;
            }
            else if (manageControl && !masterName) {
                throw new Error('Attempting to manageControl without a masterName provided');
            }
            let result;
            if (manageControl && masterName) {
                await apis.getAPIControl().acquireControl(masterName);
            }
            result = await api();
            if (manageControl && masterName) {
                apis.getAPIControl().releaseControl(masterName);
            }
            return result;
        },
        dependencies: [...dependencies, trigger, masterName],
        errorCallback
    });
    const prevResult = (0, use_previous_1.usePrevious)(result, { update: trigger });
    // Don't update result when trigger is false
    return prevResult && !trigger ? prevResult : result;
}
exports.useApi = useApi;
function useGetNodes(args) {
    const { apis, ids, masterName } = args;
    return useApi({
        api: async () => {
            if (!ids) {
                throw new Error('Missing input param');
            }
            return apis.getNodes(ids, masterName);
        },
        dependencies: [ids && ids.join(',')],
        ...args
    });
}
exports.useGetNodes = useGetNodes;
function useGetExtendedNodes(args) {
    const { apis, id, masterName } = args;
    return useApi({
        api: async () => {
            if (!id) {
                throw new Error('Missing input param');
            }
            return apis.getExtendedNodes(id, masterName);
        },
        dependencies: [id],
        ...args
    });
}
exports.useGetExtendedNodes = useGetExtendedNodes;
function useGetFilteredChildrenNodes(args) {
    const { apis, parentIds, urlQuery, masterName } = args;
    return useApi({
        api: () => apis.getFilteredChildrenNodes(parentIds, urlQuery, masterName),
        dependencies: [parentIds.join(','), (0, filter_helpers_1.getBrowserUrlQueryFilterAsString)(urlQuery)],
        ...args
    });
}
exports.useGetFilteredChildrenNodes = useGetFilteredChildrenNodes;
function useGetFilteredTableItems(args) {
    const { apis, page, parentId, urlQuery, masterName } = args;
    return useApi({
        api: () => apis.getFilteredTableItems(parentId, urlQuery, page === page_1.Page.WIZARD, masterName),
        dependencies: [parentId, (0, filter_helpers_1.getBrowserUrlQueryFilterAsString)(urlQuery), page],
        ...args
    });
}
exports.useGetFilteredTableItems = useGetFilteredTableItems;
function useGetNodeDataForTableItemVariant(args) {
    const { apis, id, urlQuery, variant, masterName } = args;
    return useApi({
        api: async () => {
            if (!variant || !id) {
                throw new Error('Missing input param');
            }
            return apis.getNodeDataForTableItemVariant(id, urlQuery, variant, masterName);
        },
        dependencies: [
            id,
            (0, filter_helpers_1.getBrowserUrlQueryFilterAsString)(urlQuery),
            variant && (0, util_1.getTableItemVariantAsString)(variant)
        ],
        ...args
    });
}
exports.useGetNodeDataForTableItemVariant = useGetNodeDataForTableItemVariant;
function useGetTableViewFilters(args) {
    const { apis, page, parentId, urlQuery, masterName } = args;
    return useApi({
        api: () => {
            if (!parentId) {
                throw new Error('Missing input param');
            }
            return apis.getTableViewFilters(parentId, urlQuery, page === page_1.Page.WIZARD, masterName);
        },
        dependencies: [parentId, (0, filter_helpers_1.getBrowserUrlQueryFilterAsString)(urlQuery), page],
        ...args
    });
}
exports.useGetTableViewFilters = useGetTableViewFilters;
function useExpandNode(args) {
    const { apis, id, urlQuery, masterName } = args;
    return useApi({
        api: async () => {
            if (!id) {
                throw new Error('Missing input param');
            }
            await apis.expandNode(id, urlQuery, masterName);
            return true;
        },
        dependencies: [id, (0, filter_helpers_1.getBrowserUrlQueryFilterAsString)(urlQuery)],
        ...args
    });
}
exports.useExpandNode = useExpandNode;
function useGetSearchSuggesgtions(args) {
    const { apis, text, urlQuery, masterName } = args;
    return useApi({
        api: () => apis.getSearchSuggestions(text, urlQuery, masterName),
        dependencies: [text, (0, filter_helpers_1.getBrowserUrlQueryFilterAsString)(urlQuery)],
        ...args
    });
}
exports.useGetSearchSuggesgtions = useGetSearchSuggesgtions;
function useGetImportInfo(args) {
    const { apis, id, urlQuery, masterName } = args;
    return useApi({
        api: () => apis.getImportInfo(id, urlQuery, masterName),
        dependencies: [id, (0, filter_helpers_1.getBrowserUrlQueryFilterAsString)(urlQuery)],
        ...args
    });
}
exports.useGetImportInfo = useGetImportInfo;
function useGetCustomPackageDownload(args) {
    const { apis, packages, zipFilePrefix, masterName } = args;
    return useApi({
        api: () => apis.getCustomPackageDownload(packages, zipFilePrefix, masterName),
        dependencies: [packages.join(','), zipFilePrefix],
        ...args
    });
}
exports.useGetCustomPackageDownload = useGetCustomPackageDownload;
function useGetCustomPackageDownloadStatus(args) {
    const { apis, requestToken, progress, masterName } = args;
    return useApi({
        api: () => {
            console.log('getting progress');
            if (!requestToken) {
                throw new Error('Missing input param');
            }
            return apis.getCustomPackageDownloadStatus(requestToken, masterName);
        },
        dependencies: [requestToken, progress],
        ...args
    });
}
exports.useGetCustomPackageDownloadStatus = useGetCustomPackageDownloadStatus;
function useGetPackages(args) {
    const { apis, masterName } = args;
    return useApi({
        api: () => apis.getPackages(masterName),
        dependencies: [],
        ...args
    });
}
exports.useGetPackages = useGetPackages;
function useGetPackageGroups(args) {
    const { apis, masterName } = args;
    return useApi({
        api: () => apis.getPackageGroups(masterName),
        dependencies: [],
        ...args
    });
}
exports.useGetPackageGroups = useGetPackageGroups;
function useGetFilterOptions(args) {
    const { apis, masterName } = args;
    return useApi({
        api: () => apis.getFilterOptions(masterName),
        dependencies: [],
        ...args
    });
}
exports.useGetFilterOptions = useGetFilterOptions;
function useGetNodeInfoForResourceId(args) {
    const { apis, query, masterName } = args;
    return useApi({
        api: () => apis.getNodeInfoForResourceId(query, masterName),
        dependencies: [query],
        ...args
    });
}
exports.useGetNodeInfoForResourceId = useGetNodeInfoForResourceId;
function useGetNodeInfoForGlobalId(args) {
    const { apis, query, masterName } = args;
    return useApi({
        api: () => apis.getNodeInfoForGlobalId(query, masterName),
        dependencies: [query],
        ...args
    });
}
exports.useGetNodeInfoForGlobalId = useGetNodeInfoForGlobalId;
function useGetNodeDbId(args) {
    const { apis, nodePublicId, packageGroupPublicUid, packagePublicId, isLatest, masterName } = args;
    return useApi({
        api: () => apis.getNodeDbId(nodePublicId, packageGroupPublicUid, packagePublicId, isLatest, masterName),
        dependencies: [nodePublicId, packageGroupPublicUid, packagePublicId],
        ...args
    });
}
exports.useGetNodeDbId = useGetNodeDbId;
function useGetRex3LinkToDbId(args) {
    const { apis, link, masterName } = args;
    return useApi({
        api: () => apis.getRex3LinkToDbId(link, masterName),
        dependencies: [link],
        ...args
    });
}
exports.useGetRex3LinkToDbId = useGetRex3LinkToDbId;
function useGetSearchResultsPage(args) {
    const { apis, textSearch, pageNum, resultsPerPage, hiddenQuery, masterName } = args;
    return useApi({
        api: async () => {
            if (!textSearch) {
                return null;
            }
            return apis.getSearchResultsPage({
                textSearch,
                pageNum,
                resultsPerPage,
                hiddenQuery,
                masterName
            });
        },
        dependencies: [textSearch, pageNum, resultsPerPage, hiddenQuery.join(',')],
        ...args
    });
}
exports.useGetSearchResultsPage = useGetSearchResultsPage;
// For test purposes only
exports._useApi = useApi;
