"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processModules = void 0;
// 3rd party
const _ = require("lodash");
const path = require("path");
const fs = require("fs-extra");
const index_1 = require("../3rd_party/merge-dirs/src/index");
const Versioning = require("../lib/versioning");
const path_helpers_1 = require("../shared/path-helpers");
const errors_1 = require("../shared/errors");
const package_helpers_1 = require("./package-helpers");
const promise_utils_1 = require("../utils/promise-utils");
// promisified methods
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
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/*
  Transform the submissions to accommodate modules.
  Handoff treats all modules + core package as a single item. This is then split up at refresh time.

  We need to
  - Group all module items in the submission, based on matching core package uid.
  - Create a merged package folder, containing all submitted modules + core package (may be in the submission) + existing modules before submission
  - Return a new set of submission items, which creates a single entry per modules + core package (we treat it as a core package submission)
*/
async function processModules(submittedItems, packageManagerAdapter, contentFolder, zipsFolder, log) {
    log.debugLogger.info(`Processing any modules in submission`);
    const { modules, nonModuleItems } = await getModulesInfoAndAdjustZips(submittedItems, packageManagerAdapter, contentFolder, log);
    log.debugLogger.info(`Detected modules ${JSON.stringify(modules)} and non-modules ${JSON.stringify(nonModuleItems)} in submission`);
    // Create any entries required, if only modules submitted with no corePackageFolder
    // Combine existing modules, newly submitted modules, and corePackages
    const moduleItems = await (0, promise_utils_1.mapSerially)(Object.entries(modules), async ([corePackageUid, { modulePackageFolders, moduleZips, moduleDownloadFolders, moduleExtractFolders, corePackageSubmittedItemsIdx }]) => {
        // Get any existing module contents
        const { corePackageFolder: existingCorePackageFolder, coreSubmittedItem: existingCorePackageItem } = await getExistingContent(corePackageUid, packageManagerAdapter, contentFolder, zipsFolder, log);
        if (existingCorePackageFolder && existingCorePackageItem) {
            log.debugLogger.info(`Using existing corePackage (+ modules)`);
            if (corePackageSubmittedItemsIdx > -1) {
                // We have a new download / extract folder, make sure we cleanup the original one
                const submittedCorePackageItem = submittedItems[corePackageSubmittedItemsIdx];
                moduleDownloadFolders.push(submittedCorePackageItem.downloadFolder);
                moduleExtractFolders.push(submittedCorePackageItem.extractFolder);
            }
        }
        // Add in the submitted corePackage
        const { coreSubmittedItem, corePackageFolder } = await (async () => {
            if (corePackageSubmittedItemsIdx > -1) {
                const [corePackageId, corePackageVersion] = corePackageUid.split('__');
                const submittedCorePackageItem = submittedItems[corePackageSubmittedItemsIdx];
                const { packageFolder: submittedCorePackageFolder } = await getSubmittedPackageData(submittedCorePackageItem.packageFolders, corePackageId, corePackageVersion);
                log.debugLogger.info(`Combining submitted core package folder with any existing content`);
                return mergeSubmittedCorePackage(submittedCorePackageItem, submittedCorePackageFolder, existingCorePackageFolder, existingCorePackageItem);
            }
            else {
                return {
                    coreSubmittedItem: existingCorePackageItem,
                    corePackageFolder: existingCorePackageFolder
                };
            }
        })();
        if (!coreSubmittedItem || !corePackageFolder) {
            throw new errors_1.GracefulError(`Cannot find corePackage for submission ${corePackageUid}`);
        }
        // Add in the submitted modules
        const { coreSubmittedItem: finalSubmittedItem } = await mergeSubmittedModules({
            coreSubmittedItem,
            corePackageFolder,
            modulePackageFolders,
            moduleZips,
            log
        });
        // Cleanup
        await Promise.all([...moduleDownloadFolders, ...moduleExtractFolders].map((item) => fs.remove(item)));
        // Return the result
        return finalSubmittedItem;
    });
    return [...nonModuleItems, ...moduleItems];
}
exports.processModules = processModules;
/**
 * Split the submitted items into modules (grouped by core package uid) and nonModuleItems
 * Also correct the module zip folders to use the package uid in the path.
 *
 */
async function getModulesInfoAndAdjustZips(submittedItems, packageManagerAdapter, contentFolder, log) {
    const submittedItemInfos = await Promise.all(submittedItems.map((item) => Promise.all(item.packageFolders.map((folder) => (0, package_helpers_1.getPackageInfo)(folder)))));
    const allEntries = await packageManagerAdapter.getAllEntries(log);
    const modules = {};
    const nonModuleItems = (await Promise.all(submittedItems.map(async (submittedItem, idx) => {
        // See if any packageFolders in the current submittedItem is a module
        const moduleItem = submittedItemInfos[idx].find((pkgInfo) => {
            if (!pkgInfo || !pkgInfo.moduleOf) {
                return null;
            }
            else if (submittedItem.uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */) {
                throw new errors_1.GracefulError('Cannot submit module as installer');
            }
            else {
                return pkgInfo;
            }
        });
        if (!moduleItem) {
            // Determine if we are a corePackage (we submitted a corePackage with no modules, but modules exist on the server)
            const corePackageUid = (await Promise.all(submittedItemInfos[idx].map(async (pkgInfo) => {
                const currentlyExists = pkgInfo &&
                    allEntries.find((item) => item.id === pkgInfo.id &&
                        item.version === pkgInfo.version);
                const { packageFolder } = currentlyExists && pkgInfo
                    ? await getSubmittedPackageData(currentlyExists.content.map((item) => path.join(contentFolder, item)), pkgInfo.id, pkgInfo.version)
                    : { packageFolder: null };
                const packageTirexJsonPaths = packageFolder &&
                    (await (0, package_helpers_1.getAllPackageTirexJsonPaths)(packageFolder));
                return _.size(packageTirexJsonPaths) > 1 && pkgInfo
                    ? `${pkgInfo.id}__${pkgInfo.version}`
                    : null;
            }))).reduce((accum, item) => accum || item, null);
            if (corePackageUid) {
                modules[corePackageUid] = modules[corePackageUid] || {
                    modulePackageFolders: [],
                    moduleZips: [],
                    moduleDownloadFolders: [],
                    moduleExtractFolders: [],
                    moduleEmail: submittedItem.uploadedEntry.email,
                    corePackageSubmittedItemsIdx: idx
                };
                return null;
            }
            else {
                return { submittedItem, info: submittedItemInfos[idx] };
            }
        }
        else {
            log.userLogger.info(`Detected module ${moduleItem.id} ${moduleItem.version} in submission`);
        }
        // Fix the zip folder to use the module packageUID in the path
        submittedItem.zips = await Promise.all(submittedItem.zips.map(async (zip) => {
            const platformFolder = path.dirname(zip);
            const platform = path.basename(platformFolder);
            const correctedLocation = path.join(submittedItem.downloadFolder, `${moduleItem.id}__${moduleItem.version}`, platform, path.basename(zip));
            await fs.move(zip, correctedLocation);
            return correctedLocation;
        }));
        // Add the item to modules
        await updateModules(modules, moduleItem, allEntries, submittedItem, submittedItems, submittedItemInfos);
        return null;
    }))).filter((item) => !!item);
    const nonModulesFinal = (await Promise.all(nonModuleItems.map(async ({ submittedItem, info }) => {
        const packageUids = info
            .map((item) => item && `${item.id}__${item.version}`)
            .filter((item) => !!item);
        const isCorePkg = !_.isEmpty(_.intersection(packageUids, Object.keys(modules)));
        return !isCorePkg && submittedItem;
    }))).filter((item) => !!item);
    return { modules, nonModuleItems: nonModulesFinal };
}
/**
 * Look for any existing content for the corePackage + modules.
 * Make a new download / extract folder, using the valid submitted content.
 */
async function getExistingContent(corePackageUid, packageManagerAdapter, contentFolder, zipsFolder, log) {
    const [id, version] = corePackageUid.split('__');
    const entry = await packageManagerAdapter.getPackageEntry(id, version, log);
    const newDownloadFolder = await getUniqueFolderPath(path.join(contentFolder, 'Download'));
    const newExtractFolder = await getUniqueFolderPath(path.join(contentFolder, 'Submission'));
    let corePackageFolder = null;
    let coreSubmittedItem = null;
    if (entry && entry.state === "valid" /* util.PackageEntryState.VALID */) {
        const { packageFolder, info: { installCommand } } = await getSubmittedPackageData(entry.content.map((item) => path.join(contentFolder, item)), entry.id, entry.version);
        const newPackageFolder = path.join(newExtractFolder, path_helpers_1.PathHelpers.getRelativePath(packageFolder, contentFolder));
        await fs.copy(packageFolder, newPackageFolder);
        await Promise.all(entry.zips.map((zip) => fs.copy(path.join(zipsFolder, zip), path.join(newDownloadFolder, zip))));
        coreSubmittedItem = {
            downloadFolder: newDownloadFolder,
            extractFolder: newExtractFolder,
            packageFolders: [newPackageFolder],
            nonPackageFolders: [],
            zips: entry.zips.map((item) => path.join(newDownloadFolder, item)),
            uploadedEntry: installCommand
                ? {
                    submissionType: "installer" /* util.SubmissionType.INSTALLER */,
                    installCommand: _.fromPairs(Object.entries(installCommand)
                        .map(([platform, command]) => {
                        return command ? [platform, command] : null;
                    })
                        .filter((item) => {
                        return !!item;
                    })),
                    submittedPackage: { id: entry.id, version: entry.version },
                    email: entry.email
                }
                : { submissionType: "zip" /* util.SubmissionType.ZIP */, email: entry.email },
            handoffChecklistValid: false
        };
        corePackageFolder = path.join(newExtractFolder, path.basename(packageFolder));
    }
    return { corePackageFolder, coreSubmittedItem };
}
/**
 * Combine the submitted content for the corePackage + modules with the existing content.
 */
async function mergeSubmittedCorePackage(submittedCorePackageItem, submittedCorePackageFolder, existingCorePackageFolder, existingCoreSubmittedItem) {
    if (existingCorePackageFolder && existingCoreSubmittedItem) {
        await (0, index_1.mergeDirs)(submittedCorePackageFolder, existingCorePackageFolder);
        const submittedZips = await Promise.all(submittedCorePackageItem.zips.map(async (zip) => {
            const relZip = path_helpers_1.PathHelpers.getRelativePath(zip, submittedCorePackageItem.downloadFolder);
            const destZip = path.join(existingCoreSubmittedItem.downloadFolder, relZip);
            if (await fs.pathExists(destZip)) {
                await fs.remove(destZip);
            }
            await fs.copy(zip, destZip);
            return destZip;
        }));
        // Note we need to add merging support here to handle these 2 cases, the code ran before this should handle these cases correctly
        // Omitting these cases now since it's not something we need to support / need to test
        if (!_.isEmpty(submittedCorePackageItem.nonPackageFolders)) {
            throw new errors_1.GracefulError(`Core submitted item cannot contain non package folders ${JSON.stringify(submittedCorePackageItem.nonPackageFolders)}`);
        }
        else if (submittedCorePackageItem.packageFolders.length > 1) {
            throw new errors_1.GracefulError(`Core submitted item cannot contain more than 1 package folder ${JSON.stringify(submittedCorePackageItem.packageFolders)}`);
        }
        return {
            coreSubmittedItem: {
                ...existingCoreSubmittedItem,
                uploadedEntry: submittedCorePackageItem.uploadedEntry,
                zips: _.uniq([...submittedZips, ...existingCoreSubmittedItem.zips])
            },
            corePackageFolder: existingCorePackageFolder
        };
    }
    else {
        return {
            coreSubmittedItem: submittedCorePackageItem,
            corePackageFolder: submittedCorePackageFolder
        };
    }
}
async function getSubmittedPackageData(packageFolders, id, version) {
    const submittedPackageCandidates = await Promise.all(packageFolders.map(async (pkgFolder) => {
        const info = await (0, package_helpers_1.getPackageInfo)(pkgFolder);
        if (!info) {
            throw new Error(`No info for folder ${pkgFolder}`);
        }
        return info.id === id && info.version === version
            ? { packageFolder: pkgFolder, info }
            : null;
    }));
    const submittedPackageData = submittedPackageCandidates.find((item) => !!item);
    if (!submittedPackageData) {
        throw new Error(`Missing submitted package ${id} ${version}`);
    }
    return submittedPackageData;
}
async function updateModules(modules, moduleItem, allEntries, submittedItem, submittedItems, submittedItemInfos) {
    if (!moduleItem.moduleOf) {
        throw new Error(`module with no moduleOf ${JSON.stringify(moduleItem)}`);
    }
    const idVerArr = submittedItems.map((item, idx) => {
        const idVersion = item.uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */
            ? item.uploadedEntry.submittedPackage
            : _.first(submittedItemInfos[idx]);
        return idVersion;
    });
    const submittedCorePackageIdx = idVerArr.findIndex((idVersion) => {
        return (idVersion &&
            moduleItem.moduleOf &&
            moduleItem.moduleOf.packageId === idVersion.id &&
            Versioning.satisfies(idVersion.version, moduleItem.moduleOf.semver));
    });
    if (submittedCorePackageIdx > -1) {
        const idVersion = idVerArr[submittedCorePackageIdx];
        if (!idVersion) {
            throw new Error(`Cannot find idVersion with idx ${submittedCorePackageIdx}`);
        }
        const key = `${idVersion.id}__${idVersion.version}`;
        updateModulesInner(modules, key, submittedItem, submittedCorePackageIdx);
    }
    else {
        const matchingEntries = allEntries.filter((item) => {
            return (moduleItem.moduleOf &&
                moduleItem.moduleOf.packageId === item.id &&
                Versioning.satisfies(item.version, moduleItem.moduleOf.semver));
        });
        const corePackage = _.last(matchingEntries.sort((item1, item2) => {
            return Versioning.compare(item1.version, item2.version);
        }));
        if (!corePackage) {
            throw new errors_1.GracefulError(`corePackage for ${moduleItem.moduleOf.packageId} ${moduleItem.moduleOf.semver} does not exist on the server. Please submit the core package first`);
        }
        const key = `${corePackage.id}__${corePackage.version}`;
        updateModulesInner(modules, key, submittedItem, submittedCorePackageIdx);
    }
}
async function mergeSubmittedModules({ coreSubmittedItem, corePackageFolder, modulePackageFolders, moduleZips }) {
    // Transfer everything into the corePackageFolder & zips folder
    await (0, promise_utils_1.mapSerially)(modulePackageFolders, async (item) => {
        await (0, index_1.mergeDirs)(item, corePackageFolder);
    });
    // Copy zip module folders over
    const moduleZipFolders = _.uniq(moduleZips.map((zip) => {
        // zip = downloadFolder/moduleUID/platform/zipName
        // zipFolder = downloadFolder/moduleUID
        const zipFolder = path.dirname(path.dirname(zip));
        return zipFolder;
    }));
    const corePackageZipsFolder = path.join(coreSubmittedItem.downloadFolder, path_helpers_1.PathHelpers.getRelativePath(corePackageFolder, coreSubmittedItem.extractFolder), 'modules');
    await Promise.all(moduleZipFolders.map(async (zipFolder) => {
        const destZipFolder = path.join(corePackageZipsFolder, path.basename(zipFolder));
        if (await fs.pathExists(destZipFolder)) {
            await fs.remove(destZipFolder);
        }
        await fs.move(zipFolder, destZipFolder);
    }));
    // Create the new list of zips
    const newZips = await Promise.all(moduleZips.map(async (zip) => {
        // zip = downloadFolder/moduleUID/platform/zipName
        const downloadFolder = path.dirname(path.dirname(path.dirname(zip)));
        return path.join(corePackageZipsFolder, path_helpers_1.PathHelpers.getRelativePath(zip, downloadFolder));
    }));
    // Return the result
    return {
        coreSubmittedItem: {
            ...coreSubmittedItem,
            zips: _.uniq([...coreSubmittedItem.zips, ...newZips])
        },
        corePackageFolder
    };
}
function updateModulesInner(modules, key, submittedItem, submittedCorePackageIdx) {
    modules[key] = modules[key] || {
        modulePackageFolders: [],
        moduleZips: [],
        moduleDownloadFolders: [],
        moduleExtractFolders: [],
        moduleEmail: '',
        corePackageSubmittedItemsIdx: -1
    };
    modules[key].modulePackageFolders = modules[key].modulePackageFolders.concat(submittedItem.packageFolders);
    modules[key].moduleZips = modules[key].moduleZips.concat(submittedItem.zips);
    modules[key].moduleDownloadFolders.push(submittedItem.downloadFolder);
    modules[key].moduleExtractFolders.push(submittedItem.extractFolder);
    modules[key].moduleEmail = modules[key].moduleEmail || submittedItem.uploadedEntry.email;
    modules[key].corePackageSubmittedItemsIdx = Math.max(submittedCorePackageIdx, modules[key].corePackageSubmittedItemsIdx);
}
