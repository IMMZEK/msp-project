"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectContentRoutes = exports.getRoutes = void 0;
const express_1 = require("express");
const path = require("path");
const fs = require("fs-extra");
const ejs = require("ejs");
const util_1 = require("util");
// our modules
const vars_1 = require("../lib/vars");
const http_status_codes_1 = require("http-status-codes");
const promise_utils_1 = require("../utils/promise-utils");
const handle_search_bot_request_1 = require("../seo/handle-search-bot-request");
const util_2 = require("../seo/util");
const packages_1 = require("./packages");
const ejsRenderFile = (0, util_1.promisify)(ejs.renderFile);
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getRoutes(logger, vars) {
    const routes = (0, express_1.Router)();
    routes.use(streamUpSitemaps(logger));
    routes.use(redirectContentRoutes(logger));
    routes.use((0, handle_search_bot_request_1.handleSearchBotRequest)(logger, vars));
    routes.use(handleDuplicateContent(logger));
    return routes;
}
exports.getRoutes = getRoutes;
/**
 * Return sitemaps
 */
function streamUpSitemaps(logger) {
    return async (req, res, next) => {
        if (RegExp(/^\/explore\/.*sitemap\.xml$/).test(req.originalUrl)) {
            try {
                const sitemapName = path.basename(req.path);
                await (0, promise_utils_1.promisePipe)([
                    fs.createReadStream(path.join(vars_1.Vars.SEO_PATH, sitemapName)),
                    res
                ]);
            }
            catch (err) {
                logger.error(`streamUpSitemaps: ${err}`);
                res.status(http_status_codes_1.INTERNAL_SERVER_ERROR);
                res.send(err.message);
            }
        }
        else {
            next();
        }
    };
}
// Google currently has many content routes indexed which may or may not be out of date, this function attempts to reroute the user/searchbot to an appropriate webpage.
// If an appropriate explore route doesn't exist, the users should be redirected to the welcome page, and the bots should be sent a noindex.
function redirectContentRoutes(logger) {
    const contentMapPath = path.join(vars_1.Vars.PROJECT_ROOT, 'config/seo/ContentToExploreRouteMap.json');
    return async (req, res, next) => {
        try {
            const isBot = (0, util_2.isSearchBot)(req);
            if (!(isBot || (0, util_2.isFromSearchResults)(req))) {
                return next();
            }
            if (!(await fs.pathExists(contentMapPath))) {
                return next();
            }
            const linkRegex = RegExp(/\/content\/(.*)/);
            const contentLink = linkRegex.exec(req.originalUrl);
            if (contentLink && contentLink.length >= 2) {
                const contentMap = require(contentMapPath);
                const linkPrefix = (0, util_2.getLinkPrefix)();
                const nodeLink = `${linkPrefix}${contentMap[contentLink[1]] || '/explore'}`;
                if (!isBot || nodeLink !== `${linkPrefix}/explore`) {
                    return res.redirect(301, nodeLink);
                }
                (0, util_2.sendNoIndex)(res);
                return;
            }
            else {
                return next();
            }
        }
        catch (error) {
            logger.error(`redirectContentRoutes: ${error}`);
            res.status(http_status_codes_1.INTERNAL_SERVER_ERROR);
            res.send(error.message);
        }
    };
}
exports.redirectContentRoutes = redirectContentRoutes;
function handleDuplicateContent(logger) {
    return async (req, res, next) => {
        if ((0, util_2.isFromSearchResults)(req) && req.sqldb && req.query.node) {
            try {
                const packageGroups = await (0, packages_1.getPackageGroups)(req.sqldb, undefined, req);
                const packages = await (0, packages_1.getPackages)(req.sqldb, undefined, req);
                const info = (0, util_2.handlePublicId)(req, res, packageGroups, packages);
                if (!info) {
                    return next();
                }
                const { packageGroupPublicId, packageGroupVersion, nodePublicId, packagePublicId } = info;
                if (packageGroupVersion !== 'LATEST') {
                    return next();
                }
                const nodeDbId = await (0, util_2.getNodeDbIdforLatestVersion)(req.sqldb, packageGroupPublicId, nodePublicId, packagePublicId);
                if (!nodeDbId) {
                    return next();
                }
                const link = await (0, util_2.getDuplicateLinks)(nodeDbId, req.sqldb);
                if (!link) {
                    return next();
                }
                const templateData = generateTemplateData(link, packageGroupPublicId, `${req.protocol}://${req.headers.host}${(0, util_2.getLinkPrefix)()}`);
                const templatePath = path.join(vars_1.Vars.PROJECT_ROOT, 'templates', 'seo-duplicates-landing-page.ejs');
                const data = await ejsRenderFile(templatePath, templateData);
                res.send(data);
            }
            catch (err) {
                logger.error(`HandleDuplicateContent: ${err}`);
                res.status(http_status_codes_1.INTERNAL_SERVER_ERROR);
                res.send(err.message);
            }
        }
        else {
            next();
        }
    };
}
function generateTemplateData(link, publicIdEncoded, host) {
    const duplicatePaths = [];
    for (const id of Object.keys(link.duplicatePaths)) {
        const hasSlashes = link.duplicatePaths[id].indexOf('/') !== -1;
        duplicatePaths.push({
            path: link.duplicatePaths[id],
            id,
            depth: hasSlashes ? link.duplicatePaths[id].match(/\//g).length : 0
        });
    }
    duplicatePaths.sort((link1, link2) => {
        if (link1.depth > link2.depth) {
            return 1;
        }
        if (link2.depth > link1.depth) {
            return -1;
        }
        return link1.path.localeCompare(link2.path);
    });
    return {
        name: link.name,
        duplicateLinks: duplicatePaths,
        host,
        packageGroupEncodedId: publicIdEncoded
    };
}
