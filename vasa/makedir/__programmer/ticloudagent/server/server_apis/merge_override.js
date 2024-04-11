// This is a support function to handle <jtag> overrides. These are connection properties that
// are overridden in the device xml files.
// 
// The override is performed by the following (src = node in connection, dest = node in device) 
// - find the overridden node element in both src and dest
// - traverse both src and children
// 		-- at any common child nodes copy any attributes properties exclusive to the src node into the dest node
// - return xml string of dest
"use strict";
var _ = require("lodash");
var ELEMENT_NODE_TYPE = 1;
var filterAttributes = {
    Name: true,
    id: true,
    ID: true,
    desc: true,
};
function copyNonExistentAttributes(src, dest) {
    _.each(src.attributes, function (attributeNode) {
        if (!dest.hasAttribute(attributeNode.nodeName) && !filterAttributes[attributeNode.nodeName]) {
            dest.setAttribute(attributeNode.nodeName, attributeNode.nodeValue);
        }
    });
}
function mergeOverride(src, dest) {
    copyNonExistentAttributes(src, dest);
    // find next child
    // childNodes contains all nodes (including text)
    _.each(src.childNodes, function (srcChild) {
        if (srcChild.nodeType === ELEMENT_NODE_TYPE) {
            var result = _.find(dest.childNodes, function (destChild) {
                if (destChild.nodeType === ELEMENT_NODE_TYPE) {
                    var srcChildID = srcChild.getAttribute("id") || srcChild.getAttribute("Name");
                    var destChildID = destChild.getAttribute("id") || destChild.getAttribute("Name");
                    return srcChildID === destChildID;
                }
                return false;
            });
            // if found matching child node, merge that
            if (result) {
                mergeOverride(srcChild, result);
            }
        }
    });
    return dest.toString();
}
module.exports = mergeOverride;
