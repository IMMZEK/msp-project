"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApisCacheInterface = void 0;
// 3rd party
const QueryString = require("query-string");
// our modules
const cache_1 = require("./cache");
const filter_helpers_1 = require("../component-helpers/filter-helpers");
const util_1 = require("../../shared/util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class ApisCacheInterface {
    static FILTER_OPTIONS_KEY = 'filterOptions';
    static PACKAGES_KEY = 'packages';
    static PACKAGE_GROUPS_KEY = 'packageGroups';
    static DATA_CACHE_SIZE = 10000;
    static MINOR_DATA_SIZE = 10;
    static RELATION_CACHE_SIZE = 1000;
    // Cache - data
    nodesDataCache = new cache_1.Cache(ApisCacheInterface.DATA_CACHE_SIZE); // id: Node
    extendedNodesDataCache = new cache_1.Cache(ApisCacheInterface.DATA_CACHE_SIZE); // id: NodeExtended
    filterOptionsCache = new cache_1.Cache(1); // filterOptionsKey: filterOptions
    searchSugestionsCache = new cache_1.Cache(ApisCacheInterface.MINOR_DATA_SIZE); // text: suggestions
    packagesCache = new cache_1.Cache(1);
    packageGroupsCache = new cache_1.Cache(1);
    importInfoCache = new cache_1.Cache(ApisCacheInterface.MINOR_DATA_SIZE);
    tableItemDataCache = new cache_1.Cache(ApisCacheInterface.DATA_CACHE_SIZE);
    tableViewFiltersDataCache = new cache_1.Cache(ApisCacheInterface.DATA_CACHE_SIZE);
    searchResultsPageCache = new cache_1.Cache(ApisCacheInterface.DATA_CACHE_SIZE);
    nodeInfoForLandingPageId = new cache_1.Cache(ApisCacheInterface.DATA_CACHE_SIZE);
    // Cache - relations
    filteredChildrenNodeIdsCache = new cache_1.Cache(ApisCacheInterface.RELATION_CACHE_SIZE); // parentId+query: childrenIds
    filteredDescendentNodeIdsCache = new cache_1.Cache(ApisCacheInterface.RELATION_CACHE_SIZE); // parentId+query: descendentIds
    nodeDbIdCache = new cache_1.Cache(ApisCacheInterface.RELATION_CACHE_SIZE); // nodePublicId+packageGroupPublicUid: nodeDbId
    rex3LinkToDbIdCache = new cache_1.Cache(ApisCacheInterface.RELATION_CACHE_SIZE); // rex3Link: nodeDbId, cache for consistency and tests
    filteredChildrenTableItemIdsCache = new cache_1.Cache(ApisCacheInterface.RELATION_CACHE_SIZE); // parentId+query:childrenIds
    nodeDbIdForTableItemVariantCache = new cache_1.Cache(ApisCacheInterface.RELATION_CACHE_SIZE); // id+query+variant:nodeDbId
    static getUrlQueryCacheKeys(ids, query) {
        const items = ids.map(id => {
            const cacheKey = this.urlQueryCacheKey(id, query);
            return { id, cacheKey };
        });
        const result = (0, util_1.objectFromKeyValuePairs)(items.map(({ id, cacheKey }) => ({ key: id, value: cacheKey })));
        return result;
    }
    static urlQueryCacheKey(id, query) {
        const queryString = QueryString.stringify({
            ...(0, filter_helpers_1.sortQuery)(query),
            parentId: id
        });
        return queryString;
    }
    clearCache() {
        this.nodesDataCache.clear();
        this.extendedNodesDataCache.clear();
        this.filterOptionsCache.clear();
        this.searchSugestionsCache.clear();
        this.packagesCache.clear();
        this.packageGroupsCache.clear();
        this.importInfoCache.clear();
        this.tableItemDataCache.clear();
        this.tableViewFiltersDataCache.clear();
        this.searchResultsPageCache.clear();
        this.nodeInfoForLandingPageId.clear();
        this.filteredChildrenNodeIdsCache.clear();
        this.filteredDescendentNodeIdsCache.clear();
        this.nodeDbIdCache.clear();
        this.rex3LinkToDbIdCache.clear();
        this.filteredChildrenTableItemIdsCache.clear();
        this.nodeDbIdForTableItemVariantCache.clear();
    }
    // For test purposes only
    _clearFilteredDescendentNodeIdsCache() {
        this.filteredDescendentNodeIdsCache.clear();
    }
    _clearNodesDataCache() {
        this.nodesDataCache.clear();
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Getters
    ///////////////////////////////////////////////////////////////////////////
    getNodesData(id) {
        return this.nodesDataCache.get(id);
    }
    getNodesDataBulk(ids) {
        const { result, missingIds } = ApisCacheInterface.getBulk(ids.map(id => ({ cacheKey: id, id })), this.nodesDataCache);
        return { nodesData: result, missingIds };
    }
    getExtendedNodesData(id) {
        return this.extendedNodesDataCache.get(id);
    }
    getExtendedNodesDataBulk(ids) {
        const { result, missingIds } = ApisCacheInterface.getBulk(ids.map(id => ({
            cacheKey: id,
            id
        })), this.extendedNodesDataCache);
        return { extendedNodesData: result, missingIds };
    }
    getFilteredChildrenNodeIds(cacheKey) {
        return this.filteredChildrenNodeIdsCache.get(cacheKey);
    }
    getFilteredChildrenNodeIdsBulk(parentIds, query) {
        const items = parentIds.map(id => {
            const key = ApisCacheInterface.urlQueryCacheKey(id, query);
            return { cacheKey: key, id };
        });
        const { result, missingIds } = ApisCacheInterface.getBulk(items, this.filteredChildrenNodeIdsCache);
        return { filteredChildrenNodeIds: result, missingIds };
    }
    getFilteredDescendentNodeIds(cacheKey) {
        return this.filteredDescendentNodeIdsCache.get(cacheKey);
    }
    getSearchSugestions(cacheKey) {
        return this.searchSugestionsCache.get(cacheKey);
    }
    getImportInfo(cacheKey) {
        return this.importInfoCache.get(cacheKey);
    }
    getPackages() {
        return this.packagesCache.get(ApisCacheInterface.PACKAGES_KEY);
    }
    getPackageGroups() {
        return this.packageGroupsCache.get(ApisCacheInterface.PACKAGE_GROUPS_KEY);
    }
    getFilterOptions() {
        return this.filterOptionsCache.get(ApisCacheInterface.FILTER_OPTIONS_KEY);
    }
    getNodeDbId({ nodePublicId, packageGroupPublicUid, packagePublicId, isLatest }) {
        return this.nodeDbIdCache.get(this.getNodeDbIdCacheKey({
            nodePublicId,
            packageGroupPublicUid,
            packagePublicId,
            isLatest
        }));
    }
    getRex3LinkToDbId(link) {
        return this.rex3LinkToDbIdCache.get(link);
    }
    getTableItemData(tableItemId) {
        return this.tableItemDataCache.get(tableItemId);
    }
    getTableViewFiltersData(cacheKey) {
        return this.tableViewFiltersDataCache.get(cacheKey);
    }
    getSearchResultsPage(cacheKey) {
        return this.searchResultsPageCache.get(cacheKey);
    }
    getNodeInfoForId(cacheKey) {
        return this.nodeInfoForLandingPageId.get(cacheKey);
    }
    getFilterChildrenTableItemIds(cacheKey) {
        return this.filteredChildrenTableItemIdsCache.get(cacheKey);
    }
    getNodeDbIdForTableItemVariant(cacheKey) {
        return this.nodeDbIdForTableItemVariantCache.get(cacheKey);
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Setters
    ///////////////////////////////////////////////////////////////////////////
    // These methods update the cache with the missing items
    // Returns the object(s) referenced from cache
    setNode(nodes) {
        return this._setNodes(nodes);
    }
    setNodes(nodes) {
        return nodes.map(node => {
            return this._setNodes(node);
        });
    }
    setNodeExtended(nodes) {
        return this._setNodesExtended(nodes);
    }
    setNodesExtended(nodes) {
        return nodes.map(node => {
            this._setNodesExtended(node);
        });
    }
    setFilteredChildrenNodeIds(cacheKey, childrenIds) {
        const cachedItem = this.filteredChildrenNodeIdsCache.get(cacheKey);
        return cachedItem || this.filteredChildrenNodeIdsCache.insert(cacheKey, childrenIds);
    }
    setFilteredDescendentNodeIds(cacheKey, childrenIds) {
        const cachedItem = this.filteredDescendentNodeIdsCache.get(cacheKey);
        return cachedItem || this.filteredDescendentNodeIdsCache.insert(cacheKey, childrenIds);
    }
    setSearchSuggestions(cacheKey, suggestions) {
        const cachedItem = this.searchSugestionsCache.get(cacheKey);
        return cachedItem || this.searchSugestionsCache.insert(cacheKey, suggestions);
    }
    setImportInfo(cacheKey, info) {
        const cachedItem = this.importInfoCache.get(cacheKey);
        return cachedItem || this.importInfoCache.insert(cacheKey, info);
    }
    setPackages(packages) {
        const cachedItem = this.packagesCache.get(ApisCacheInterface.PACKAGES_KEY);
        return cachedItem || this.packagesCache.insert(ApisCacheInterface.PACKAGES_KEY, packages);
    }
    setPackageGroups(packageGroups) {
        const cachedItem = this.packageGroupsCache.get(ApisCacheInterface.PACKAGE_GROUPS_KEY);
        return (cachedItem ||
            this.packageGroupsCache.insert(ApisCacheInterface.PACKAGE_GROUPS_KEY, packageGroups));
    }
    setFilterOptions(filterOptions) {
        const cachedItem = this.filterOptionsCache.get(ApisCacheInterface.FILTER_OPTIONS_KEY);
        return (cachedItem ||
            this.filterOptionsCache.insert(ApisCacheInterface.FILTER_OPTIONS_KEY, filterOptions));
    }
    setNodeDbId({ nodeDbId, nodePublicId, packagePublicId, packageGroupPublicUid, isLatest }) {
        const cacheKey = this.getNodeDbIdCacheKey({
            nodePublicId,
            packageGroupPublicUid,
            packagePublicId,
            isLatest
        });
        const cachedItem = this.nodeDbIdCache.get(cacheKey);
        return cachedItem || this.nodeDbIdCache.insert(cacheKey, nodeDbId);
    }
    setRex3LinkToDbId({ rex3Link, dbId }) {
        const cachedItem = this.rex3LinkToDbIdCache.get(rex3Link);
        return cachedItem || this.rex3LinkToDbIdCache.insert(rex3Link, dbId);
    }
    setTableItems(tableItems) {
        return tableItems.map(item => {
            const cachedItem = this.tableItemDataCache.get(item.tableItemDbId);
            return cachedItem || this.tableItemDataCache.insert(item.tableItemDbId, item);
        });
    }
    setTableViewFiltersData(cacheKey, data) {
        const cachedItem = this.tableViewFiltersDataCache.get(cacheKey);
        return cachedItem || this.tableViewFiltersDataCache.insert(cacheKey, data);
    }
    setSearchResultsPage(cacheKey, page) {
        const cachedItem = this.searchResultsPageCache.get(cacheKey);
        return cachedItem || this.searchResultsPageCache.insert(cacheKey, page);
    }
    setNodeInfoForId(cacheKey, result) {
        const cachedItem = this.nodeInfoForLandingPageId.get(cacheKey);
        return cachedItem || this.nodeInfoForLandingPageId.insert(cacheKey, result);
    }
    setFilteredChildrenTableItemIds(cacheKey, tableItemIds) {
        const cachedItem = this.filteredChildrenTableItemIdsCache.get(cacheKey);
        return cachedItem || this.filteredChildrenTableItemIdsCache.insert(cacheKey, tableItemIds);
    }
    setNodeDbIdForTableItemVariant({ cacheKey, nodeDbId }) {
        const cachedItem = this.nodeDbIdForTableItemVariantCache.get(cacheKey);
        return cachedItem || this.nodeDbIdForTableItemVariantCache.insert(cacheKey, nodeDbId);
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Private methods
    ///////////////////////////////////////////////////////////////////////////
    static getBulk(keyIdPairs, cache) {
        const items = keyIdPairs.map(({ cacheKey, id }) => ({ id, data: cache.get(cacheKey) }));
        const validItems = items.filter((item) => {
            return !!item.data;
        });
        const missingIds = items.filter(item => !item.data).map(item => item.id);
        return {
            result: (0, util_1.objectFromKeyValuePairs)(validItems.map(({ id, data }) => ({ key: id, value: data }))),
            missingIds
        };
    }
    _setNodesExtended(node) {
        const cachedNode = this.extendedNodesDataCache.get(node.nodeDbId);
        return cachedNode || this.extendedNodesDataCache.insert(node.nodeDbId, node);
    }
    _setNodes(node) {
        const cachedNode = this.nodesDataCache.get(node.nodeDbId);
        return cachedNode || this.nodesDataCache.insert(node.nodeDbId, node);
    }
    getNodeDbIdCacheKey({ nodePublicId, packageGroupPublicUid, packagePublicId, isLatest }) {
        return `${nodePublicId}__${packageGroupPublicUid}__${packagePublicId}__${isLatest ? 'latest' : 'not_latest'}`;
    }
}
exports.ApisCacheInterface = ApisCacheInterface;
