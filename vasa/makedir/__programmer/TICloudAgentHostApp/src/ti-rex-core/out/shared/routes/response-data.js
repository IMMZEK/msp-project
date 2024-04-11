"use strict";
/**
 * Type definitions for the data sent to the client
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Platform = exports.Nodes = void 0;
var Nodes;
(function (Nodes) {
    // ENUMs
    let NodeType;
    (function (NodeType) {
        NodeType["FOLDER_NODE"] = "Folder";
        NodeType["FOLDER_WITH_HIDDEN_RESOURCE_NODE"] = "FolderWithResource";
        NodeType["PACKAGE_FOLDER_NODE"] = "PackageFolder";
        NodeType["LEAF_NODE"] = "Leaf";
    })(NodeType = Nodes.NodeType || (Nodes.NodeType = {}));
})(Nodes || (exports.Nodes = Nodes = {}));
var Platform;
(function (Platform) {
    Platform["LINUX"] = "linux";
    Platform["MACOS"] = "macos";
    Platform["WINDOWS"] = "win";
})(Platform || (exports.Platform = Platform = {}));
