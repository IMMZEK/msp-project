"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCSEclipseRequest = void 0;
// 3rd party
const url = require("url");
const path = require("path");
const http = require("http");
const request_helpers_1 = require("../shared/request-helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class CCSEclipseRequest {
    logger;
    ccsPort;
    httpServer;
    constructor(logger, ccsPort, onIdeEvent) {
        this.logger = logger;
        this.ccsPort = ccsPort;
        this.httpServer = http.createServer((req, res) => {
            try {
                res.end();
            }
            catch (error) {
                this.logger.error(error);
            }
            const urlObj = url.parse(req.url || '', true);
            onIdeEvent(urlObj);
        });
    }
    close() {
        return new Promise((resolve, reject) => {
            this.httpServer.close((err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
    start() {
        return new Promise((resolve, reject) => {
            this.httpServer.listen(0, '0.0.0.0', () => {
                const address = this.httpServer.address();
                const localPort = address && typeof address !== 'string'
                    ? address.port.toString()
                    : (address || 0).toString();
                const path = 'ccsEvent';
                this.registerListener(localPort, path).then(resolve, reject);
            });
        });
    }
    rediscoverProducts() {
        return this.ccsRequest(constructUrl({ pathname: "/ide/rediscoverProducts" /* CCS_ECLIPSE_API.REDISCOVER_PRODUCTS */, port: this.ccsPort }));
    }
    getProducts() {
        return this.ccsRequest(constructUrl({ pathname: "/ide/getProducts" /* CCS_ECLIPSE_API.GET_PRODUCTS */, port: this.ccsPort }));
    }
    registerListener(localPort, path) {
        return this.ccsRequest(constructUrl({
            pathname: "/ide/registerListener" /* CCS_ECLIPSE_API.REGISTER_LISTENER */,
            port: this.ccsPort,
            queryObj: { localPort, path }
        }));
    }
    syncSearchPath() {
        return this.ccsRequest(constructUrl({ pathname: "/ide/syncProductDiscoveryPath" /* CCS_ECLIPSE_API.SYNC_SEARCH_PATH */, port: this.ccsPort }));
    }
    importProject(location, targetId) {
        return this.ccsRequest(constructUrl({
            pathname: "/ide/importProject" /* CCS_ECLIPSE_API.IMPORT_PROJECT */,
            port: this.ccsPort,
            queryObj: targetId ? { location, deviceId: targetId } : { location }
        }));
    }
    createProject(location, targetId) {
        return this.ccsRequest(constructUrl({
            pathname: "/ide/createProject" /* CCS_ECLIPSE_API.CREATE_PROJECT */,
            port: this.ccsPort,
            queryObj: targetId
                ? {
                    copyFiles: location,
                    deviceId: targetId,
                    projectName: path.basename(location)
                }
                : { copyFiles: location, projectName: path.basename(location) }
        }));
    }
    importSketch(location, targetId) {
        return this.ccsRequest(constructUrl({
            pathname: "/ide/importSketch" /* CCS_ECLIPSE_API.IMPORT_SKETCH */,
            port: this.ccsPort,
            queryObj: {
                sketchFile: location,
                boardId: targetId
            }
        }));
    }
    ///////////////////////////////////////////////////////////////////////////////
    /// Private methods
    ///////////////////////////////////////////////////////////////////////////////
    async ccsRequest(url) {
        const result = await (0, request_helpers_1.doGetRequest)(url);
        this.logger.info(`${url} returned ${JSON.stringify(result.data)}`);
        return result.data;
    }
}
exports.CCSEclipseRequest = CCSEclipseRequest;
function constructUrl({ pathname, queryObj, port }) {
    const urlObj = {
        protocol: 'http',
        hostname: '127.0.0.1',
        port,
        pathname,
        query: queryObj
    };
    return url.format(urlObj);
}
