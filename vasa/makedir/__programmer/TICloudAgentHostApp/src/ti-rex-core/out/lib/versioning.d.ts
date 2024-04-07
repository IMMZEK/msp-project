/**
 * @param {String} version1
 * @param {String} version2
 *
 * @returns {Integer} result
 */
export declare function compare(version1: string, version2: string): number;
/**
 * @param {String} version1
 * @param {String} version2
 *
 * @returns {Integer} result
 */
export declare function rcompare(version1: string, version2: string): number;
/**
 * @param {String} version
 * @param {String} versionRange
 *
 * @returns {Boolean} result
 */
export declare function gtr(version: string, versionRange: string): boolean;
/**
 * @param {String} version
 * @param {String} versionRange
 *
 * @returns {Boolean} result
 */
export declare function ltr(version: string, versionRange: string): boolean;
/**
 * @param {String} version
 * @param {String} versionRange
 * @param {String} hilo
 *
 * @returns {Boolean} result
 */
export declare function outside(version: string, versionRange: string, hilo: '<' | '>'): boolean;
/**
 * @param versions
 * @param versionRange
 *
 * @returns result
 */
export declare function maxSatisfying(versions: string[], versionRange: string): string | undefined;
/**
 * @param {String} version
 * @param {String} versionRange
 *
 * @returns {Boolean} result
 */
export declare function satisfies(version: string, versionRange: string): boolean;
/**
 * @param {String} version
 *
 * @returns {String|null} result
 */
export declare function valid(version: string): string | null;
/**
 * @param {String} version
 *
 * @returns {String|null} result
 */
export declare function validRange(version: string): string | null;
/**
 * Convert a bundle/resource version to semver format
 * Keep first 3 parts only and remove any leading zeros
 *
 * @param {String} version
 *
 * @returns {String|null} result - semver version or null if conversion unsuccessful
 */
export declare function convertToSemver(version: string): string | null;
