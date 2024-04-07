"use strict";
// allow expect(blah).to.exist
// tslint:disable:no-unused-expression
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDBContent = exports.createContent = exports.getDbId = exports.toNodePath = exports.getNodeDbIdRex3 = exports.getNodeDbId = exports.getSearchSuggestions = exports.getRootNode = exports.getFilterOptions = exports.getExpandedFilteredDescendantNodesData = exports.getFilteredChildrenNodeIds = exports.getNodeExtendedData = exports.getNodesData = exports.makeRequest = exports.makeDownloadImportRequest = exports.updateDatabaseWithScript = exports.updateDatabase = exports.GROUP_ID_PREFIX = void 0;
const _ = require("lodash");
const scriptsUtil = require("../../scripts-lib/util");
const expect_1 = require("../../test/expect");
const database_utils_1 = require("./database-utils");
const path = require("path");
const fs = require("fs-extra");
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
// tslint:disable-next-line:no-var-requires
const dinfra = require(test_helpers_1.testingGlobals.dinfraPath);
const contentImporter_1 = require("../../lib/dbImporter/contentImporter");
exports.GROUP_ID_PREFIX = 'grp_'; // do NEVER change since it's part of the URL and would break bookmarks
let lastUpdate;
async function updateDatabase(data) {
    return _updateDatabase(data, database_utils_1.updateDatabaseImpl);
}
exports.updateDatabase = updateDatabase;
async function updateDatabaseWithScript(data) {
    return _updateDatabase(data, database_utils_1.updateDatabaseWithScriptImpl);
}
exports.updateDatabaseWithScript = updateDatabaseWithScript;
async function _updateDatabase(data, updateFunc) {
    lastUpdate = new Date();
    const dbFolder = await updateFunc(data);
    nodePathToDbIdMap = {};
    return dbFolder;
}
// ------------------------------------------------------------------------------------------------
// Functions to query the server APIs this test is meant to test
function getPayload(res) {
    const rawData = JSON.parse(res.text);
    const { sessionId } = rawData.sideBand;
    (0, expect_1.expect)(sessionId).to.not.be.undefined;
    (0, expect_1.expect)(parseInt(sessionId)).to.be.greaterThan(lastUpdate.getTime());
    (0, expect_1.expect)(parseInt(sessionId)).to.be.lessThan(new Date().getTime());
    return rawData.payload;
}
async function makeDownloadImportRequest(get, query) {
    try {
        const result = await expect_1.chai
            .request(scriptsUtil.mochaServer)
            .get(get)
            .query(query);
        return result;
    }
    catch (e) {
        if (e.message && e.response) {
            e.message = `${e.message} (${e.response.text})`;
        }
        throw e;
    }
}
exports.makeDownloadImportRequest = makeDownloadImportRequest;
async function makeRequest(get, query) {
    try {
        const result = await expect_1.chai
            .request(scriptsUtil.mochaServer)
            .get(get)
            .query(query);
        if (!result.status.toString().startsWith('2')) {
            throw result;
        }
        return getPayload(result);
    }
    catch (e) {
        if (e.message && e.response) {
            e.message = `${e.message} (${e.response.text})`;
        }
        throw e;
    }
}
exports.makeRequest = makeRequest;
async function getNodesData(query) {
    return makeRequest("api/nodesData" /* API.GET_NODES_DATA */, query);
}
exports.getNodesData = getNodesData;
async function getNodeExtendedData(query) {
    return makeRequest("api/nodeExtendedData" /* API.GET_NODE_EXTENDED_DATA */, query);
}
exports.getNodeExtendedData = getNodeExtendedData;
async function getFilteredChildrenNodeIds(query) {
    return makeRequest("api/filteredChildrenNodeIds" /* API.GET_FILTERED_CHILDREN_NODE_IDS */, query);
}
exports.getFilteredChildrenNodeIds = getFilteredChildrenNodeIds;
async function getExpandedFilteredDescendantNodesData(query) {
    return makeRequest("api/expandedFilteredDescendantNodesData" /* API.GET_EXPANDED_FILTERED_DESCENDANT_NODES_DATA */, query);
}
exports.getExpandedFilteredDescendantNodesData = getExpandedFilteredDescendantNodesData;
async function getFilterOptions() {
    return makeRequest("api/filterOptions" /* API.GET_FILTER_OPTIONS */);
}
exports.getFilterOptions = getFilterOptions;
async function getRootNode() {
    return makeRequest("api/rootNode" /* API.GET_ROOT_NODE */);
}
exports.getRootNode = getRootNode;
async function getSearchSuggestions(query) {
    return makeRequest("api/searchSuggestions" /* API.GET_SEARCH_SUGGESTIONS */, query);
}
exports.getSearchSuggestions = getSearchSuggestions;
async function getNodeDbId(query) {
    return makeRequest("api/nodePublicIdToDbId" /* API.GET_NODE_PUBLIC_ID_TO_DB_ID */, query);
}
exports.getNodeDbId = getNodeDbId;
async function getNodeDbIdRex3(query) {
    return makeRequest("api/rex3LinkToDbId" /* API.GET_REX3_LINK_TO_DB_ID */, query);
}
exports.getNodeDbIdRex3 = getNodeDbIdRex3;
// ------------------------------------------------------------------------------------------------
// Functions to fetch the database id from a node path
// cache of all node paths with associated node id of its last element (gets invalidated on DB update)
let nodePathToDbIdMap = {};
async function getNodePathToDbIdMap() {
    if (_.isEmpty(nodePathToDbIdMap)) {
        const filterInfo = await getFilterOptions();
        const filterPackageGroup = filterInfo.packageGroups.map(p => p.publicId);
        const rootNode = await getRootNode();
        await fetchChildren([], rootNode);
        async function fetchChildren(parentNodePath, parentId) {
            const childrenDbId = (await getFilteredChildrenNodeIds({
                parentDbId: [parentId],
                filterPackageGroup
            })).parentToChildDbId[parentId];
            if (childrenDbId.length) {
                const data = await getNodesData({ dbId: childrenDbId });
                for (const dbId of childrenDbId) {
                    const nodePath = [...parentNodePath, data.dbIdToData[dbId].name];
                    nodePathToDbIdMap[nodePath.join('/')] = dbId;
                    await fetchChildren(nodePath, dbId);
                }
            }
        }
    }
    return nodePathToDbIdMap;
}
function toNodePath(parameter) {
    if (Array.isArray(parameter)) {
        return parameter;
    }
    return [...parameter.fullPaths[0], parameter.name];
}
exports.toNodePath = toNodePath;
async function getDbId(parameter) {
    // We don't yet have this API, but it makes it easier to test as I can find a node directly
    // from the metadata id.  As such, I've implemented it as a "walk everything until found"
    // TODO: replace with server version once it exists
    const nodePath = toNodePath(parameter).join('/');
    if (!nodePath) {
        return getRootNode();
    }
    const nodePathToDbIdMap = await getNodePathToDbIdMap();
    if (nodePathToDbIdMap[nodePath]) {
        return nodePathToDbIdMap[nodePath];
    }
    else {
        throw new Error(`${nodePath} not found`);
    }
}
exports.getDbId = getDbId;
function createContent(contentPath, content) {
    fs.ensureDirSync(contentPath);
    for (const key of Object.keys(content)) {
        const subPath = path.join(contentPath, key);
        const value = content[key];
        if (typeof value === 'string') {
            if (key === 'linkedFile') {
                fs.ensureSymlinkSync(value, subPath);
            }
            else {
                fs.writeFileSync(subPath, value);
            }
        }
        else {
            createContent(subPath, value);
        }
    }
}
exports.createContent = createContent;
async function updateDBContent(contentPath, options = {}) {
    scriptsUtil.initMochaConfig({});
    return (0, contentImporter_1.contentImport)(dinfra, contentPath, scriptsUtil.getMochaConfig().dbResourcePrefix, {
        ...options,
        quiet: true
    });
}
exports.updateDBContent = updateDBContent;
