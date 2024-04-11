"use strict";
const http = require("http");
const url_1 = require("url");
const timers_1 = require("timers");
const FormData = require("form-data");
function asBuffer(chunk) {
    return chunk instanceof Buffer ? chunk : Buffer.from(chunk, 'binary');
}
class HttpRequestor {
    constructor(_triggerEvent, logger) {
        this._triggerEvent = _triggerEvent;
        this.logger = logger;
        this.nextStreamRequestId = 0;
        this.streamRequests = {};
        this.pendingRequests = new Set();
    }
    async onClose() {
        for (const [id, res] of Object.entries(this.streamRequests)) {
            res.destroy(Error("Module was closed"));
            delete this.streamRequests[id];
        }
        const toDestroy = Array.from(this.pendingRequests);
        for (const req of toDestroy) {
            req.destroy(Error("Module was closed"));
        }
    }
    _makeRequest(method, url, data, options, onResponse, onRequestError) {
        const reqUrl = new url_1.URL(url);
        let headers = {};
        let formData;
        if (options.type === "multipart/form-data") {
            if (!Array.isArray(data)) {
                onRequestError(new Error("provided form data is not of correct type"));
                return;
            }
            formData = new FormData();
            for (const { key, value, options: valueOptions } of data) {
                formData.append(key, Buffer.from(value, 'base64'), valueOptions);
            }
            headers = formData.getHeaders();
        }
        else {
            headers["Content-Type"] = options.type === "json" ? "application/json" : "text/plain";
            if (data) {
                if (Array.isArray(data)) {
                    onRequestError(new Error("provided data is not of correct type"));
                    return;
                }
                headers["Content-Length"] = Buffer.byteLength(data);
            }
        }
        const reqOpts = {
            method,
            hostname: reqUrl.hostname,
            path: reqUrl.pathname,
            port: reqUrl.port,
            headers,
            timeout: options.timeout
        };
        const req = http.request(reqOpts, onResponse);
        req.on("close", () => this.pendingRequests.delete(req));
        this.pendingRequests.add(req);
        req.on("timeout", () => {
            this.logger.info(`${method} request to ${url} timed out`);
            req.destroy(Error("Request timed out"));
        });
        req.on("error", (err) => {
            this.logger.info(`Request error for ${method} request to ${url}: ${err.message}`);
            onRequestError(err);
        });
        if (formData) {
            formData.pipe(req);
        }
        else if (data) {
            req.write(data);
        }
        req.end();
    }
    request(method, url, data, options = {}) {
        return (new Promise((resolve, reject) => {
            const chunks = [];
            this._makeRequest(method, url, data, options || {}, (res) => {
                if (200 <= res.statusCode && res.statusCode <= 299) {
                    res.setEncoding("binary");
                    res.on("data", (chunk) => {
                        chunks.push(asBuffer(chunk));
                    });
                    res.on("end", () => resolve({ headers: res.headers, data: Buffer.concat(chunks).toString('base64') }));
                }
                else {
                    reject(`Failed with code ${res.statusCode}`);
                }
            }, (err) => reject(err));
        }));
    }
    streamRequest(method, url, payload, options = {}) {
        return new Promise((resolve, reject) => {
            const id = this.nextStreamRequestId++;
            const onRequestError = (err) => reject(err);
            const onResponse = (res) => {
                if (200 <= res.statusCode && res.statusCode <= 299) {
                    this.streamRequests[id] = res;
                    resolve({ id, headers: res.headers });
                    res.setEncoding("binary");
                    const onData = (chunk) => {
                        const b64Data = asBuffer(chunk).toString("base64");
                        this._triggerEvent("data", { id, data: b64Data });
                    };
                    const onEnd = () => {
                        this._triggerEvent("end", { id });
                        delete this.streamRequests[id];
                    };
                    const onError = (message) => {
                        this.logger.info(`Error for stream request ${id}: ${message}`);
                        this._triggerEvent("error", { id, message });
                    };
                    // We resolve the promise before we emit any events, but node won't
                    // process the promise's resolution until the next cycle of the event loop.
                    // This means that any events we emit on this cycle will be fired before
                    // the command's result is fired.
                    // To avoid things being out of order, we delay events with setImmediate
                    // until the promise is resolved.
                    const delayFn = (fn) => (arg) => timers_1.setImmediate(() => fn(arg));
                    const delayedOnData = delayFn(onData);
                    const delayedOnEnd = delayFn(onEnd);
                    const delayedOnError = delayFn(onError);
                    res.on("data", delayedOnData);
                    res.on("end", delayedOnEnd);
                    res.on("error", delayedOnError);
                    timers_1.setImmediate(() => {
                        res.removeListener("data", delayedOnData);
                        res.removeListener("end", delayedOnEnd);
                        res.removeListener("error", delayedOnError);
                        res.on("data", onData);
                        res.on("end", onEnd);
                        res.on("error", onError);
                    });
                }
                else {
                    reject(`Failed with code ${res.statusCode}`);
                }
            };
            this._makeRequest(method, url, payload, options || {}, onResponse, onRequestError);
        });
    }
    async closeStreamRequest(id) {
        const req = this.streamRequests[id];
        if (req) {
            req.destroy();
            delete this.streamRequests[id];
        }
    }
}
exports.HttpRequestor = HttpRequestor;
exports.name = "HttpRequestor";
function instance(triggerEvent, _, logger) {
    return {
        commands: new HttpRequestor(triggerEvent, logger),
    };
}
exports.instance = instance;
