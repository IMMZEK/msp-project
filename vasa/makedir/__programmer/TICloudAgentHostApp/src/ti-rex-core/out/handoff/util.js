"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareLogFile = exports.getAssetsPath = exports.getEntryWithModules = exports.getInstallCommand = exports.getRefreshParams = exports.logMessage = exports.sendEmail = exports.getCombinedError = exports.ignoreError = exports.transformLogMessage = exports.install = exports.extract = exports.downloadFile = exports.Platform = void 0;
// 3rd party
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const yauzl = require("yauzl");
const _ = require("lodash");
const util_1 = require("util");
const p = require("child_process");
// our modules
const vars_1 = require("../lib/vars");
const request_1 = require("../lib/request");
const errors_1 = require("../shared/errors");
const promise_utils_1 = require("../utils/promise-utils");
const helpers_node_1 = require("../shared/helpers-node");
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
const util_2 = require("../shared/util");
const delay_1 = require("../test/delay");
const path_helpers_1 = require("../shared/path-helpers");
const package_helpers_1 = require("./package-helpers");
// promisified methods - note util.promisfy didn't work nicely with some methods
const getUniqueFolderPath = (0, util_1.promisify)(path_helpers_1.PathHelpers.getUniqueFolderPath);
const _sendEmail = (0, util_1.promisify)(helpers_node_1.sendEmail);
// tslint:disable-next-line only-arrow-functions
const yauzlOpen = function (zip) {
    return new Promise((resolve, reject) => {
        yauzl.open(zip, { lazyEntries: true }, (err, zipFile) => {
            if (err || !zipFile) {
                return reject(err);
            }
            return resolve(zipFile);
        });
    });
};
// tslint:disable-next-line only-arrow-functions
const yauzlOpenReadStream = function (zipFile, entry) {
    return new Promise((resolve, reject) => {
        zipFile.openReadStream(entry, (err, readStream) => {
            if (err || !readStream) {
                return reject(err);
            }
            return resolve(readStream);
        });
    });
};
///////////////////////////////////////////////////////////////////////////////
/// Types
///////////////////////////////////////////////////////////////////////////////
var Platform;
(function (Platform) {
    Platform["WINDOWS"] = "win";
    Platform["LINUX"] = "linux";
    Platform["OSX"] = "macos";
    Platform["ALL"] = "all";
    Platform["MODULE_GROUP"] = "moduleGroup";
})(Platform || (exports.Platform = Platform = {}));
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Gets the file from the provided url.
 *
 * @param url - The url to download the zip from.
 * @param dst - the destination folder.
 * @param onProgressUpdate
 *
 * @returns {Promise} fileName
 */
async function downloadFile(url, dst, onProgressUpdate) {
    // Note: we should really be doing a HEAD request on url and reading the content-disposition header
    // Some of the urls don't seem to have this header (i.e downloads.ti.com, don't know how the browser figures out the name)
    // so just rely on the urls pointing directly to a file name
    const fileName = path.join(dst, path.basename(url.split('?')[0]));
    await fs.outputFile(fileName, '');
    const writeStream = fs.createWriteStream(fileName);
    const requestStream = (0, request_1.getRequest)().get(url);
    // Determine total file length (in bytes) from headers
    let totalSize;
    requestStream.once('response', (response) => {
        totalSize = response.headers['content-length'];
    });
    // When we get data, update the progress
    const onData = _.throttle((cummulativeSize) => {
        try {
            if (totalSize) {
                onProgressUpdate({
                    name: 'Downloading...',
                    subActivity: `Downloaded ${humanFileSize(cummulativeSize)} of ${humanFileSize(totalSize)}`,
                    percent: (100 * cummulativeSize) / totalSize,
                    progressType: "Definite" /* ProgressType.DEFINITE */
                });
            }
            else {
                onProgressUpdate({
                    name: 'Downloading...',
                    subActivity: `Downloaded ${humanFileSize(cummulativeSize)} of unknown`,
                    progressType: "Indefinite" /* ProgressType.INDEFINITE */
                });
            }
        }
        catch (e) {
            requestStream.abort();
        }
    }, 500);
    let cummulativeSize = 0;
    requestStream.on('data', (data) => {
        cummulativeSize += data.length;
        onData(cummulativeSize);
    });
    // Finally, pipe the request to the file
    await Promise.all([
        (0, promise_utils_1.promisePipe)([requestStream, writeStream]),
        new Promise((resolve, reject) => {
            requestStream.once('response', (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Got status ${response.statusCode} for url ${url}`));
                }
                else {
                    resolve();
                }
            });
        })
    ]);
    onData.flush();
    return fileName;
}
exports.downloadFile = downloadFile;
function humanFileSize(bytes) {
    const threshold = 1024;
    if (bytes < threshold) {
        return bytes + ' B'; // no decimal point for bytes case
    }
    for (const unit of ['KB', 'MB', 'GB']) {
        bytes /= threshold;
        if (bytes < threshold) {
            return `${bytes.toFixed(1)} ${unit}`;
        }
    }
    return `${bytes.toFixed(1)} TB`;
}
/**
 * Extract the zip at the given location.
 *
 * @param zip - The file name of the zip to extract.
 * @param dst - the destination folder.
 * @param onProgressUpdate
 *
 *  @returns {Promise} topLevelItems - where topLevelItems is the
 *  files / folders located at the root of the zip.
 */
async function extract(zip, dst, onProgressUpdate) {
    const zipfile = await yauzlOpen(zip);
    const topLevelItems = new Set();
    zipfile.readEntry();
    await new Promise((resolve, reject) => {
        const onThrottledUpdate = _.throttle((progress) => {
            try {
                onProgressUpdate(progress);
            }
            catch (e) {
                reject(e);
            }
        }, 500);
        zipfile.on('entry', async (entry) => {
            try {
                await handleEntry(entry, onThrottledUpdate);
                if (zipfile.entriesRead === zipfile.entryCount) {
                    resolve();
                }
                // We do setImmediate because it seems there is some cleanup of the
                // open file descriptors which does not get handled unless we put this at the end of the event queue.
                // We end up with an EMFILE error if we don't do this (too many files open).
                setImmediate(() => zipfile.readEntry());
            }
            catch (e) {
                reject(e);
            }
        });
        zipfile.on('end', () => onThrottledUpdate.flush());
    });
    return Array.from(topLevelItems).map((item) => path.normalize(path.join(dst, item)));
    async function handleEntry(entry, onThrottledUpdate) {
        // From https://www.npmjs.com/package/yauzl:
        // When strictFileNames is false (the default) and decodeStrings is true, all backslash
        // (\) characters in each entry.fileName are replaced with forward slashes (/).
        // Therefore, we must normalize all incoming paths prior to use path functions
        const fileName = path.normalize(entry.fileName);
        // Progress first, for both directories and files
        onThrottledUpdate({
            name: 'Extracting...',
            subActivity: fileName,
            percent: (100 * zipfile.entriesRead) / zipfile.entryCount,
            progressType: "Definite" /* ProgressType.DEFINITE */
        });
        // Now extract
        if (fileName.endsWith(path.sep)) {
            // Directory
            topLevelItems.add(fileName.split(path.sep)[0] + path.sep);
            const folder = path.join(dst, fileName);
            await fs.ensureDir(folder);
        }
        else {
            // File
            topLevelItems.add(path.dirname(fileName).split(path.sep)[0] + path.sep);
            if (!fileName.includes(path.sep)) {
                // Top level file
                topLevelItems.add(fileName);
            }
            const file = path.join(dst, fileName);
            // Check for naming conflicts
            await fs.ensureDir(path.dirname(file));
            const stat = await ignoreError(() => fs.stat(file));
            if (stat && stat.isDirectory()) {
                const msg = 'error folder exists with same name and location as file ' + file;
                throw new Error(msg);
            }
            // Stream to a file
            const readStream = await yauzlOpenReadStream(zipfile, entry);
            // tslint:disable-next-line no-bitwise
            const orignalMode = (entry.externalFileAttributes >> 16) & 0xfff;
            // tslint:disable-next-line no-bitwise
            const mode = (orignalMode | parseInt('0444', 8)).toString(8); // add read permissions
            await (0, promise_utils_1.promisePipe)([
                readStream,
                // @ts-ignore number vs string for mode
                fs.createWriteStream(file, os.platform() !== 'win32' ? { mode } : {})
            ]);
        }
    }
}
exports.extract = extract;
async function install(installCommand, workingDirectory, installDir, onProgressUpdate, out) {
    if (!installCommand.includes('@install-location')) {
        throw new Error(`Missing @install-location in installCommand ${installCommand}`);
    }
    onProgressUpdate({ name: 'Installing', progressType: "Indefinite" /* ProgressType.INDEFINITE */ });
    // Check what's in installDir before installing
    const originalItems = await fs.readdir(installDir);
    // Wait 3 seconds. There are cases where we get the "text file busy" error.
    // This can be caused by fs operations not completing or anti-virus scanning.
    await (0, delay_1.delay)(3000);
    // Run install command
    await new Promise((resolve, reject) => {
        let done = false;
        const child = p.exec(installCommand.replace('@install-location', installDir), {
            cwd: workingDirectory,
            // At most installer can take 3 hours
            timeout: 1000 * 60 * 60 * 3
        }, (err) => {
            if (err) {
                done = true;
                reject(err);
            }
        });
        if (out) {
            const readables = [child.stdout, child.stderr];
            readables.forEach((readable) => {
                if (readable) {
                    readable.pipe(out);
                }
            });
        }
        child.on('exit', (code) => {
            if (!done) {
                if (code !== null && code !== 0) {
                    reject(new Error(`Install exited with code ${code}`));
                }
                else {
                    resolve();
                }
            }
        });
    });
    // Determine new items added by install
    const itemsAfterInstall = await fs.readdir(installDir);
    const newItems = _.difference(itemsAfterInstall, originalItems);
    return newItems.map((newItem) => path.join(installDir, newItem));
}
exports.install = install;
/**
 * Prepare the message for the email.
 *
 * @param message - A log message.
 *
 * @returns formatedMessage - The formatted result.
 *
 */
function transformLogMessage(message) {
    const { data, type } = JSON.parse(message.toString());
    const typeColors = {
        info: 'black',
        warning: '#FCD116',
        error: 'red',
        critical: 'red',
        emergency: 'red'
    };
    const color = (typeof type === 'string' && typeColors[type]) || 'black';
    const msg = `<b style="color: ${color}">[${type.toUpperCase()}] </b> ${data} <br>`;
    return msg;
}
exports.transformLogMessage = transformLogMessage;
/**
 * Ignore any errors caused by calling the promise.
 *
 * @param promiseFn
 *
 * @returns {Promise} result - or null if there was an error
 */
function ignoreError(promiseFn) {
    return promiseFn().catch(() => {
        return null;
    });
}
exports.ignoreError = ignoreError;
/**
 * Take err1 and err2 and return the one with the higher precedence.
 * Non graceful errors get highest precedence, err1 takes higher precedence than err2.
 *
 * @param err1
 * @param err2
 *
 * @returns combinedError
 */
function getCombinedError(err1, err2) {
    if (err1 && !(err1 instanceof errors_1.GracefulError)) {
        return err1;
    }
    else if (err2 && !(err2 instanceof errors_1.GracefulError)) {
        return err2;
    }
    else {
        return err1 || err2;
    }
}
exports.getCombinedError = getCombinedError;
async function sendEmail(email, subjectPostfix, message, log, action, attachments) {
    if (email || vars_1.Vars.MAILING_LIST) {
        const emailSubjectPrefix = `${action === 'add' ? 'Handoff' : 'Deletion'} to ${os.hostname()}`;
        const receiver = `${email},${vars_1.Vars.MAILING_LIST}`;
        try {
            await _sendEmail({
                receiver,
                subject: emailSubjectPrefix + subjectPostfix,
                payload: message,
                attachments: attachments || []
            });
        }
        catch (e) {
            // Allow email to fail (i.e bad recipient)
            if (log) {
                logMessage(log.debugLogger.warning, `Unable to send email to ${receiver} due to below error`);
                logMessage(log.debugLogger.error, e);
            }
        }
    }
}
exports.sendEmail = sendEmail;
function logMessage(logMethod, message) {
    logMethod(message, ['handoff']);
}
exports.logMessage = logMessage;
async function getRefreshParams(items, allEntires, contentFolder, zipsFolder) {
    const itemsWithModules = _.flatten(await Promise.all(items.map(async (item) => {
        const entryWithModules = await getEntryWithModules(item.entry, contentFolder);
        return entryWithModules.map((entry) => ({ entry, request: item.request }));
    })));
    const allEntiresWithModules = _.flatten(await Promise.all(allEntires.map((entry) => getEntryWithModules(entry, contentFolder))));
    return Promise.all(allEntiresWithModules
        .map((entry) => {
        const passedInItem = itemsWithModules.find(({ entry: passedInEntry }) => entry.id === passedInEntry.id && entry.version === passedInEntry.version);
        return passedInItem || { entry, request: 'nothing' };
    })
        .filter((item) => item.entry.showEntry)
        .map(async ({ entry, request }) => {
        const assetsPath = getAssetsPath(entry);
        const refreshRequestEntry = {
            content: entry.content[0],
            uid: (0, dbBuilderUtils_1.formUid)(entry.id, entry.version),
            operation: "excludePackage" /* RefreshOperation.EXCLUDE_PACKAGE */,
            installPath: assetsPath,
            installCommand: await getInstallCommand(entry, contentFolder),
            installSize: await getInstallSize(assetsPath, zipsFolder),
            modulePrefix: entry.modulePrefix
        };
        switch (request) {
            case 'add':
                refreshRequestEntry.operation = "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */;
                break;
            case 'remove':
                refreshRequestEntry.operation = "removePackage" /* RefreshOperation.REMOVE_PACKAGE */;
                break;
            case 'nothing':
                refreshRequestEntry.operation = "doNothing" /* RefreshOperation.DO_NOTHING */;
                break;
            default:
                (0, util_2.assertNever)(request);
                throw new Error(`Unknown Processing request ${request}`);
        }
        return refreshRequestEntry;
    }));
}
exports.getRefreshParams = getRefreshParams;
async function getInstallCommand(entry, contentFolder) {
    // TODO - refresh should be able to get this info from package.tirex.json itself
    // Get install command from package.tirex.json
    const packageFolder = path.join(contentFolder, entry.content[0]);
    const allPackageTirexJson = await (0, package_helpers_1.getAllPackageTirexJsonPaths)(packageFolder);
    const potentialInstallCommands = await Promise.all(allPackageTirexJson.map(async (item) => {
        const info = await (0, package_helpers_1.getPackageInfo)(packageFolder, item);
        if (info && info.id === entry.id && info.installCommand) {
            return info.installCommand;
        }
        else {
            return null;
        }
    }));
    return potentialInstallCommands.find((item) => !!item) || null;
}
exports.getInstallCommand = getInstallCommand;
async function getEntryWithModules(entry, contentFolder) {
    // Note we are also accommodating featureSupport / ccsComponent packages with modulePrefix,
    // These aren't technically modules, just a standalone package with a modulePrefix.
    // we call these module like packages  - has metadata files with a modulePrefix, but only contain a single package
    const packageFolder = _.first(entry.content);
    if (!packageFolder) {
        return [{ ...entry, modulePrefix: null }];
    }
    const allPackageTirexJsonFiles = await (0, package_helpers_1.getAllPackageTirexJsonPaths)(path.join(contentFolder, packageFolder));
    if (_.isEmpty(allPackageTirexJsonFiles) ||
        (allPackageTirexJsonFiles.length < 2 &&
            path.basename(allPackageTirexJsonFiles[0]) === vars_1.Vars.PACKAGE_TIREX_JSON)) {
        return [{ ...entry, modulePrefix: null }];
    }
    const modulesInfo = await Promise.all(allPackageTirexJsonFiles
        .filter((item) => path.basename(item) !== vars_1.Vars.PACKAGE_TIREX_JSON)
        .map(async (item) => ({ info: await (0, package_helpers_1.getPackageInfo)(packageFolder, item), path: item })));
    const moduleUids = modulesInfo.map((item) => {
        if (!item.info) {
            throw new Error(`Cannot get package info for ${item}`);
        }
        return `${item.info.id}__${item.info.version}`;
    });
    const isModuleLikePackage = _.size(allPackageTirexJsonFiles) === 1 &&
        path.basename(allPackageTirexJsonFiles[0]) !== vars_1.Vars.PACKAGE_TIREX_JSON;
    const corePackageEntry = {
        ...entry,
        // Remove module zips from the corePackage
        zips: entry.zips.filter((item) => !moduleUids.find((uid) => item.includes(uid))),
        modulePrefix: isModuleLikePackage ? getModulePrefix(allPackageTirexJsonFiles[0]) : null
    };
    const entriesWithModes = [corePackageEntry].concat((isModuleLikePackage ? [] : modulesInfo).map(({ info, path: pathInner }) => {
        if (!info) {
            throw new Error(`Cannot get package info for ${path}`);
        }
        const { id, version } = info;
        const uid = `${id}__${version}`;
        const zips = entry.zips.filter((item) => item.includes(uid));
        const moduleEntry = {
            ...entry,
            id,
            version,
            zips,
            modulePrefix: getModulePrefix(pathInner)
        };
        return moduleEntry;
    }));
    return entriesWithModes;
    function getModulePrefix(pathInner) {
        const endOfPrefix = Math.max(pathInner.indexOf(vars_1.Vars.PACKAGE_TIREX_JSON), 0);
        const prefix = pathInner.substring(0, endOfPrefix);
        return path.basename(prefix) || null;
    }
}
exports.getEntryWithModules = getEntryWithModules;
// Separate the entry.zips by platform for refresh
function getAssetsPath(entry) {
    const fallbackPrefixes = {
        '__linux.zip': Platform.LINUX,
        '__win.zip': Platform.WINDOWS,
        '__macos.zip': Platform.OSX
    };
    const assetPaths = entry.zips.map((item) => path_helpers_1.PathHelpers.normalizeFile(item));
    const assetsByPlatform = _.chain(assetPaths)
        .map((asset) => {
        const assetPathPieces = asset.split(path.sep);
        let platform = assetPathPieces.find((piece) => {
            return (piece === Platform.ALL ||
                piece === Platform.LINUX ||
                piece === Platform.WINDOWS ||
                piece === Platform.OSX ||
                piece === Platform.MODULE_GROUP);
        }) || null;
        if (!platform) {
            const assetFileName = path.basename(asset);
            const prefix = Object.keys(fallbackPrefixes).find((item) => assetFileName.endsWith(item));
            if (prefix) {
                platform = fallbackPrefixes[prefix];
            }
        }
        else if (platform === Platform.MODULE_GROUP) {
            // We don't include module_group platform
            platform = null;
        }
        return { platform, asset };
    })
        .groupBy((item) => item.platform)
        .mapValues((item) => {
        // Refresh only accepts one asset, take the first one
        const firstAsset = _.first(item);
        return firstAsset ? firstAsset.asset : null;
    })
        .value();
    const assetPath = {
        [Platform.LINUX]: assetsByPlatform[Platform.ALL] || assetsByPlatform[Platform.LINUX] || undefined,
        [Platform.WINDOWS]: assetsByPlatform[Platform.ALL] || assetsByPlatform[Platform.WINDOWS] || undefined,
        [Platform.OSX]: assetsByPlatform[Platform.ALL] || assetsByPlatform[Platform.OSX] || undefined
    };
    return assetPath;
}
exports.getAssetsPath = getAssetsPath;
async function getInstallSize(assetsPath, zipsFolder) {
    const platforms = [Platform.LINUX, Platform.WINDOWS, Platform.OSX];
    const sizeByPlatform = await Promise.all(platforms.map(async (plat) => {
        const assetsPathRel = assetsPath[plat];
        if (!assetsPathRel) {
            return { platform: plat, size: undefined };
        }
        const assetPath = path.join(zipsFolder, assetsPathRel);
        const assetSize = (await fs.stat(assetPath)).size;
        return { platform: plat, size: assetSize };
    }));
    const sizeByPlatObj = _.chain(sizeByPlatform)
        .map((item) => [item.platform, item.size])
        .fromPairs()
        .value();
    return sizeByPlatObj;
}
async function prepareLogFile(parentFolder, fileName) {
    const filePath = await getUniqueFolderPath(path.join(parentFolder, 'tmp'));
    const file = path.join(filePath, fileName);
    await fs.ensureFile(file);
    const logOut = fs.createWriteStream(file);
    return new Promise((resolve, reject) => {
        let done = false;
        logOut.once('open', () => {
            if (!done) {
                resolve({ logOut, logFile: file });
            }
            done = true;
        });
        logOut.once('error', (err) => {
            if (!done) {
                reject(err);
            }
            done = true;
        });
    });
}
exports.prepareLogFile = prepareLogFile;
