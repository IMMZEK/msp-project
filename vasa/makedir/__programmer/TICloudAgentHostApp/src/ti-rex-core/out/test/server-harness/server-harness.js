'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerHarness = void 0;
// 3rd party
const _ = require("lodash");
const errors_1 = require("../../shared/errors");
const util_1 = require("../../shared/util");
const util_2 = require("../../frontend/component-helpers/util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class ServerHarness {
    mode;
    role;
    constructor({ mode, role }) {
        this.mode = mode;
        this.role = role;
    }
    // Nodes
    getNodes({ ids, data }) {
        if (ids.includes(data.rootNode) || !ServerHarness.isValidArrayParam(ids)) {
            throw new errors_1.NetworkError('Client Error', '400');
        }
        const nodes = ids.map(id => data.nodeData[id] || null);
        // @ts-ignore : Typescript can't figure out nodes may have nulls in it
        if (nodes.includes(null)) {
            throw new errors_1.NetworkError('Not Found', '404');
        }
        const accum = { dbIdToData: {} };
        const result = nodes.reduce((accum, item) => {
            accum.dbIdToData[item.nodeDbId] = item;
            return accum;
        }, accum);
        return ServerHarness.asPayload(result, data);
    }
    getNodesExtended({ id, data }) {
        if (!id || id === data.rootNode) {
            throw new errors_1.NetworkError('Client Error', '400');
        }
        const node = data.nodeDataExtended[id] || null;
        if (!node) {
            throw new errors_1.NetworkError('Not Found', '404');
        }
        return ServerHarness.asPayload({ dbIdToChildExtData: { [id]: node } }, data);
    }
    getFilteredChildrenNodeIds({ parentIds, data, filter }) {
        if (!ServerHarness.isValidArrayParam(parentIds)) {
            throw new errors_1.NetworkError('Client Error', '400');
        }
        const accum = { parentToChildDbId: {} };
        const result = parentIds
            .map(id => {
            const childrenIds = data.hierarchy[id];
            if (!childrenIds) {
                throw new errors_1.NetworkError('Not Found', '404');
            }
            const filteredIds = childrenIds.filter(id => ServerHarness.filterNode(id, data, filter));
            return {
                parentId: id,
                childrenNodeIds: filteredIds
            };
        })
            .reduce((accum, { parentId, childrenNodeIds }) => {
            accum.parentToChildDbId[parentId] = childrenNodeIds;
            return accum;
        }, accum);
        return ServerHarness.asPayload(result, data);
    }
    getExpandedFilteredDescendantNodesData({ parentId, data, filter }) {
        if (!parentId) {
            throw new errors_1.NetworkError('Client Error', '400');
        }
        const result = this.getSingleNodePath({ parentId, data, filter });
        const accum = { parentToChildData: {} };
        for (let i = 0; i < result.length - 1; i++) {
            accum.parentToChildData[result[i].nodeDbId] = [result[i + 1]];
        }
        const finalNode = !_.isEmpty(result)
            ? result[result.length - 1]
            : data.nodeData[parentId];
        if (finalNode.descriptor.hasChildren) {
            const children = this.getFilteredChildrenNodeIds({
                parentIds: [finalNode.nodeDbId],
                data,
                filter
            }).payload.parentToChildDbId[finalNode.nodeDbId];
            if (!_.isEmpty(children)) {
                accum.parentToChildData[finalNode.nodeDbId] = children.map(id => data.nodeData[id]);
            }
        }
        return ServerHarness.asPayload(accum, data);
    }
    getFilteredTableItemsData({ parentNodeDbId, data, filter }) {
        const filterData = Object.values(data.tableItemFilterData).find(filterData => filterData.tableItemNodeDbId === parentNodeDbId);
        if (!filterData) {
            throw new errors_1.NetworkError('Not found', '404');
        }
        const childrenIds = data.tableItemHierarchy[filterData.tableItemDbId];
        if (!childrenIds) {
            throw new errors_1.NetworkError('Not found', '404');
        }
        const filteredIds = childrenIds.filter(id => ServerHarness.filterTableItem(id, data, filter));
        const filteredTableItems = filteredIds.map(id => {
            const item = data.tableItemData[id];
            if (!item) {
                throw new errors_1.NetworkError('Not found', '404');
            }
            return item;
        });
        return ServerHarness.asPayload({ parentToChildDbId: { [parentNodeDbId]: filteredTableItems } }, data);
    }
    getNodeDataForTableItemVariant({ tableItemDbId, variantCompiler, variantKernel, data }) {
        const tableItemFilterData = data.tableItemFilterData[tableItemDbId];
        if (!tableItemFilterData) {
            throw new errors_1.NetworkError('Not Found', '404');
        }
        const variantKey = (0, util_2.getTableItemVariantAsString)({
            compiler: variantCompiler,
            kernel: variantKernel
        });
        const variantNodeDbId = tableItemFilterData.variants[variantKey];
        if (!variantNodeDbId) {
            throw new errors_1.NetworkError(`Variant not found ${variantKey}`, '404');
        }
        return this.getNodes({ ids: [variantNodeDbId], data });
    }
    getSearchSuggestions({ text, data }) {
        const suggestions = _.flatten((0, util_1.getObjectKeys)(data.filterData).map(key => {
            return data.filterData[key]
                .filter(item => item.name.includes(text))
                .map(item => item.name);
        }));
        return ServerHarness.asPayload(suggestions, data);
    }
    // Actions
    getNodeDownload({}) {
        throw new errors_1.NetworkError('Not implemented', '500');
    }
    getImportProject({}) {
        throw new errors_1.NetworkError('Not implemented', '500');
    }
    getImportInfo({ id, data, filter }) {
        if (!data.nodeFilterData[id]) {
            throw new errors_1.NetworkError('Not found', '404');
        }
        const nodeFilterData = data.nodeFilterData[id].filterData;
        const commonDevices = filter.filterDevice && !_.isEmpty(filter.filterDevice)
            ? _.intersection(nodeFilterData.filterDevice || [], filter.filterDevice)
            : nodeFilterData.filterDevice || [];
        const commonDevtools = filter.filterDevtool && !_.isEmpty(filter.filterDevtool)
            ? _.intersection(nodeFilterData.filterDevtool || [], filter.filterDevtool)
            : nodeFilterData.filterDevtool || [];
        return ServerHarness.asPayload({
            targets: [...commonDevices, ...commonDevtools],
            location: `${id}/some/path`,
            projectType: "project.ccs" /* ProjectType.CCS */
        }, data);
    }
    // Basic data
    getServerConfig({ data }) {
        return ServerHarness.asPayload({
            mode: this.mode,
            role: this.role,
            rootNodeDbId: data.rootNode,
            softwareNodePublicId: data.softwareNodePublicId,
            version: '1.0.0',
            offline: false
        }, data);
    }
    getRootNode({ data }) {
        return ServerHarness.asPayload(data.rootNode, data);
    }
    getPackages({ data }) {
        return ServerHarness.asPayload(data.packages, data);
    }
    getPackageGroups({ data }) {
        return ServerHarness.asPayload(data.packageGroups, data);
    }
    getFilterOptions({ data }) {
        return ServerHarness.asPayload(data.filterData, data);
    }
    // Other
    getNodePublicIdToDbId({ nodePublicId, packageGroupPublicUid, data }) {
        if (packageGroupPublicUid) {
            const node = Object.values(data.nodeData).find(node => node.nodePublicId === nodePublicId &&
                node.packageGroupPublicUid === packageGroupPublicUid);
            const group = data.packageGroups.find(group => group.packageGroupPublicUid === packageGroupPublicUid);
            if (!node || !group) {
                throw new errors_1.NetworkError('Not found', '404');
            }
            return ServerHarness.asPayload(node.nodeDbId, data);
        }
        else {
            const node = Object.values(data.nodeData).find(node => node.nodePublicId === nodePublicId);
            if (!node) {
                throw new errors_1.NetworkError('Not found', '404');
            }
            else if (node.packageGroupPublicUid) {
                throw new errors_1.NetworkError(`Node has a group wtih uid ${node.packageGroupPublicUid}`, '400');
            }
            return ServerHarness.asPayload(node.nodeDbId, data);
        }
    }
    getRex3LinkToDbId({ linkField, data }) {
        const dbId = data.rex3Links[linkField];
        if (!dbId) {
            throw new errors_1.NetworkError('Not found', '404');
        }
        return ServerHarness.asPayload(dbId, data);
    }
    ///////////////////////////////////////////////////////////////////////////////
    /// Helpers
    ///////////////////////////////////////////////////////////////////////////////
    getSingleNodePath({ parentId, data, filter, accum = [] }) {
        const parentNode = data.nodeData[parentId];
        if (!parentNode) {
            throw new errors_1.NetworkError('Not Found', '404');
        }
        else {
            accum = accum.concat(parentNode);
            const children = parentNode.descriptor.hasChildren &&
                this.getFilteredChildrenNodeIds({
                    parentIds: [parentId],
                    data,
                    filter
                }).payload.parentToChildDbId[parentId];
            if (!children || children.length !== 1) {
                return accum;
            }
            else {
                return this.getSingleNodePath({
                    parentId: children[0],
                    data,
                    filter,
                    accum
                });
            }
        }
    }
    static asPayload(payload, serverData) {
        return {
            payload,
            sideBand: {
                sessionId: serverData.sessionId
            }
        };
    }
    static isValidArrayParam(arr) {
        return arr.length > 0 && !(arr.length === 1 && !arr[0]);
    }
    /**
     * Filter the node.
     * It passes the filter if it or one of it's descendants is the correct node type.
     *
     * @param id
     * @param nodeTypes
     * @param data
     *
     * @returns passesFilter
     */
    static filterNode(id, data, query) {
        const node = data.nodeData[id];
        const nodeFilterData = data.nodeFilterData[id];
        if (!node) {
            return false;
        }
        else if (ServerHarness.passesFilter(nodeFilterData.filterData, query, nodeFilterData.nodeType)) {
            return true;
        }
        else {
            const children = data.hierarchy[node.nodeDbId];
            const isChildCorrectType = !!children &&
                children
                    .map(id => ServerHarness.filterNode(id, data, query))
                    .reduce((accum, isCorrect) => {
                    return accum || isCorrect;
                }, false);
            return isChildCorrectType;
        }
    }
    static filterTableItem(id, data, query) {
        const tableItem = data.tableItemData[id];
        const tableItemFilterData = data.tableItemFilterData[id];
        if (!tableItem) {
            return false;
        }
        else if (ServerHarness.passesFilter(tableItemFilterData.filterData, query, null)) {
            return true;
        }
        else {
            const children = data.hierarchy[tableItem.tableItemDbId];
            const isChildCorrectType = !!children &&
                children
                    .map(id => ServerHarness.filterNode(id, data, query))
                    .reduce((accum, isCorrect) => {
                    return accum || isCorrect;
                }, false);
            return isChildCorrectType;
        }
    }
    static passesFilter(filterData, query, itemNodeType) {
        const { filterDevice: itemDevices, filterDevtool: itemDevtools, filterPackageGroup: itemPackages, filterSearch: itemSearch, filterCompiler: itemCompiler, filterKernel: itemKernel, filterIde: itemIde, filterLanguage: itemLanguage, filterResourceClass: itemResourceClass } = filterData;
        const { filterDevice, filterDevtool, filterPackageGroup, filterSearch, filterNode, filterCompiler, filterKernel, filterIde, filterLanguage, filterResourceClass } = query;
        let passes = true;
        [
            { filters: filterDevice, items: itemDevices },
            { filters: filterDevtool, items: itemDevtools },
            { filters: filterCompiler, items: itemCompiler },
            { filters: filterKernel, items: itemKernel },
            { filters: filterIde, items: itemIde },
            { filters: filterLanguage, itemss: itemLanguage },
            { filters: filterResourceClass, items: itemResourceClass }
        ].forEach(({ filters, items }) => {
            if (!_.isEmpty(filters)) {
                passes =
                    passes &&
                        !!filters &&
                        !!items &&
                        !!items.find(itemId => {
                            return !!filters.find(filterId => filterId === itemId);
                        });
            }
        });
        // Only do package filtering if that item has something in it's itemPackages list
        if (!_.isEmpty(itemPackages)) {
            passes =
                passes &&
                    !!itemPackages &&
                    !!itemPackages.find(packageGroupId => {
                        return !!filterPackageGroup.find(groupId => groupId === packageGroupId);
                    });
        }
        if (filterSearch) {
            passes = passes && !!itemSearch && itemSearch === filterSearch;
        }
        if (!_.isEmpty(filterNode) && itemNodeType) {
            // nodeType is different since this info is in the node object itself (node.nodeType).
            // No need to do look at node.filterData
            passes =
                passes && !!filterNode && !!filterNode.find(nodeType => nodeType === itemNodeType);
        }
        return passes;
    }
}
exports.ServerHarness = ServerHarness;
