"use strict";
var fs = require("fs");
var path = require("path");
var Q = require("q");
var _ = require("lodash");
var dinfra_common_1 = require("../common/dinfra_common");
var Resources = require("../common/resources");
var parse_meta_1 = require("../common/parse_meta");
var readIntoString = require("../common/read_to_string");
var metaData = require("../common/meta");
var verifyInstances = require("../common/verify_instances");
var generateTargetSetupInfo = require("../common/generate_target_setup_info");
var concurrentProcessFactory = require("../common/process_with_concurrent_limit");
var processSerially = concurrentProcessFactory(1);
function getOS() {
    if (/^win/.test(process.platform)) {
        return "win";
    }
    if (/^linux/.test(process.platform)) {
        return "linux";
    }
    return "osx";
}
var ProgressHandler = (function () {
    function ProgressHandler(progress, stepStartPercent, stepSize) {
        if (stepStartPercent === void 0) { stepStartPercent = 0; }
        if (stepSize === void 0) { stepSize = 100; }
        this.progress = progress;
        this.stepStartPercent = stepStartPercent;
        this.stepSize = stepSize;
        this.percentComplete = stepStartPercent;
    }
    ProgressHandler.prototype.update = function (step, percentComplete) {
        this.percentComplete = this.stepSize * percentComplete / 100 + this.stepStartPercent;
        this.progress(step, this.percentComplete);
    };
    ProgressHandler.prototype.subStep = function (startPercentOfStep, endPercentOfStep, descriptionOfStep) {
        if (descriptionOfStep) {
            this.progress(descriptionOfStep, this.percentComplete);
        }
        var percentSizeOfStep = endPercentOfStep - startPercentOfStep;
        var startOfSubStep = this.percentComplete;
        this.percentComplete = this.stepSize * percentSizeOfStep / 100 + this.stepStartPercent;
        return new ProgressHandler(this.progress, startOfSubStep, percentSizeOfStep * this.stepSize / 100);
    };
    return ProgressHandler;
}());
function readDir(dirPath) {
    var deferred = Q.defer();
    fs.readdir(dirPath, function (err, files) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(files);
        }
    });
    return deferred.promise;
}
function stat(file) {
    var deferred = Q.defer();
    fs.stat(file, function (err, stats) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(stats);
        }
    });
    return deferred.promise;
}
function readAll(initialRoot) {
    function impl(currentRoot) {
        return readDir(currentRoot)
            .then(function (files) {
            return Q.all(_.map(files, function (file) {
                file = path.join(currentRoot, file);
                file = _.replace(file, /\\/g, "/");
                return stat(file)
                    .then(function (stats) {
                    if (stats.isDirectory()) {
                        return impl(file);
                    }
                    else {
                        return [file.slice(initialRoot.length)];
                    }
                });
            }));
        })
            .then(function (files) {
            return _.flatten(files);
        });
    }
    return impl(initialRoot);
}
function detectFileDifferences(rootFolder, version, os) {
    return readAll(rootFolder + Resources.getPrefix(os))
        .then(function (fsFiles) {
        return getDbFiles(version, os)
            .then(function (dbFiles) {
            var newFiles = _.difference(fsFiles, dbFiles);
            var deletedFiles = _.difference(dbFiles, fsFiles);
            return {
                newFiles: newFiles,
                deletedFiles: deletedFiles,
            };
        });
    });
}
function deleteFilesFromDb(version, files, progress, os) {
    return processSerially(files, function (file, index) {
        progress.update("Removing " + file + " from db", 100 * index / files.length);
        return dinfra_common_1.dinfra.destroyResource(Resources.getPrefix(os) + file, version);
    });
}
function determineCategory(file) {
    if (file.match(/.*jlink_scriptfiles.*/i)) {
        return "core";
    }
    else if (_.startsWith(file, "ccs_base/common/targetdb")) {
        return "targetdb";
    }
    else if (_.startsWith(file, "ccs_base/emulation/gel")) {
        return "gel";
    }
    return "core";
}
function addFilesToDb(version, files, progress, os) {
    return processSerially(files, function (file, index) {
        var meta = {
            TICloudAgent: {
                categories: [{
                        category: determineCategory(file),
                    }],
                sourceArchive: "_user_added_1.0.zip",
            },
        };
        var opts = {
            create: true,
            keep: true,
            version: version,
            meta: meta,
        };
        progress.update("Adding " + file + " to db", 100 * index / files.length);
        return dinfra_common_1.dinfra.openResource(Resources.getPrefix(os) + file, opts)
            .then(function (resource) { return resource.close(); });
    });
}
function syncFiles(rootFolder, version, progress, os) {
    return detectFileDifferences(rootFolder, version, os)
        .then(function (differences) {
        return deleteFilesFromDb(version, differences.deletedFiles, progress.subStep(0, 50), os)
            .then(function () { return addFilesToDb(version, differences.newFiles, progress.subStep(50, 100), os); });
    });
}
function getDbFiles(version, os, category) {
    var query = dinfra_common_1.dinfra.queryResources()
        .withVersion(version)
        .withNamePrefix(Resources.getPrefix(os));
    if (category) {
        query = query.withFieldValue("category", category);
    }
    var files = [];
    return query.invoke()
        .progress(function (result) {
        files.push(result.name.slice(Resources.getPrefix(os).length));
    })
        .then(function () { return files; });
}
var parseMeta = {
    targetdb: parse_meta_1.parseTargetDBFile,
    gel: parse_meta_1.parseGelFile,
};
function updateMetaData(files, category, progress, os) {
    return processSerially(files, function (file, index) {
        progress.update("Checking " + file, 100 * index / files.length);
        return dinfra_common_1.dinfra.openResource(Resources.getPrefix(os) + file, { writable: true })
            .then(function (resource) {
            var readable = resource.openReadable();
            return readIntoString(readable)
                .finally(function () { return resource.closeReadable(readable); })
                .then(function (contents) {
                var dbMeta = metaData.getMeta(resource);
                var parsedMeta = {
                    sourceArchive: dbMeta.sourceArchive,
                };
                if (dbMeta.categories) {
                    parsedMeta.categories = dbMeta.categories;
                }
                if (dbMeta.categoryRegexes) {
                    parsedMeta.categoryRegexes = dbMeta.categoryRegexes;
                }
                parseMeta[category](file, contents, parsedMeta);
                if (!_.isEqual(dbMeta, parsedMeta)) {
                    progress.update("Updating metadata for " + file, 100 * index / files.length);
                    metaData.setMeta(resource, parsedMeta);
                }
            })
                .finally(function () { return resource.close(); });
        });
    });
}
function syncMetaDataByCategory(version, category, progress, os) {
    return getDbFiles(version, os, category)
        .then(function (files) { return updateMetaData(files, category, progress, os); });
}
function syncMetadata(version, progress, os) {
    return syncMetaDataByCategory(version, "targetdb", progress.subStep(0, 90), os)
        .then(function () { return syncMetaDataByCategory(version, "gel", progress.subStep(90, 100), os); });
}
function updateTargetSetupInfo(version, os) {
    return generateTargetSetupInfo(version, os)
        .then(function (targetSetupInfo) {
        var opts = {
            writable: true,
        };
        return dinfra_common_1.dinfra.openResource(Resources.getPrefix(os) + "target_setup.json", opts)
            .then(function (resource) {
            var writable = resource.openWritable();
            var deferred = Q.defer();
            writable.end(JSON.stringify(targetSetupInfo), function () {
                deferred.resolve();
            });
            return deferred.promise
                .then(function () { return resource.close(); });
        });
    });
}
module.exports = function doUpdate(rootFolder, progress, os) {
    os = os ? os : getOS();
    var progressHandler = new ProgressHandler(progress);
    return Resources.version.getCurrent()
        .then(function (version) {
        return syncFiles(rootFolder, version, progressHandler.subStep(0, 25, "Syncing files"), os)
            .then(function () { return syncMetadata(version, progressHandler.subStep(25, 90, "Syncing metadata"), os); })
            .then(function () {
            progressHandler.update("Syncing cross references", 90);
            return updateTargetSetupInfo(version, os);
        })
            .then(function () {
            progressHandler.update("Verifying", 95);
            return verifyInstances(version);
        });
    });
};
