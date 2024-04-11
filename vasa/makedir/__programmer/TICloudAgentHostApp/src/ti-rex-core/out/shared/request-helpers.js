"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doDeleteRequest = exports.doFormDataPostRequest = exports.doPostRequest = exports.doGetRequest = void 0;
const request_1 = require("../lib/request");
async function doGetRequest(url, json = false) {
    const data = await doRequest((callback) => (0, request_1.getRequest)().get(url, callback), url, json);
    return data;
}
exports.doGetRequest = doGetRequest;
async function doPostRequest(url, body, json = false) {
    const data = await doRequest((callback) => (0, request_1.getRequest)().post(url, { body, json: true }, callback), url, json);
    return data;
}
exports.doPostRequest = doPostRequest;
async function doFormDataPostRequest(url, body, json = false) {
    const data = await doRequest((callback) => (0, request_1.getRequest)().post(url, { formData: body }, callback), url, json);
    return data;
}
exports.doFormDataPostRequest = doFormDataPostRequest;
async function doDeleteRequest(url, json = false) {
    const data = await doRequest((callback) => (0, request_1.getRequest)().delete(url, callback), url, json);
    return data;
}
exports.doDeleteRequest = doDeleteRequest;
async function doRequest(request, url, json) {
    const { data, statusCode } = await new Promise((resolve, reject) => {
        request((err, response, body) => {
            if (err) {
                return reject(err);
            }
            const contentType = response.headers['content-type'];
            const useJson = (contentType && contentType.includes('application/json')) || json;
            resolve({
                statusCode: response.statusCode,
                data: useJson ? JSON.parse(body) : body
            });
        });
    });
    if (statusCode < 200 || statusCode > 299) {
        throw new Error(data
            ? `Received message: "${data}" with status code: ${statusCode} when making request to ${url}`
            : `Got status ${statusCode} when making request to ${url} `);
    }
    return { data, statusCode };
}
