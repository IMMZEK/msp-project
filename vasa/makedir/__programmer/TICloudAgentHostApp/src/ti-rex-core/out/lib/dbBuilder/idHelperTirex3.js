"use strict";
/**
 * UUID Requirements
 * • A given metadata record in the database must always be assigned the same uuid regardless of
 * when and where it is generated (e.g. cloud vs end user's desktop)
 * • Use unaltered metadata directly from the content, devices, and devtools json file: to make
 * uuid agnostic  to code changes in how metadata is processed
 * • Use all fields of original metadata: two records could be identical with exception of say
 * 'language' field and result in identical uuids if language field was excluded; in future further
 * fields like  this may be added and every time we would need to keep hash function updated
 * • Add packageUId to the input to make uuid package version specific.
 * • Do not add a time stamp to the input as it is sometimes done to generate database id.
 * • A stable stringify is used to make uuid agnostic to ordering of properties and how an object
 * is stored in memory by the V8 engine.
 * • Does not need to be a cryptographic hash function which could be 30x slower (ref?) and
 * typically produces unnecessary long hash codes (> 160 bit).
 * • Hash algorithm must be of good quality with a low collision rate (see
 * https://github.com/rurban/smhasher)
 * • The hash must be URL safe. Standard Base64 encoding results in a short hash, but is not URL
 * safe. To make it URL safe see http://www.rfc-base.org/txt/rfc-4648.txt and
 * http://stackoverflow.com/questions/17639645/websafe-encoding-of-hashed-string-in-nodejs
 * • Considerations for Lucene performance:
 * http://blog.mikemccandless.com/2014/05/choosing-fast-unique-identifier-uuid.html
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUuid = exports.createUuid = void 0;
const jsonStableStringify = require("json-stable-stringify");
const XXH = require("xxhashjs");
const custom_url_helpers_1 = require("../../shared/custom-url-helpers");
const seed = 0;
/**
 *
 * @param record
 * @param header: optional
 * @returns {{hash: *, input: *}}
 */
function createUuid(record, header) {
    let packageData = '';
    if (header != null) {
        packageData = header.packageUId;
    }
    const recordData = jsonStableStringify(record);
    const data = packageData + recordData;
    const hash64Str = XXH.h64(new Buffer(data), seed);
    const prefixHash = ('' + XXH.h32(new Buffer(packageData), seed)).slice(0, 3);
    const id = (0, custom_url_helpers_1.makeBase64UrlSafe)(prefixHash + hash64Str);
    return { idVal: id, data, prefixHash };
}
exports.createUuid = createUuid;
/**
 *
 * @param hashObj
 * @param updateObj
 * @returns {{hash: *, input: *}}s
 */
function updateUuid(hashObj, updateObj) {
    const updateData = jsonStableStringify(updateObj);
    const hash64Str = XXH.h64(new Buffer(hashObj.data + updateData), seed);
    const id = (0, custom_url_helpers_1.makeBase64UrlSafe)(hashObj.prefixHash + hash64Str);
    return { idVal: id };
}
exports.updateUuid = updateUuid;
