"use strict";
var dinfra_common_1 = require("../common/dinfra_common");
var resources = require("../common/resources");
var generateErrorHandler = require("../common/generate_error_handler");
// Since all database resources are uncompressed in the desktop case, we need
// to strip the headers marking them as such.  Otherwise, we might try to 
// decompress them before accessing them, which would fail
function markUncompressed(rinfo) {
    if (rinfo.meta.headers) {
        delete rinfo.meta.headers["content-encoding"];
    }
    return rinfo;
}
function generateDesktopDB(os, res) {
    resources.version.getCurrent()
        .then(function (version) {
        res.setHeader("content-type", "application/binary");
        var prefixes = [resources.prefix + "version", resources.getPrefix(os)];
        return dinfra_common_1.dinfra.queryResources()
            .withNamePrefixes(prefixes)
            .withVersion(version)
            .invoke(dinfra_common_1.dinfra.createResourceArchiveQueryHandler(res, {
            format: "file",
            content: false,
            transform: markUncompressed,
        }));
    })
        .catch(generateErrorHandler(res))
        .done();
}
module.exports = generateDesktopDB;
