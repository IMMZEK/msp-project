"use strict";
var path = require("path");
var zlib = require("zlib");
var stream = require("stream");
var PassThrough = stream.PassThrough;
var promisePipeToString = require("./promise_pipe_to_string");
var metaData = require("./meta");
// Same as path.join, but is always in linux format as that's the format dinfra
// uses
function join(path1, path2) {
    var result = path.join(path1, path2);
    if ("/" !== path.sep) {
        result = result.replace(/\\/g, "/");
    }
    return result;
}
exports.join = join;
exports.dinfra = null;
function setDinfra(value) {
    exports.dinfra = value;
}
exports.setDinfra = setDinfra;
function openResource(version, path) {
    return exports.dinfra.openResource(path, {
        create: false,
        writable: false,
        version: version,
    })
        .then(function (resource) {
        if (!resource) {
            throw new Error("No such resource " + path + " with version " + version);
        }
        return resource;
    });
}
function getResource(version, path, fetchContent) {
    if (fetchContent) {
        return openResource(version, path)
            .then(function (resource) {
            var meta = metaData.getMeta(resource);
            var headers = resource.getMeta("headers");
            var isZipped = headers && headers["content-encoding"]; // could be null on desktop
            var transform = isZipped ? zlib.createGunzip() : new PassThrough();
            return promisePipeToString(resource.openReadable(), transform)
                .then(function (content) {
                return resource.close()
                    .thenResolve({ meta: meta, content: content });
            });
        });
    }
    else {
        return openResource(version, path)
            .then(function (resource) {
            var meta = metaData.getMeta(resource);
            return resource.close()
                .thenResolve(meta);
        });
    }
}
exports.getResource = getResource;
