"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortVersionedItems = exports.setValueForPair = exports.measureTime = exports.mapValues = exports.objectFromKeyValuePairs = exports.getObjectKeys = exports.assertNever = void 0;
// 3rd party
const _ = require("lodash");
const stable = require("stable");
// our modules
const versioning = require("../lib/versioning");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function assertNever(_x) { }
exports.assertNever = assertNever;
function getObjectKeys(obj) {
    return Object.keys(obj);
}
exports.getObjectKeys = getObjectKeys;
function objectFromKeyValuePairs(pairs) {
    return _.fromPairs(pairs.map(({ key, value }) => {
        const pair = [key, value];
        return pair;
    }));
}
exports.objectFromKeyValuePairs = objectFromKeyValuePairs;
/**
 * Same as _.mapValues, but with object-explicit typing so the return values keys are fixed
 *
 */
exports.mapValues = _.mapValues;
async function measureTime(promise, label) {
    console.time(label);
    const result = await promise;
    console.timeEnd(label);
    return result;
}
exports.measureTime = measureTime;
/**
 * Sets the value at a key for one object from another after applying func to the value.
 * This method is needed after a change in ts, this function was inspired by this comment
 * https://github.com/microsoft/TypeScript/pull/30769#issuecomment-503643456
 *
 * @param o1 - The object to set at the key
 * @param o2 - The object to read at the key
 * @param key - The key to read / set the value
 * @param func - The function to apply to o2 before setting it in o1
 */
function setValueForPair(o1, o2, key, func) {
    o1[key] = func(o2[key]);
}
exports.setValueForPair = setValueForPair;
function sortVersionedItems(obj, idKey, versionKey) {
    return stable(obj, (a, b) => {
        if (a[idKey] === b[idKey]) {
            const ver1 = a[versionKey];
            const ver2 = b[versionKey];
            if (typeof ver1 !== 'string' || typeof ver2 !== 'string') {
                throw new Error(`Key ${String(versionKey)} returned a non-string value`);
            }
            return versioning.rcompare(ver1, ver2);
        }
        else {
            return 0;
        }
    });
}
exports.sortVersionedItems = sortVersionedItems;
