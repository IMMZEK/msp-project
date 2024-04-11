'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeServerHarnessData = exports.ServerDataInput = void 0;
// 3rd party
const _ = require("lodash");
const response_data_1 = require("../../shared/routes/response-data");
const util_1 = require("../../shared/util");
const util_2 = require("../../frontend/component-helpers/util");
var ServerDataInput;
(function (ServerDataInput) {
    // Input
    let InputType;
    (function (InputType) {
        InputType["FILTER_DATA_ONLY"] = "FilterDataOnly";
        InputType["NODE_DATA"] = "NodeData";
        InputType["TABLE_ITEM_DATA"] = "TableItemData";
    })(InputType = ServerDataInput.InputType || (ServerDataInput.InputType = {}));
})(ServerDataInput || (exports.ServerDataInput = ServerDataInput = {}));
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Initializes the server data received (set any defaults, etc).
 *
 * @param data
 *
 * @returns initializedServerData
 */
function initializeServerHarnessData(data) {
    const hierarchy = data.inputType === ServerDataInput.InputType.FILTER_DATA_ONLY ? {} : data.hierarchy;
    const tableItemHierarchy = data.inputType === ServerDataInput.InputType.TABLE_ITEM_DATA ? data.tableItemHierarchy : {};
    const rootNode = data.inputType === ServerDataInput.InputType.FILTER_DATA_ONLY ? '0' : data.rootNode;
    const softwareNodePublicId = data.inputType === ServerDataInput.InputType.FILTER_DATA_ONLY
        ? rootNode
        : data.softwareNodePublicId || rootNode;
    // Generate the node data
    let nodeData;
    let nodeDataExtended;
    let nodeFilterData;
    if (data.inputType === ServerDataInput.InputType.NODE_DATA ||
        data.inputType === ServerDataInput.InputType.TABLE_ITEM_DATA) {
        ({ nodeData, nodeDataExtended, nodeFilterData } = generateNodeData(data));
    }
    else {
        nodeData = {};
        nodeDataExtended = {};
        nodeFilterData = {};
    }
    // Generate the table item data
    let tableItemData;
    let tableItemFilterData;
    if (data.inputType === ServerDataInput.InputType.TABLE_ITEM_DATA) {
        ({ tableItemData, tableItemFilterData } = generateTableItemData(data));
    }
    else {
        tableItemData = {};
        tableItemFilterData = {};
    }
    // Generate the filter data
    const filterData = {
        compilers: data.filterData ? data.filterData.compilers : [],
        devices: data.filterData ? data.filterData.devices : [],
        devtools: data.filterData ? data.filterData.devtools : [],
        ides: data.filterData ? data.filterData.ides : [],
        kernels: data.filterData ? data.filterData.kernels : [],
        resourceClasses: data.filterData ? data.filterData.resourceClasses : [],
        languages: data.filterData ? data.filterData.languages : [],
        packageGroups: data.filterData
            ? _.chain(data.filterData.packages)
                .map(item => item.packageGroupPublicUids.map(id => ({
                publicId: id,
                name: 'Group name placeholder'
            })))
                .flatten()
                .uniqBy('publicId')
                .value()
            : []
    };
    // Generate the package data and package groups data
    const packages = sortPackages(data.filterData ? data.filterData.packages : []);
    const packageGroups = sortPackageGroups(data.filterData && data.filterData.packageGroups
        ? data.filterData.packageGroups
        : generatePackageGroups(packages));
    return {
        filterData,
        packages,
        packageGroups,
        rootNode,
        softwareNodePublicId,
        hierarchy,
        nodeData,
        nodeDataExtended,
        nodeFilterData,
        sessionId: 'testSessionId',
        rex3Links: data.rex3Links || {},
        tableItemData,
        tableItemFilterData,
        tableItemHierarchy
    };
}
exports.initializeServerHarnessData = initializeServerHarnessData;
function generateNodeData(data) {
    const { nodeData: nodes, rootNode, hierarchy } = data;
    const accum = { nodeData: {}, nodeDataExtended: {}, nodeFilterData: {} };
    const result = Object.keys(nodes)
        .map(nodeDbId => {
        const node = nodes[nodeDbId];
        const { name, nodePublicId, descriptor: { icon, ...restDescriptor }, contentType, packagePublicUid, packageGroupPublicUid, filterData } = node;
        const path = getPath(nodeDbId, hierarchy, rootNode);
        if (!path) {
            throw new Error(`Cannot get path for node id ${nodeDbId}`);
        }
        // Don't include root in the path
        path.shift();
        const nodeDataCommon = {
            nodeDbId,
            nodePublicId,
            name,
            descriptor: {
                ...restDescriptor,
                icon: icon || "Folder" /* Nodes.Icon.FOLDER */,
                hasChildren: !!data.hierarchy[nodeDbId] && data.hierarchy[nodeDbId].length > 0
            },
            contentType,
            packagePublicUid,
            packageGroupPublicUid
        };
        const nodeDataExtendedCommon = {
            nodeDbId,
            nodeDbIdPath: path
        };
        const nodeFilterDataCommon = {
            nodeDbId,
            filterData
        };
        let result;
        if (node.nodeType === response_data_1.Nodes.NodeType.FOLDER_NODE) {
            const { overview } = node;
            const nodeType = response_data_1.Nodes.NodeType.FOLDER_NODE;
            result = {
                node: { ...nodeDataCommon, nodeType },
                nodeDataExtended: {
                    ...nodeDataExtendedCommon,
                    nodeType,
                    overview
                },
                nodeFilterData: {
                    ...nodeFilterDataCommon,
                    nodeType: node.nodeType
                }
            };
        }
        else if (node.nodeType === response_data_1.Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE) {
            const { overview } = node;
            const nodeType = response_data_1.Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE;
            result = {
                node: { ...nodeDataCommon, nodeType },
                nodeDataExtended: {
                    ...nodeDataExtendedCommon,
                    nodeType,
                    overview
                },
                nodeFilterData: { ...nodeFilterDataCommon, nodeType }
            };
        }
        else if (node.nodeType === response_data_1.Nodes.NodeType.LEAF_NODE) {
            const { description, link } = node;
            const nodeType = response_data_1.Nodes.NodeType.LEAF_NODE;
            if (!icon) {
                nodeDataCommon.descriptor.icon = "File" /* Nodes.Icon.FILE */;
            }
            result = {
                node: {
                    ...nodeDataCommon,
                    nodeType
                },
                nodeDataExtended: {
                    ...nodeDataExtendedCommon,
                    nodeType,
                    description,
                    link,
                    linkType: "Internal" /* Nodes.LinkType.INTERNAL */
                },
                nodeFilterData: { ...nodeFilterDataCommon, nodeType }
            };
        }
        else if (node.nodeType === response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE) {
            const { packagePublicUid, overview } = node;
            const nodeType = response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE;
            if (!icon) {
                nodeDataCommon.descriptor.icon = "Package" /* Nodes.Icon.PACKAGE */;
            }
            result = {
                node: {
                    ...nodeDataCommon,
                    nodeType,
                    packagePublicUid
                },
                nodeDataExtended: {
                    ...nodeDataExtendedCommon,
                    nodeType,
                    overview
                },
                nodeFilterData: { ...nodeFilterDataCommon, nodeType }
            };
        }
        else {
            throw new Error(`Unknown node type for node ${node}`);
        }
        return result;
    })
        .reduce((accum, { node, nodeDataExtended, nodeFilterData }) => {
        accum.nodeData[node.nodeDbId] = node;
        accum.nodeDataExtended[node.nodeDbId] = nodeDataExtended;
        accum.nodeFilterData[node.nodeDbId] = nodeFilterData;
        return accum;
    }, accum);
    // Add rootNode
    result.nodeData[rootNode] = {
        nodeDbId: rootNode,
        nodePublicId: 'public' + rootNode,
        descriptor: {
            hasChildren: !!data.hierarchy[rootNode] && data.hierarchy[rootNode].length > 0,
            icon: "Folder" /* Nodes.Icon.FOLDER */,
            isDownloadable: false
        },
        nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
        name: 'root',
        contentType: "Other" /* Nodes.ContentType.OTHER */,
        packagePublicUid: null,
        packageGroupPublicUid: null
    };
    result.nodeDataExtended[rootNode] = {
        nodeDbId: rootNode,
        nodeDbIdPath: [rootNode],
        nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE
    };
    result.nodeFilterData[rootNode] = {
        nodeDbId: rootNode,
        nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
        filterData: {
            filterPackageGroup: []
        }
    };
    return result;
}
function generateTableItemData(data) {
    const { tableItemData: tableItems } = data;
    const accum = { tableItemData: {}, tableItemFilterData: {} };
    const result = Object.keys(tableItems)
        .map(tableItemDbId => {
        const tableItem = tableItems[tableItemDbId];
        const { name, tableItemNodeDbId, descriptor: { icon, ...restDescriptor }, filterData, variants, resourceSubClass = 'example.general', packageName = 'Placeholder package name' } = tableItem;
        const resolvedVariants = {};
        variants.forEach(({ variant, nodeDbId }) => {
            resolvedVariants[(0, util_2.getTableItemVariantAsString)(variant)] = nodeDbId;
        });
        return {
            tableItemData: {
                tableItemDbId,
                name,
                descriptor: {
                    ...restDescriptor,
                    icon: icon || "Folder" /* Nodes.Icon.FOLDER */,
                    hasChildren: !!data.tableItemHierarchy[tableItemDbId] &&
                        data.tableItemHierarchy[tableItemDbId].length > 0
                },
                categoryContext: '',
                resourceSubClass,
                packageName,
                variants: variants.map(item => item.variant)
            },
            tableItemFilterData: {
                tableItemDbId,
                tableItemNodeDbId,
                filterData,
                variants: resolvedVariants
            }
        };
    })
        .reduce((accum, { tableItemData, tableItemFilterData }) => {
        accum.tableItemData[tableItemData.tableItemDbId] = tableItemData;
        accum.tableItemFilterData[tableItemData.tableItemDbId] = tableItemFilterData;
        return accum;
    }, accum);
    return result;
}
/**
 * Sort the packages; in ascending order.
 *
 * @param packages
 *
 * @returns sortedPackages
 */
function sortPackages(packages) {
    return (0, util_1.sortVersionedItems)(packages, 'packagePublicId', 'packageVersion');
}
/**
 * Sort the groups; in ascending order.
 *
 * @param groups
 *
 * @returns sortedGroups
 */
function sortPackageGroups(groups) {
    return (0, util_1.sortVersionedItems)(groups, 'packageGroupPublicId', 'packageGroupVersion');
}
function getPath(id, hierarchy, currentId, accum = []) {
    if (id === currentId) {
        return accum.concat(id);
    }
    const children = hierarchy[currentId];
    const path = !!children &&
        children
            .map(childId => getPath(id, hierarchy, childId, accum.concat(currentId)))
            .filter(path => !!path);
    return !!path && path.length === 1 && path[0];
}
function generatePackageGroups(packages) {
    const groups = {}; // Value = packagePublicUids
    packages.forEach(pkg => {
        pkg.packageGroupPublicUids.forEach(id => {
            groups[id] = [...(groups[id] || []), pkg.packagePublicUid];
        });
    });
    let groupVersion = 1;
    let groupPublicId = 1;
    return Object.entries(groups).map(([packageGroupPublicUid, packagesPublicUids]) => {
        const mainPkg = packages.find(pkg => packagesPublicUids.includes(pkg.packagePublicUid) &&
            pkg.packageType === "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */);
        if (!mainPkg) {
            throw new Error('No main package for group');
        }
        return {
            packageGroupVersion: (groupVersion++).toString(),
            packageGroupPublicId: (groupPublicId++).toString(),
            packageGroupPublicUid,
            packagesPublicUids,
            mainPackagePublicUid: mainPkg.packagePublicUid,
            hideByDefault: false,
            packagesToListVersionsFrom: []
        };
    });
}
