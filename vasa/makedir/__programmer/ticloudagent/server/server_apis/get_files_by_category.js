"use strict";
var Q = require("q");
var generateErrorHandler = require("../common/generate_error_handler");
var resources = require("../common/resources");
var findFilesByCategories = require("../common/find_files_by_categories");
function getFilesByCategories(params, res) {
    // If no categories were specified, then search for "undefined" which 
    // should return all categories
    var categories = params.categories ?
        params.categories.split(",") : [undefined];
    getVersion(params)
        .then(function (version) {
        return findFilesByCategories(categories, params.os, version, params.bitSize);
    })
        .then(function (responseObj) {
        // Send json data back to client
        var body = JSON.stringify(responseObj);
        if (res.writeHead) {
            res.writeHead(200, {
                "content-type": "application/json",
            });
        }
        res.end(body);
    })
        .catch(generateErrorHandler(res))
        .done();
}
function getVersion(params) {
    if (!params.version) {
        return resources.version.getCurrent();
    }
    else {
        return Q.resolve(params.version);
    }
}
module.exports = getFilesByCategories;
