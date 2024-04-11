"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePublicId = exports.getLinkPrefix = exports.isFromSearchResults = exports.getNodeDbIdforLatestVersion = exports.replaceCharactersWithHtmlEncoding = exports.getDuplicateLinks = exports.sendNoIndex = exports.isSearchBot = void 0;
const fs = require("fs-extra");
const path = require("path");
const vars_1 = require("../lib/vars");
const public_id_helpers_1 = require("../frontend/component-helpers/public-id-helpers");
const path_helpers_1 = require("../shared/path-helpers");
function isSearchBot(req) {
    const userAgent = req.headers['user-agent'];
    return userAgent && userAgent.match(/Googlebot|BingBot|BingPreview/im);
}
exports.isSearchBot = isSearchBot;
function sendNoIndex(res) {
    res.setHeader('X-Robots-Tag', 'noindex');
    res.sendStatus(200);
}
exports.sendNoIndex = sendNoIndex;
async function getDuplicateLinks(nodeDbId, sqldb) {
    const resource = await sqldb.getResourceOnNode(nodeDbId);
    if (!resource || !resource.link) {
        return null;
    }
    resource.link = path_helpers_1.PathHelpers.cleanFilePathWithQueryValues(resource.link);
    const presentationData = await sqldb.getNodePresentation(nodeDbId);
    if (!presentationData.packageId) {
        return null;
    }
    const packageRecord = sqldb
        .getPackageRecords()
        .find((p) => p.packageDbId === presentationData.packageId);
    if (!packageRecord) {
        return null;
    }
    const packagePublicUid = packageRecord.packagePublicUid;
    const resourceLink = resource.link;
    if (!(await fs.pathExists(path.join(vars_1.Vars.SEO_PATH, `${packagePublicUid + vars_1.Vars.DUPLICATE_RESOURCE_LINKS_FILE_SUFFIX}`)))) {
        return null;
    }
    const duplicateLinks = await fs.readJson(path.join(vars_1.Vars.SEO_PATH, `${packagePublicUid + vars_1.Vars.DUPLICATE_RESOURCE_LINKS_FILE_SUFFIX}`));
    return duplicateLinks[resourceLink];
}
exports.getDuplicateLinks = getDuplicateLinks;
function replaceCharactersWithHtmlEncoding(content) {
    return content.replace(/[^a-zA-Z0-9\s]/g, (match) => `&#${match.charCodeAt(0)};`);
}
exports.replaceCharactersWithHtmlEncoding = replaceCharactersWithHtmlEncoding;
async function getNodeDbIdforLatestVersion(sqldb, packageGroupPublicId, nodePublicId, packagePublicId) {
    const nodeDbId = await sqldb.lookupNodeDbIdOnPublicId(nodePublicId, {
        publicId: packageGroupPublicId,
        version: 'LATEST'
    }, packagePublicId);
    return nodeDbId;
}
exports.getNodeDbIdforLatestVersion = getNodeDbIdforLatestVersion;
function isFromSearchResults(req) {
    return (req.headers.referer &&
        (req.headers.referer.indexOf('https://www.google.') !== -1 ||
            req.headers.referer.indexOf('https://www.bing.') !== -1));
}
exports.isFromSearchResults = isFromSearchResults;
function getLinkPrefix() {
    return vars_1.Vars.ROLE ? `/${vars_1.Vars.ROLE}` : '';
}
exports.getLinkPrefix = getLinkPrefix;
function handlePublicId(req, _res, packageGroups, _packages) {
    const publicIdData = (0, public_id_helpers_1.getPublicIdData)(req.query.node, packageGroups);
    if (!publicIdData) {
        return null;
    }
    const { group, nodePublicId, packagePublicId } = publicIdData;
    if (!group) {
        // foundation nodes are also not indexed
        return null;
    }
    const { packageGroupPublicId, packageGroupVersion } = group;
    return { packageGroupPublicId, packageGroupVersion, packagePublicId, nodePublicId };
}
exports.handlePublicId = handlePublicId;
