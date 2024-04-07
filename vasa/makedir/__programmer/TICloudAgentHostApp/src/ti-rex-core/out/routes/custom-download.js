"use strict";
/**
 * Supports Zip Creation and Download
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoutes = void 0;
// 3rd party
const _ = require("lodash");
const HttpStatus = require("http-status-codes");
const express_1 = require("express");
const uaParserJs = require("ua-parser-js");
const PQueue = require("p-queue");
const rexError_1 = require("../utils/rexError");
const executeRoute_1 = require("./executeRoute");
const download_1 = require("../lib/download");
const custom_download_manager_1 = require("./custom-download-manager");
const helpers_1 = require("../shared/helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getRoutes(rex) {
    const routes = (0, express_1.Router)();
    const customDownloadManager = new custom_download_manager_1.CustomDownloadManager(rex.vars, rex.log.debugLogger);
    const updateQueue = new PQueue({ concurrency: 1 });
    if (rex.vars.downloadServer) {
        routes.get(`/${"api/custom-package-download" /* API.GET_CUSTOM_PACKAGE_DOWNLOAD */}`, (0, executeRoute_1.executeRoute)((sqldb, query, req) => {
            return updateQueue.add(() => {
                return getCustomPackageDownload(rex, customDownloadManager, sqldb, query, req);
            });
        }));
        routes.get(`/${"api/custom-package-download-status" /* API.GET_CUSTOM_PACKAGE_DOWNLOAD_STATUS */}`, (0, executeRoute_1.executeRoute)((sqldb, query, req) => {
            return getCustomPackageDownloadStatus(customDownloadManager, sqldb, query, req);
        }));
    }
    return routes;
}
exports.getRoutes = getRoutes;
async function getCustomPackageDownload(rex, customDownloadManager, sqldb, query, req) {
    const vars = rex.vars;
    if (!query.packages) {
        throw new rexError_1.RexError({
            message: 'Must specify packages',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    else if (!query.zipFilePrefix) {
        throw new rexError_1.RexError({
            message: 'Must specify zipFilePrefix',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    query.packages = (0, helpers_1.getQueryParamAsArray)(query.packages || []);
    // If the platform is omitted, derive from useragent
    const platform = query.platform || (0, download_1.resolvePackageZipForOS)(getUA(req).getOS().name || '');
    // url prefix
    let urlPrefix = '';
    if (vars.remoteBundleZips) {
        urlPrefix = `${vars.remoteBundleZips}/`;
    }
    else if (vars.localBundleZips) {
        urlPrefix = `https://${req.get('host')}/${vars.role ? vars.role + '/' : ''}zips/`;
    }
    else {
        throw new rexError_1.RexError('Neither REMOTE_BUNDLE_ZIPS or LOCAL_BUNDLE_ZIPS are defined');
    }
    // Get package info
    const allPackages = _.uniqBy(sqldb.getPackageRecords(), 'packagePublicUid');
    const packages = _.map(query.packages, (packageUid) => {
        const pkg = _.find(allPackages, (pkg) => pkg.packagePublicUid === packageUid);
        if (!pkg) {
            throw new rexError_1.RexError({
                message: `Cannot find package with uid ${packageUid}`,
                httpCode: HttpStatus.BAD_REQUEST
            });
        }
        return pkg;
    });
    // Get download URLs
    const downloadUrls = _.map(packages, (pkg) => {
        const downloadUrl = pkg.installPath && pkg.installPath[platform];
        if (!downloadUrl) {
            throw new rexError_1.RexError({
                message: `Package not supported on ${platform}`,
                httpCode: HttpStatus.NOT_FOUND
            });
        }
        return downloadUrl;
    });
    if (_.isEmpty(downloadUrls)) {
        throw new rexError_1.RexError('No inputs');
    }
    //
    return customDownloadManager.getCustomDownload(query.zipFilePrefix, packages, platform, urlPrefix);
}
async function getCustomPackageDownloadStatus(customDownloadManager, _sqldb, query, _req) {
    if (!query.requestToken) {
        throw new rexError_1.RexError({
            message: 'Must specify requestToken',
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    const status = customDownloadManager.getCustomDownloadStatus(query.requestToken);
    if (!status) {
        throw new rexError_1.RexError({
            message: `No status for ${query.requestToken}`,
            httpCode: HttpStatus.BAD_REQUEST
        });
    }
    return status;
}
function getUA(req) {
    // get client info in case there are client OS-specific downloads
    const uaParser = new uaParserJs();
    // workaround for desktop clients using only Windows not Windows NT
    const patchedUA = (req.header('user-agent') || '').replace('Windows', 'Windows NT');
    uaParser.setUA(patchedUA);
    return uaParser;
}
