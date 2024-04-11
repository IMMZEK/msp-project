"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteServer = void 0;
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const stream_1 = require("stream");
const Q = require("q");
const request = require("request");
const util = require("../../util/util");
const proxyfinder = require("../../util/find_proxy");
const logger = require("../logger");
const userMessages = require("./user_messages");
const config = require("../config");
const fileInstaller = require("./install_file");
const promisePipe = require("./promise_pipe");
class ProxyCache {
    constructor(cloudAgentInstallerServerURL) {
        this.cloudAgentInstallerServerURL = cloudAgentInstallerServerURL;
        this.proxyPromise = null;
    }
    get() {
        if (null === this.proxyPromise) {
            this.proxyPromise = Q.defer();
            proxyfinder.get((proxy) => {
                logger.info("installer.js using proxy: " + proxy);
                // append http if needed
                if (proxy !== "" && proxy.indexOf("http") < 0) {
                    proxy = "http://" + proxy;
                }
                this.proxyPromise.resolve(proxy);
            }, this.cloudAgentInstallerServerURL);
        }
        return this.proxyPromise.promise;
    }
}
class FileDownloader {
    constructor(cloudAgentInstallerServerURL, proxyCache) {
        this.proxyCache = proxyCache;
        this.componentPathAPIUrl = cloudAgentInstallerServerURL + "/getFile/";
    }
    download(url, destination) {
        return this.proxyCache.get().then((proxy) => {
            const deferred = Q.defer();
            util.mkdirRecursive(path.dirname(destination));
            const opts = {
                url,
                strictSSL: false,
                proxy,
                headers: {
                    "accept-encoding": "gzip",
                },
            };
            request.get(opts)
                .on("error", (err) => {
                deferred.reject(err);
            })
                .on("response", (response) => {
                if (response.statusCode === 200) {
                    const permissions = response.headers["x-ticloudagent-permissions"];
                    if (Array.isArray(permissions)) {
                        deferred.reject(`x-ticloudagent-permissions response header returned multiple permissions, expected only one.`);
                    }
                    // Pipe the response through an unzipper (if 
                    // necessary) and then to the file system
                    let transform;
                    if (response.headers["content-encoding"] === "gzip") {
                        transform = zlib.createGunzip();
                    }
                    else {
                        transform = new stream_1.PassThrough();
                    }
                    promisePipe(response, transform, fileInstaller.createWriteStream(destination, permissions))
                        .then(() => {
                        deferred.resolve();
                    })
                        .catch((err) => {
                        deferred.reject(err);
                    })
                        .done();
                }
                else {
                    deferred.reject("server responded with status code " + response.statusCode);
                }
            });
            return deferred.promise;
        });
    }
    fetch(file, version, os) {
        const url = this.getComponentPath(file, version, os);
        const destination = this.getDestinationName(file);
        logger.info("Downloading " + file);
        return this.download(url, destination)
            .catch((err) => {
            throw new Error(userMessages.downloadError(file, err));
        });
    }
    getComponentPath(file, version, os) {
        os = os || util.installerOS;
        const fileComponents = file.split("/");
        fileComponents.push(encodeURIComponent(fileComponents.pop()));
        return this.componentPathAPIUrl + os + "/" + fileComponents.join("/") + "/" + version;
    }
    getDestinationName(file) {
        return path.join(config.loadersRoot, file);
    }
}
class RemoteServer {
    constructor(cloudAgentInstallerServerURL) {
        this.cloudAgentInstallerServerURL = cloudAgentInstallerServerURL;
        this.proxyCache = new ProxyCache(this.cloudAgentInstallerServerURL);
        this.fileDownloader = new FileDownloader(this.cloudAgentInstallerServerURL, this.proxyCache);
        if (!cloudAgentInstallerServerURL) {
            throw new Error("cloudAgentInstallerServerURL must be defined!");
        }
    }
    // get the install info data
    getSupportingFiles(ccxmlFilePath, os) {
        const path = this.cloudAgentInstallerServerURL + "/getSupportingFiles?" + this.osTypeData(os);
        logger.info("Getting install info: " + path);
        return this.requestJSONFromServer(path, fs.readFileSync(ccxmlFilePath).toString());
    }
    // Fetch files by their category and database version
    // If version is undefined, the current stable version is used
    // If categories is undefined, all categories are fetched
    getFilesByCategory(categories, version, os) {
        let path = this.cloudAgentInstallerServerURL + "/getFilesByCategory?" + this.osTypeData(os);
        if (categories) {
            path += "&categories=" + categories.join(",");
        }
        if (version) {
            path += "&version=" + version;
        }
        logger.info("Getting file info by category: " + path);
        return this.requestJSONFromServer(path, undefined, true);
    }
    // Creates the dinfra_resource.json.gz file for the specified version
    // This file is what is used by the desktop version of dinfra to 
    // simulate resource queries
    generateDesktopDB(version, os) {
        os = os || util.installerOS;
        let url = this.cloudAgentInstallerServerURL + "/generateDesktopDB?";
        url += "os=" + os;
        if (version) {
            url += "&version=" + version;
        }
        logger.info("Generating desktop dinfra: " + url);
        const file = "dinfra_resource.json.gz";
        const filePath = path.join(config.loadersRoot, "..", "..", "..", file);
        return this.fileDownloader.download(url, filePath);
    }
    // Fetches the closest version to some date
    fetchClosestVersion(date) {
        const path = this.cloudAgentInstallerServerURL + "/getVersions?closestTo=" + date;
        return this.requestJSONFromServer(path, "", true)
            .then((versionInfo) => versionInfo.closest);
    }
    downloadFiles(filesArg, os) {
        let files = filesArg.slice(); // clone array since we modify it
        let concurrentDownloads = 10;
        let errorOccurred = false;
        const doDownload = () => {
            const deferred = Q.defer();
            logger.info("Downloading " + files.length + " files");
            const downloads = [];
            let index = 0;
            const downloadFile = (file, version) => {
                return this.fileDownloader.fetch(file, version, os);
            };
            function downloadNext() {
                if (files.length > index && !errorOccurred) {
                    const myIndex = index++;
                    const file = files[myIndex];
                    return downloadFile(file.name, file.version)
                        .then(() => {
                        files[myIndex] = null;
                        deferred.notify({
                            message: file.name,
                            percent: Math.floor(index * 100 / files.length),
                        });
                        return downloadNext();
                    })
                        .catch((e) => {
                        errorOccurred = true; // stop other downloads
                        throw e;
                    });
                }
                return Q();
            }
            // We only download 10 at a time.  Our server seems to handle 
            // downloading all of them at once, but if we scale up the number
            // of users...?  Plus, it doesn't seem to give much benefit to 
            // download all at once...
            for (let i = 0; i < concurrentDownloads; ++i) {
                downloads.push(downloadNext());
            }
            Q.all(downloads)
                .then(() => {
                deferred.resolve();
            })
                .catch((err) => {
                return Q.allSettled(downloads)
                    .finally(() => deferred.reject(err));
            })
                .done();
            return deferred.promise;
        };
        return doDownload()
            .catch(() => {
            logger.info("re-trying download with less concurrency");
            concurrentDownloads = 1;
            errorOccurred = false;
            files = files.filter((f) => f !== null);
            return doDownload();
        });
    }
    requestJSONFromServer(url, body, get = false) {
        const fetchType = get ? "get" : "post";
        return this.proxyCache.get()
            .then((proxy) => {
            const deferred = Q.defer();
            request[fetchType]({
                url,
                strictSSL: false,
                proxy,
                body,
            }, (error, response, resultBody) => {
                if (!error && response.statusCode === 200) {
                    logger.info(resultBody);
                    deferred.resolve(JSON.parse(resultBody));
                }
                else {
                    logger.info("requestJSONFromServer failed.  error = " + error + " resultBody = " + resultBody);
                    deferred.reject(userMessages.remoteServerError());
                }
            });
            return deferred.promise;
        });
    }
    osTypeData(os) {
        let path = "os=" + (os ? os : util.installerOS);
        if (undefined !== util.osBitSize && undefined === os) {
            path += "&bitSize=" + util.osBitSize;
        }
        return path;
    }
}
exports.RemoteServer = RemoteServer;
