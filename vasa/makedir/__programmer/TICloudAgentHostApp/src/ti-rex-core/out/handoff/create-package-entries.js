"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._getMissingNonPackageFolders = exports._deduceZips = exports._getMissingPackages = exports.createPackageEntries = void 0;
// 3rd party
const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");
// our modules
const path_helpers_1 = require("../shared/path-helpers");
const PackageHelpers = require("./package-helpers");
const util_1 = require("./util");
const overrides_manager_1 = require("./overrides-manager");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Create entries for the content folders provided which do not exist in the provided set of entries
 *
 * @param args
 *  @param args.entries - The already existing entries
 *  @param args.packageFolders - The set of package folders which may not already be in entries
 *  @param args.contentFolder - The location the entries content and the packageFolders exist (and the paths are relative to)
 *
 * @returns {Promise} missingPackages
 */
async function createPackageEntries(args) {
    const missingPackages = await getMissingPackages(args);
    const nonPackageFoldersMissingInfo = await getMissingNonPackageFolders(args);
    const overridesManager = new overrides_manager_1.OverridesManager(args.overridesDir);
    const entries = await Promise.all([...missingPackages, ...nonPackageFoldersMissingInfo].map(async (item) => {
        const zips = await deduceZips(item, args.zipsFolder);
        const showEntry = (await overridesManager.getShowEntryValues(item.content)).reduce((accum, item) => accum && item, true);
        const { id, version, content, isNonTirexPackage } = item;
        const entry = {
            id,
            version,
            content,
            zips,
            submissionId: '',
            email: '',
            showEntry: showEntry && !isNonTirexPackage,
            state: "valid" /* PackageEntryState.VALID */
        };
        return entry;
    }));
    return entries;
}
exports.createPackageEntries = createPackageEntries;
async function getMissingPackages(args) {
    const potentialMissingPackages = await getPotentialMissingPackages(args);
    const missingPackages = getFinalMissingPackages(potentialMissingPackages, args);
    return missingPackages;
}
async function getMissingNonPackageFolders(args) {
    const nonPackageFoldersMissingInfo = args.nonPackageFolders.map((item) => {
        const { name, id, version } = PackageHelpers.getPlaceholderPackageInfo(item);
        return {
            name,
            id,
            version,
            content: [item],
            isNonTirexPackage: true
        };
    });
    return nonPackageFoldersMissingInfo;
}
/**
 * Deduce the set of zips for a package based on the missing package info.
 *
 * @param missingPackage
 * @param zipsFolder
 *
 * @returns {Promise} zips
 */
async function deduceZips(missingPackage, zipsFolder) {
    const zipFolders = _.flatten(await Promise.all(missingPackage.content.map(async (packageFolder) => {
        // Determine if there are any module Folders
        const coreZipsBaseFolder = path.join(zipsFolder, packageFolder);
        const modulesFolder = path.join(coreZipsBaseFolder, 'modules');
        const coreZipsFolders = [
            // We may have either the old flat structure or organized by platform
            coreZipsBaseFolder,
            ...[util_1.Platform.LINUX, util_1.Platform.WINDOWS, util_1.Platform.OSX, util_1.Platform.ALL].map((plat) => path.join(coreZipsBaseFolder, plat))
        ];
        if (await fs.pathExists(modulesFolder)) {
            const potentialModuleFolders = (await fs.readdir(modulesFolder)).map((item) => path.join(modulesFolder, item));
            const isDir = await Promise.all(potentialModuleFolders.map(async (item) => {
                const stats = await fs.lstat(item);
                return stats.isDirectory();
            }));
            const moduleBaseFolders = potentialModuleFolders.filter((_item, idx) => isDir[idx]);
            const moduleFolders = _.flatten(moduleBaseFolders.map((moduleBaseFolder) => {
                return [
                    util_1.Platform.LINUX,
                    util_1.Platform.WINDOWS,
                    util_1.Platform.OSX,
                    util_1.Platform.ALL
                ].map((plat) => path.join(moduleBaseFolder, plat));
            }));
            return [...coreZipsFolders, ...moduleFolders];
        }
        else {
            return coreZipsFolders;
        }
    })));
    const result = await Promise.all(zipFolders.map(async (zipFolder) => {
        if (!(await fs.pathExists(zipFolder))) {
            return null;
        }
        const zipFolderContents = await fs.readdir(zipFolder);
        if (!zipFolderContents) {
            return null;
        }
        const zipFiles = await Promise.all(zipFolderContents.map(async (zipFolderContent) => {
            const zip = path.join(zipFolder, zipFolderContent);
            // We can have errors for broken links
            return (0, util_1.ignoreError)(async () => {
                const stats = await fs.stat(zip);
                return stats.isFile() ? zip : null;
            });
        }));
        return zipFiles.filter((zipFile) => !!zipFile);
    }));
    return result
        .filter((item) => !!item)
        .reduce((item1, item2) => item1.concat(item2), [])
        .map((absZip) => path_helpers_1.PathHelpers.getRelativePath(absZip, zipsFolder));
}
/**
 * Get the potential set of missing packages.
 * We find the content folders in packageFolders that do not exist in the list of entries content items
 * Then we return their package info.
 *
 * @param args
 *
 * @returns potentialMissingPackages
 */
async function getPotentialMissingPackages({ entries, packageFolders, contentFolder }) {
    const existingContentFolders = _.uniq(entries
        .map((pkg) => pkg.content)
        .reduce((item1, item2) => item1.concat(item2), [])
        .map((item) => path_helpers_1.PathHelpers.normalize(item)));
    const missingContentFolders = packageFolders.filter((item) => !existingContentFolders.includes(path_helpers_1.PathHelpers.normalize(item)));
    return (await Promise.all(missingContentFolders.map(async (pkg) => {
        const info = await PackageHelpers.getPackageInfo(path.join(contentFolder, pkg));
        if (!info) {
            return null;
        }
        return { ...info, content: [pkg] };
    }))).filter((missingPkg) => !!missingPkg);
}
/**
 * Get the final set of missing packages.
 * We look at the items in potentialMissingPackages and see if these is something with the same id, version
 * in packageManagerFileJson
 *
 * @param potentialMissingPackages
 *
 * @returns finalMissingPackages
 */
function getFinalMissingPackages(potentialMissingPackages, { entries }) {
    const missingPackages = potentialMissingPackages.filter(({ id, version }) => {
        const existingPackage = entries.find((pkg) => pkg.id === id && pkg.version === version);
        return !existingPackage;
    });
    const groupedResult = {};
    missingPackages.forEach(({ id, version, content }) => {
        if (!groupedResult[id]) {
            groupedResult[id] = {};
        }
        if (groupedResult[id][version]) {
            groupedResult[id][version].content = groupedResult[id][version].content.concat(content);
        }
        else {
            groupedResult[id][version] = {
                id,
                version,
                content,
                isNonTirexPackage: false
            };
        }
    });
    return _.flatten(Object.values(groupedResult).map((items) => Object.values(items)));
}
// For test purposes only
function _getMissingPackages(args) {
    return getMissingPackages(args);
}
exports._getMissingPackages = _getMissingPackages;
function _deduceZips(missingPackage, zipsFolder) {
    return deduceZips(missingPackage, zipsFolder);
}
exports._deduceZips = _deduceZips;
function _getMissingNonPackageFolders(args) {
    return getMissingNonPackageFolders(args);
}
exports._getMissingNonPackageFolders = _getMissingNonPackageFolders;
