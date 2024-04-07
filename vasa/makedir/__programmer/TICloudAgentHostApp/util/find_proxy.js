"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = void 0;
const child_process_1 = require("child_process");
const util = require("./util");
const logger = require("./../src/logger");
const proxy_1 = require("./proxy");
const env = process.env;
logger.info("Overridden Proxy = " + proxy_1.proxy);
const utilDirPath = __dirname;
// default def
let findProxy;
if (util.isWin) {
    findProxy = (callback, url) => {
        logger.info("Looking up proxy settings for url " + url);
        (0, child_process_1.execFile)("./lsproxy.exe", [url], {
            cwd: utilDirPath,
        }, (err, data) => {
            if (err) {
                logger.info("Proxy look up failed : " + url);
                logger.info(err);
            }
            else {
                logger.info("Setting proxy to " + data);
            }
            callback(data);
        });
    };
}
else if (util.isOSX) {
    findProxy = (callback, url) => {
        logger.info("Looking up proxy settings for url " + url);
        (0, child_process_1.execFile)("./proxyfinder.sh", [url], {
            cwd: utilDirPath,
        }, (_err, data) => {
            const cleanData = data.trim().replace(/^\s+|\s+$/g, "");
            callback(cleanData);
        });
    };
}
else {
    findProxy = (callback) => {
        if (env.http_proxy) {
            callback(env.http_proxy);
        }
        else {
            callback(proxy_1.proxy);
        }
    };
}
function get(callback, url) {
    // clean up url by removing the query string
    url = url.split("?")[0];
    if (proxy_1.proxy !== "") {
        if (proxy_1.proxy === "DIRECT") { // if direct bypass all settings
            logger.info("Proxy is direct");
            callback("");
        }
        else {
            callback(proxy_1.proxy);
        }
    }
    else {
        findProxy(callback, url);
    }
}
exports.get = get;
