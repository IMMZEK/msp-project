"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFolder = exports.getPlatform = exports.removeTempDirs = exports.makeTempDirs = exports.doTirex4Request = void 0;
// native modules
const path = require("path");
const fs = require("fs-extra");
const os = require("os");
const path_helpers_1 = require("../shared/path-helpers");
const vars_1 = require("../lib/vars");
const request_helpers_1 = require("../shared/request-helpers");
const response_data_1 = require("../shared/routes/response-data");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
const PLATFORM_MAP = {
    linux: response_data_1.Platform.LINUX,
    win32: response_data_1.Platform.WINDOWS,
    darwin: response_data_1.Platform.MACOS
};
async function doTirex4Request(url) {
    const { data } = await (0, request_helpers_1.doGetRequest)(url);
    return data.payload;
}
exports.doTirex4Request = doTirex4Request;
async function makeTempDirs(location, name) {
    const tempFolder = path.join(location, '.tirex-temp');
    const downloadDir = await getUniqueFolderPath(path.join(tempFolder, `${name}-download`));
    const extractDir = await getUniqueFolderPath(path.join(tempFolder, `${name}-extract`));
    await fs.ensureDir(downloadDir);
    await fs.ensureDir(extractDir);
    return { downloadDir, extractDir };
}
exports.makeTempDirs = makeTempDirs;
async function removeTempDirs(dirs) {
    return Promise.all([fs.remove(dirs.downloadDir), fs.remove(dirs.extractDir)]);
}
exports.removeTempDirs = removeTempDirs;
const getUniqueFolderPath = (prefixPath) => {
    return new Promise((resolve, reject) => {
        path_helpers_1.PathHelpers.getUniqueFolderPath(prefixPath, (err, uniquePath) => {
            if (err) {
                return reject(err);
            }
            resolve(uniquePath);
        });
    });
};
function getPlatform() {
    return PLATFORM_MAP[os.platform()];
}
exports.getPlatform = getPlatform;
function getConfigFolder() {
    return path.join(vars_1.Vars.PROJECT_ROOT, 'config');
}
exports.getConfigFolder = getConfigFolder;
