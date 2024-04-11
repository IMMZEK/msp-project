"use strict";
var _ = require("lodash");
var Q = require("q");
var dinfra_common_1 = require("./dinfra_common");
var config = require("../common/config.json");
var processWithLimit = require("./process_with_concurrent_limit");
var processConcurrently = processWithLimit(config.concurrency.maxUpdateTasks);
exports.prefix = "/TICloudAgent/";
if (process.env.TI_CLOUD_AGENT_TEST) {
    // tslint:disable-next-line no-console
    console.log("Using test prefix");
    exports.prefix = "/TICloudAgent-test/";
}
exports.osTypes = ["win", "linux", "osx"];
function isOSType(arg) {
    return _.includes(exports.osTypes, arg);
}
exports.isOSType = isOSType;
function getPrefix(os) {
    return exports.prefix + os + "/";
}
exports.getPrefix = getPrefix;
function openResource(noThrow, opts) {
    if (noThrow === void 0) { noThrow = false; }
    opts = opts || {
        create: false,
        writable: false,
    };
    return dinfra_common_1.dinfra.openResource(exports.prefix + "version", opts)
        .then(function (resource) {
        if (!resource && !noThrow) {
            throw new Error("No version resource exists");
        }
        return resource;
    });
}
var version;
(function (version_1) {
    // This version is to control backwards-compatibility of the server with 
    // desktop installs that update based on it.  It should be updated if any of 
    // the following are no longer compatible with older versions:
    // 	- dslite API
    // 	- dinfra json format for desktop
    // 	- server-side apis to generate the desktop json, get the list of files, fetch the files changes
    // 	- something else we haven't thought of
    // 
    // Uniflash makes use of this for updates, but other products could too (GC?)
    version_1.desktopCompatibilityVersion = 1;
    var updateResourceName = exports.prefix + "updateVersion";
    // Gets the current version to use for end-user queries
    function getCurrent() {
        return openResource()
            .then(function (resource) {
            var version = resource.latest_version;
            return resource.close()
                .thenResolve(version);
        });
    }
    version_1.getCurrent = getCurrent;
    var beforeAnyUpdateEver = new Date(0).toISOString();
    // Gets the version that is closest to the provided date without going past
    function findClosest(requested) {
        if (requested === "LATEST") {
            return getCurrent();
        }
        return openResource()
            .then(function (resource) {
            var closest = _.reduce(resource.versions, function (bestSoFar, _value, version) {
                if (version <= requested && version > bestSoFar) {
                    return version;
                }
                return bestSoFar;
            }, beforeAnyUpdateEver);
            if (closest === beforeAnyUpdateEver) {
                throw new Error("No resource exists at or before " + requested);
            }
            return closest;
        });
    }
    version_1.findClosest = findClosest;
    var emptyComponents = {
        osx: [],
        linux: [],
        win: [],
    };
    // Gets the list of components and their versions that make up this 
    // version
    function getComponentInfo() {
        return openResource(true)
            .then(function (resource) {
            if (!resource) {
                return emptyComponents;
            }
            var components = resource.getMeta("TICloudAgent").components || emptyComponents;
            return resource.close()
                .thenResolve(components);
        });
    }
    version_1.getComponentInfo = getComponentInfo;
    // Find and destroy all files later than the current version
    // Eliminates stale files from a previously failed/killed update
    function destroyFiles(version) {
        var toDestroy = [];
        return dinfra_common_1.dinfra.queryResources()
            .withNamePrefix(exports.prefix)
            .withVersion(version)
            .withTerminations() // need to undo terminations as well as updates!
            .invoke()
            .progress(function (queryResult) {
            if (queryResult.name !== updateResourceName) {
                toDestroy.push(queryResult.name);
            }
        })
            .then(function () {
            if (0 !== toDestroy.length) {
                // tslint:disable-next-line no-console
                console.log("Deleting " + toDestroy.length + " stale resources");
                return processConcurrently(toDestroy, function (condemned) {
                    return dinfra_common_1.dinfra.destroyResource(condemned, version);
                });
            }
            return null;
        })
            .then(function () {
            // Make sure to do this one last
            return dinfra_common_1.dinfra.destroyResource(updateResourceName, version);
        });
    }
    // !!! Only the update script should use this
    // Acquires a lease, destroys any files from a previous failed update,
    // and returns an object containing the version number to use for the 
    // update and a function to signal when the update is complete.
    function beginUpdate() {
        // Create a lease to surround and guard from multiple updates
        var lease = null;
        return dinfra_common_1.dinfra.openLease("ticloudagent update_db.js", exports.prefix + "version", 30 * 1000 /*30 seconds*/)
            .then(function (newLease) {
            lease = newLease;
            lease.register(function () {
                // There's no connection to check - the lease is just valid for the
                // lifetime of this script.  So just always say we're good
                lease.acknowledge();
            });
        })
            .then(function () {
            // Try to open any update resource created by a previous update
            return dinfra_common_1.dinfra.openResource(updateResourceName, {
                create: false,
                writable: false,
            });
        })
            .then(function (updateResource) {
            // If found, destroy all files from that update, but only if that 
            // resource isn't the same version as the current version (note in 
            // createUpdateFinisher below that the version is updated and only 
            // then is the update resource destroyed)
            if (updateResource) {
                var previousVersion_1 = updateResource.version;
                return updateResource.close()
                    .then(function () {
                    return openResource(true);
                })
                    .then(function (versionResource) {
                    if (!versionResource || versionResource.version !== previousVersion_1) {
                        return destroyFiles(previousVersion_1);
                    }
                    else {
                        return dinfra_common_1.dinfra.destroyResource(updateResourceName, previousVersion_1);
                    }
                });
            }
            return null;
        })
            .then(function () {
            // Now, create an update resource for this update, based on the 
            // current date +
            var opts = {
                create: true,
                version: new Date().toISOString(),
            };
            return dinfra_common_1.dinfra.openResource(updateResourceName, opts)
                .thenResolve(opts.version);
        })
            .then(function (updateVersion) {
            // Return the version to use for this update, but a finish function
            // to end the update
            return {
                version: updateVersion,
                finished: createUpdateFinisher(lease, updateVersion),
                failed: function () {
                    return lease.close();
                },
            };
        });
    }
    version_1.beginUpdate = beginUpdate;
    function createUpdateFinisher(lease, updateVersion) {
        return finished;
        function finished(archiveInfo, fullUpdate) {
            var previousComponentsPromise = fullUpdate ? Q(emptyComponents) : getComponentInfo();
            return previousComponentsPromise
                .then(function (previousComponents) {
                // First, calculate what components will make up this version.
                // We take the new archive info, and then for each os, convert 
                // it to the form we expect and combine it with the old data
                // in case this wasn't a full update.  Then delete any empty
                // zips
                return _.mapValues(previousComponents, function (previousOsComponents, os) {
                    return _.chain(archiveInfo)
                        .filter(function (entry) {
                        return entry.os === os;
                    })
                        .map(function (entry) {
                        return {
                            name: entry.unversionedName,
                            version: entry.filesProcessed !== 0 ? entry.version : false,
                        };
                    })
                        .unionBy(previousOsComponents, "name")
                        .filter("version")
                        .sortBy("name")
                        .value();
                });
            })
                .then(function (components) {
                // Create a new version resource with the version of the update, and 
                // add the set of zips that were processed so we can refer back to it.
                // Then, we can destroy the update resource and lease.
                var opts = {
                    create: true,
                    version: updateVersion,
                    meta: {
                        TICloudAgent: {
                            zipsProcessed: _.map(archiveInfo, "archiveNameAndPath"),
                            components: components,
                        },
                    },
                };
                return openResource(false, opts)
                    .then(function (resource) {
                    return resource.close();
                })
                    .then(function () {
                    return dinfra_common_1.dinfra.destroyResource(updateResourceName, updateVersion);
                })
                    .then(function () {
                    return lease.close();
                });
            });
        }
    }
    // for debugging
    function getStatus() {
        return dinfra_common_1.dinfra.openResource(updateResourceName, {
            create: false,
            writable: false,
        })
            .then(function (resource) {
            if (resource) {
                throw new Error("an update appears to be in progress");
            }
        })
            .then(function () { return openResource(); })
            .then(function (resource) {
            var result = resource.getMeta("TICloudAgent");
            return resource.close()
                .thenResolve(result);
        });
    }
    version_1.getStatus = getStatus;
})(version = exports.version || (exports.version = {}));
