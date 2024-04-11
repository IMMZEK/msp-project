import { PackageScopedResourceIdUrlQuery, GlobalResourceIdUrlQuery } from '../frontend/apis/filter-types';
export declare function getPackageScopedResourceIdQuery(queryString: string): PackageScopedResourceIdUrlQuery;
export declare function getGlobalResourceIdQuery(queryString: string): GlobalResourceIdUrlQuery;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Replaces +/= with -.!, respectively to make base64 URL and filesystem safe
 *
 * @param data
 * @returns {*}
 */
export declare function makeBase64UrlSafe(data: string): string;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Undo our custom URL safe encoding so that we can decode bas64 with the regular APIs
 * @param base64str
 */
export declare function undoBase64UrlSafe(base64str: string): string;
