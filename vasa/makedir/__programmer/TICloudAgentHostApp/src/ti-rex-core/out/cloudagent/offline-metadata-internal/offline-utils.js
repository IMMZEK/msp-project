"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poll = exports.pollAsync = exports.generateProgressId = void 0;
// 3rd party
const crypto = require("crypto");
// our modules
const promisifyAny_1 = require("../../utils/promisifyAny");
const request_helpers_1 = require("../../shared/request-helpers");
/**
 * Generate a progress id for tirex3 server archive and download APIs
 */
function generateProgressId() {
    // from http://stackoverflow.com/questions/9407892/how-to-generate-random-sha1-hash-to-use-as-id-in-node-js
    return crypto.randomBytes(20).toString('hex');
}
exports.generateProgressId = generateProgressId;
/**
 * Poll progress of download every 1 sec until done
 */
exports.pollAsync = (0, promisifyAny_1.promisifyAny)(poll);
function poll(progressId, rex3Server, callback) {
    const url = rex3Server + '/api/downloadprogress/' + progressId;
    (0, request_helpers_1.doGetRequest)(url).then(({ data, statusCode }) => {
        if (statusCode === 206) {
            // not done yet
            setTimeout(() => {
                poll(progressId, rex3Server, callback);
            }, 1000);
        }
        else if (statusCode === 200) {
            // done
            if (data) {
                callback(null, data);
            }
            else {
                callback(new Error('no response body for api/downloadprogress'));
            }
        }
        else {
            callback(new Error('expected status code 206 or 200 but got ' + statusCode));
        }
    }, callback);
}
exports.poll = poll;
