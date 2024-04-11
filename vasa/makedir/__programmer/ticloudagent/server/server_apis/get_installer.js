"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Q = require("q");
var stream_1 = require("stream");
var dinfra_common_1 = require("../common/dinfra_common");
var promisePipe = require("../common/promise_pipe");
var generateErrorHandler = require("../common/generate_error_handler");
var resources = require("../common/resources");
var getFile = require("./get_file");
// a host id is passed as a part of the installer name when doing a command line install
// that Id could than be used to look up an actual host
var knownHosts = {
    "ccs.ti.com": "1",
    "dev.ti.com": "2",
    "tgdccscloud.toro.design.ti.com": "3",
};
var extensions = {
    win: "exe",
    linux: "run",
    osx: "dmg",
};
function getConnectionType(connectionID, os, currentVersion) {
    return dinfra_common_1.dinfra.openResource(resources.getPrefix(os) + "ccs_base/common/targetdb/connections/" + connectionID + ".xml", {
        version: currentVersion,
    })
        .then(function (resource) {
        if (!resource) {
            throw {
                statusCode: 404,
                message: "Unknown connection id",
            };
        }
        var result = resource.getMeta("TICloudAgent").connectionType;
        return resource.close()
            .thenResolve(result);
    });
}
function getSimpleEncodedFileName(host) {
    var hostKey = knownHosts[host] || host;
    return "ticloudagent" + "__" + hostKey;
}
function getEncodedFileName(host, os, connectionID, version) {
    return getConnectionType(connectionID, os, version)
        .then(function (connectionType) {
        // we want to encode the name of the target and host in the installer extName
        return getSimpleEncodedFileName(host) + "__" + connectionType + "." + extensions[os];
    });
}
function getfileNameToServe(host, os, connectionID, version) {
    if (os === "win") {
        if (undefined !== connectionID) {
            return getEncodedFileName(host, os, connectionID, version);
        }
        else {
            return getSimpleEncodedFileName(host) + "." + extensions[os];
        }
    }
    else {
        return Q("ticloudagent." + extensions[os]);
    }
}
var ResponseProxy = (function (_super) {
    __extends(ResponseProxy, _super);
    function ResponseProxy(fileNameToServeAs, res) {
        var _this = _super.call(this) || this;
        _this.fileNameToServeAs = fileNameToServeAs;
        _this.res = res;
        return _this;
    }
    ResponseProxy.prototype.writeHead = function (statusCode, headers) {
        headers["content-disposition"] = "attachment; filename=" + this.fileNameToServeAs;
        this.res.writeHead(statusCode, headers);
    };
    ResponseProxy.prototype.setHeader = function (name, value) {
        this.res.setHeader(name, value);
    };
    return ResponseProxy;
}(stream_1.PassThrough));
/**
 * Serves installer files
 * @param req
 * @param res
 */
function getInstaller(host, params, res, sendUncompressed) {
    var version;
    resources.version.getCurrent()
        .then(function (currentVersion) {
        version = currentVersion;
        return getfileNameToServe(host, params.os, params.connectionID, version);
    })
        .then(function (fileNameToServeAs) {
        // Create a transform stream that doesn't change the data, but 
        // alters the headers so the correct file name is served
        var responseProxy = new ResponseProxy(fileNameToServeAs, res);
        // Pass that stream to getFile, and then pipe it to the real 
        // response object
        getFile(params, "ticloudagent/installer/ticloudagent." + extensions[params.os], version, responseProxy, sendUncompressed);
        return promisePipe(responseProxy, res);
    })
        .catch(generateErrorHandler(res))
        .done();
}
module.exports = getInstaller;
