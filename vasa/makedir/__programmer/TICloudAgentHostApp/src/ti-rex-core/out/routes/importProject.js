"use strict";
/**
 *  Supports importProject, createProject
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoutes = void 0;
// 3rd party
const express_1 = require("express");
const url = require("url");
const path = require("path");
const vars_1 = require("../lib/vars");
const executeRoute_1 = require("./executeRoute");
const nodes_1 = require("./nodes");
const rexError_1 = require("../utils/rexError");
const HttpStatus = require("http-status-codes");
const helpers_1 = require("../shared/helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getRoutes() {
    const routes = (0, express_1.Router)();
    routes.get(`/${"api/importProject" /* API.GET_IMPORT_PROJECT */}`, (0, executeRoute_1.executeRoute)(importProject, sendImportProjectResponse));
    routes.get(`/${"api/importInfo" /* API.GET_IMPORT_INFO */}`, (0, executeRoute_1.executeRoute)(importInfo));
    return routes;
}
exports.getRoutes = getRoutes;
async function importInfo(sqldb, query, req) {
    // Get the resource
    const [id] = (0, nodes_1.convertIdsForDB)(query.dbId);
    const resource = await sqldb.getResourceOnNode(id);
    if (!resource || !resource.id) {
        throw new rexError_1.RexError({
            message: 'No resource id found: ' + req.originalUrl,
            httpCode: HttpStatus.INTERNAL_SERVER_ERROR
        });
    }
    if (!resource.link) {
        throw new rexError_1.RexError({
            message: 'No link found for resource: ' + resource.id,
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    const projectType = getProjectType(resource.type);
    if (!projectType) {
        throw new rexError_1.RexError({
            message: `Requesting to get import info on resource with type ${resource.type}, ${resource.id}`,
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    return {
        location: resource.link,
        projectType,
        targets: await getTargets(sqldb, resource, query)
    };
}
/*
    importProject checks to see  what parameters we need to use for importProject
*/
async function importProject(_sqldb, query, _req) {
    if (!query.projectType || !query.location) {
        throw new rexError_1.RexError({
            message: 'Missing required field',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    query.targetId = query.targetId || vars_1.Vars.TARGET_ID_PLACEHOLDER;
    const { location, targetId, projectName } = query;
    switch (query.projectType) {
        case "project.ccs" /* ProjectType.CCS */:
        case "projectSpec" /* ProjectType.SPEC */:
            return importProject(location, targetId, projectName);
        case "file.importable" /* ProjectType.FILE */:
        case "folder.importable" /* ProjectType.FOLDER */:
            return createProject(location, targetId, projectName);
        case "project.energia" /* ProjectType.ENERGIA */:
            return importSketch(location, targetId, projectName);
        default:
            throw new rexError_1.RexError({
                message: `Invalid resourceType ${query.projectType}`,
                httpCode: HttpStatus.BAD_REQUEST
            });
    }
    function importProject(location, targetId, projectName) {
        return generateCCSUrl("/ide/importProject" /* CCS_CLOUD_API.IMPORT_PROJECT */, {
            location,
            deviceId: targetId,
            projectName
        });
    }
    function createProject(location, targetId, projectName, templateId, toolVersion, outputType) {
        return generateCCSUrl("/ide/createProject" /* CCS_CLOUD_API.CREATE_PROJECT */, {
            copyFiles: location,
            projectName: projectName || path.basename(location),
            ...(targetId ? { deviceId: targetId } : {}),
            ...(toolVersion ? { toolVersion } : {}),
            ...(templateId ? { templateId } : {}),
            ...(outputType ? { outputType } : {})
        });
    }
    function importSketch(location, targetId, projectName) {
        return generateCCSUrl("/ide/importSketch" /* CCS_CLOUD_API.IMPORT_SKETCH */, {
            sketchFile: location,
            boardId: targetId,
            ...(projectName ? { projectName } : {})
        });
    }
}
/*
    sendResponse will be send as  a parameter to the executeRoute to be used as the custom response function
    The only thing that this functions needs to do is the redirect
*/
const sendImportProjectResponse = function sendResponse(req, res, resUrl) {
    res.set({ 'Access-Control-Allow-Origin': req.headers.origin });
    res.redirect(resUrl.payload);
};
async function getTargets(sqldb, resource, query) {
    // Get the nodeDataPath
    const ned = await (0, nodes_1.getNodeExtendedData)(sqldb, { dbId: query.dbId });
    const nodeIdPaths = ned.dbIdToChildExtData[query.dbId].nodeDbIdPath;
    const nodeDataPath = await Promise.all(nodeIdPaths.map((item) => sqldb.getNodePresentation(Number(item))));
    // Get the list of device / boards assocated with the resource
    const deviceDbIds = await sqldb.getDevicesOnResource(resource.id);
    const allDeviceRecords = sqldb.getDeviceVariantsSorted();
    const deviceRecords = deviceDbIds
        .map((dbId) => allDeviceRecords.find((item) => item.id === dbId))
        .filter((item) => !!item);
    const devtoolDbIds = await sqldb.getDevtoolsOnResource(resource.id);
    const allDevtoolRecords = sqldb.getDevtoolBoardsSorted();
    const devtoolRecords = devtoolDbIds
        .map((dbId) => allDevtoolRecords.find((item) => item.id === dbId))
        .filter((item) => !!item);
    // Return the matching target, or all if we can't narrow down
    const devtoolRecord = getMatchingDevtoolRecord(devtoolRecords);
    const deviceRecord = getMatchingDeviceRecord(deviceRecords);
    if (deviceRecord) {
        return [deviceRecord.publicId];
    }
    else if (devtoolRecord) {
        const deviceDbIds = devtoolRecord.devices;
        const deviceRecords = deviceDbIds
            .map((publicId) => allDeviceRecords.find((item) => item.publicId === publicId))
            .filter((item) => {
            return !!item;
        });
        return deviceRecords.map((item) => item.publicId);
    }
    else {
        return [...deviceRecords, ...devtoolRecords].map((item) => item.publicId);
    }
    function getMatchingDeviceRecord(deviceRecords) {
        // Don't check for device / board in path for now
        // const deviceRecordInPath = deviceRecords.find(findRecordInPath);
        const deviceRecordInPath = null;
        const deviceRecordInFilter = deviceRecords.find((record) => findRecordInFilter(record, 'filterDevice'));
        return deviceRecordInFilter || deviceRecordInPath;
    }
    function getMatchingDevtoolRecord(devtoolRecords) {
        // Don't check for device / board in path for now
        // const devtoolRecordInPath = devtoolRecords.find(findRecordInPath);
        const devtoolRecordInPath = null;
        const devtoolRecordInFilter = devtoolRecords.find((record) => findRecordInFilter(record, 'filterDevtool'));
        return devtoolRecordInFilter || devtoolRecordInPath;
    }
    // @ts-ignore unused while we don't check path for device / board
    function findRecordInPath(record) {
        return !!nodeDataPath.find((nodeData) => nodeData.name === record.name);
    }
    function findRecordInFilter(record, key) {
        return !!(0, helpers_1.getQueryParamAsArray)(query[key] || []).find((recordPublicId) => record.publicId === recordPublicId);
    }
}
function getProjectType(resourceType) {
    let projectType = null;
    switch (resourceType) {
        case "project.ccs" /* ProjectType.CCS */:
            projectType = "project.ccs" /* ProjectType.CCS */;
            break;
        case "projectSpec" /* ProjectType.SPEC */:
            projectType = "projectSpec" /* ProjectType.SPEC */;
            break;
        case "project.energia" /* ProjectType.ENERGIA */:
            projectType = "project.energia" /* ProjectType.ENERGIA */;
            break;
        case "file.importable" /* ProjectType.FILE */:
            projectType = "file.importable" /* ProjectType.FILE */;
            break;
        case "folder.importable" /* ProjectType.FOLDER */:
            projectType = "folder.importable" /* ProjectType.FOLDER */;
            break;
        default:
            projectType = null;
    }
    return projectType;
}
function generateCCSUrl(pathname, query) {
    return url.format({
        hostname: `//${vars_1.Vars.CCS_CLOUD_URL}`,
        pathname,
        query
    });
}
