"use strict";
/**
 * Supports Package Download
 * Supports Leaf node downloads for certain file extensions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoutes = void 0;
const _ = require("lodash");
const express_1 = require("express");
const uaParserJs = require("ua-parser-js");
const download_1 = require("../lib/download");
const rexError_1 = require("../utils/rexError");
const fs = require("fs-extra");
const vars_1 = require("../lib/vars");
const nodes_1 = require("./nodes");
const executeRoute_1 = require("./executeRoute");
const HttpStatus = require("http-status-codes");
const logger_1 = require("../utils/logger");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getRoutes() {
    const routes = (0, express_1.Router)();
    routes.get(`/${"api/nodeDownload" /* API.GET_NODE_DOWNLOAD */}`, (0, executeRoute_1.executeRoute)(getDownloadNodeData, downloadNode));
    routes.get(`/${"api/packageDownload" /* API.GET_PACKAGE_DOWNLOAD */}`, (0, executeRoute_1.executeRoute)(getPackageDownloadData, downloadPackage));
    return routes;
}
exports.getRoutes = getRoutes;
const downloadNode = async (req, res, dbResp) => {
    const resource = dbResp.payload;
    let file;
    const uaParser = getUA(req);
    const clientInfo = {
        OS: uaParser.getOS().name || '',
        arch: uaParser.getCPU().architecture || ''
    };
    if (resource.linkForDownload) {
        const altLink = (0, download_1.resolveDownloadLinkForOS)(resource.linkForDownload, clientInfo);
        if (altLink) {
            file = altLink;
        }
        else {
            logger_1.logger.info('Error downloading on platform ' +
                clientInfo.OS +
                ' : Could not find link specified in linkForDownload field' +
                altLink);
            res.sendStatus(404);
            return;
        }
    }
    else if (resource.link) {
        file = resource.link;
    }
    else {
        logger_1.logger.info('Error downloading on platform ' +
            clientInfo.OS +
            ' : No link or linkForDownload for resource ' +
            resource.jsonId);
        res.sendStatus(404);
        return;
    }
    if (resource.linkType === 'local') {
        const path = vars_1.Vars.CONTENT_BASE_PATH + (vars_1.Vars.CONTENT_BASE_PATH.endsWith('/') ? '' : '/') + file;
        const pathValid = await fs.pathExists(path);
        if (!pathValid) {
            throw new rexError_1.RexError({
                message: `Path not valid ${file}`,
                httpCode: HttpStatus.NOT_FOUND
            });
        }
        res.download(path);
    }
    else {
        res.redirect(file);
    }
};
const downloadPackage = async (req, res, dbResp) => {
    // Get download url
    const uaParser = getUA(req);
    const clientInfo = {
        OS: uaParser.getOS().name || '',
        arch: uaParser.getCPU().architecture || ''
    };
    const platform = (0, download_1.resolvePackageZipForOS)(clientInfo.OS);
    const downloadUrl = dbResp.payload.installPath && dbResp.payload.installPath[platform];
    if (!downloadUrl) {
        throw new rexError_1.RexError({
            message: `Package not supported on ${platform}`,
            httpCode: HttpStatus.NOT_FOUND
        });
    }
    // Redirect
    let prefix = '';
    if (vars_1.Vars.REMOTE_BUNDLE_ZIPS) {
        prefix = vars_1.Vars.REMOTE_BUNDLE_ZIPS + '/';
    }
    else if (vars_1.Vars.LOCAL_BUNDLE_ZIPS) {
        prefix = `https://${req.get('host')}/${vars_1.Vars.ROLE ? vars_1.Vars.ROLE + '/' : ''}zips/`;
    }
    res.redirect(prefix + downloadUrl);
};
async function getDownloadNodeData(sqldb, query) {
    const [id] = (0, nodes_1.convertIdsForDB)(query.dbId);
    const record = await sqldb.getResourceOnNode(id);
    if (!record) {
        throw new rexError_1.RexError({
            message: 'No resource record for node with id ' + query.dbId,
            httpCode: HttpStatus.INTERNAL_SERVER_ERROR
        });
    }
    return record;
}
async function getPackageDownloadData(sqldb, query) {
    if (!query.packageId || !query.packageVersion) {
        throw new rexError_1.RexError({
            message: 'Must specify packageId and packageVersion',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    const packageRecordsUnique = _.uniqBy(sqldb.getPackageRecords(), 'packagePublicUid');
    const packageRecord = packageRecordsUnique.find((item) => {
        if (item.packagePublicId === query.packageId &&
            item.packageVersion === query.packageVersion) {
            return item;
        }
        else {
            return null;
        }
    });
    if (!packageRecord) {
        throw new rexError_1.RexError({
            message: `Cannot find package with packageId ${query.packageId} and packageVersion ${query.packageVersion}`,
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    return packageRecord;
}
// Helpers
function getUA(req) {
    // get client info in case there are client OS-specific downloads
    const uaParser = new uaParserJs();
    // workaround for desktop clients using only Windows not Windows NT
    const patchedUA = (req.header('user-agent') || '').replace('Windows', 'Windows NT');
    uaParser.setUA(patchedUA);
    return uaParser;
}
