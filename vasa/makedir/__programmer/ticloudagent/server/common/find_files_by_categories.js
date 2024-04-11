"use strict";
var Q = require("q");
var _ = require("lodash");
var path = require("path");
var dinfra_common_1 = require("./dinfra_common");
var resources = require("./resources");
var meta = require("./meta");
// Returns a promise that resolves to all the database files associated with a
// given set of categories and which are kernel drivers in the following form:
// 		files: [{
// 			name: <resolved file file>,
// 			version: <database version>			
// 		}],
// 		drivers: [<unique driver paths>]
// 	}
function findFilesAndDriversByCategory(categories, os, version, osBitSize) {
    return findFilesByCategories(categories, os, version, osBitSize)
        .then(function (files) {
        return {
            files: _.chain(files).map("file").uniqBy("name").value(),
            drivers: getKernalPaths(files),
        };
    });
}
// 		file: {
// 			name: <resolved file file>,
// 			version: <database version>			
// 		},
// 		kernel: true if a kernel driver
// 	}
// Returns a promise that resolves to all the database files associated with a
// given set of categroies
function findFilesByCategories(categories, os, version, osBitSize) {
    var prefix = resources.getPrefix(os);
    var result = [];
    return Q.all(_.map(categories, function (category) {
        return dinfra_common_1.dinfra.queryResources()
            .withNamePrefix(prefix)
            .withVersion(version)
            .withFieldValue("category", category)
            .invoke()
            .progress(function (queryResult) {
            if (matchesOsBitSize(queryResult, osBitSize)) {
                var name_1 = queryResult.name.slice(prefix.length);
                result.push({
                    file: {
                        name: name_1,
                        version: queryResult.sparse_version || queryResult.version,
                    },
                    kernel: _.some(meta.getMeta(queryResult).categories, {
                        category: "kernel",
                    }),
                });
            }
        });
    }))
        .thenResolve(result);
}
// Returns true if this query result matches the os bit size specified
function matchesOsBitSize(queryResult, osBitSize) {
    if (undefined !== osBitSize) {
        var wrongOSBitSize = "32" === osBitSize.toString() ? 64 : 32;
        return !_.some(meta.getMeta(queryResult).categories, {
            category: "kernel" + wrongOSBitSize,
        });
    }
    return true;
}
// Return the paths where necessary kernel files exist
function getKernalPaths(files) {
    // Filter out only those files that are marked "kernel"
    // Then map to an array of the directories they are contained in
    // Then remove duplicates
    var kernalPaths = _.chain(files)
        .filter({
        kernel: true,
    })
        .map(function (file) {
        return path.dirname(file.file.name);
    })
        .sortBy()
        .sortedUniq()
        .value();
    return findUniqueParentPaths(kernalPaths);
}
// Reduce the list of ordered paths into to unique parents that are also in the list
// ie. a/b/c, a/b/d, a/e/f , a/e -> a/b/c, a/b/d, a/e
function findUniqueParentPaths(paths) {
    var distinctParentPaths = [];
    _.each(paths, function (kernalPath) {
        if (!_.some(distinctParentPaths, function (distinctParentPath) {
            return _.startsWith(kernalPath, distinctParentPath);
        })) {
            distinctParentPaths.push(kernalPath);
        }
    });
    return distinctParentPaths;
}
module.exports = findFilesAndDriversByCategory;
