"use strict";
var _ = require("lodash");
var generateErrorHandler = require("../common/generate_error_handler");
var resources = require("../common/resources");
function getVersions(params, res) {
    var promise = params.closestTo ? getClosestVersion(params.closestTo) : getVersionInfo();
    return promise
        .then(function (responseData) {
        // If this is a http response, write back a success code and 
        // the http-headers stored in the database
        if (res.writeHead) {
            res.writeHead(200, {
                "content-type": "application/json",
            });
        }
        res.end(JSON.stringify(responseData));
    })
        .catch(generateErrorHandler(res))
        .done();
}
// The basic response - includes the current version and compatibility version
function getVersionInfo() {
    return resources.version.getCurrent()
        .then(function (contentVersion) {
        var responseData = {
            contentVersion: contentVersion,
            desktopCompatibilityVersion: resources.version.desktopCompatibilityVersion,
        };
        return responseData;
    });
}
// Extended response - the basic version + info on the closest version to some
// other version
function getClosestVersion(requested) {
    return resources.version.findClosest(requested)
        .then(function (closest) {
        return getVersionInfo()
            .then(function (versionInfo) { return _.extend(versionInfo, { closest: closest }); });
    });
}
module.exports = getVersions;
