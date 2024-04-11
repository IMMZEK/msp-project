"use strict";
var generateErrorHandler = require("../common/generate_error_handler");
var resources = require("../common/resources");
function getComponentInfo(res, os) {
    resources.version.getComponentInfo()
        .then(function (info) {
        var responseData = info[os];
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
module.exports = getComponentInfo;
