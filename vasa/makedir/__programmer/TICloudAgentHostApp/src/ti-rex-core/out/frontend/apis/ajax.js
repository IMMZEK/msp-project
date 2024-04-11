"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ajax = void 0;
const errors_1 = require("../../shared/errors");
/**
 * ajax helper functions
 *
 */
var ajax;
(function (ajax) {
    /**
     * Do an HTTP GET. If the contentType is application/json parse the response as JSON.
     *
     * @param url
     * @returns Promise - resolve(response), reject(statusCode)
     */
    function get(url) {
        return doRequest(url, 'GET');
    }
    ajax.get = get;
    function head(url) {
        return doRequest(url, 'HEAD');
    }
    ajax.head = head;
    function doRequest(url, method) {
        const XMLClass = getXMLHttpRequest();
        const req = new XMLClass();
        return new Promise((resolve, reject) => {
            req.onreadystatechange = () => {
                if (req.readyState === XMLHttpRequest.DONE) {
                    if (req.status !== 200) {
                        return reject(new errors_1.NetworkError(req.responseText, req.status.toString()));
                    }
                    const contentType = req.getResponseHeader('Content-Type');
                    if (contentType && contentType.includes('application/json')) {
                        resolve(JSON.parse(req.responseText));
                    }
                    else {
                        // @ts-ignore If the server didn't give us our expected type, we have other problems
                        resolve(req.responseText);
                    }
                }
            };
            req.open(method, url);
            req.send();
        });
    }
    function getXMLHttpRequest() {
        return window.fakeXML || XMLHttpRequest;
    }
})(ajax || (exports.ajax = ajax = {}));
