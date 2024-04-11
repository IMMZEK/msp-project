'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertResourceRecordForClient = exports.convertIdsForClient = exports.convertIdForClient = exports.convertIdsForDB = exports.makeNodeData = exports.getNodeExtendedData = exports.getNodesData = exports.getAvailableTableViewFilters = exports.getFilteredTableItemsData = exports.getNodeInfoForGlobalId = exports.getNodeInfoForResourceId = exports.getSearchSuggestions = exports.getRootNode = exports.lookupNodeDbIdRex3 = exports.lookupNodeDbId = exports.getRoutes = void 0;
const express = require("express");
const HttpStatus = require("http-status-codes");
const path = require("path");
const fs = require("fs-extra");
const _ = require("lodash");
const sortStable = require("stable");
// Our modules
const vars_1 = require("../lib/vars");
const response_data_1 = require("../shared/routes/response-data");
const helpers_1 = require("../shared/helpers");
const rexError_1 = require("../utils/rexError");
const dbTypes_1 = require("../lib/dbBuilder/dbTypes");
const executeRoute_1 = require("./executeRoute");
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
const routes_1 = require("./routes");
const nonIARCompilers = Object.keys(dbTypes_1.compilers).filter((item) => item !== 'iar');
// Types
var NodeType = response_data_1.Nodes.NodeType;
//
// Routes implementation
//
/**
 *
 * @returns {Router}
 */
function getRoutes() {
    // set the DB instance
    const routes = express.Router();
    routes.get(`/${"api/filteredTableItemsData" /* API.GET_FILTERED_TABLE_ITEMS_DATA */}`, (0, executeRoute_1.executeRoute)(getFilteredTableItemsData));
    routes.get(`/${"api/tableViewFilters" /* API.GET_TABLE_VIEW_FILTERS */}`, (0, executeRoute_1.executeRoute)(getAvailableTableViewFilters));
    routes.get(`/${"api/nodeDataForTableItemVariant" /* API.GET_NODE_DATA_FOR_TABLE_ITEM_VARIANT */}`, (0, executeRoute_1.executeRoute)(getNodeDataForTableItemVariant));
    routes.get(`/${"api/expandedFilteredDescendantNodesData" /* API.GET_EXPANDED_FILTERED_DESCENDANT_NODES_DATA */}`, (0, executeRoute_1.executeRoute)(getExpandedFilteredDescendantNodesData));
    routes.get(`/${"api/filteredChildrenNodeIds" /* API.GET_FILTERED_CHILDREN_NODE_IDS */}`, (0, executeRoute_1.executeRoute)(getFilteredChildrenNodeIds));
    routes.get(`/${"api/nodesData" /* API.GET_NODES_DATA */}`, (0, executeRoute_1.executeRoute)(getNodesData));
    routes.get(`/${"api/nodeExtendedData" /* API.GET_NODE_EXTENDED_DATA */}`, (0, executeRoute_1.executeRoute)(getNodeExtendedData));
    routes.get(`/${"api/filterOptions" /* API.GET_FILTER_OPTIONS */}`, (0, executeRoute_1.executeRoute)(getFilterOptions));
    routes.get(`/${"api/boardsDevices" /* API.GET_BOARDS_AND_DEVICES */}`, (0, executeRoute_1.executeRoute)(getBoardAndDeviceData));
    routes.get(`/${"api/rootNode" /* API.GET_ROOT_NODE */}`, (0, executeRoute_1.executeRoute)(getRootNode));
    routes.get(`/${"api/searchSuggestions" /* API.GET_SEARCH_SUGGESTIONS */}`, (0, executeRoute_1.executeRoute)(getSearchSuggestions));
    routes.get(`/${"api/getNodeInfoForResourceId" /* API.GET_NODE_INFO_FOR_RESOURCE_ID */}`, (0, executeRoute_1.executeRoute)(getNodeInfoForResourceId));
    routes.get(`/${"api/getNodeInfoForGlobalId" /* API.GET_NODE_INFO_FOR_GLOBAL_ID */}`, (0, executeRoute_1.executeRoute)(getNodeInfoForGlobalId));
    routes.get(`/${"api/nodePublicIdToDbId" /* API.GET_NODE_PUBLIC_ID_TO_DB_ID */}`, (0, executeRoute_1.executeRoute)(lookupNodeDbId));
    routes.get(`/${"api/rex3LinkToDbId" /* API.GET_REX3_LINK_TO_DB_ID */}`, (0, executeRoute_1.executeRoute)(lookupNodeDbIdRex3));
    return routes;
}
exports.getRoutes = getRoutes;
async function lookupNodeDbId(sqldb, query) {
    if (!query.nodePublicId) {
        throw new rexError_1.RexError({
            message: 'Must specify nodePublicId',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    else if (query.toDbIdType === "ToDbIdLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_LATEST */ ||
        query.toDbIdType === "ToDbIdNotLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_NOT_LATEST */) {
        if (!query.packageGroupPublicUid) {
            throw new rexError_1.RexError({
                message: 'Must specify packageGroupPublicUid',
                httpCode: HttpStatus.BAD_REQUEST
            });
        }
        else if (query.packagePublicId === undefined) {
            throw new rexError_1.RexError({
                message: 'Must specify packagePublicId',
                httpCode: HttpStatus.BAD_REQUEST
            });
        }
    }
    else if (!query.toDbIdType) {
        throw new rexError_1.RexError({
            message: 'Must specify ToDbIdType',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    const rootNodeDbId = await getRootNode(sqldb);
    if (query.nodePublicId === rootNodeDbId) {
        return rootNodeDbId.toString();
    }
    let nodeDbId;
    switch (query.toDbIdType) {
        case "ToDbIdNoGroup" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_NO_GROUP */:
            nodeDbId = await sqldb.lookupNodeDbIdOnPublicId(query.nodePublicId, null, null);
            break;
        case "ToDbIdNotLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_NOT_LATEST */: {
            const { id, version } = (0, dbBuilderUtils_1.splitUid)(query.packageGroupPublicUid);
            nodeDbId = await sqldb.lookupNodeDbIdOnPublicId(query.nodePublicId, { publicId: id, version }, query.packagePublicId || null);
            break;
        }
        case "ToDbIdLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_LATEST */: {
            const { id } = (0, dbBuilderUtils_1.splitUid)(query.packageGroupPublicUid);
            nodeDbId = await sqldb.lookupNodeDbIdOnPublicId(query.nodePublicId, { publicId: id, version: 'LATEST' }, query.packagePublicId || null);
            break;
        }
    }
    if (!nodeDbId) {
        throw new rexError_1.RexError({
            message: `nodeDbId for public id "${query.nodePublicId}" not found`,
            httpCode: HttpStatus.NOT_FOUND
        });
    }
    return convertIdForClient(nodeDbId);
}
exports.lookupNodeDbId = lookupNodeDbId;
async function lookupNodeDbIdRex3(sqldb, query) {
    if (!query.linkField) {
        throw new rexError_1.RexError({
            message: 'Must specify linkField',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    const linkArr = query.linkField.split('/');
    const nodePublicId = (0, dbBuilderUtils_1.createPublicIdFromTreeNodePath)(query.linkField);
    let packageGroupPublicUid;
    const topLevel = linkArr[0];
    let packageName;
    if (topLevel === 'Software') {
        const dbFoundationNodes = await fs.readJson(vars_1.Vars.FOUNDATION_TREE_FILE);
        const indexOfDeepestFoundationNode = findIndexOfDeepestFoundationNode(linkArr, dbFoundationNodes.root);
        if (indexOfDeepestFoundationNode === -1) {
            throw new rexError_1.RexError({
                message: `Could not resolve Rex 3 link "${query.linkField}": Expected foundation node in link`,
                httpCode: HttpStatus.INTERNAL_SERVER_ERROR
            });
        }
        const indexOfPackageName = indexOfDeepestFoundationNode + 1;
        if (indexOfPackageName < linkArr.length) {
            packageName = linkArr[indexOfPackageName];
            const candidatePackages = sqldb
                .getPackageRecords()
                .filter((pkg) => pkg.name === packageName);
            const latestPackage = candidatePackages[0]; // assume it is already sorted
            let packageGroupDbId;
            if (latestPackage &&
                latestPackage.packageType === "softwareMain" /* Sqldb.PackageRecordType.SOFTWARE_MAIN */) {
                packageGroupDbId = latestPackage.packageGroupDbId;
            }
            const packageGroup = sqldb
                .getSoftwarePackageGroups()
                .find((pg) => pg.packageGroupDbId === packageGroupDbId);
            if (packageGroup) {
                packageGroupPublicUid = packageGroup.packageGroupPublicUid;
            }
        }
    }
    else if (topLevel === 'Device Documentation') {
        const packageGroup = sqldb.getDevicePackageGroup();
        if (packageGroup) {
            packageGroupPublicUid = packageGroup.packageGroupPublicUid;
        }
    }
    else if (topLevel === 'Development Tools') {
        const packageGroup = sqldb.getDevtoolPackageGroup();
        if (packageGroup) {
            packageGroupPublicUid = packageGroup.packageGroupPublicUid;
        }
    }
    try {
        const nodeDbId = packageGroupPublicUid
            ? await lookupNodeDbId(sqldb, {
                nodePublicId,
                packageGroupPublicUid,
                packagePublicId: null,
                toDbIdType: "ToDbIdLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_LATEST */
            })
            : await lookupNodeDbId(sqldb, {
                nodePublicId,
                toDbIdType: "ToDbIdNoGroup" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_NO_GROUP */
            });
        return nodeDbId;
    }
    catch (e) {
        if (e.httpCode && e.httpCode === HttpStatus.NOT_FOUND) {
            throw new rexError_1.RexError({
                message: `Could not resolve Rex 3 link "${query.linkField}"`,
                httpCode: HttpStatus.NOT_FOUND,
                causeError: e
            });
        }
        else {
            throw e;
        }
    }
}
exports.lookupNodeDbIdRex3 = lookupNodeDbIdRex3;
/**
 * Returns -1 if no foundation node in link at all
 * @param link
 * @param dbFoundationTreeRoot
 */
function findIndexOfDeepestFoundationNode(link, dbFoundationTreeRoot) {
    let foundationNodes = dbFoundationTreeRoot.children;
    let indexOfDeepestFoundationNode = -1;
    link.some((linkElement, linkElementIndex) => {
        const index = foundationNodes.findIndex((foundationNode) => linkElement === foundationNode.name);
        if (index !== -1) {
            indexOfDeepestFoundationNode = linkElementIndex;
            foundationNodes = foundationNodes[index].children;
            return !foundationNodes; // no more children - we're done, otherwise next link element
        }
        return true; // no more foundation nodes in the link - we're done
    });
    return indexOfDeepestFoundationNode;
}
async function getRootNode(sqldb) {
    const rootId = sqldb.getRootId();
    return convertIdForClient(rootId);
}
exports.getRootNode = getRootNode;
async function getSearchSuggestions(sqldb, query) {
    if (typeof query.text !== 'string') {
        throw new rexError_1.RexError({
            message: 'Search text is undefined',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    const { packageGroupDbIds } = convertFilterParamsForDB(sqldb, query);
    return sqldb.getSearchSuggestions(query.text, packageGroupDbIds);
}
exports.getSearchSuggestions = getSearchSuggestions;
async function getNodeInfoForResourceId(sqldb, query) {
    // Make sure all values are strings, not arrays
    const queryKeys = [
        'resourceId',
        'packageId',
        'packageVersion',
        'device',
        'devtool'
    ];
    verifyValuesAllString(queryKeys, query);
    for (const key of queryKeys) {
        if (query[key] && Array.isArray(query[key])) {
            throw new rexError_1.RexError({
                message: `${key} is an array, must be a string`,
                httpCode: HttpStatus.BAD_REQUEST
            });
        }
    }
    if (!query.resourceId || !query.packageId) {
        const missingValue = !query.resourceId ? 'resourceId' : 'packageId';
        throw new rexError_1.RexError({
            message: `Must specify ${missingValue}`,
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    let filter;
    if (query.device) {
        filter = { type: 'device', publicId: query.device };
    }
    else if (query.devtool) {
        filter = { type: 'devtool', publicId: query.devtool };
    }
    const result = await sqldb.lookupNodesOnCustomResourceId(query.resourceId, { publicId: query.packageId, version: query.packageVersion }, filter, 1);
    result.forEach((item) => {
        item.packageGroup.publicId = (0, dbBuilderUtils_1.encodePackageGroupPublicId)(item.packageGroup.publicId);
    });
    return result;
}
exports.getNodeInfoForResourceId = getNodeInfoForResourceId;
async function getNodeInfoForGlobalId(sqldb, query) {
    // Make sure all values are strings, not arrays
    const queryKeys = ['globalId', 'device', 'devtool'];
    verifyValuesAllString(queryKeys, query);
    if (!query.globalId) {
        throw new rexError_1.RexError({ message: 'Must specify globalId' });
    }
    let filter;
    if (query.device) {
        filter = { type: 'device', publicId: query.device };
    }
    else if (query.devtool) {
        filter = { type: 'devtool', publicId: query.devtool };
    }
    const result = await sqldb.lookupNodesOnGlobalId(query.globalId, filter, 1);
    result.forEach((item) => {
        item.packageGroup.publicId = (0, dbBuilderUtils_1.encodePackageGroupPublicId)(item.packageGroup.publicId);
    });
    return result;
}
exports.getNodeInfoForGlobalId = getNodeInfoForGlobalId;
async function getFilteredTableItemsData(sqldb, query) {
    const [parentNodeDbId] = convertIdsForDB(query.parentDbId);
    const filterDb = convertTableViewFilterParamsForDB(sqldb, query);
    return convertTableItemDataForClient(sqldb, await sqldb.getTableViewItems(parentNodeDbId, filterDb.packageGroupDbIds, filterDb.filters));
}
exports.getFilteredTableItemsData = getFilteredTableItemsData;
async function convertTableItemDataForClient(sqldb, idToTableViewItemDataMap) {
    const responseData = { parentToChildDbId: {} };
    for (const [parentNodeId, tableItemsDataDb] of idToTableViewItemDataMap.entries()) {
        const nodeIdClient = convertIdForClient(parentNodeId);
        const tableItemsDataClient = [];
        for (const tableItemDataDb of tableItemsDataDb) {
            if (tableItemDataDb.resourceType === 'energiaSketch') {
                // TODO TV: temporary workaround for undesired Energia metadata
                // TODO TV: maybe only remove for wizard but keep for example view?
                continue;
            }
            let tableItemDataClient;
            try {
                tableItemDataClient = await makeTableItemData(sqldb, tableItemDataDb);
                tableItemsDataClient.push(tableItemDataClient);
            }
            catch (err) {
                throw new rexError_1.RexError({
                    message: `Could not create table item data for node id ${parentNodeId}`,
                    causeError: err,
                    httpCode: HttpStatus.INTERNAL_SERVER_ERROR
                });
            }
        }
        sortByResourceSubClassAndPackageNameAndName(tableItemsDataClient);
        responseData.parentToChildDbId[nodeIdClient] = tableItemsDataClient; // TODO TV: rename parentToChildDbId to parentToTableItems?
    }
    return responseData;
}
async function getAvailableTableViewFilters(sqldb, query) {
    const [parentNodeDbId] = convertIdsForDB(query.parentDbId);
    const filterDb = convertTableViewFilterParamsForDB(sqldb, query);
    return convertTableViewFiltersForClient(await sqldb.getAvailableTableViewFilters(parentNodeDbId, filterDb.packageGroupDbIds, filterDb.filters));
}
exports.getAvailableTableViewFilters = getAvailableTableViewFilters;
async function convertTableViewFiltersForClient(idToTableViewFiltersMap) {
    const responseData = { parentToTableFilters: {} };
    for (const [parentNodeId, tableItemsDataDb] of idToTableViewFiltersMap.entries()) {
        const nodeIdClient = convertIdForClient(parentNodeId);
        responseData.parentToTableFilters[nodeIdClient] = tableItemsDataDb;
    }
    return responseData;
}
function convertTableViewFilterParamsForDB(sqldb, query) {
    const filterDb = convertFilterParamsForDB(sqldb, { ...(query.isProjectWizard ? { filterCompiler: nonIARCompilers } : {}), ...query }, {
        multiCompiler: true
    });
    if (!(filterDb.filters.deviceId || filterDb.filters.devtoolId)) {
        throw new rexError_1.RexError({
            message: 'Must set either device or devtool filter to use table views',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    return filterDb;
}
function sortByResourceSubClassAndPackageNameAndName(tableItemsData) {
    const exampleOrder = {
        // TODO TV: define names in dbTypes.ts but define order still here
        // divide into a non-general and general section
        'example.empty': 0,
        'example.helloworld': 0,
        'example.gettingstarted': 0,
        'example.outofbox': 0,
        'example.general': 1
    };
    sortStable.inplace(tableItemsData, (a, b) => {
        const exampleComparison = exampleOrder[a.resourceSubClass] - exampleOrder[b.resourceSubClass];
        if (exampleComparison !== 0) {
            return exampleComparison;
        }
        const packageNameComparison = String(a.packageName).localeCompare(b.packageName);
        if (packageNameComparison !== 0) {
            return packageNameComparison;
        }
        const nameComparison = String(a.name).localeCompare(b.name);
        return nameComparison;
    });
}
async function getNodeDataForTableItemVariant(sqldb, query) {
    const [tableItemDbId] = convertIdsForDB(query.tableItemDbId);
    const filterDb = convertFilterParamsForDB(sqldb, query, {
        multiCompiler: true
    });
    if (!(filterDb.filters.deviceId || filterDb.filters.devtoolId)) {
        throw new rexError_1.RexError({
            message: 'Must set either device or devtool filter to get node for table view item variant',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    const presentationData = await sqldb.getNodePresentationForTableViewItemVariant(tableItemDbId, filterDb.filters, { compiler: query.variantCompiler, kernel: query.variantKernel });
    const idToPresentationDataMap = new Map();
    idToPresentationDataMap.set(presentationData.id, presentationData);
    const result = await convertPresentationDataForClient(sqldb, idToPresentationDataMap);
    return result;
}
/**
 * For expand node case (single parent)
 *
 * Auto-opens single children (keeps descending )
 *
 * @param sqldb
 * @param {RequestQueryInput.ExpandedFilteredDescendantNodesData} query
 * @returns {Promise<Response.ExpandedFilteredDescendantNodesData>}
 */
async function getExpandedFilteredDescendantNodesData(sqldb, query) {
    const parentNodeIdDbs = convertIdsForDB(query.parentDbId);
    if (parentNodeIdDbs.length !== 1) {
        throw new rexError_1.RexError({
            message: 'Can only request expanded filtered descendant data for a single parent node id',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    let parentNodeIdDb = parentNodeIdDbs[0];
    const { packageGroupDbIds, filters } = convertFilterParamsForDB(sqldb, query);
    const packageNodesOnly = (0, helpers_1.getQueryParamAsArray)(query.filterNode || []).includes(response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE);
    const result = { parentToChildData: {} };
    if (packageNodesOnly) {
        // Package nodes only - not handled by the regular db apis
        const data = await getPackageTreeNodes(sqldb);
        _.each(data.relations, (childIds, parentId) => {
            result.parentToChildData[parentId] = childIds.map((id) => data.data[id]);
        });
    }
    else {
        const fullParentToChildrenMap = new Map();
        // get children of the parent node; descend if single child
        let descend;
        do {
            const parentToChildrenMap = await sqldb.getNodeChildrenBulk([parentNodeIdDb], packageGroupDbIds, filters);
            parentToChildrenMap.forEach((childrenIds, parentId) => {
                fullParentToChildrenMap.set(parentId, childrenIds);
                if (childrenIds.length === 1) {
                    parentNodeIdDb = childrenIds[0];
                    descend = true;
                }
                else {
                    descend = false;
                }
            });
        } while (descend);
        // get node data for each child
        let allChildrenIds = [];
        for (const children of fullParentToChildrenMap.values()) {
            allChildrenIds = allChildrenIds.concat(children);
        }
        const childrenData = await sqldb.getNodePresentationBulk(allChildrenIds);
        const nodesData = await convertPresentationDataForClient(sqldb, childrenData);
        // create result: parentId -> children node data
        for (const [parentId, children] of fullParentToChildrenMap.entries()) {
            const parentIdClient = convertIdForClient(parentId);
            result.parentToChildData[parentIdClient] = children.map((childId) => nodesData.dbIdToData[childId]);
        }
    }
    return result;
}
/**
 * For filter change case
 *
 * Get the node ids of the filtered children for each of the given parent ids
 *
 * Called for parentIds whose children node ids and data is still in front-end cache
 *
 * @param {RequestQueryInput.FilteredChildrenNodeIds} query
 * @returns {Promise<Response.FilteredChildrenNodeIds>}
 */
async function getFilteredChildrenNodeIds(sqldb, query) {
    const parentIdsDb = convertIdsForDB(query.parentDbId);
    const { packageGroupDbIds, filters } = convertFilterParamsForDB(sqldb, query);
    const packageNodesOnly = (0, helpers_1.getQueryParamAsArray)(query.filterNode || []).includes(response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE);
    const result = { parentToChildDbId: {} };
    if (packageNodesOnly) {
        // Package nodes only - not handled by the regular db apis
        const data = await getPackageTreeNodes(sqldb);
        parentIdsDb.forEach((id) => {
            result.parentToChildDbId[id] = data.relations[id] || [];
        });
    }
    else {
        const parentToChildrenIdMap = await sqldb.getNodeChildrenBulk(parentIdsDb, packageGroupDbIds, filters);
        for (const [parentId, children] of parentToChildrenIdMap.entries()) {
            const parentIdClient = convertIdForClient(parentId);
            result.parentToChildDbId[parentIdClient] = convertIdsForClient(children);
        }
    }
    return result;
}
/**
 * For filter change case
 *
 * Get the basic metadata for the given list of node ids
 * Called for node ids that are cached in the front-end but their data is not
 *
 * @param sqldb
 * @param {RequestQueryInput.NodesData} query
 * @returns {Promise<Response.NodesData>}
 */
async function getNodesData(sqldb, query) {
    const nodeIdsDb = convertIdsForDB(query.dbId);
    const idToPresentationDataMap = await sqldb.getNodePresentationBulk(nodeIdsDb);
    const result = await convertPresentationDataForClient(sqldb, idToPresentationDataMap);
    return result;
}
exports.getNodesData = getNodesData;
/**
 * For node selected case
 *
 * Get the extended metadata of the given single node id (which includes info needed for rendering)
 * Only a single id is accepted because the returned data includes node ancestors ids which
 * are expensive to obtain from the DB. It is also assumed that this API is only called
 * infrequently, e.g. when the user selects a node in the front-end.
 *
 * @param {RequestQueryInput.NodeExtendedData} query
 * @returns {Promise<Response.NodeExtendedData>}
 */
async function getNodeExtendedData(sqldb, query) {
    const nodeIdsDb = convertIdsForDB(query.dbId);
    if (nodeIdsDb.length !== 1) {
        throw new rexError_1.RexError({
            message: 'Can only request extended data for a single node id',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    const nodeIdDb = nodeIdsDb[0];
    const resourceRecordMap = await sqldb.getResourceOnNodeBulk([nodeIdDb]);
    const result = await convertResourceRecordForClient(sqldb, resourceRecordMap);
    return result;
}
exports.getNodeExtendedData = getNodeExtendedData;
/**
 * Returns the available filters that exist for the different known categories
 *
 * @returns {Promise<Response.FilterOptionsData>}
 */
async function getFilterOptions(sqldb) {
    const deviceRecords = sqldb.getDeviceVariantsSorted();
    const deviceFilterOptions = deviceRecords.map((record) => {
        return {
            publicId: record.publicId,
            name: record.name,
            overviewNodeDbId: record.overviewNodeId
                ? convertIdForClient(record.overviewNodeId)
                : undefined
        };
    });
    const devtoolRecords = sqldb.getDevtoolBoardsSorted();
    const devtoolFilterOptions = devtoolRecords.map((record) => {
        return {
            publicId: record.publicId,
            name: record.name,
            overviewNodeDbId: record.overviewNodeId
                ? convertIdForClient(record.overviewNodeId)
                : undefined
        };
    });
    const packageGroupFilterOptions = [];
    for (const thePackageGroup of sqldb.getSoftwarePackageGroups()) {
        packageGroupFilterOptions.push({
            publicId: thePackageGroup.packageGroupPublicUid,
            name: thePackageGroup.mainPackageName
        });
    }
    return {
        devices: deviceFilterOptions,
        devtools: devtoolFilterOptions,
        resourceClasses: sqldb.getResourceClasses(),
        ides: sqldb.getIdes(),
        compilers: sqldb.getCompilers(),
        kernels: sqldb.getKernels(),
        packageGroups: packageGroupFilterOptions,
        languages: sqldb.getLanguages()
    };
}
/**
 * Returns all device variants and boards, including each's feature support packages and for boards
 * their devices
 *
 * @returns {Promise<BoardsAndDevicesData>}
 */
async function getBoardAndDeviceData(sqldb) {
    return sqldb.getBoardAndDeviceData();
}
/**
 *  Data massaging only, no conversions or DB queries
 *
 * @param sqldb
 * @param nodeIdClient
 * @param tableViewRow
 * @param nodeIdDb
 * @returns {Nodes.Node}
 */
async function makeTableItemData(sqldb, tableViewRow) {
    const actualFileType = determineActualFileType(tableViewRow.fileType, tableViewRow.linkExt);
    const pkg = sqldb.getPackageRecords().find((pkg) => pkg.packageDbId === tableViewRow.packageId);
    // TODO TV: move into DB as with others
    if (!(0, dbTypes_1.isResourceSubClass)(tableViewRow.subClass)) {
        throw new rexError_1.RexError({
            message: `Unknown resourceSubClass ${tableViewRow.subClass}`,
            httpCode: HttpStatus.INTERNAL_SERVER_ERROR
        });
    }
    const tableItem = {
        tableItemDbId: convertIdForClient(tableViewRow.id),
        name: tableViewRow.name,
        shortDescription: tableViewRow.shortDescription,
        // assumption regardless of filter (for performance reason):
        descriptor: {
            icon: determineIcon(actualFileType, tableViewRow.icon, tableViewRow.resourceType, true),
            hasChildren: tableViewRow.hasChildren,
            isImportable: determineIsImportable(tableViewRow.resourceType),
            hasReadme: tableViewRow.hasReadme
        },
        resourceSubClass: tableViewRow.subClass,
        categoryContext: tableViewRow.categoryContext || '',
        packageName: pkg ? pkg.name : '',
        variants: tableViewRow.variants
    };
    return tableItem;
}
/**
 *  Data massaging only, no conversions or DB queries
 *
 * @param sqldb
 * @param nodeIdClient
 * @param presentationData
 * @param nodeIdDb
 * @returns {Nodes.Node}
 */
async function makeNodeData(sqldb, nodeIdClient, presentationData) {
    if (!presentationData.publicId) {
        throw new rexError_1.RexError({
            message: `Node with id ${presentationData.id} has no publicId`,
            httpCode: HttpStatus.INTERNAL_SERVER_ERROR
        });
    }
    // look up packageGroupPublicUid
    let packageGroupPublicUid;
    if (presentationData.packageGroupId) {
        const packageGroupRecord = sqldb
            .getAllPackageGroups()
            .find((p) => p.packageGroupDbId === presentationData.packageGroupId);
        if (!packageGroupRecord) {
            throw new rexError_1.RexError({
                message: `Package group with id ${presentationData.packageGroupId}, ${presentationData.name} not found`,
                httpCode: HttpStatus.INTERNAL_SERVER_ERROR
            });
        }
        packageGroupPublicUid = packageGroupRecord.packageGroupPublicUid;
    }
    else {
        packageGroupPublicUid = null;
    }
    // look up packagePublicUid
    let packagePublicUid;
    if (presentationData.packageId) {
        const packageRecord = sqldb
            .getPackageRecords()
            .find((p) => p.packageDbId === presentationData.packageId);
        if (!packageRecord) {
            throw new rexError_1.RexError({
                message: `Package with id ${presentationData.packageId} not found`,
                httpCode: HttpStatus.INTERNAL_SERVER_ERROR
            });
        }
        packagePublicUid = packageRecord.packagePublicUid;
    }
    else {
        packagePublicUid = null;
    }
    const actualFileType = determineActualFileType(presentationData.fileType, presentationData.linkExt);
    const baseNode = {
        nodeDbId: nodeIdClient,
        nodePublicId: presentationData.publicId,
        name: presentationData.name,
        shortDescription: presentationData.shortDescription,
        // assumption regardless of filter (for performance reason):
        descriptor: {
            icon: determineIcon(actualFileType, presentationData.icon, presentationData.resourceType, presentationData.isLeaf),
            hasChildren: !presentationData.isLeaf,
            programmingLanguage: getProgrammingLanguage(actualFileType),
            isImportable: determineIsImportable(presentationData.resourceType),
            isDownloadable: false
        },
        contentType: getContentType(actualFileType),
        packagePublicUid,
        packageGroupPublicUid,
        readmeNodePublicId: presentationData.readmeNodePublicId
    };
    const isFolder = !presentationData.isLeaf ||
        // WORKAROUND for some projects not having source files in BU metadata
        (presentationData.resourceType && presentationData.resourceType.startsWith('project'));
    const hasResource = presentationData.resourceType != null;
    if (presentationData.resourceType === 'packageOverview') {
        // package folder (main or supplemental packages)
        const packageRecord = sqldb
            .getPackageRecords()
            .find((p) => p.packageDbId === presentationData.packageId);
        if (!packageRecord) {
            throw new rexError_1.RexError({
                message: `Package record with id ${presentationData.packageId} not found`,
                httpCode: HttpStatus.INTERNAL_SERVER_ERROR
            });
        }
        const nodeData = {
            ...baseNode,
            nodeType: NodeType.PACKAGE_FOLDER_NODE,
            packagePublicUid: packageRecord.packagePublicUid
        };
        nodeData.descriptor.isDownloadable = true;
        return nodeData;
    }
    else if (isFolder &&
        hasResource &&
        presentationData.resourceType !== 'overview' &&
        presentationData.resourceType !== 'category') {
        // folder with resource
        const nodeData = {
            ...baseNode,
            nodeType: NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE
        };
        return nodeData;
    }
    else if (isFolder) {
        // folder (w/ or w/o overview)
        const nodeData = {
            ...baseNode,
            nodeType: NodeType.FOLDER_NODE
        };
        return nodeData;
    }
    else if (!isFolder) {
        // leaf
        const nodeData = {
            ...baseNode,
            nodeType: NodeType.LEAF_NODE
        };
        if (presentationData.linkType === 'local') {
            nodeData.descriptor.isDownloadable = true;
        }
        // determine content view/render limitations
        // Notes: (1) By default express types for mime are wrong because express specifically depends on
        // mime 1.x but @types picks ups the latest mime 2.x because of "*" in the dependency.
        // We manually installed @types/mime@1.3.1 to work around this.
        // (2) Fallback mime type is 'not-found'. Mime 2.x actually returns null instead of application/octet-stream
        // which would be preferred, but express is still using Mime 1.x. We could use Mime 2.x here
        // but then the mime types may not be consistent with what express returns (maybe it doesn't matter?)
        const NOT_FOUND = 'not-found';
        const mimeType = express.static.mime.lookup(actualFileType, NOT_FOUND);
        if (actualFileType && mimeType && mimeType !== NOT_FOUND) {
            if (mimeType === 'application/pdf' ||
                mimeType === 'application/json' ||
                mimeType === 'application/javascript' ||
                mimeType.startsWith('image/') ||
                mimeType === 'text/plain' ||
                mimeType === 'text/markdown' ||
                mimeType === 'text/html' ||
                mimeType === 'text/csv' ||
                mimeType === 'text/x-c' ||
                mimeType === 'text/x-asm') {
                // tirex content page can render these
                nodeData.descriptor.viewConstraint = undefined;
            }
            else if (mimeType === 'application/xml') {
                // tirex can't, but browser CAN render this
                nodeData.descriptor.viewConstraint = "ExternalOnly" /* Nodes.ViewConstraint.EXTERNAL_ONLY */;
            }
            else {
                // if neither tirex nor browser can render, allow download only
                nodeData.descriptor.viewConstraint = "DownloadOnly" /* Nodes.ViewConstraint.DOWNLOAD_ONLY */;
            }
        }
        else {
            // if mime type for content file is not recognized we assume it cannot be viewed in a browser
            if (presentationData.linkType === 'local') {
                nodeData.descriptor.viewConstraint = "DownloadOnly" /* Nodes.ViewConstraint.DOWNLOAD_ONLY */;
            }
            else {
                // however if it's external URL with no extension at the end and no fileType specified
                // we should to let it go through since it's most likely a web page.
                // But let's check first if the field hwas set
                nodeData.descriptor.viewConstraint = undefined;
            }
        }
        if (!nodeData.descriptor.viewConstraint) {
            if (_.size(presentationData.viewLimitations) === 1 &&
                _.first(presentationData.viewLimitations) === 'h264codec') {
                nodeData.descriptor.viewConstraint = "DesktopExternalOnly" /* Nodes.ViewConstraint.DESKTOP_EXTERNAL_ONLY */;
            }
            else {
                nodeData.descriptor.viewConstraint = presentationData.viewLimitations
                    ? "ExternalOnly" /* Nodes.ViewConstraint.EXTERNAL_ONLY */
                    : undefined;
            }
        }
        return nodeData;
    }
    throw new rexError_1.RexError({
        message: `Could not determine node type for node id ${nodeIdClient}`,
        httpCode: HttpStatus.INTERNAL_SERVER_ERROR
    });
}
exports.makeNodeData = makeNodeData;
/**
 * Make metadata for node content pane
 *
 * Data massaging only, no conversions or DB queries
 *
 * @param nodeType
 * @param {string} nodeIdClient
 * @param {string[]} nodeDbIdPath
 * @param {ResourceRecord} resourceRecord
 * @returns {Nodes.NodeExtended}
 */
function makeNodeExtendedData(nodeType, nodeIdClient, nodeDbIdPath, resourceRecord) {
    const baseNodeExtended = {
        nodeDbId: nodeIdClient,
        nodeDbIdPath,
        description: resourceRecord ? resourceRecord.description : undefined
    };
    if (nodeType === NodeType.FOLDER_NODE &&
        (!resourceRecord || (resourceRecord && resourceRecord.type === 'category'))) {
        // folder w/o overview
        const data = baseNodeExtended;
        data.nodeType = NodeType.FOLDER_NODE;
        return data;
    }
    else if (nodeType === NodeType.FOLDER_NODE &&
        resourceRecord &&
        (resourceRecord.type === 'overview' || resourceRecord.type === 'packageOverview')) {
        // folder (w/ overview)
        const data = baseNodeExtended;
        data.nodeType = NodeType.FOLDER_NODE;
        data.overview = makeOverviewType(resourceRecord);
        return data;
    }
    else if (nodeType === NodeType.FOLDER_NODE && resourceRecord) {
        // TODO; should not happen, throw error
        const data = baseNodeExtended;
        data.nodeType = NodeType.FOLDER_NODE;
    }
    else if (nodeType === NodeType.PACKAGE_FOLDER_NODE && resourceRecord) {
        // package folder
        const data = baseNodeExtended;
        data.nodeType = NodeType.PACKAGE_FOLDER_NODE;
        data.overview = makeOverviewType(resourceRecord);
        return data;
    }
    else if (nodeType === NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE && resourceRecord) {
        // folder with hidden resource (only an overview is displayed if one exists)
        //    (note DB currently only allows one record, resource or overview, to be retrieved for any
        //    given node, i.e. overviews are not currently supported for this case)
        const data = baseNodeExtended;
        data.nodeType = NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE;
        // SPECIAL CASE for Energia projects: display .ino file content
        if (resourceRecord.type === 'project.energia') {
            data.overview = makeOverviewType(resourceRecord);
        }
        return data;
    }
    else if (nodeType === NodeType.LEAF_NODE && resourceRecord) {
        // leaf resource
        if (!resourceRecord.link || !resourceRecord.linkType) {
            throw new rexError_1.RexError({
                message: `No link or linkType in resource to make extended node data for node id ${nodeIdClient}`,
                httpCode: HttpStatus.INTERNAL_SERVER_ERROR
            });
        }
        const data = baseNodeExtended;
        data.nodeType = NodeType.LEAF_NODE;
        data.link = (0, routes_1.makeLink)(resourceRecord.link, resourceRecord.linkType);
        if (resourceRecord.linkType === 'local') {
            data.linkType = "Internal" /* Nodes.LinkType.INTERNAL */;
        }
        else if (resourceRecord.linkType === 'external') {
            data.linkType = "External" /* Nodes.LinkType.EXTERNAL */;
        }
        return data;
    }
    throw new rexError_1.RexError({
        message: `No resource to make extended node data for node id ${nodeIdClient}`,
        httpCode: HttpStatus.INTERNAL_SERVER_ERROR
    });
}
/**
 *
 * @param {ResourceRecord} overviewRecord
 * @returns {Nodes.Overview | Nodes.OverviewLink | undefined}
 */
function makeOverviewType(overviewRecord) {
    if (overviewRecord.link) {
        const result = {
            overviewLink: (0, routes_1.makeLink)(overviewRecord.link, 'local'),
            overviewType: "OverviewLink" /* Nodes.OverviewType.OVERVIEW_LINK */
        };
        return result;
    }
    else if (overviewRecord.description) {
        const result = {
            overviewText: overviewRecord.description,
            overviewImage: overviewRecord.image
                ? (0, routes_1.makeLink)(overviewRecord.image, 'local')
                : undefined,
            overviewType: "Overview" /* Nodes.OverviewType.OVERVIEW */
        };
        return result;
    }
    return undefined;
}
//
// Converters to DB
//
function verifySingleValue(values, keyName) {
    if (values.length !== 1) {
        throw new rexError_1.RexError({
            message: `Can only specify one ${keyName} in filter params`,
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    return values[0];
}
/**
 *
 * @param {Filter.Params} filterParams
 * @returns {FiltersAndPackageGroupsDB}
 */
function convertFilterParamsForDB(sqldb, filterParams, options) {
    // force in the device anf devtool package groups
    const devPackageGroups = [sqldb.getDevicePackageGroup(), sqldb.getDevtoolPackageGroup()];
    const forcedPackageSetIds = devPackageGroups
        .filter((ps) => ps)
        .map((ps) => ps.packageGroupDbId);
    const filtersAndPackageGroupsDB = {
        packageGroupDbIds: forcedPackageSetIds,
        filters: {}
    };
    for (const key of Object.keys(filterParams)) {
        if (key.startsWith('filter') && filterParams[key] && filterParams[key] !== '') {
            const values = (0, helpers_1.getQueryParamAsArray)(filterParams[key]);
            switch (key) {
                case 'filterPackageGroup':
                    const filterPackageGroupIds = values;
                    filtersAndPackageGroupsDB.packageGroupDbIds = [
                        ...filtersAndPackageGroupsDB.packageGroupDbIds,
                        // map public id to DB id
                        ...filterPackageGroupIds.map((value) => {
                            const thePackageGroup = sqldb
                                .getSoftwarePackageGroups()
                                .find((packageGroup) => value === packageGroup.packageGroupPublicUid);
                            if (!thePackageGroup) {
                                throw new rexError_1.RexError({
                                    message: `No package group found with packageGroupPublicUid ${value}`,
                                    httpCode: HttpStatus.BAD_REQUEST
                                });
                            }
                            return thePackageGroup.packageGroupDbId;
                        })
                    ];
                    break;
                case 'filterDevice':
                    const filterDeviceId = verifySingleValue(values, 'device');
                    // map public id to DB id
                    const theDeviceRecord = sqldb
                        .getDeviceVariantsSorted()
                        .find((deviceRecord) => filterDeviceId === deviceRecord.publicId);
                    if (!theDeviceRecord) {
                        throw new rexError_1.RexError({
                            message: `No device found with publicId ${filterDeviceId}`,
                            httpCode: HttpStatus.BAD_REQUEST
                        });
                    }
                    filtersAndPackageGroupsDB.filters.deviceId = theDeviceRecord.id;
                    break;
                case 'filterDevtool':
                    const filterDevtoolId = verifySingleValue(values, 'devtool');
                    // map public id to DB id
                    const theDevtoolRecord = sqldb
                        .getDevtoolBoardsSorted()
                        .find((devtoolRecord) => filterDevtoolId === devtoolRecord.publicId);
                    if (!theDevtoolRecord) {
                        throw new rexError_1.RexError({
                            message: `No devtool found with publicId ${filterDevtoolId}`,
                            httpCode: HttpStatus.BAD_REQUEST
                        });
                    }
                    filtersAndPackageGroupsDB.filters.devtoolId = theDevtoolRecord.id;
                    break;
                case 'filterSearch':
                    const searchText = values[0];
                    const andTerms = searchText
                        .split(/\s*[ ,;|/]+\s*/)
                        .map((term) => term.toLocaleLowerCase().trim())
                        .map((term) => `*${term}*`);
                    filtersAndPackageGroupsDB.filters.search = andTerms;
                    break;
                case 'filterCompiler':
                    if (!(options && options.multiCompiler)) {
                        verifySingleValue(values, 'compiler');
                        filtersAndPackageGroupsDB.filters.compiler = values[0];
                    }
                    else {
                        filtersAndPackageGroupsDB.filters.compiler = values;
                    }
                    break;
                case 'filterIde':
                    verifySingleValue(values, 'ide');
                    filtersAndPackageGroupsDB.filters.ide = values[0];
                    break;
                case 'filterLanguage':
                    verifySingleValue(values, 'language');
                    filtersAndPackageGroupsDB.filters.language = values[0];
                    break;
                case 'filterResourceClass':
                    verifySingleValue(values, 'resourceClass');
                    filtersAndPackageGroupsDB.filters.resourceClass = values[0];
                    break;
                case 'filterKernel':
                    verifySingleValue(values, 'kernel');
                    filtersAndPackageGroupsDB.filters.kernel = values[0];
                    break;
                case 'filterNode':
                    // ignore, doesn't map to a filter at the DB layer
                    break;
                default:
                    throw new rexError_1.RexError({
                        message: `Filter param ${key} is not supported`,
                        httpCode: HttpStatus.BAD_REQUEST
                    });
            }
        }
    }
    return filtersAndPackageGroupsDB;
}
/**
 *
 * @param {string | string[]} ids
 * @returns {number[]}
 */
function convertIdsForDB(ids) {
    if (!ids) {
        throw new rexError_1.RexError({
            message: 'Required id parameter was not provided',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    const nodeIds = Array.isArray(ids) ? ids : [ids];
    const dbNodeIds = [];
    for (const nodeId of nodeIds) {
        let dbNodeId;
        dbNodeId = parseInt(nodeId);
        if (isNaN(dbNodeId)) {
            throw new rexError_1.RexError({
                message: `Id is NaN: ${nodeId}`,
                httpCode: HttpStatus.BAD_REQUEST
            });
        }
        dbNodeIds.push(dbNodeId);
    }
    return dbNodeIds;
}
exports.convertIdsForDB = convertIdsForDB;
//
// Converters to client
//
/**
 *
 * @param {number} id
 * @returns {string}
 */
function convertIdForClient(id) {
    let idClient;
    idClient = id.toString();
    return idClient; // TODO change to base64
}
exports.convertIdForClient = convertIdForClient;
function convertIdsForClient(ids) {
    return ids.map((nodeId) => convertIdForClient(nodeId));
}
exports.convertIdsForClient = convertIdsForClient;
async function convertPresentationDataForClient(sqldb, presentationDataMap) {
    const nodesData = { dbIdToData: {} };
    for (const [nodeIdDb, presentationData] of presentationDataMap.entries()) {
        const nodeIdClient = convertIdForClient(nodeIdDb);
        let nodeData;
        try {
            nodeData = await makeNodeData(sqldb, nodeIdClient, presentationData);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `Could not create node data for node id ${nodeIdDb}`,
                causeError: err,
                httpCode: HttpStatus.INTERNAL_SERVER_ERROR
            });
        }
        nodesData.dbIdToData[nodeIdClient] = nodeData;
    }
    return nodesData;
}
async function convertResourceRecordForClient(sqldb, resourceRecordMap) {
    const result = { dbIdToChildExtData: {} };
    for (const [nodeDbId, resourceRecord] of resourceRecordMap.entries()) {
        const nodeIdClient = convertIdForClient(nodeDbId);
        // get the node's ancestors for 'path'
        let nodeDbIdPath;
        try {
            const ancestorsIds = await sqldb.getNodeAncestors(nodeDbId);
            const ancestorsWithoutRoot = ancestorsIds.slice(1);
            const ancestorIdsClient = convertIdsForClient(ancestorsWithoutRoot);
            nodeDbIdPath = [...ancestorIdsClient, nodeIdClient];
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `Could not get ancestors for node id ${nodeDbId}`,
                causeError: err,
                httpCode: HttpStatus.INTERNAL_SERVER_ERROR
            });
        }
        // generate the node object for the front end based on the required node type
        let nodeExtendedData;
        try {
            // have to determine node type first so that they match
            const presentationData = await sqldb.getNodePresentation(nodeDbId);
            const nodeData = await makeNodeData(sqldb, nodeIdClient, presentationData);
            nodeExtendedData = makeNodeExtendedData(nodeData.nodeType, nodeIdClient, nodeDbIdPath, resourceRecord);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `Could not create node data for node id ${nodeIdClient}`,
                causeError: err,
                httpCode: HttpStatus.INTERNAL_SERVER_ERROR
            });
        }
        result.dbIdToChildExtData[nodeIdClient] = nodeExtendedData;
    }
    return result;
}
exports.convertResourceRecordForClient = convertResourceRecordForClient;
//
// Getters for Descriptor
//
// Note: In the functions below fileType ideally already is just the extension, i.e. '.ext'
// but some old packages may have fileTypes of the form 'xxx.ext'. That's why we extract the
// extension below.
/**
 * Returns true if some text string ends with any one of the specified extensions
 * @param text
 * @param extensions
 */
function testExtension(text, extensions) {
    const extname = text.substring(text.lastIndexOf('.')).toLowerCase(); // include the '.'
    return extensions.includes(extname);
}
function getContentType(fileType) {
    if (testExtension(fileType, ['.c', '.h', '.cpp', '.asm', '.cmd', '.ino'])) {
        return "Code" /* Nodes.ContentType.SOURCE_CODE */;
    }
    else if (testExtension(fileType, ['.md'])) {
        return "Markdown" /* Nodes.ContentType.MARKDOWN */;
    }
    else if (testExtension(fileType, ['.pdf'])) {
        return "PDF" /* Nodes.ContentType.PDF */;
    }
    return "Other" /* Nodes.ContentType.OTHER */;
}
function getProgrammingLanguage(fileType) {
    if (testExtension(fileType, ['.c', '.h', '.cpp', '.ino'])) {
        return "C" /* Nodes.ProgrammingLanguage.C */;
    }
    else if (testExtension(fileType, ['.asm'])) {
        return "Asm" /* Nodes.ProgrammingLanguage.ASM */;
    }
    return undefined;
}
function determineIsImportable(resourceType) {
    return resourceType ? (0, dbTypes_1.isResourceTypeImportableByCCS)(resourceType) : false;
}
function determineActualFileType(fileType, linkExt) {
    let resultingFileType;
    if (fileType) {
        resultingFileType = fileType; // BU specified takes priority
    }
    else if (linkExt && linkExt !== '') {
        resultingFileType = linkExt;
    }
    else {
        resultingFileType = '';
    }
    return resultingFileType;
}
function determineIcon(actualFileType, icon, resourceType, isLeaf) {
    let resultingIcon;
    if (icon) {
        // support some custom icon images of old packages by mapping them to our icons
        resultingIcon = mapCustomIcon(icon);
    }
    if (!resultingIcon) {
        resultingIcon = getIcon(actualFileType, resourceType || null, isLeaf);
    }
    return resultingIcon;
    //
    // private functions
    //
    function getIcon(fileType, resourceType, isLeaf) {
        // leaf icons
        if (isLeaf) {
            if (testExtension(fileType, ['.c'])) {
                return "SourceCode_C" /* Nodes.Icon.SOURCE_CODE_C */;
            }
            else if (testExtension(fileType, ['.h'])) {
                return "SourceCode_H" /* Nodes.Icon.SOURCE_CODE_H */;
            }
            else if (testExtension(fileType, ['.cpp'])) {
                return "SourceCode_CPP" /* Nodes.Icon.SOURCE_CODE_CPP */;
            }
            else if (testExtension(fileType, ['.asm'])) {
                return "SourceCode_ASM" /* Nodes.Icon.SOURCE_CODE_ASM */;
            }
            else if (testExtension(fileType, ['.cmd'])) {
                return "SourceCode_CMD" /* Nodes.Icon.SOURCE_CODE_CMD */;
            }
            else if (testExtension(fileType, ['.md'])) {
                return "Markdown" /* Nodes.Icon.MARKDOWN */;
            }
            else if (testExtension(fileType, ['.pdf'])) {
                return "PDF" /* Nodes.Icon.PDF */;
            }
            else if (resourceType === 'file.executable') {
                return "Executable" /* Nodes.Icon.EXECUTABLE */;
            }
            else if (resourceType === 'web.page') {
                return "WebPage" /* Nodes.Icon.WEBPAGE */;
            }
            else if (resourceType === 'web.app') {
                return "WebApp" /* Nodes.Icon.WEBAPP */;
            }
        }
        // leaf or non-leaf icons
        if (resourceType === 'project.ccs' || resourceType === 'projectSpec') {
            return "Project_CCS" /* Nodes.Icon.PROJECT_CCS */;
        }
        else if (resourceType === 'project.energia') {
            return "Project_Energia" /* Nodes.Icon.PROJECT_ENERGIA */;
        }
        else if (resourceType === 'project.iar') {
            return "Project_IAR" /* Nodes.Icon.PROJECT_IAR */;
        }
        else if (resourceType === 'packageOverview') {
            return "Package" /* Nodes.Icon.PACKAGE */;
        }
        // default
        if (!isLeaf) {
            return "Folder" /* Nodes.Icon.FOLDER */;
        }
        else {
            return "File" /* Nodes.Icon.FILE */;
        }
    }
    function mapCustomIcon(iconPath) {
        const iconFilename = path.basename(iconPath);
        if (iconFilename === 'icon_s_forum_a.png') {
            return "Support" /* Nodes.Icon.SUPPORT */;
        }
        else if (iconFilename === 'icon_s_video_a.png') {
            return "Video" /* Nodes.Icon.VIDEO */;
        }
        else if (iconFilename === 'Help.png') {
            return "Help" /* Nodes.Icon.HELP */;
        }
        else if (iconFilename === 'scs.png') {
            return "Image" /* Nodes.Icon.IMAGE */;
        }
        else if (iconFilename === 'DevelopmentNetwork.png') {
            return "Network" /* Nodes.Icon.NETWORK */;
        }
        else if (iconFilename === 'bluetooth_icon.png') {
            return "Bluetooth" /* Nodes.Icon.BLUETOOTH */;
        }
        else if (iconFilename === 'sub1.png') {
            return "Wifi" /* Nodes.Icon.WIFI */;
        }
        else if (iconFilename === 'icon_s_wiki_a.png') {
            return "Wiki" /* Nodes.Icon.WIKI */;
        }
        else if (iconFilename === 'Training.png') {
            return "Training" /* Nodes.Icon.TRAINING */;
        }
        else if (iconFilename === 'favicon.png') {
            // used by SimpleLink
            return "Training" /* Nodes.Icon.TRAINING */;
        }
        else if (iconFilename === 'icon_s_ppt_a.png') {
            return "Powerpoint" /* Nodes.Icon.POWERPOINT */;
        }
        else if (iconFilename === 'Documentation.png') {
            return "Document" /* Nodes.Icon.DOCUMENT */;
        }
        else if (iconFilename === 'icon_s_html_a.png') {
            return "WebPage" /* Nodes.Icon.WEBPAGE */;
        }
        else if (iconFilename === 'icon_s_doc_a.png') {
            return "File" /* Nodes.Icon.FILE */;
        }
        else if (iconFilename === 'icon_s_tools-software_a.png') {
            return "Devtool" /* Nodes.Icon.DEVTOOL */;
        }
        return;
    }
}
async function getPackageTreeNodes(sqldb) {
    const tree = await sqldb.getNodePackageTree();
    const flatMapData = {};
    const flatMapRelations = {};
    let nodesPresentationData = [tree];
    let idx = 0;
    do {
        const presentationData = nodesPresentationData[idx++];
        nodesPresentationData = nodesPresentationData.concat(presentationData.children);
        // Write to flatMapData & flatMapRelations
        const nodeDbId = convertIdForClient(presentationData.id);
        const finalNode = await makeNodeData(sqldb, nodeDbId, presentationData);
        flatMapData[nodeDbId] = finalNode;
        if (!_.isEmpty(presentationData.children)) {
            flatMapRelations[nodeDbId] = presentationData.children.map((item) => convertIdForClient(item.id));
        }
    } while (idx < nodesPresentationData.length);
    return { data: flatMapData, relations: flatMapRelations, sessionId: sqldb.getSessionId() };
}
function verifyValuesAllString(queryKeys, query) {
    for (const key of queryKeys) {
        if (query[key] && Array.isArray(query[key])) {
            throw new rexError_1.RexError({
                message: `${String(key)} is an array, must be a string`,
                httpCode: HttpStatus.BAD_REQUEST
            });
        }
    }
}
