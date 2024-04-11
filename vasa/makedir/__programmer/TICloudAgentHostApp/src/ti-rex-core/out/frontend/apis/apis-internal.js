"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY = exports._PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY = exports.APIsInternal = void 0;
// 3rd party modules
const _ = require("lodash");
const QueryString = require("query-string");
// our modules
const apis_cache_interface_1 = require("./apis-cache-interface");
const server_interface_1 = require("./server-interface");
const util_1 = require("../../shared/util");
const counter_1 = require("../component-helpers/counter");
const util_2 = require("../component-helpers/util");
const filter_helpers_1 = require("../component-helpers/filter-helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
const PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY = 'placeholder';
const PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY = 'placeholder2';
const DEBUG = false;
class APIsInternal {
    serverInterface = new server_interface_1.ServerInterface();
    cacheInterface = new apis_cache_interface_1.ApisCacheInterface();
    counter = new counter_1.Counter();
    initOffline(localApis, offlineDevices) {
        this.serverInterface.initOffline(localApis, offlineDevices);
    }
    getNodes(ids) {
        let promise;
        const { nodesData: nodesFromCache, missingIds } = this.cacheInterface.getNodesDataBulk(ids);
        if (Object.keys(nodesFromCache).length === ids.length) {
            promise = Promise.resolve(ids.map((id) => nodesFromCache[id]));
        }
        else {
            promise = Promise.all([
                this.serverInterface.getNodesData(missingIds),
                this.getPackages()
            ]).then(([result, pkgs]) => {
                // Add any missing nodePublicId+packageGroupPublicUid -> nodeDbId
                _.each(result.dbIdToData, (node, dbId) => {
                    const pkg = pkgs.find((pkg) => pkg.packagePublicUid === node.packagePublicUid);
                    const cacheObject = {
                        nodeDbId: dbId,
                        nodePublicId: node.nodePublicId,
                        packagePublicId: pkg
                            ? pkg.packagePublicId
                            : PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY,
                        packageGroupPublicUid: node.packageGroupPublicUid ||
                            PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY
                    };
                    if (!pkg || !this.isPackageAnAlias(pkg, pkgs)) {
                        this.cacheInterface.setNodeDbId({
                            ...cacheObject,
                            isLatest: true
                        });
                    }
                    return this.cacheInterface.setNodeDbId({
                        ...cacheObject,
                        isLatest: false
                    });
                });
                return ids.map((id) => {
                    // Note: The values in nodesFromCache may not reflect what's in the cache still
                    // Things may have been added or evicted
                    const fromCache = this.cacheInterface.getNodesData(id);
                    if (fromCache) {
                        return fromCache;
                    }
                    else if (nodesFromCache[id]) {
                        return nodesFromCache[id];
                    }
                    else if (result.dbIdToData[id]) {
                        return this.cacheInterface.setNode(result.dbIdToData[id]);
                    }
                    else {
                        throw new Error(`id ${id} missing in result`);
                    }
                });
            });
        }
        this.counter.setValue();
        const label = `APIsInternal-getNodes-${ids}-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getExtendedNodes(id) {
        let promise;
        const extendedNodeFromCache = this.cacheInterface.getExtendedNodesData(id);
        if (extendedNodeFromCache) {
            promise = Promise.resolve(extendedNodeFromCache);
        }
        else {
            promise = this.serverInterface.getExtendedNodesData(id).then((result) => {
                // Note: The values in extendedNodeFromCache may not reflect what's in the cache still
                // Things may have been added or evicted
                const fromCache = this.cacheInterface.getExtendedNodesData(id);
                return (fromCache || this.cacheInterface.setNodeExtended(result.dbIdToChildExtData[id]));
            });
        }
        this.counter.setValue();
        const label = `APIsInternal-getExtendedNodes-${id}-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getFilteredChildrenNodes(parentIds, query) {
        const { filteredChildrenNodeIds: filteredChildrenNodeIdsFromCache, missingIds } = this.cacheInterface.getFilteredChildrenNodeIdsBulk(parentIds, query);
        const promise = Promise.all([
            this.getChildrenNodesData(filteredChildrenNodeIdsFromCache),
            this.getMissingFilteredChildrenNodes(missingIds, query)
        ]).then(([oldFilteredChildrenNodes, newFilteredChildrenNodes]) => {
            return parentIds.map((parentId) => {
                const result = oldFilteredChildrenNodes[parentId] || newFilteredChildrenNodes[parentId];
                if (!result) {
                    throw new Error(`Missing result for id ${parentId}`);
                }
                return result;
            });
        });
        this.counter.setValue();
        const label = `APIsInternal-getFilteredChildrenNodes-${parentIds}-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getFilteredTableItems(parentId, query, isProjectWizard) {
        let promise;
        const cacheKey = apis_cache_interface_1.ApisCacheInterface.urlQueryCacheKey(parentId, query) +
            `projectWizard=${isProjectWizard}`;
        const childrenIds = this.cacheInterface.getFilterChildrenTableItemIds(cacheKey);
        const childrenTableItems = childrenIds && childrenIds.map((id) => this.cacheInterface.getTableItemData(id));
        const childrenTableItemsFiltered = (childrenTableItems || []).filter((item) => !!item);
        if (childrenTableItems &&
            childrenTableItemsFiltered &&
            childrenTableItemsFiltered.length === childrenTableItems.length) {
            promise = Promise.resolve(childrenTableItemsFiltered);
        }
        else {
            promise = this.serverInterface
                .getFilteredTableItemsData(parentId, query, isProjectWizard)
                .then((result) => {
                const childrenTableItems = result.parentToChildDbId[parentId];
                this.cacheInterface.setFilteredChildrenTableItemIds(cacheKey, childrenTableItems.map((item) => item.tableItemDbId));
                return this.cacheInterface.setTableItems(childrenTableItems);
            });
        }
        this.counter.setValue();
        const label = `APIsInternal-getFilteredTableItems-${parentId}-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getNodeDataForTableItemVariant(tableItemId, query, variant) {
        let promise;
        const cacheKey = this.getCacheKeyForTableItemVariant(tableItemId, query, variant);
        const nodeDbId = this.cacheInterface.getNodeDbIdForTableItemVariant(cacheKey);
        if (nodeDbId) {
            promise = this.getNodes([nodeDbId]).then((nodesData) => {
                const nodeData = _.first(nodesData);
                if (!nodeData) {
                    throw new Error(`Missing result for id ${tableItemId}`);
                }
                return nodeData;
            });
        }
        else {
            promise = this.serverInterface
                .getNodeDataForTableItemVariant(tableItemId, query, variant)
                .then((result) => {
                const firstId = _.first(Object.keys(result.dbIdToData));
                if (!firstId) {
                    throw new Error(`Missing result for id ${tableItemId}`);
                }
                const nodeData = result.dbIdToData[firstId];
                this.cacheInterface.setNodeDbIdForTableItemVariant({
                    cacheKey,
                    nodeDbId: firstId
                });
                return this.cacheInterface.setNode(nodeData);
            });
        }
        this.counter.setValue();
        const label = `APIsInternal-getNodeIdsForTableItemVariant-${tableItemId}-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getTableViewFilters(parentId, query, isProjectWizard) {
        let promise;
        const cacheKey = apis_cache_interface_1.ApisCacheInterface.urlQueryCacheKey(parentId, query) +
            `projectWizard=${isProjectWizard}`;
        const filter = this.cacheInterface.getTableViewFiltersData(cacheKey);
        if (filter) {
            promise = Promise.resolve(filter);
        }
        else {
            promise = this.serverInterface
                .getTableViewFilters(parentId, query, isProjectWizard)
                .then((result) => {
                const data = result.parentToTableFilters[parentId];
                return this.cacheInterface.setTableViewFiltersData(cacheKey, data);
            });
        }
        this.counter.setValue();
        const label = `APIsInternal-getFilteredTableItems-${parentId}-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    /**
     * Call this when the user expands a node.
     * This will prefetch data from the server to avoid unnecessary round trips while auto expanding.
     *
     * @param id
     * @param query
     *
     * @returns {Promise} (void)
     */
    expandNode(id, query) {
        let promise;
        const cacheKey = apis_cache_interface_1.ApisCacheInterface.urlQueryCacheKey(id, query);
        const descendentNodeIds = this.cacheInterface.getFilteredDescendentNodeIds(cacheKey);
        if (descendentNodeIds) {
            // We already have id -> filteredChildrenIds for all the
            // provided levels bellow id; So no prefetching needed.
            promise = this.getNodes(descendentNodeIds).then(() => { });
        }
        else {
            promise = Promise.all([
                this.serverInterface.getExpandedFilteredDescendantNodesData(id, query),
                this.getPackages()
            ])
                .then(([result, pkgs]) => this.expandNodeFillCaches(result, pkgs, cacheKey, query))
                .then(() => { });
        }
        this.counter.setValue();
        const label = `APIsInternal-expandNode-${id}-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getSearchSugestions(text, query) {
        const cacheKey = apis_cache_interface_1.ApisCacheInterface.urlQueryCacheKey(text, query);
        const fromCache = this.cacheInterface.getSearchSugestions(cacheKey);
        const promise = fromCache
            ? Promise.resolve(fromCache)
            : this.serverInterface
                .getSearchSuggestions(text, query)
                .then((sugestions) => this.cacheInterface.setSearchSuggestions(cacheKey, sugestions));
        this.counter.setValue();
        const label = `APIsInternal-getSearchSuggestions-${text}-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getImportInfo(id, query) {
        const cacheKey = apis_cache_interface_1.ApisCacheInterface.urlQueryCacheKey(id, query);
        const fromCache = this.cacheInterface.getImportInfo(cacheKey);
        const promise = fromCache
            ? Promise.resolve(fromCache)
            : this.serverInterface
                .getImportInfo(id, query)
                .then((result) => this.cacheInterface.setImportInfo(cacheKey, result));
        this.counter.setValue();
        const label = `APIsInternal-getImportInfo-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getCustomPackageDownload(packages, zipFilePrefix) {
        const promise = this.serverInterface.getCustomPackageDownload(packages, zipFilePrefix);
        this.counter.setValue();
        const label = `APIsInternal-getCustomPackageDownload-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getCustomPackageDownloadStatus(requestToken) {
        const promise = this.serverInterface.getCustomPackageDownloadStatus(requestToken);
        this.counter.setValue();
        const label = `APIsInternal-getCustomPackageDownloadStatus-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getPackages() {
        const fromCache = this.cacheInterface.getPackages();
        const promise = fromCache
            ? Promise.resolve(fromCache)
            : this.serverInterface
                .getPackages()
                .then((options) => this.cacheInterface.setPackages(options));
        this.counter.setValue();
        const label = `APIsInternal-getPackages-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getPackageGroups() {
        const fromCache = this.cacheInterface.getPackageGroups();
        const promise = fromCache
            ? Promise.resolve(fromCache)
            : this.serverInterface
                .getPackageGroups()
                .then((options) => this.cacheInterface.setPackageGroups(options));
        this.counter.setValue();
        const label = `APIsInternal-getPackageGroups-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getFilterOptions() {
        const filterOptionsFromCache = this.cacheInterface.getFilterOptions();
        const promise = filterOptionsFromCache
            ? Promise.resolve(filterOptionsFromCache)
            : this.serverInterface
                .getFilterOptions()
                .then((options) => this.cacheInterface.setFilterOptions(options));
        const label = `APIsInternal-getFilterOptions-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getNodeInfoForResourceId(query) {
        const cacheKey = QueryString.stringify({ ...(0, filter_helpers_1.sortQuery)(query) });
        const fromCache = this.cacheInterface.getNodeInfoForId(cacheKey);
        const promise = fromCache
            ? Promise.resolve(fromCache)
            : this.serverInterface
                .getNodeInfoForResourceId(query)
                .then((result) => this.cacheInterface.setNodeInfoForId(cacheKey, result));
        const label = `APIsInternal-getNodeInfoForResourceId-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getNodeInfoForGlobalId(query) {
        const cacheKey = QueryString.stringify({ ...(0, filter_helpers_1.sortQuery)(query) });
        const fromCache = this.cacheInterface.getNodeInfoForId(cacheKey);
        const promise = fromCache
            ? Promise.resolve(fromCache)
            : this.serverInterface
                .getNodeInfoForGlobalId(query)
                .then((result) => this.cacheInterface.setNodeInfoForId(cacheKey, result));
        const label = `APIsInternal-getNodeInfoForGlobalId-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getNodeDbId(nodePublicId, packageGroupPublicUid, packagePublicId, isLatest) {
        const nodeDbIdFromCache = this.cacheInterface.getNodeDbId({
            nodePublicId,
            packagePublicId: packagePublicId || PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY,
            packageGroupPublicUid: packageGroupPublicUid || PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY,
            isLatest
        });
        let promise = null;
        if (nodeDbIdFromCache) {
            promise = Promise.resolve(nodeDbIdFromCache);
        }
        else {
            promise = this.serverInterface
                .getNodePublicIdToDbId(nodePublicId, packageGroupPublicUid, packagePublicId, isLatest)
                .then((dbId) => this.cacheInterface.setNodeDbId({
                nodeDbId: dbId,
                nodePublicId,
                packagePublicId: packagePublicId || PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY,
                packageGroupPublicUid: packageGroupPublicUid || PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY,
                isLatest
            }));
        }
        this.counter.setValue();
        const label = `APIsInternal-getNodeDbId-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getRex3LinkToDbId(link) {
        const fromCache = this.cacheInterface.getRex3LinkToDbId(link);
        const promise = fromCache
            ? Promise.resolve(fromCache)
            : this.serverInterface
                .getRex3LinkToDbId(link)
                .then((dbId) => this.cacheInterface.setRex3LinkToDbId({ dbId, rex3Link: link }));
        this.counter.setValue();
        const label = `APIsInternal-getRex3LinkToDbId-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    getSearchResultsPage({ textSearch, pageNum, resultsPerPage, hiddenQuery }) {
        const cacheKey = `${textSearch}__${pageNum}__${resultsPerPage}__${hiddenQuery.join(',')}`;
        const fromCache = this.cacheInterface.getSearchResultsPage(cacheKey);
        const promise = fromCache
            ? Promise.resolve(fromCache)
            : this.serverInterface
                .getSearchResultsPage({ textSearch, pageNum, resultsPerPage, hiddenQuery })
                .then((result) => this.cacheInterface.setSearchResultsPage(cacheKey, result));
        this.counter.setValue();
        const label = `APIsInternal-getSearchResultsPage-${this.counter.getValue()}`;
        return APIsInternal.measureTime(promise, label);
    }
    // for test purposes only
    _getServerInterface() {
        return this.serverInterface;
    }
    _getCacheInterface() {
        return this.cacheInterface;
    }
    ///////////////////////////////////////////////////////////////////////////////
    /// Private methods
    ///////////////////////////////////////////////////////////////////////////////
    /**
     * Wraps promise with shared/util.measureTime method if the DEBUG flag is set
     *
     * @param promise
     * @param label
     *
     * @returns {Promise} result
     */
    static measureTime(promise, label) {
        if (!DEBUG) {
            return promise;
        }
        return (0, util_1.measureTime)(promise, label);
    }
    /**
     * Get the nodes data for the children.
     *
     * @param childrenNodeIds
     *
     * @returns {Promise} childrenNodesData
     */
    getChildrenNodesData(childrenNodeIds) {
        const parentIds = Object.keys(childrenNodeIds);
        return this.getNodes(_.chain(parentIds)
            .map((parentId) => childrenNodeIds[parentId])
            .flatten()
            .value()).then((childrenNodes) => {
            return (0, util_1.objectFromKeyValuePairs)(Object.entries(getParentIndices()).map(([parentId, { start, end }]) => ({
                key: parentId,
                value: childrenNodes.slice(start, end)
            })));
        });
        function getParentIndices() {
            let start = 0;
            const parentIndcies = parentIds.map((parentId) => {
                const startEnd = {
                    start,
                    end: start + childrenNodeIds[parentId].length
                };
                start = startEnd.end;
                return { parentId, startEnd };
            });
            return (0, util_1.objectFromKeyValuePairs)(parentIndcies.map(({ parentId, startEnd }) => ({ key: parentId, value: startEnd })));
        }
    }
    /**
     * Get the filtered children nodes for the parents which do not have
     * the mapping parentId -> filteredChildrenNodeIds in cache.
     *
     * @param missingParentIds
     * @param query
     *
     * @returns {Promise} missingFilteredChildrenNodes
     */
    getMissingFilteredChildrenNodes(missingIds, query) {
        const cacheKeys = apis_cache_interface_1.ApisCacheInterface.getUrlQueryCacheKeys(missingIds, query);
        return !_.isEmpty(missingIds)
            ? this.getFilteredChildrenNodeIds(missingIds, query, cacheKeys).then((filteredChildrenNodeIds) => this.getChildrenNodesData(filteredChildrenNodeIds))
            : Promise.resolve({});
    }
    /**
     * Call the server to get the filteredChildrenNodeIds.
     * Fill the caches with the responses.
     *
     * @param parentIds
     * @param query
     * @param cacheKeys
     *
     * @returns {Promise} filteredChildrenNodeIds
     */
    getFilteredChildrenNodeIds(parentIds, query, cacheKeys) {
        return this.serverInterface.getFilteredChildrenNodeIds(parentIds, query).then((result) => {
            const pairs = parentIds.map((parentId) => {
                const childrenIds = result.parentToChildDbId[parentId];
                const cacheKey = cacheKeys[parentId];
                return {
                    parentId,
                    childrenIds: this.cacheInterface.setFilteredChildrenNodeIds(cacheKey, childrenIds)
                };
            });
            return (0, util_1.objectFromKeyValuePairs)(pairs.map(({ parentId, childrenIds }) => ({ key: parentId, value: childrenIds })));
        });
    }
    /**
     * Fill the caches with the result
     *
     * @param result
     * @param cacheKey
     * @param query
     */
    expandNodeFillCaches(result, packageData, cacheKey, query) {
        const { parentToChildData } = result;
        const urlQueryCacheKeys = apis_cache_interface_1.ApisCacheInterface.getUrlQueryCacheKeys(Object.keys(parentToChildData), query);
        _.each(urlQueryCacheKeys, (cacheKey, key) => {
            const childrenIds = parentToChildData[key].map(({ nodeDbId }) => nodeDbId);
            this.cacheInterface.setFilteredChildrenNodeIds(cacheKey, childrenIds);
        });
        this.cacheInterface.setFilteredDescendentNodeIds(cacheKey, _.flatMap(parentToChildData, (nodes) => nodes.map(({ nodeDbId }) => nodeDbId)));
        this.cacheInterface.setNodes(_.flatten(Object.values(parentToChildData)));
        _.each(parentToChildData, (nodes) => nodes.forEach((node) => {
            const pkg = packageData.find((pkg) => pkg.packagePublicUid === node.packagePublicUid);
            const cacheObject = {
                nodeDbId: node.nodeDbId,
                nodePublicId: node.nodePublicId,
                packagePublicId: pkg
                    ? pkg.packagePublicId
                    : PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY,
                packageGroupPublicUid: node.packageGroupPublicUid || PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY
            };
            if (!pkg || !this.isPackageAnAlias(pkg, packageData)) {
                this.cacheInterface.setNodeDbId({
                    ...cacheObject,
                    isLatest: true
                });
            }
            return this.cacheInterface.setNodeDbId({
                ...cacheObject,
                isLatest: false
            });
        }));
    }
    getCacheKeyForTableItemVariant(tableItemId, query, variant) {
        const cacheKey = apis_cache_interface_1.ApisCacheInterface.urlQueryCacheKey(tableItemId, query);
        const variantToString = (0, util_2.getTableItemVariantAsString)(variant);
        return `${cacheKey}-${variantToString}`;
    }
    isPackageAnAlias(pkg, allPackages) {
        const isAlias = !!allPackages.find((item) => !!item.aliases.find((packagePublicId) => packagePublicId === pkg.packagePublicId));
        return isAlias;
    }
}
exports.APIsInternal = APIsInternal;
// For test purposes only
exports._PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY = PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY;
exports._PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY = PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY;
