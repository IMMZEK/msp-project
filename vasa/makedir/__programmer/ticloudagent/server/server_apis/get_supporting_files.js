"use strict";
var path = require("path");
var Q = require("q");
var _ = require("lodash");
var dinfraCommon = require("../common/dinfra_common");
var dinfra_common_1 = require("../common/dinfra_common");
var dinfraJoin = dinfraCommon.join;
var generateErrorHandler = require("../common/generate_error_handler");
var readIntoString = require("../common/read_to_string");
var resources = require("../common/resources");
var findFilesByCategories = require("../common/find_files_by_categories");
var metaData = require("../common/meta");
var logger = dinfra_common_1.dinfra.logger("cloud-agent-server");
function getSupportingFiles(params, req, res) {
    var start;
    return readIntoString(req)
        .then(function (ccxmlContents) {
        start = new Date().getTime();
        return processCCXMLFile(ccxmlContents, params.os, params.bitSize);
    })
        .then(function (responseObj) {
        var end = new Date().getTime();
        logger.info({
            requestId: res.cloudAgentId,
            performance: (end - start) + "ms",
        });
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
// Asychronously execute the iteratee across each element of the collection.  
// The iteratee is expected to return a promise that will be resolved with an
// array.  This function returns a promise that is resolved with all the arrays
// flattened into one.
function asyncMapAndFlatten(collection, iteratee) {
    return Q.all(_.map(collection, iteratee))
        .then(function (result) {
        return _.flatten(result);
    });
}
// Returns an object indicating all other files that will be needed to use 
// this ccxml file
function processCCXMLFile(ccxmlContents, os, osBitSize) {
    return resources.version.getCurrent()
        .then(function (version) {
        var instances = parseCCXMLFile(ccxmlContents);
        return asyncMapAndFlatten(instances, function (file) {
            return processTargetdbFile([file], os, version);
        })
            .then(function (targetdbResult) {
            var requiredCategories = _.chain(targetdbResult)
                .map("requiredCategories")
                .flatten()
                .uniq()
                .value().concat("core");
            return findFilesByCategories(requiredCategories, os, version, osBitSize)
                .then(function (categoryResult) {
                var files = _.map(targetdbResult, "file").concat(categoryResult.files);
                return {
                    files: _.uniqBy(files, "name"),
                    drivers: categoryResult.drivers,
                };
            });
        });
    });
}
// Parses a ccxml file and returns a set of instanced files
function parseCCXMLFile(ccxmlContents) {
    var normalizedCcxmlContents = _.replace(ccxmlContents, new RegExp(">", "g"), ">\n");
    var regex = /<instance .*href="([^"]*)"/g;
    var matches = regex.exec(normalizedCcxmlContents);
    var files = [];
    while (null !== matches) {
        files.push("ccs_base/common/targetdb/" + matches[1]);
        matches = regex.exec(normalizedCcxmlContents);
    }
    return files;
}
// Returns a promise that resolves to an array containing information about 
// the passed in targetdb file, and all files it instances.  fileNames is an
// array of names that the file could possibly be (as targetdb files are looked
// up in multiple locations).  
function processTargetdbFile(fileNames, os, version) {
    return lookupFileInfo(fileNames, os, version)
        .then(function (fileInfo) {
        var result = {
            file: fileInfo.file,
            requiredCategories: getRequiredCategories(fileInfo.meta),
        };
        return lookupInstances(fileInfo, os, version)
            .then(function (instancesResults) {
            return instancesResults.concat(result);
        });
    });
}
// Returns a promise that resolves to information about the passed in targetdb 
// file on its own.  fileNames is an array of names that the file could 
// possibly be (as targetdb files are looked up in multiple locations).
function lookupFileInfo(fileNames, os, version) {
    return fetchResource(fileNames, os, version)
        .then(function (resource) {
        var result = {
            file: {
                name: resource.name.slice(resources.getPrefix(os).length),
                version: resource.sparse_version || resource.version,
            },
            meta: metaData.getMeta(resource),
        };
        return resource.close()
            .thenResolve(result);
    });
}
// Returns a promise that resolves to the database resource given an array of 
// possible file names it could be called
function fetchResource(fileNames, os, version) {
    var opts = {
        writable: false,
        version: version,
    };
    return iterate(0, resources.getPrefix(os));
    function iterate(index, prefix) {
        if (index === fileNames.length) {
            throw new Error("Unable to find (" + fileNames.join(",") + ")");
        }
        return dinfra_common_1.dinfra.openResource(prefix + fileNames[index], opts)
            .then(function (resource) {
            if (!resource) {
                ++index;
                return iterate(index, prefix);
            }
            return resource;
        });
    }
}
// Parses out all the categories in the database meta data and returns an array
// of all the categories
function getRequiredCategories(meta) {
    var requiredCategories = meta.neededIsaTypes || [];
    if (meta.connectionType) {
        requiredCategories.push(meta.connectionType);
    }
    return requiredCategories;
}
// Looks up all the instances of a targetdb file from the database metadata,
// and then returns a promise that resolves into the array of the file info
// that processTargetdbFile would return for each of those instances
function lookupInstances(fileInfo, os, version) {
    return asyncMapAndFlatten(fileInfo.meta.instances, function (instance) {
        var instances = [
            dinfraJoin(path.dirname(fileInfo.file.name), instance),
            dinfraJoin("ccs_base/common/targetdb", instance),
        ];
        return processTargetdbFile(instances, os, version);
    });
}
module.exports = getSupportingFiles;
