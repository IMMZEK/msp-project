"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtractedItems = exports.prepareHandoff = void 0;
// 3rd party
const path = require("path");
const fs = require("fs-extra");
const _ = require("lodash");
const path_helpers_1 = require("../shared/path-helpers");
const PackageHelpers = require("./package-helpers");
const util = require("./util");
const verification_helpers_1 = require("./verification-helpers");
const errors_1 = require("../shared/errors");
const extract_submitted_assets_1 = require("./extract-submitted-assets");
const handoff_checklist_helpers_1 = require("./handoff-checklist-helpers");
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
/**
 * Retrieve the submission and do any fs operations to prepare its data.
 */
async function prepareHandoff(args) {
    const { uploadedEntry, contentFolder, assetUploads, log } = args;
    const { downloadFolder, extractFolder } = await generateSubmissionFolders(contentFolder);
    try {
        // Handle zips / installers
        if (uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */) {
            verification_helpers_1.VerificationHelpers.verifyInstallerCommandValid(uploadedEntry.installCommand, log);
        }
        const handoffChecklistValid = (0, handoff_checklist_helpers_1.validateHandoffChecklist)(uploadedEntry.handoffChecklist, log);
        const { allAssets, topLevelItems } = await (0, extract_submitted_assets_1.extractSubmittedAssets)(assetUploads, uploadedEntry, downloadFolder, extractFolder, args.submissionType === "installer" /* util.SubmissionType.INSTALLER */ ? args.installOut : null, log);
        verification_helpers_1.VerificationHelpers.verifyAssetCombinationValid(allAssets, log);
        const targetAssets = allAssets.filter(({ platform }) => platform === util.Platform.LINUX || platform === util.Platform.ALL);
        if (_.isEmpty(targetAssets)) {
            throw new errors_1.GracefulError('Missing linux or all platform in upload');
        }
        else if (_.size(targetAssets) > 1) {
            throw new errors_1.GracefulError('Multiple linux or all platform items in upload');
        }
        // Handle extracted / installed folders
        const { packageFolders: packageFoldersInitial, nonPackageFolders: nonPackageFoldersInitial } = await getExtractedItems(topLevelItems, extractFolder);
        await validatePackageFolders(packageFoldersInitial, extractFolder, args.submissionType === "installer" /* util.SubmissionType.INSTALLER */, log);
        // Filter nonPackageFolders if they exist on the fs as a packageFolder
        const nonPackageFolders = args.submissionType === "installer" /* util.SubmissionType.INSTALLER */
            ? (await Promise.all(nonPackageFoldersInitial.map(async (item) => {
                const contentFolderLocation = path.join(contentFolder, path_helpers_1.PathHelpers.getRelativePath(item, extractFolder));
                const info = await PackageHelpers.getPackageInfo(contentFolderLocation);
                return { item, info };
            })))
                .filter(({ info }) => !info)
                .map((item) => item.item)
            : [];
        // Filter packageFolders if they exist in the package manager file and are not the main package
        const { id, version } = args.uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */
            ? {
                id: args.uploadedEntry.submittedPackage.id,
                version: args.uploadedEntry.submittedPackage.version
            }
            : { id: null, version: null };
        const packageFolders = args.submissionType === "installer" /* util.SubmissionType.INSTALLER */
            ? (await Promise.all(packageFoldersInitial.map(async (item) => {
                const info = await PackageHelpers.getPackageInfo(item);
                if (!info) {
                    throw new Error(`Cannot get package info for package folder ${item}`);
                }
                const entry = await args.packageManagerAdapter.getPackageEntry(info.id, info.version, log);
                return { entry, info, item };
            })))
                .filter((item) => !item.entry ||
                (item.entry && item.entry.id === id && item.entry.version === version))
                .map((data) => ({
                item: data.item,
                isSubmittedPackage: data.info.id === id && data.info.version === version
            }))
            : packageFoldersInitial.map((item) => ({ item, isSubmittedPackage: true }));
        // Final manipulation of package folders & zips
        const finalPackageFolders = await Promise.all(packageFolders.map(async ({ item: packageFolder, isSubmittedPackage }) => {
            const transformedFolder = await PackageHelpers.movePackageToSubfolder({
                packageFolder,
                extractFolder
            });
            return { packageFolder: transformedFolder, isSubmittedPackage };
        }));
        const finalAssets = await PackageHelpers.zipsMirrorPackageFolderStructure({
            downloadFolder,
            extractFolder,
            zips: allAssets,
            packageFolders: finalPackageFolders
                // only apply this to the main package's packageFolders when working with installes
                .filter((item) => item.isSubmittedPackage)
                .map((item) => item.packageFolder)
        });
        if (!finalPackageFolders.find((item) => item.isSubmittedPackage)) {
            throw new errors_1.GracefulError(`Submitted package not in installer, got ${JSON.stringify(finalPackageFolders)}`);
        }
        // Verify install command in submitted packageFolder matches installCommand
        // sent as part of handoff
        if (args.submissionType === "installer" /* util.SubmissionType.INSTALLER */ &&
            !args.skipVerifyInstallerInSync &&
            args.uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */) {
            const submittedPackageFolder = finalPackageFolders.find((item) => item.isSubmittedPackage);
            if (!submittedPackageFolder) {
                throw new Error('Missing submitted package folder');
            }
            await verification_helpers_1.VerificationHelpers.verifyInstallerCommandInSync(args.uploadedEntry.installCommand, submittedPackageFolder.packageFolder, log);
        }
        // Return
        return {
            zips: finalAssets,
            packageFolders: finalPackageFolders.map((item) => item.packageFolder),
            nonPackageFolders,
            downloadFolder,
            extractFolder,
            handoffChecklistValid
        };
    }
    catch (e) {
        await Promise.all([downloadFolder, extractFolder].map((item) => fs.remove(item)));
        throw e;
    }
}
exports.prepareHandoff = prepareHandoff;
async function generateSubmissionFolders(contentFolder) {
    const extractFolder = await getUniqueFolderPath(path.join(contentFolder, 'Submission'));
    const downloadFolder = await getUniqueFolderPath(path.join(contentFolder, 'Download'));
    // make a clean download & extract folder
    await Promise.all([downloadFolder, extractFolder].map((item) => fs.ensureDir(item)));
    return { downloadFolder, extractFolder };
}
async function getExtractedItems(topLevelItems, extractFolder) {
    const topLevelFolders = (await Promise.all(topLevelItems.map(async (item) => {
        const isDir = (await fs.stat(item)).isDirectory();
        return isDir ? item : null;
    })))
        .filter((item) => !!item)
        .map((item) => path_helpers_1.PathHelpers.getRelativePath(item, extractFolder));
    const { packageFolders: packageFoldersTemp, nonPackageFolders: nonPackageFoldersTemp } = await PackageHelpers.getPackageFolders(extractFolder);
    const packageFolders = packageFoldersTemp.map((item) => path.join(extractFolder, item));
    const nonPackageFolders = nonPackageFoldersTemp
        .filter((item) => {
        return topLevelFolders.find((topLevelFolder) => item.startsWith(topLevelFolder));
    })
        .map((item) => path.join(extractFolder, item));
    return { packageFolders, nonPackageFolders };
}
exports.getExtractedItems = getExtractedItems;
async function validatePackageFolders(packageFolders, extractFolder, isInstaller, log) {
    // Ensure we can read the package info for all package folders
    try {
        await Promise.all(packageFolders.map((packageFolder) => PackageHelpers.getPackageInfo(packageFolder)));
    }
    catch (e) {
        log.userLogger.error(e);
        throw e;
    }
    // Verify no package folders === extract folder
    const packageNoBasefolder = packageFolders.find((pkg) => path_helpers_1.PathHelpers.normalize(pkg) === path_helpers_1.PathHelpers.normalize(extractFolder));
    if (packageNoBasefolder) {
        const msg = 'Extracted package has no base folder, ensure the package zip includes the base folder';
        logMessage(log.userLogger.error, msg);
        throw new errors_1.GracefulError(`No subfolder for ${packageNoBasefolder}`);
    }
    // Verify exactly 1 package in the submission
    const detectedPackages = _.flatten(await Promise.all(packageFolders.map((item) => PackageHelpers.getAllPackageTirexJsonPaths(item))));
    if (isInstaller) {
        // Can have any number of packages in an installer
    }
    else if (detectedPackages.length === 0) {
        const msg = 'Could not find any tirex packages in the handoff. ' +
            'Please check that tirex metadata is included in the submission, i.e .metadata/.tirex is present.';
        logMessage(log.userLogger.error, msg);
        throw new errors_1.GracefulError('Nothing to handoff');
    }
    else if (detectedPackages.length > 1) {
        const msg = 'Multiple packages in one submission';
        logMessage(log.userLogger.error, msg);
        throw new errors_1.GracefulError(msg);
    }
}
function logMessage(logMethod, message) {
    logMethod(message, ['handoff']);
}
