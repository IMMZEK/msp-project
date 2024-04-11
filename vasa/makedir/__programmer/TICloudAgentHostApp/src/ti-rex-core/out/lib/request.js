"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequest = void 0;
const request = require("request");
const path = require("path");
const os = require("os");
const vars_1 = require("./vars");
// Allow requests to servers with self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let requestObj;
function getRequest(httpProxy) {
    if (!requestObj) {
        const version = require(path.join(vars_1.Vars.PROJECT_ROOT, 'package.json')).version;
        // map node's platform names to more commonly used ones in browser user agents
        // (while linux and win32 were recognized by ua-parser, darwin was interpreted incorrectly
        // as linux. Note: This is required to get the correct platform zip when installing packages
        const uaPlatformMap = {
            linux: 'Linux',
            win32: 'Windows NT',
            darwin: 'Macintosh'
        };
        const userAgent = `TirexServer/${version} (${uaPlatformMap[os.platform()]})`;
        const requestDefaults = {
            forever: true,
            jar: true,
            headers: {
                'User-Agent': userAgent
            },
            rejectUnauthorized: false,
            followRedirects: true,
            followAllRedirects: true,
            followOriginalHttpMethod: true
        };
        if (httpProxy) {
            requestDefaults.proxy = httpProxy;
        }
        requestObj = request.defaults(requestDefaults);
    }
    return requestObj;
}
exports.getRequest = getRequest;
