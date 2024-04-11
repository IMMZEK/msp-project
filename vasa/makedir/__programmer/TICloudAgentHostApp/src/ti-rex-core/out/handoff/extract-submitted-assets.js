"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSubmittedAssets = void 0;
// 3rd party
const path = require("path");
const fs = require("fs-extra");
const _ = require("lodash");
const util = require("./util");
const errors_1 = require("../shared/errors");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Process the submission items. This includes extracting, verification, downloading,
 * and moving items into the download / extract folders
 */
async function extractSubmittedAssets(assetUploads, uploadedEntry, downloadFolder, extractFolder, installOut, log) {
    const { organizedAssetLinks, organizedAssetUploads } = organizeAssetSources(assetUploads, uploadedEntry);
    const allAssets = [
        ...(await moveAssets(organizedAssetUploads, downloadFolder)),
        ...(await downloadAssets(organizedAssetLinks, downloadFolder, log))
    ];
    if (uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */) {
        // We are working with installers, set permissions
        await Promise.all(allAssets.map(({ asset }) => fs.chmod(asset, 0o775)));
    }
    const topLevelItems = uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */
        ? await install(uploadedEntry.installCommand, installOut, downloadFolder, extractFolder, log)
        : await extract(allAssets, extractFolder, log);
    return { allAssets, topLevelItems };
}
exports.extractSubmittedAssets = extractSubmittedAssets;
// Helpers
function organizeAssetSources(assetUploads, uploadedEntry) {
    const organizedAssetLinks = uploadedEntry.assets || {};
    const organizedAssetUploads = {};
    const platformErrorMessage = (platform) => `Unknown platform ${platform}. Please specify either: ${util.Platform.ALL}, ${util.Platform.LINUX}, ${util.Platform.OSX}, or ${util.Platform.WINDOWS}`;
    Object.keys(uploadedEntry.assets || {}).map((platform) => {
        switch (platform) {
            case util.Platform.MODULE_GROUP:
            case util.Platform.ALL:
            case util.Platform.LINUX:
            case util.Platform.OSX:
            case util.Platform.WINDOWS:
                break;
            default:
                throw new errors_1.GracefulError(platformErrorMessage(platform));
        }
    });
    Object.entries(uploadedEntry.localAssets || {}).map(([platform, originalPath]) => {
        switch (platform) {
            case util.Platform.MODULE_GROUP:
            case util.Platform.ALL:
            case util.Platform.LINUX:
            case util.Platform.OSX:
            case util.Platform.WINDOWS:
                const assetUpload = assetUploads.find((upload) => upload.originalname === path.basename(originalPath));
                if (!assetUpload) {
                    throw new Error(`Cannot find ${originalPath} in ${JSON.stringify(assetUploads)}`);
                }
                organizedAssetUploads[platform] = assetUpload;
                break;
            default:
                throw new errors_1.GracefulError(platformErrorMessage(platform));
        }
    });
    return { organizedAssetLinks, organizedAssetUploads };
}
async function moveAssets(assetUploads, downloadFolder) {
    const assets = await Promise.all(Object.entries(assetUploads).map(async ([platform, zipUpload]) => {
        const asset = path.join(downloadFolder, zipUpload.originalname);
        await fs.move(zipUpload.path, asset);
        return { asset, platform };
    }));
    return assets;
}
async function downloadAssets(assetLinks, downloadFolder, log) {
    const allAssets = await Promise.all(Object.entries(assetLinks).map(async ([platform, asset]) => {
        const downloadedAsset = await log.handleErrorPromise(() => util.downloadFile(asset, downloadFolder, ignoreProgress), {
            userMessage: `Failed to download ${asset}. Please verify the url and that it is accessible within ti.`
        });
        return { asset: downloadedAsset, platform };
    }));
    return allAssets;
}
// TODO should give graceful errors in these cases
async function extract(allAssets, extractFolder, log) {
    const hasModuleGroupPackage = allAssets.find((item) => item.platform === util.Platform.MODULE_GROUP);
    return _.flatten(await Promise.all(allAssets.map(async ({ asset: zip, platform }) => {
        if ((hasModuleGroupPackage && platform === util.Platform.MODULE_GROUP) ||
            (!hasModuleGroupPackage &&
                (platform === util.Platform.LINUX || platform === util.Platform.ALL))) {
            // don't extract other platform zips
            // since we don't handle it in tirex anyways
            const msg = `Failed to extract ${zip}. Please ensure you are using the recommended zip utility.`;
            const topLevelItems = await log.handleErrorPromise(() => util.extract(zip, extractFolder, ignoreProgress), {
                userMessage: msg
            });
            return topLevelItems;
        }
        else {
            return [];
        }
    })));
}
async function install(installCommand, installOut, downloadFolder, extractFolder, log) {
    const linuxCommand = installCommand[util.Platform.LINUX];
    const msg = `Failed to install ${linuxCommand}. Please ensure your installer on linux is working`;
    const topLevelItems = await log.handleErrorPromise(async () => {
        // Install
        if (installCommand) {
            return util.install(linuxCommand, downloadFolder, extractFolder, ignoreProgress, installOut || undefined);
        }
        else {
            return [];
        }
    }, { userMessage: msg });
    return topLevelItems;
}
// Exists to indicate that we are explicitly ignoring progress callbacks
function ignoreProgress() { }
