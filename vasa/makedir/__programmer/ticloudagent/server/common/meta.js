// This is all the TICloudAgent specific meta data that we store per-resource
// in the database
"use strict";
// json pod representation
var ConfigurablesNode = (function () {
    function ConfigurablesNode(property) {
        this.property = property;
    }
    return ConfigurablesNode;
}());
exports.ConfigurablesNode = ConfigurablesNode;
var metaKey = "TICloudAgent";
function isResource(resource) {
    return resource.getMeta;
}
function getMeta(resource) {
    return isResource(resource) ?
        resource.getMeta(metaKey) :
        resource.meta[metaKey];
}
exports.getMeta = getMeta;
function setMeta(resource, meta) {
    resource.setMeta(metaKey, meta);
}
exports.setMeta = setMeta;
function getHeaders(resource) {
    return isResource(resource) ?
        resource.getHeaders() :
        resource.meta.headers;
}
exports.getHeaders = getHeaders;
