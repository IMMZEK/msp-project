"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.undoBase64UrlSafe = exports.makeBase64UrlSafe = exports.getGlobalResourceIdQuery = exports.getPackageScopedResourceIdQuery = void 0;
// 3rd party
const QueryString = require("query-string");
const _ = require("lodash");
// our modules
const util_1 = require("../frontend/component-helpers/util");
const util_2 = require("./util");
// allows easy conversion of url keys
// tslint:disable:no-string-literal
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getPackageScopedResourceIdQuery(queryString) {
    const browserQueryObject = QueryString.parse(queryString);
    const queryObject = {};
    {
        // Do any renaming between url / code
        const urlObject = browserQueryObject;
        if (urlObject['id']) {
            urlObject['resourceId'] = urlObject['id'];
            delete urlObject['id'];
        }
        if (urlObject['devices']) {
            urlObject['device'] = urlObject['devices'];
            delete urlObject['devices'];
        }
        if (urlObject['devtools']) {
            urlObject['devtool'] = urlObject['devtools'];
            delete urlObject['devtools'];
        }
    }
    (0, util_2.getObjectKeys)(browserQueryObject).forEach((urlQueryKey) => {
        switch (urlQueryKey) {
            case 'resourceId':
            case 'packageId':
            case 'packageVersion':
            case 'device':
            case 'devtool':
                (0, util_2.setValueForPair)(queryObject, browserQueryObject, urlQueryKey, (item) => Array.isArray(item) && !_.isEmpty(item) ? item[0] : item);
                if (queryObject[urlQueryKey] === undefined) {
                    delete queryObject[urlQueryKey];
                }
                break;
            default:
                (0, util_2.assertNever)(urlQueryKey);
                if ((0, util_1.isBrowserEnvironment)()) {
                    console.warn(`Unknown query item ${urlQueryKey} skipping...`);
                }
        }
    });
    return queryObject;
}
exports.getPackageScopedResourceIdQuery = getPackageScopedResourceIdQuery;
function getGlobalResourceIdQuery(queryString) {
    const browserQueryObject = QueryString.parse(queryString);
    const queryObject = {};
    {
        // Do any renaming between url / code
        const urlObject = browserQueryObject;
        if (urlObject['id']) {
            urlObject['globalId'] = urlObject['id'];
            delete urlObject['id'];
        }
        if (urlObject['devices']) {
            urlObject['device'] = urlObject['devices'];
            delete urlObject['devices'];
        }
        if (urlObject['devtools']) {
            urlObject['devtool'] = urlObject['devtools'];
            delete urlObject['devtools'];
        }
    }
    (0, util_2.getObjectKeys)(browserQueryObject).forEach((urlQueryKey) => {
        switch (urlQueryKey) {
            case 'globalId':
            case 'device':
            case 'devtool':
                (0, util_2.setValueForPair)(queryObject, browserQueryObject, urlQueryKey, (item) => Array.isArray(item) && !_.isEmpty(item) ? item[0] : item);
                if (queryObject[urlQueryKey] === undefined) {
                    delete queryObject[urlQueryKey];
                }
                break;
            default:
                (0, util_2.assertNever)(urlQueryKey);
                if ((0, util_1.isBrowserEnvironment)()) {
                    console.warn(`Unknown query item ${urlQueryKey} skipping...`);
                }
        }
    });
    return queryObject;
}
exports.getGlobalResourceIdQuery = getGlobalResourceIdQuery;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Replaces +/= with -.!, respectively to make base64 URL and filesystem safe
 *
 * @param data
 * @returns {*}
 */
function makeBase64UrlSafe(data) {
    // see http://www.rfc-base.org/txt/rfc-4648.txt, section 5
    return data
        .replace(/\+/g, '-')
        .replace(/\//g, '.') // rfc says to use '_' but '__' is our id delimiter
        .replace(/=+$/, ''); // remove padding
    // Note: We can safely remove padding - it's only needed if we had to decode multiple concatenated
    // base64 strings (see https://en.wikipedia.org/wiki/Base64#Output_padding). Decoding using
    // e.g. new Buffer(<s>, 'base64').toString('hex') doesn't require any padding.
}
exports.makeBase64UrlSafe = makeBase64UrlSafe;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Undo our custom URL safe encoding so that we can decode bas64 with the regular APIs
 * @param base64str
 */
function undoBase64UrlSafe(base64str) {
    return base64str.replace(/-/g, '+').replace(/\./g, '/');
}
exports.undoBase64UrlSafe = undoBase64UrlSafe;
