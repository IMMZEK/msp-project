"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAndExtractPackageMetadata = exports.offlinePackageMetadataNoQ = void 0;
// native modules
const fs = require("fs-extra");
const path = require("path");
// 3rd party modules
const async = require("async");
const querystring = require("querystring");
const util_1 = require("../../handoff/util");
const fsutils = require("../../utils/fsutils");
const offline_utils_1 = require("./offline-utils");
const vars_1 = require("../../lib/vars");
const request_helpers_1 = require("../../shared/request-helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Add package metadata to offline DB
 *
 */
async function offlinePackageMetadataNoQ(args) {
    return new Promise((resolve, reject) => {
        offlinePacakgeMetadataCB(args, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.offlinePackageMetadataNoQ = offlinePackageMetadataNoQ;
async function downloadAndExtractPackageMetadata(packagePublicUid, { downloadDir, extractDir }, onProgressUpdate, rex3Server) {
    return new Promise((resolve, reject) => {
        downloadAndExtractPackageMetadataCB(packagePublicUid, onProgressUpdate, { downloadDir, extractDir }, rex3Server, (err, dstPath) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(dstPath);
            }
        });
    });
}
exports.downloadAndExtractPackageMetadata = downloadAndExtractPackageMetadata;
//
// Private functions
//
function offlinePacakgeMetadataCB({ packagePublicUid, dbResources, dbOverviews, dbPureBundles, installPackageFolder, onProgressUpdate, rex3Server, dstPath }, callback) {
    async.waterfall([
        // parse the metadata records (single json file) for the package
        (callback) => {
            let metadata;
            try {
                const jsonFiles = fsutils.readDirRecursive(dstPath, /.*\.json$/);
                const text = fs.readFileSync(path.join(dstPath, jsonFiles[0]), 'utf8'); // there should be only one
                metadata = JSON.parse(text);
            }
            catch (err) {
                return callback(err);
            }
            if (metadata == null) {
                return callback(null, []);
            }
            callback(null, metadata.resources, metadata.overviews);
        },
        // get the package overview record itself, mark it as 'local', patch the paths
        (resources, overviews, callback) => {
            const qs = querystring.stringify({ vid: packagePublicUid });
            onProgressUpdate({
                progressType: "Indefinite" /* ProgressType.INDEFINITE */,
                name: 'Fetching metadata'
            });
            const url = rex3Server + '/api/bundle?' + qs;
            (0, request_helpers_1.doGetRequest)(url).then(({ data }) => {
                if (!data || typeof data !== 'object') {
                    callback(new Error('expected body to be an object:' + JSON.stringify(data)));
                }
                else {
                    const packageOverview = data;
                    packageOverview.local = 'full';
                    packageOverview.localPackagePath = installPackageFolder;
                    if (packageOverview.image) {
                        packageOverview.image = packageOverview.image.replace(packageOverview.packagePath, packageOverview.localPackagePath);
                    }
                    callback(null, packageOverview, resources, overviews);
                }
            }, callback);
        },
        // relocate contents using local install path
        (packageOverview, resources, overviews, callback) => {
            onProgressUpdate({
                progressType: "Indefinite" /* ProgressType.INDEFINITE */,
                name: 'Inserting metadata records'
            });
            // modify resources
            for (const resource of resources) {
                if (resource.linkType === 'local') {
                    if (resource.link) {
                        resource.link = resource.link.replace(packageOverview.packagePath, packageOverview.localPackagePath);
                    }
                    const _relbase = vars_1.Vars.CCS_CLOUD_IMPORT_PATH + '/' + packageOverview.packagePath;
                    if (resource._importProjectCCS) {
                        let _ccsImportProject = resource._importProjectCCS.replace(/\\/g, '/');
                        _ccsImportProject = _ccsImportProject.replace(_relbase, packageOverview.localPackagePath);
                        resource._importProjectCCS = _ccsImportProject;
                    }
                    if (resource._createProjectCCS) {
                        let _createProjectCCS = resource._createProjectCCS.replace(/\\/g, '/');
                        _createProjectCCS = _createProjectCCS.replace(_relbase, packageOverview.localPackagePath);
                        resource._createProjectCCS = _createProjectCCS;
                    }
                }
            }
            // modify overviews
            for (const overview of overviews) {
                const items = ['link', 'icon', 'image'];
                items.forEach(prop => {
                    const value = overview[prop];
                    if (value) {
                        overview[prop] = value.replace(packageOverview.packagePath, packageOverview.localPackagePath);
                    }
                });
            }
            dbResources.insert(resources, (_err) => {
                dbOverviews.insert(overviews, (_err) => {
                    upsertBundleRecord(packageOverview, callback);
                });
            });
        }
    ], err => {
        if (err) {
            return callback(err);
        }
        async.series([
            callback => {
                fs.remove(dstPath, callback);
            },
            callback => {
                onProgressUpdate({
                    progressType: "Indefinite" /* ProgressType.INDEFINITE */,
                    name: 'Writing metadata to disk'
                });
                dbPureBundles.save(() => {
                    dbOverviews.save(() => {
                        dbResources.save(() => {
                            dbResources.use([], callback); // unload all resources from memory
                        });
                    });
                });
            }
        ], callback);
    });
    function upsertBundleRecord(bundleRecord, callback) {
        if (bundleRecord.resourceType === 'bundle') {
            dbPureBundles.upsert({ _id: bundleRecord._id }, bundleRecord, callback);
        }
        else if (bundleRecord.resourceType === 'packageOverview' ||
            bundleRecord.resourceType === 'categoryInfo') {
            dbOverviews.upsert({ _id: bundleRecord._id }, bundleRecord, callback);
        }
        else {
            dbResources.upsert({ _id: bundleRecord._id }, bundleRecord, callback);
        }
    }
}
/**
 * Download and extract the metadata of a software package (as single json file)
 *
 */
function downloadAndExtractPackageMetadataCB(packagePublicUid, onProgressUpdate, { downloadDir, extractDir }, rex3Server, callback) {
    let zipFilePath = '';
    const progressId = (0, offline_utils_1.generateProgressId)();
    async.waterfall([
        (callback) => {
            // request server to create zipped json file with the metadata for the package
            const qs = querystring.stringify({
                vid: packagePublicUid,
                makeoffline: 'true',
                progressId,
                os: vars_1.Vars.HOST
            });
            const url = rex3Server + '/api/bundle?' + qs;
            (0, request_helpers_1.doGetRequest)(url).then(({ statusCode }) => {
                if (statusCode !== 202) {
                    return callback(new Error('expected status code 202 but got ' + statusCode));
                }
                (0, offline_utils_1.poll)(progressId, rex3Server, callback);
            }, callback);
        },
        // now download the created zip archive (can be cancelled)
        (previousBody, callback) => {
            // progressInfo.message = 'Downloading ' + message;
            zipFilePath = path.join(downloadDir +
                '/tmp_bundle_' +
                packagePublicUid +
                '-makeoffline-' +
                progressId +
                '.zip');
            const zipUrl = rex3Server + '/' + previousBody.result;
            (0, util_1.downloadFile)(zipUrl, zipFilePath, onProgressUpdate)
                .then(zip => callback(null, zip, extractDir))
                .catch(callback);
        },
        // unzip the downloaded the archive
        (zipFilePath, extractFolder, callback) => {
            (0, util_1.extract)(zipFilePath, extractFolder, onProgressUpdate)
                .then(() => callback(null, extractFolder))
                .catch(callback);
        }
    ], (err, dstPath) => {
        fs.unlink(zipFilePath, () => {
            callback(err, dstPath);
        });
    });
}
