"use strict";
var path = require("path");
var _ = require("lodash");
var Q = require("q");
var dinfra_common_1 = require("../common/dinfra_common");
var meta = require("../common/meta");
var resources = require("../common/resources");
var processWithLimit = require("../common/process_with_concurrent_limit");
var config = require("./config.json");
var processVerifications = processWithLimit(config.concurrency.maxUpdateTasks);
function verifyInstances(version) {
    var verifications = [];
    var errors = {};
    var promiseCache = {};
    return dinfra_common_1.dinfra.queryResources()
        .withNamePrefix(resources.prefix)
        .withVersion(version)
        .withFieldValue("instances")
        .invoke()
        .progress(function (queryResult) {
        var data = meta.getMeta(queryResult);
        verifications.push.apply(verifications, _.map(data.instances, function (instance) {
            return {
                instancingFile: queryResult.name,
                sourceArchive: data.sourceArchive,
                instance: instance,
            };
        }));
    })
        .then(function () {
        return processVerifications(verifications, function (toVerify) {
            return verifyInstance(toVerify.instancingFile, toVerify.sourceArchive, toVerify.instance, version, errors, promiseCache);
        });
    })
        .then(function () {
        var size = _.size(errors);
        if (0 !== size) {
            throw new Error("Found " + size + " missing files:\n" + JSON.stringify(errors, null, 3));
        }
    });
}
function verifyInstance(instancingFile, sourceArchive, instance, version, errors, promiseCache) {
    var os = instancingFile.split("/")[2];
    if (!resources.isOSType(os)) {
        throw new Error("instancing file \"" + instancingFile + "\" is not stored under an os");
    }
    var prefix = resources.getPrefix(os);
    var fileNames = [
        dinfra_common_1.join(path.dirname(instancingFile), instance),
        dinfra_common_1.join(prefix + "ccs_base/common/targetdb", instance),
    ];
    return resourceExists(fileNames, version, promiseCache)
        .then(function (exists) {
        if (!exists) {
            var key = instance + " is missing";
            errors[key] = errors[key] || {
                "instanced by": [],
            };
            errors[key]["instanced by"].push(instancingFile.slice(prefix.length) + " (" + sourceArchive + ")");
        }
    });
}
function resourceExists(fileNames, version, promiseCache) {
    var promiseKey = fileNames.join();
    promiseCache[promiseKey] = promiseCache[promiseKey] || iterate(0);
    return promiseCache[promiseKey];
    function iterate(index) {
        if (index === fileNames.length) {
            return Q(false);
        }
        var opts = {
            writable: false,
            version: version,
        };
        return dinfra_common_1.dinfra.openResource(fileNames[index], opts)
            .then(function (resource) {
            if (!resource) {
                ++index;
                return iterate(index);
            }
            return resource.close()
                .thenResolve(true);
        });
    }
}
module.exports = verifyInstances;
