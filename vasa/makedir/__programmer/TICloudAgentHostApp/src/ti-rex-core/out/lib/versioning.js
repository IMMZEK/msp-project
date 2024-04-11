'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToSemver = exports.validRange = exports.valid = exports.satisfies = exports.maxSatisfying = exports.outside = exports.ltr = exports.gtr = exports.rcompare = exports.compare = void 0;
/**
 * Wraps semvver APIs to handle 4+ digit versions. Only deals with semver ranges. See semver
 * documentation for bellow functions.
 *
 */
const semver = require("semver");
/**
 * @param {String} version1
 * @param {String} version2
 *
 * @returns {Integer} result
 */
function compare(version1, version2) {
    const semver1 = convertToSemver(version1);
    const semver2 = convertToSemver(version2);
    if (!semver1 || !semver2) {
        throw new Error(`Could not handle version, version 1 ${version1} version 2 ${version2}`);
    }
    const isSemver = semver.valid(version1) || semver.valid(version2);
    if (semver.eq(semver1, semver2) && !isSemver) {
        return fallbackCompare(version1, version2);
    }
    else {
        return semver.compare(semver1, semver2);
    }
}
exports.compare = compare;
/**
 * @param {String} version1
 * @param {String} version2
 *
 * @returns {Integer} result
 */
function rcompare(version1, version2) {
    return compare(version2, version1);
}
exports.rcompare = rcompare;
/**
 * @param {String} version
 * @param {String} versionRange
 *
 * @returns {Boolean} result
 */
function gtr(version, versionRange) {
    return outside(version, versionRange, '>');
}
exports.gtr = gtr;
/**
 * @param {String} version
 * @param {String} versionRange
 *
 * @returns {Boolean} result
 */
function ltr(version, versionRange) {
    return outside(version, versionRange, '<');
}
exports.ltr = ltr;
/**
 * @param {String} version
 * @param {String} versionRange
 * @param {String} hilo
 *
 * @returns {Boolean} result
 */
function outside(version, versionRange, hilo) {
    if (semver.validRange(versionRange)) {
        const _semver = convertToSemver(version);
        if (!_semver) {
            throw new Error(`Could not handle version ${version}`);
        }
        return semver.outside(_semver || '', versionRange, hilo);
    }
    else if (hilo === '>') {
        return compare(version, versionRange) === 1;
    }
    else if (hilo === '<') {
        return compare(version, versionRange) === -1;
    }
    else {
        throw new Error(`Unknown hilo ${hilo}`);
    }
}
exports.outside = outside;
/**
 * @param versions
 * @param versionRange
 *
 * @returns result
 */
function maxSatisfying(versions, versionRange) {
    if (semver.validRange(versionRange)) {
        const result = versions
            .filter((version) => {
            const _semver = convertToSemver(version);
            if (!_semver) {
                throw new Error(`Could not handle version ${version}`);
            }
            return semver.satisfies(_semver || '', versionRange);
        })
            .sort((v1, v2) => {
            return rcompare(v1, v2);
        });
        return result.length > 0 ? result[0] : undefined;
    }
    else {
        return versions.find((version) => {
            return version === versionRange;
        });
    }
}
exports.maxSatisfying = maxSatisfying;
/**
 * @param {String} version
 * @param {String} versionRange
 *
 * @returns {Boolean} result
 */
function satisfies(version, versionRange) {
    if (semver.validRange(versionRange)) {
        const _semver = convertToSemver(version);
        if (!_semver) {
            throw new Error(`Could not handle version ${version}`);
        }
        return semver.satisfies(_semver || '', versionRange);
    }
    else {
        return version === versionRange;
    }
}
exports.satisfies = satisfies;
/**
 * @param {String} version
 *
 * @returns {String|null} result
 */
function valid(version) {
    const isValid = semver.valid(version) ||
        (!/^\d+\.\d+\.\d+\.\d+\.\d+/.test(version) && /\d+\.\d+\.\d+\.\d+.*/.test(version));
    return isValid ? version : null;
}
exports.valid = valid;
/**
 * @param {String} version
 *
 * @returns {String|null} result
 */
function validRange(version) {
    const isValid = semver.validRange(version) || valid(version);
    return isValid ? version : null;
}
exports.validRange = validRange;
///////////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////////
/**
 * Convert a bundle/resource version to semver format
 * Keep first 3 parts only and remove any leading zeros
 *
 * @param {String} version
 *
 * @returns {String|null} result - semver version or null if conversion unsuccessful
 */
function convertToSemver(version) {
    if (version == null || !valid(version)) {
        return null;
    }
    else if (semver.valid(version)) {
        return version;
    }
    else {
        const versionString = version + '';
        const versionArr = versionString.split('.').slice(0, 3);
        const semversion = versionArr.map((part) => parseInt(part, 10)).join('.');
        return semver.clean(semversion);
    }
}
exports.convertToSemver = convertToSemver;
/**
 * Fallback to comparing 4th digit + trailing string in case where first 3 digits match
 *
 * @param {String} version1
 * @param {String} version2
 *
 * @returns {Integer} result
 *         1 if version1 > version2
 *         0 if version1 == version2
 *         -1 if version1 < version2
 */
function fallbackCompare(version1, version2) {
    const trailing1 = getTrailing(version1) || [];
    const trailing2 = getTrailing(version2) || [];
    if (trailing1.length !== trailing2.length) {
        throw new Error(`Cannot compare 2 versions with different number of digits ${version1} ${version2}`);
    }
    const length = Math.min(trailing1.length, trailing2.length);
    let result = null;
    for (let i = 0; i < length; i++) {
        if (trailing1[i] > trailing2[i]) {
            result = 1;
            break;
        }
        else if (trailing1[i] < trailing2[i]) {
            result = -1;
            break;
        }
    }
    return result || 0;
}
/**
 * Get the trailing 4th digit + trailing string as an array.
 *
 * @param {String} version
 *
 * @returns {Array|null} trailing - null if version doesn't have 4 digits, [4th digit, trailing
 * string] otherwise
 *
 */
function getTrailing(version) {
    const versionArray = version.split('.');
    const numComponents = 4;
    if (versionArray.length >= numComponents) {
        const end = versionArray[numComponents - 1];
        const lastComponent = parseInt(end, 10);
        const additionalComponents = `.${versionArray.slice(4, versionArray.length).join('.')}`;
        const trailingString = end.replace(/[+|-]?\d+/, '') +
            (versionArray.length > numComponents ? additionalComponents : '');
        return [isNaN(lastComponent) ? Number.NEGATIVE_INFINITY : lastComponent, trailingString];
    }
    else {
        return null;
    }
}
