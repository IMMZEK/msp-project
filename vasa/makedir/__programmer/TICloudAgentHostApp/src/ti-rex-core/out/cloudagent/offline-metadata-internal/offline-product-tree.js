"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offlineProductTreeNoQ = void 0;
// native modules
const path = require("path");
// 3rd party modules
const querystring = require("querystring");
const fs = require("fs-extra");
const offline_utils_1 = require("./offline-utils");
const util_1 = require("../../handoff/util");
const request_helpers_1 = require("../../shared/request-helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 *
 */
async function offlineProductTreeNoQ({ dbDevices, dbDevtools, rex3Server, tempDirs, installLocation, onProgressUpdate }) {
    // get device or devtool metadata
    const { data: deviceRecords } = await (0, request_helpers_1.doGetRequest)(rex3Server + '/api/devices');
    const { data: devtoolRecords } = await (0, request_helpers_1.doGetRequest)(rex3Server + '/api/devtools');
    // Assume that if the number of records didn't change the local devDB is in sync with
    // the cloud and skip updating the DB and downloading the images. This is not perfect,
    // but this what rex3 desktop has been doing all along too.
    if (dbDevices.getEntries() === deviceRecords.length &&
        dbDevtools.getEntries() === devtoolRecords.length) {
        return;
    }
    onProgressUpdate({
        progressType: "Indefinite" /* ProgressType.INDEFINITE */,
        name: 'Updating device and devtools records'
    });
    await updateDbDev(dbDevices, deviceRecords);
    await updateDbDev(dbDevtools, devtoolRecords);
    await installDevImageFiles({
        devices: deviceRecords,
        devtools: devtoolRecords,
        rex3Server,
        onProgressUpdate,
        tempDirs,
        installLocation
    });
}
exports.offlineProductTreeNoQ = offlineProductTreeNoQ;
/**
 *
 */
async function updateDbDev(dbDev, devRecords) {
    await dbDev.removeAsync({});
    await dbDev.insertAsync(devRecords);
    await dbDev.saveAsync();
}
/**
 *
 */
async function installDevImageFiles({ devices, devtools, rex3Server, onProgressUpdate, tempDirs: { downloadDir, extractDir }, installLocation }) {
    const deviceImageFiles = devices.map(record => record.image);
    const devtoolImageFiles = devtools.map(record => record.image);
    const allImageFiles = deviceImageFiles
        .concat(devtoolImageFiles)
        .filter((image) => !!image);
    const downloadUrl = await tirex3RequestArchiveFiles(allImageFiles, rex3Server, onProgressUpdate);
    const zipFilename = await (0, util_1.downloadFile)(downloadUrl, downloadDir, onProgressUpdate);
    const items = await (0, util_1.extract)(zipFilename, extractDir, onProgressUpdate);
    const productTreeExtractLocation = path.resolve(items[0] || '');
    if (items.length === 1 && productTreeExtractLocation.endsWith('tirex-product-tree')) {
        const productTreeInstallLocation = path.join(installLocation, path.basename(productTreeExtractLocation));
        await fs.remove(productTreeInstallLocation);
        await fs.move(productTreeExtractLocation, productTreeInstallLocation);
    }
    else {
        throw new Error(`Extracted these unexpected folder(s): ${items}`);
    }
}
/**
 *
 */
async function tirex3RequestArchiveFiles(fileList, rex3Server, onProgressUpdate) {
    onProgressUpdate({ progressType: "Indefinite" /* ProgressType.INDEFINITE */, name: 'Archiving files' });
    const progressId = (0, offline_utils_1.generateProgressId)();
    const qs = querystring.stringify({
        progressId
    });
    const url = rex3Server + '/api/archivefiles?' + qs;
    const { statusCode } = await (0, request_helpers_1.doPostRequest)(url, fileList);
    if (statusCode !== 202) {
        throw new Error('Unexpected status code ' + statusCode);
    }
    const { result: downloadUrlPath } = await (0, offline_utils_1.pollAsync)(progressId, rex3Server);
    if (downloadUrlPath.indexOf('NothingToDownload.txt') !== -1) {
        throw new Error(`${url} returned 'NothingToDownload.txt`);
    }
    const downloadUrl = rex3Server + '/' + downloadUrlPath;
    return downloadUrl;
}
