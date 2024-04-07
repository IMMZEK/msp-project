"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPackageTirexJsonPaths = exports.getPackageTirexJsonPath = exports.zipsMirrorPackageFolderStructure = exports.movePackageToSubfolder = exports.getPlaceholderPackageInfo = exports.getPackageInfo = exports.isPackageFolder = exports.getPackageFolders = void 0;
// 3rd party
const fg = require("fast-glob");
const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");
// our modules
const path_helpers_1 = require("../shared/path-helpers");
const vars_1 = require("../lib/vars");
const errors_1 = require("../shared/errors");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Search the items for packages (folders containing a package.tirex.json file).
 *
 */
async function getPackageFolders(folder) {
    // packageFolders
    const packageJsonFolders = _.uniq(await customPackageFolderScan(folder)).map((item) => path.dirname(path_helpers_1.PathHelpers.normalize(item)));
    const packageFolders = packageJsonFolders
        .map((jsonFolder) => {
        const jsonFileName = vars_1.Vars.PACKAGE_TIREX_JSON;
        const fullPath = path.join(jsonFolder, jsonFileName);
        if (jsonFolder.endsWith(vars_1.Vars.METADATA_DIR)) {
            return fullPath.slice(0, fullPath.length -
                path_helpers_1.PathHelpers.normalizeFile(path.join(vars_1.Vars.METADATA_DIR, jsonFileName)).length);
        }
        else {
            return fullPath.slice(0, fullPath.length - jsonFileName.length);
        }
    })
        .map((item) => path_helpers_1.PathHelpers.getRelativePath(item, folder));
    // nonPackageFolders
    const topLevelItems = await fs.readdir(folder);
    const topLevelFolders = (await Promise.all(topLevelItems.map(async (item) => {
        const isDir = (await fs.stat(path.join(folder, item))).isDirectory();
        return isDir ? item : null;
    }))).filter((item) => !!item);
    const nonPackageFolders = topLevelFolders.filter((item) => {
        const isPackageFolder = packageFolders.find((pkg) => pkg.startsWith(item));
        return !isPackageFolder;
    });
    return { packageFolders, nonPackageFolders };
}
exports.getPackageFolders = getPackageFolders;
async function isPackageFolder(folderPath) {
    const stat = await fs.stat(folderPath);
    if (!stat.isDirectory()) {
        return false;
    }
    return !!getPackageTirexJsonPath(folderPath);
}
exports.isPackageFolder = isPackageFolder;
/**
 * Get the package.tirex.json based package info
 *
 * @param packageFolder - absolute path to the package.
 * @param trueVersion - If true, return the actual version of the package. By default, some are altered.
 *
 * @returns packageInfo
 */
async function getPackageInfo(packageFolder, packageMetadataFile) {
    packageMetadataFile = packageMetadataFile || (await getPackageTirexJsonPath(packageFolder));
    const data = (packageMetadataFile && _.first(await fs.readJson(packageMetadataFile))) || null;
    if (data) {
        data.type = data.type || 'software';
        // Keep the version the same for all non s/w packages
        // data.version = data.type === 'software' || trueVersion ? data.version : '1.0.0';
        // TODO this is only temporary, should hook into schema validation
        if (!data.version || !data.id) {
            throw new errors_1.GracefulError('Invalid package.tirex.json file');
        }
    }
    return data;
}
exports.getPackageInfo = getPackageInfo;
/**
 * Get placeholder PackageInfo for the non tirex package folder, folder.
 *
 * @param folder - absolute path to the folder
 *
 * @returns placeholderPackageInfo
 */
function getPlaceholderPackageInfo(folder) {
    const info = {
        name: path.basename(folder),
        id: path.basename(folder),
        version: '1.0.0',
        type: 'nonTirexPackage'
    };
    return info;
}
exports.getPlaceholderPackageInfo = getPlaceholderPackageInfo;
/**
 * Put the package folder into a subfolder under certain conditions.
 * Conditions:
 *  If it's a non-software package put it under the 'tirex-product-tree' subfolder
 *  If it's a feature package put it under a pacakgeId__packageVersion folder
 *
 */
async function movePackageToSubfolder({ packageFolder, extractFolder }) {
    const info = await getPackageInfo(packageFolder);
    if (!info) {
        throw new errors_1.GracefulError(`No package info for packageFolder ${packageFolder}`);
    }
    else if (info.type === 'devices' || info.type === 'devtools') {
        return moveToSubfolder('tirex-product-tree');
    }
    else if (info.subType === 'ccsComponent' || info.subType === 'featureSupport') {
        return moveToSubfolder(`${info.id}__${info.version}`);
    }
    else {
        return packageFolder;
    }
    async function moveToSubfolder(subfolder) {
        const pkgPath = path.relative(extractFolder, packageFolder);
        const dst = path.join(extractFolder, subfolder, pkgPath);
        if (path_helpers_1.PathHelpers.isSubfolder(dst, packageFolder)) {
            const msg = `Cannot have ${dst} be a subfolder of ${packageFolder}; this will cause move to fail and the folder to be deleted`;
            throw new errors_1.GracefulError(msg);
        }
        await fs.move(packageFolder, dst);
        return path_helpers_1.PathHelpers.normalize(dst);
    }
}
exports.movePackageToSubfolder = movePackageToSubfolder;
/**
 * Create a folder structure in the downloadFolder which mirrors the
 * packages folder structure in the extractFolder, then move the zips into the folders structures in the downloadFolder.
 * Note: all paths are absolute
 *
 * @param args
 *  @param args.downloadFolder - Where the zips were downloaded.
 *  @param args.extractFolder - Where the packages were extracted.
 *  @param args.zips
 *  @param args.packageFolders - Subfolders of extractFolder which are packages.
 *    (absolute paths, must be in the extractFolder).
 *
 * @param {Promise} newZips
 */
async function zipsMirrorPackageFolderStructure({ downloadFolder, extractFolder, zips, packageFolders }) {
    // TODO map zip folders to packageFolders so we don't need to copy
    // all the zips into every folder structure
    const relativePackageFolders = packageFolders
        .filter((pkg) => {
        return path_helpers_1.PathHelpers.isSubfolder(pkg, extractFolder);
    })
        .map((pkg) => {
        return path_helpers_1.PathHelpers.getRelativePath(pkg, extractFolder);
    });
    const zipFolders = await Promise.all(relativePackageFolders.map(async (pkgFolder) => {
        const zipFolder = path.join(downloadFolder, pkgFolder);
        await fs.ensureDir(zipFolder);
        return zipFolder;
    }));
    const newZipsLists = await Promise.all(zipFolders.map((zipFolder) => {
        // shouldn't need to do this for every zip
        // only the ones for the package (TODO above).
        return Promise.all(zips.map(async ({ asset: zip, platform }) => {
            const newZip = path.join(zipFolder, platform, path.basename(zip));
            await fs.copy(zip, newZip);
            return newZip;
        }));
    }));
    // remove the original zips
    await Promise.all(zips.map(({ asset: zip }) => fs.remove(zip)));
    return newZipsLists.reduce((newZips1, newZips2) => newZips1.concat(newZips2), []);
}
exports.zipsMirrorPackageFolderStructure = zipsMirrorPackageFolderStructure;
async function getPackageTirexJsonPath(packageFolder) {
    const files = await getAllPackageTirexJsonPaths(packageFolder);
    const sortedFiles = files.sort((item1, item2) => {
        const item1FileNameLength = path.basename(item1).length;
        const item2FileNameLength = path.basename(item2).length;
        if (item1FileNameLength > item2FileNameLength) {
            return 1;
        }
        else if (item1FileNameLength < item2FileNameLength) {
            return -1;
        }
        else {
            return 0;
        }
    });
    // If there's multiple package.tirex.json files, the one with the smallest name is selected
    // That way the core package (with no prefix) will take precedence
    return _.first(sortedFiles);
}
exports.getPackageTirexJsonPath = getPackageTirexJsonPath;
async function getAllPackageTirexJsonPaths(packageFolder) {
    // Look directly under the packageFolder
    const packageTirexJson1 = path.join(packageFolder, vars_1.Vars.PACKAGE_TIREX_JSON);
    const fileSet1 = (await fs.pathExists(packageTirexJson1)) ? [packageTirexJson1] : [];
    // Look in the metadata folder
    const packageTirexJsonFolder = path.join(packageFolder, vars_1.Vars.METADATA_DIR);
    const fileSet2 = await fg(`${getPathForFg(packageTirexJsonFolder)}/*${vars_1.Vars.PACKAGE_TIREX_JSON}`, {
        dot: true,
        deep: 1
    });
    // Final list
    return [...fileSet1, ...fileSet2];
    function getPathForFg(path) {
        const packageFolderForFg = path_helpers_1.PathHelpers.normalize(path).replace(new RegExp('\\\\', 'g'), '/');
        if (packageFolderForFg.endsWith('/')) {
            return packageFolderForFg.slice(0, -1);
        }
        else {
            return packageFolderForFg;
        }
    }
}
exports.getAllPackageTirexJsonPaths = getAllPackageTirexJsonPaths;
/**
 * A custom scan for package folders, which stops searching a dir once we find a .metadata or package.tirex.json folder
 * Goal is to make this fast for desktop / cloudagent
 */
async function customPackageFolderScan(folder, depth = 0) {
    if (depth > 3) {
        return null;
    }
    const children = await fs.readdir(folder);
    const result = await Promise.all(children.map(async (item) => {
        const stats = await fs.stat(path.join(folder, item));
        if (!stats.isDirectory()) {
            return item.endsWith(vars_1.Vars.PACKAGE_TIREX_JSON) ? [path.join(folder, item)] : null;
        }
        if (await fs.pathExists(path.join(folder, vars_1.Vars.METADATA_DIR))) {
            const metadataDirItems = await fs.readdir(path.join(folder, vars_1.Vars.METADATA_DIR));
            return metadataDirItems
                .filter((item) => item.endsWith(vars_1.Vars.PACKAGE_TIREX_JSON))
                .map((item) => path.join(folder, vars_1.Vars.METADATA_DIR, item));
        }
        else {
            const foundItems = await customPackageFolderScan(path.join(folder, item), depth + 1);
            return foundItems;
        }
    }));
    return _.flatten(result).filter((item) => !!item);
}
