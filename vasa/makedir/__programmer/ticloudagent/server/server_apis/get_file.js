"use strict";
var zlib = require("zlib");
var dinfra_common_1 = require("../common/dinfra_common");
var promisePipe = require("../common/promise_pipe");
var generateErrorHandler = require("../common/generate_error_handler");
var resources = require("../common/resources");
function writeHeaders(res, resource, sendUncompressed) {
    // If this is a http response, write back a success code and 
    // the http-headers stored in the database
    if (res.writeHead) {
        var headers = resource.getHeaders();
        if (sendUncompressed) {
            delete headers["content-encoding"]; // no longer gzipped
            delete headers["content-length"]; // length was the gzipped length
        }
        res.writeHead(200, headers);
    }
}
function writeData(res, resource, sendUncompressed) {
    // Open a readable from the resource and pipe it to the 
    // response. Log errors, as there's not much else we can do
    if (sendUncompressed) {
        return promisePipe(resource.openReadable(), zlib.createGunzip(), res);
    }
    else {
        return promisePipe(resource.openReadable(), res);
    }
}
function getFile(params, filePath, version, res, sendUncompressed) {
    if (version !== "LATEST") {
        var resource_1 = null;
        dinfra_common_1.dinfra.openResource(resources.getPrefix(params.os) + filePath, {
            version: version,
        })
            .then(function (r) {
            resource_1 = r;
            if (!resource_1) {
                throw {
                    statusCode: 404,
                    message: "File not found",
                };
            }
            writeHeaders(res, resource_1, sendUncompressed);
            return writeData(res, resource_1, sendUncompressed);
        })
            .finally(function () {
            if (resource_1) {
                return resource_1.close();
            }
            return null;
        })
            .catch(generateErrorHandler(res))
            .done();
    }
    else {
        // Lookup the latest version, and then retry with that version
        resources.version.getCurrent()
            .then(function (currentVersion) {
            getFile(params, filePath, currentVersion, res, sendUncompressed);
        })
            .catch(generateErrorHandler(res))
            .done();
    }
}
module.exports = getFile;
