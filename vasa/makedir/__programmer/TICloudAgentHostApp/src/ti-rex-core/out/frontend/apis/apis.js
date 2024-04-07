"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIs = void 0;
const api_control_1 = require("./api-control");
const apis_internal_1 = require("./apis-internal");
const filter_helpers_1 = require("../component-helpers/filter-helpers");
const util_1 = require("../../shared/util");
const counter_1 = require("../component-helpers/counter");
const DEBUG = false;
class APIs {
    apiControl = new api_control_1.APIControl();
    apisInternal = new apis_internal_1.APIsInternal();
    counter = new counter_1.Counter();
    // See the equivalent methods in apis-internal for documentation
    // @param masterName - The current master holding control of the APIs. Allows
    //  you to call the APIs while a master is holding control of them.
    initOffline(localApis, offlineDevices) {
        this.apisInternal.initOffline(localApis, offlineDevices);
    }
    getNodes(ids, masterName) {
        this.counter.setValue();
        const label = `APIs-getNodes-${ids}-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getNodes(ids), label, masterName);
    }
    getExtendedNodes(id, masterName) {
        this.counter.setValue();
        const label = `APIs-getExtendedNodes-${id}-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getExtendedNodes(id), label, masterName);
    }
    getFilteredChildrenNodes(parentIds, urlQuery, masterName) {
        this.counter.setValue();
        const label = `APIs-getFilteredChildrenNodes-${parentIds}-${this.counter.getValue()}`;
        return this.apiWithFilterQuery((query) => this.apisInternal.getFilteredChildrenNodes(parentIds, query), urlQuery, label, masterName);
    }
    getFilteredTableItems(parentId, urlQuery, isProjectWizard, masterName) {
        this.counter.setValue();
        const label = `APIs-getFilteredTableItems-${parentId}-${this.counter.getValue()}`;
        return this.apiWithFilterQuery((query) => this.apisInternal.getFilteredTableItems(parentId, query, isProjectWizard), urlQuery, label, masterName);
    }
    getNodeDataForTableItemVariant(tableItemId, urlQuery, variant, masterName) {
        this.counter.setValue();
        const label = `APIs-getNodeDataForTableItemVariant-${tableItemId}-${this.counter.getValue()}`;
        return this.apiWithFilterQuery((query) => this.apisInternal.getNodeDataForTableItemVariant(tableItemId, query, variant), urlQuery, label, masterName);
    }
    getTableViewFilters(parentId, urlQuery, isProjectWizard, masterName) {
        this.counter.setValue();
        const label = `APIs-getTableViewFilters-${parentId}-${this.counter.getValue()}`;
        return this.apiWithFilterQuery((query) => this.apisInternal.getTableViewFilters(parentId, query, isProjectWizard), urlQuery, label, masterName);
    }
    expandNode(id, urlQuery, masterName) {
        this.counter.setValue();
        const label = `APIs-expandNode-${id}-${this.counter.getValue()}`;
        return this.apiWithFilterQuery((query) => this.apisInternal.expandNode(id, query), urlQuery, label, masterName);
    }
    getSearchSuggestions(text, urlQuery, masterName) {
        this.counter.setValue();
        const label = `APIs-getSearchSuggestions-${this.counter.getValue()}`;
        return this.apiWithFilterQuery((query) => this.apisInternal.getSearchSugestions(text, query), urlQuery, label, masterName);
    }
    getImportInfo(id, urlQuery, masterName) {
        this.counter.setValue();
        const label = `APIs-getImportInfo-${this.counter.getValue()}`;
        return this.apiWithFilterQuery((query) => this.apisInternal.getImportInfo(id, query), urlQuery, label, masterName);
    }
    getCustomPackageDownload(packages, zipFilePrefix, masterName) {
        this.counter.setValue();
        const label = `APIs-getCustomPackageDownload-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getCustomPackageDownload(packages, zipFilePrefix), label, masterName);
    }
    getCustomPackageDownloadStatus(requestToken, masterName) {
        this.counter.setValue();
        const label = `APIs-getCustomPackageDownloadStatus-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getCustomPackageDownloadStatus(requestToken), label, masterName);
    }
    getPackages(masterName) {
        this.counter.setValue();
        const label = `APIs-getPackages-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getPackages(), label, masterName);
    }
    getPackageGroups(masterName) {
        this.counter.setValue();
        const label = `APIs-getPackageGroups-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getPackageGroups(), label, masterName);
    }
    getFilterOptions(masterName) {
        this.counter.setValue();
        const label = `APIs-getFilterOptions-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getFilterOptions(), label, masterName);
    }
    getNodeInfoForResourceId(query, masterName) {
        this.counter.setValue();
        const label = `APIs-getNodeInfoForResourceId-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getNodeInfoForResourceId(query), label, masterName);
    }
    getNodeInfoForGlobalId(query, masterName) {
        this.counter.setValue();
        const label = `APIs-getNodeInfoForGlobalId-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getNodeInfoForGlobalId(query), label, masterName);
    }
    getNodeDbId(nodePublicId, packageGroupPublicUid, packagePublicId, isLatest, masterName) {
        this.counter.setValue();
        const label = `APIs-getNodeDbId-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getNodeDbId(nodePublicId, packageGroupPublicUid, packagePublicId, isLatest), label, masterName);
    }
    getRex3LinkToDbId(link, masterName) {
        this.counter.setValue();
        const label = `APIs-getRex3LinkToDbId-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getRex3LinkToDbId(link), label, masterName);
    }
    getSearchResultsPage({ textSearch, pageNum, resultsPerPage, hiddenQuery, masterName }) {
        this.counter.setValue();
        const label = `APIs-getSearchResultsPage-${this.counter.getValue()}`;
        return this.apiNoQuery(() => this.apisInternal.getSearchResultsPage({
            textSearch,
            pageNum,
            resultsPerPage,
            hiddenQuery
        }), label, masterName);
    }
    getAPIControl() {
        return this.apiControl;
    }
    // For test purposes only
    _getServerInterface() {
        return this.apisInternal._getServerInterface();
    }
    _getCacheInterface() {
        return this.apisInternal._getCacheInterface();
    }
    static measureTime(promise, label) {
        if (!DEBUG) {
            return promise;
        }
        return (0, util_1.measureTime)(promise, label);
    }
    async apiWithFilterQuery(api, urlQuery, label, masterName) {
        const [filterOptions, groups] = await Promise.all([
            this.getFilterOptions(masterName),
            this.getPackageGroups(masterName)
        ]);
        const query = (0, filter_helpers_1.getServerFilterQueryFromBrowserUrlQuery)(urlQuery, groups, filterOptions);
        return this.apiNoQuery(() => api(query), label, masterName);
    }
    async apiNoQuery(api, label, masterName) {
        const promise = this.registerTask(masterName, api);
        return APIs.measureTime(promise, label);
    }
    /**
     * Register a tasks to be processed. If another master has control your
     * request will only be processed once it is finished.
     *
     */
    registerTask(masterName, callback) {
        if (masterName && this.apiControl.isCurrentMaster(masterName)) {
            return callback();
        }
        else if (masterName && !this.apiControl.isCurrentMaster(masterName)) {
            return Promise.reject(new Error(`Not current master ${masterName}`));
        }
        else {
            return this.apiControl.onIdle().then(() => callback());
        }
    }
}
exports.APIs = APIs;
