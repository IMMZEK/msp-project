"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importProjectInCurrentPackage = exports.importProject = exports.jumpToNodeOnLocalId = exports.jumpToNodeOnGlobalId = exports.jumpToNodeInCurrentPackage = exports.jumpToNode = void 0;
const _ = require("lodash");
const routing_helpers_1 = require("./routing-helpers");
const public_id_helpers_1 = require("./public-id-helpers");
const util_1 = require("../../shared/util");
const import_1 = require("../components/import");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
//
// Jump to Node functions
//
function jumpToNode(appProps, publicId, options = {}) {
    const link = (0, routing_helpers_1.getNodeLink)({
        publicId,
        urlQuery: getUrlQuery(appProps, options),
        page: appProps.page,
        keepFullQueryUrl: true
    });
    appProps.history.push(link);
}
exports.jumpToNode = jumpToNode;
function jumpToNodeInCurrentPackage(appProps, nodePublicId, options = {}) {
    const { packageGroupPublicUid, packagePublicUid } = getSelectedNodePackageInfo(appProps);
    const publicId = (0, public_id_helpers_1.getPublicIdFromIds)({
        nodePublicId,
        packageGroupPublicUid,
        packagePublicUid,
        allGroups: appProps.packageGroups,
        allPackages: appProps.packages,
        urlQuery: appProps.urlQuery
    });
    jumpToNode(appProps, publicId, options);
}
exports.jumpToNodeInCurrentPackage = jumpToNodeInCurrentPackage;
async function jumpToNodeOnGlobalId(appProps, globalId, options = {}) {
    checkDeviceAndDevtool(options);
    const device = options.device;
    const devtool = options.devtool;
    const nodeInfo = _.first(await appProps.apis.getNodeInfoForGlobalId({ globalId, device, devtool }));
    if (!nodeInfo) {
        throw new Error(`Node not found on: global id ${globalId}` +
            (device ? `, device ${device}` : '') +
            (devtool ? `, devtool ${devtool}` : ''));
    }
    const publicId = getNodePublicIdFromNodeInfo(appProps, nodeInfo);
    jumpToNode(appProps, publicId, options);
}
exports.jumpToNodeOnGlobalId = jumpToNodeOnGlobalId;
async function jumpToNodeOnLocalId(appProps, localId, packageId, packageVersion, options = {}) {
    checkDeviceAndDevtool(options);
    const device = options.device;
    const devtool = options.devtool;
    if (!packageId) {
        const { packagePublicUid } = getSelectedNodePackageInfo(appProps);
        // TODO TP: Move into helper function? Or better yet refactor things so that sort of thing
        // isn't necessary internally. May be better to eventually use {id, version} as an UID
        // instead of id__version internally whereever possible; but that's a much wider change.
        const pkg = _.find(appProps.packages, pkg => {
            return pkg.packagePublicUid === packagePublicUid;
        });
        if (!pkg) {
            throw new Error(`Package not found on packagePublicUid: ${packagePublicUid}`);
        }
        ({ packagePublicId: packageId, packageVersion } = pkg);
    }
    const nodeInfo = _.first(await appProps.apis.getNodeInfoForResourceId({
        resourceId: localId,
        packageId,
        packageVersion,
        device,
        devtool
    }));
    if (!nodeInfo) {
        throw new Error(`Node not found on: local id ${localId}` +
            (packageId ? `, packageId ${packageId}` : '') +
            (packageVersion ? `, packageVersion ${packageVersion}` : '') +
            (device ? `, device ${device}` : '') +
            (devtool ? `, devtool ${devtool}` : ''));
    }
    const publicId = getNodePublicIdFromNodeInfo(appProps, nodeInfo);
    jumpToNode(appProps, publicId, options);
}
exports.jumpToNodeOnLocalId = jumpToNodeOnLocalId;
//
// Import Project functions
//
async function importProject(appProps, publicId) {
    const dbId = await (0, public_id_helpers_1.getNodeDbIdFromPublicId)(publicId, appProps.packageGroups, appProps.urlQuery, appProps.apis);
    if (!dbId) {
        throw new Error('Unknown public id: ' + publicId);
    }
    const [node] = await appProps.apis.getNodes([dbId]);
    if (!node.descriptor.isImportable) {
        throw new Error('Specified node cannot be imported as a project');
    }
    appProps.mountComponentTemporarily.mountDialogTemporarily(import_1.Import, {
        appProps,
        node,
        projectName: null,
        importType: "Online" /* ImportType.ONLINE */
    });
}
exports.importProject = importProject;
function importProjectInCurrentPackage(appProps, nodePublicId) {
    const { packageGroupPublicUid, packagePublicUid } = getSelectedNodePackageInfo(appProps);
    const publicId = (0, public_id_helpers_1.getPublicIdFromIds)({
        nodePublicId,
        packageGroupPublicUid,
        packagePublicUid,
        allGroups: appProps.packageGroups,
        allPackages: appProps.packages,
        urlQuery: appProps.urlQuery
    });
    return importProject(appProps, publicId);
}
exports.importProjectInCurrentPackage = importProjectInCurrentPackage;
//
// Internal functions
//
function getSelectedNodePackageInfo(appProps) {
    if (!appProps.selectedNode) {
        throw new Error('Trying to jump to a node in the current package but we are not on a node');
    }
    else if (!appProps.selectedNode.packageGroupPublicUid) {
        throw new Error('Trying to jump to a node in the current package but the currently selected node has no package group');
    }
    else if (!appProps.selectedNode.packagePublicUid) {
        throw new Error('Trying to jump to a node in the current package but the currently selected node has no package');
    }
    const { packagePublicUid, packageGroupPublicUid } = appProps.selectedNode;
    return {
        packageGroupPublicUid,
        packagePublicUid
    };
}
function getUrlQuery(appProps, options) {
    const urlQuery = { ...appProps.urlQuery };
    (0, util_1.getObjectKeys)(options).forEach(item => {
        switch (item) {
            case 'chapter':
                urlQuery[item] = options[item];
                break;
            default:
                // Ignore, as options may be a superset of UrlOptions
                break;
        }
    });
    return urlQuery;
}
function checkDeviceAndDevtool(options) {
    if (options.device && options.devtool) {
        throw new Error('Options device and devtool are mutually exclusive and cannot both be defined');
    }
}
function getNodePublicIdFromNodeInfo(appProps, nodeInfo) {
    const packageGroup = appProps.packageGroups.find(group => group.packageGroupPublicId === nodeInfo.packageGroup.publicId &&
        group.packageGroupVersion === nodeInfo.packageGroup.version);
    if (!packageGroup) {
        throw new Error(`Unknown package group with id ${nodeInfo.packageGroup.publicId} and ` +
            `version ${nodeInfo.packageGroup.version}`);
    }
    return (0, public_id_helpers_1.getPublicIdFromIds)({
        nodePublicId: nodeInfo.hashedNodePublicId,
        packageGroupPublicUid: packageGroup.packageGroupPublicUid,
        packagePublicUid: `${nodeInfo.package.publicId}__${nodeInfo.package.version}`,
        allGroups: appProps.packageGroups,
        allPackages: appProps.packages,
        urlQuery: {}
    });
}
