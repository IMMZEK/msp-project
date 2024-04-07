"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUrl = exports.getUrlQuery = exports.getNodeLinkFromRex3Link = exports.getNodeLinkFromNode = exports.getNodeLink = exports.getLinkPrefix = exports.getDefaultNodeLink = void 0;
// 3rd party
const QueryString = require("query-string");
const _ = require("lodash");
const helpers_1 = require("../../shared/helpers");
const util_1 = require("./util");
const util_2 = require("../../shared/util");
const errors_1 = require("../../shared/errors");
const public_id_helpers_1 = require("../../frontend/component-helpers/public-id-helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * For dealing with urls and links
 *
 */
/**
 * Get the default node navigation link.
 *
 */
function getDefaultNodeLink({ urlQuery, page, keepFullQueryUrl = false, tableViewNode = false }) {
    return getLink({ publicId: null, urlQuery, page, keepFullQueryUrl, tableViewNode });
}
exports.getDefaultNodeLink = getDefaultNodeLink;
/**
 * Get the prefix for any navigation url.
 *
 */
function getLinkPrefix() {
    const { role } = (0, util_1.getServerConfig)();
    return role ? `/${role}` : '';
}
exports.getLinkPrefix = getLinkPrefix;
/**
 * Get the node navigation link for the give publicId.
 */
function getNodeLink({ publicId, urlQuery, page, keepFullQueryUrl = false, tableViewNode = false }) {
    return getLink({ publicId, urlQuery, page, keepFullQueryUrl, tableViewNode });
}
exports.getNodeLink = getNodeLink;
/**
 * Get the node navigation link from the data in Nodes.Node.
 *
 */
function getNodeLinkFromNode(node, appProps, keepFullQueryUrl = false, tableViewNode = false) {
    const { nodePublicId, packageGroupPublicUid, packagePublicUid } = node;
    const publicId = (0, public_id_helpers_1.getPublicIdFromIds)({
        nodePublicId,
        packageGroupPublicUid,
        packagePublicUid,
        allGroups: appProps.packageGroups,
        allPackages: appProps.packages,
        urlQuery: appProps.urlQuery
    });
    return getNodeLink({
        publicId,
        urlQuery: appProps.urlQuery,
        page: appProps.page,
        keepFullQueryUrl,
        tableViewNode
    });
}
exports.getNodeLinkFromNode = getNodeLinkFromNode;
/**
 * Resolve the rex3 link into a link to the node
 *
 */
function getNodeLinkFromRex3Link(appProps) {
    const { urlQuery, apis } = appProps;
    const { link } = urlQuery;
    if (!link) {
        throw new Error(`Called getNodeLinkFromRex3Link but the url query has no link ${urlQuery}`);
    }
    return apis
        .getRex3LinkToDbId(link)
        .then(dbId => apis.getNodes([dbId]), (err) => {
        if (err instanceof errors_1.NetworkError && parseInt(err.statusCode) === 404) {
            return [null];
        }
        else {
            throw err;
        }
    })
        .then(([node]) => {
        if (!node) {
            return null;
        }
        const resolvedLink = getNodeLinkFromNode(node, {
            ...appProps,
            urlQuery
        });
        return resolvedLink;
    });
}
exports.getNodeLinkFromRex3Link = getNodeLinkFromRex3Link;
/**
 * Get BrowserUrlQuery.Params from the browsers queryString
 *
 */
function getUrlQuery(queryString) {
    const queryObject = {};
    const browserQueryObject = QueryString.parse(queryString);
    (0, util_2.getObjectKeys)(browserQueryObject).forEach(urlQueryKey => {
        switch (urlQueryKey) {
            // filter keys (arrays)
            case 'compilers':
            case 'devices':
            case 'devtools':
            case 'ides':
            case 'kernels':
            case 'languages':
            case 'resourceClasses':
            case 'a':
            case 'r':
            case 'nodeType':
            case 'packageDependencies': {
                setQueryObjectValue(queryObject, browserQueryObject, urlQueryKey, item => item && (0, helpers_1.getQueryParamAsArray)(item));
                break;
            }
            // non-filter keys (single item)
            case 'chapter':
            case 'search':
            case 'link':
            case 'fullTextSearch':
            case 'fullTextSearchPage':
            case 'tableViewNode':
            case 'modeTableView':
            case 'placeholder':
            case 'theiaPort':
            case 'theiaTheme': {
                setQueryObjectValue(queryObject, browserQueryObject, urlQueryKey, item => (Array.isArray(item) && !_.isEmpty(item) ? item[0] : item));
                break;
            }
            case 'node': {
                browserQueryObject.node = getCorrectedNodeQueryParam(browserQueryObject[urlQueryKey]);
                setQueryObjectValue(queryObject, browserQueryObject, urlQueryKey, item => (Array.isArray(item) && !_.isEmpty(item) ? item[0] : item));
                break;
            }
            default:
                (0, util_2.assertNever)(urlQueryKey);
                if ((0, util_1.isBrowserEnvironment)()) {
                    console.warn(`Unknown query item ${urlQueryKey} skipping...`);
                }
        }
    });
    return queryObject;
}
exports.getUrlQuery = getUrlQuery;
function setQueryObjectValue(queryObject, browserQueryObject, urlQueryKey, transformFunc) {
    (0, util_2.setValueForPair)(queryObject, browserQueryObject, urlQueryKey, transformFunc);
    if (queryObject[urlQueryKey] === undefined) {
        delete queryObject[urlQueryKey];
    }
}
function getCorrectedNodeQueryParam(recievedNodeQueryParam) {
    // split publicId
    const { nodePublicId, packagePublicId, packageGroupPublicId, packageGroupVersion } = (0, public_id_helpers_1.getPublicIdParts)(recievedNodeQueryParam);
    // converting packageGroupVersion to uppercase specifically in the case when
    // 'latest' is passed instead of 'LATEST', this has occured incase of requests
    // from searchbots
    const correctedPackageGroupVersion = packageGroupVersion === 'latest' ? packageGroupVersion.toUpperCase() : packageGroupVersion;
    // combine publicId
    return (0, public_id_helpers_1.getPublicIdFromMinimalIds)({
        nodePublicId,
        packageGroupPublicId,
        packageGroupVersion: correctedPackageGroupVersion,
        packagePublicId
    });
}
/**
 * Update the url with the specified query.
 *
 */
function updateUrl({ urlQuery, history, location = history.location.pathname, replace = false }) {
    const queryString = QueryString.stringify(urlQuery);
    const url = `${location}?${queryString}`;
    replace ? history.replace(url) : history.push(url);
}
exports.updateUrl = updateUrl;
function getLink({ urlQuery, page, publicId, keepFullQueryUrl, tableViewNode }) {
    const prefix = getLinkPrefix();
    const queryString = QueryString.stringify({
        ...urlQuery,
        chapter: keepFullQueryUrl ? urlQuery.chapter : undefined,
        link: keepFullQueryUrl ? urlQuery.link : undefined,
        ...(tableViewNode
            ? { tableViewNode: publicId || undefined }
            : { node: publicId || undefined })
    });
    let fullPrefix = null;
    switch (page) {
        case util_1.Page.EXPLORE:
            fullPrefix = `${prefix}/${page}/node`;
            break;
        case util_1.Page.NODE_CONTENT:
        case util_1.Page.WIZARD:
            fullPrefix = `${prefix}/${page}`;
            break;
        case util_1.Page.CUSTOM_URL_GLOBAL_RESOURCE_ID:
        case util_1.Page.CUSTOM_URL_PACKAGE_SCOPED_RESOURCE_ID:
            fullPrefix = `${prefix}/${util_1.Page.EXPLORE}/node`;
            break;
        case util_1.Page.DEPENDENCY_MANAGER:
        case util_1.Page.TEST_LANDING_PAGE:
        case util_1.Page.BLANK:
            throw new Error(`Unhandled page ${page}`);
        default:
            (0, util_2.assertNever)(page);
            throw new Error(`Unknown page ${page}`);
    }
    const link = fullPrefix;
    // this is unnecessary, aesthetically it's just so our links don't have a trailing "?"
    return _.isEmpty(queryString) ? link : link + `?${queryString}`;
}
