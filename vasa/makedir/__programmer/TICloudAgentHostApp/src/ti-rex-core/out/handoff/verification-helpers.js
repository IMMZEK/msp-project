"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationHelpers = void 0;
// 3rd party
const fs = require("fs-extra");
// native modules
const assert = require("assert");
// our modules
const PackageHelpers = require("./package-helpers");
const errors_1 = require("../shared/errors");
const util = require("./util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
var VerificationHelpers;
(function (VerificationHelpers) {
    /**
     * Verify that the items do not exist
     *
     * @param items - A list of absolute paths to files / folders
     *
     * @returns {Promise} void
     */
    async function verifyItemsDoNotExist(items) {
        await Promise.all(items.map(async (item) => {
            try {
                await fs.access(item);
                return item;
            }
            catch (e) {
                return null;
            }
        })).then((results) => {
            const existingItems = results.filter((result) => !!result);
            if (existingItems.length > 0) {
                throw new Error(`The items ${existingItems} already exist`);
            }
        });
    }
    VerificationHelpers.verifyItemsDoNotExist = verifyItemsDoNotExist;
    /**
     * Verify that the items exist
     *
     * @param items - A list of absolute paths to files / folders
     *
     * @returns {Promise} void
     */
    async function verifyItemsExist(items) {
        const results = await Promise.all(items.map(async (item) => {
            try {
                await fs.access(item);
                return null;
            }
            catch (e) {
                return item;
            }
        }));
        const nonExistingItems = results.filter((result) => !!result);
        if (nonExistingItems.length > 0) {
            throw new Error(`The items ${nonExistingItems} does not exist`);
        }
    }
    VerificationHelpers.verifyItemsExist = verifyItemsExist;
    function verifyAssetCombinationValid(assets, log) {
        const viewableZips = assets.filter((zip) => zip.platform === util.Platform.ALL || zip.platform === util.Platform.LINUX);
        if (viewableZips.length === 0) {
            const msg = `Could not find linux or all asset (minimum requirement). Please check that a linux or all zip / installer was included in the submission.`;
            logMessage(log.userLogger.error, msg);
            throw new errors_1.GracefulError('No linux or all asset in handoff');
        }
        const allZips = assets.filter((zip) => zip.platform === util.Platform.ALL);
        const platformSpecifcZips = assets.filter((zip) => zip.platform === util.Platform.LINUX ||
            zip.platform === util.Platform.OSX ||
            zip.platform === util.Platform.WINDOWS);
        if (allZips.length > 0 && platformSpecifcZips.length > 0) {
            const msg = 'Mixture of platform specific and all asset files are not supported. Please upload one or the other.';
            logMessage(log.userLogger.error, msg);
            throw new errors_1.GracefulError('Mix of all & platform specify assets in handoff');
        }
        else if (platformSpecifcZips.length > 0) {
            const macZips = platformSpecifcZips.filter((zip) => zip.platform === util.Platform.OSX);
            const linuxZips = platformSpecifcZips.filter((zip) => zip.platform === util.Platform.LINUX);
            const winZips = platformSpecifcZips.filter((zip) => zip.platform === util.Platform.WINDOWS);
            if (winZips.length === 0 || linuxZips.length === 0 || macZips.length === 0) {
                const msg = 'Submission does not include asset files for all os platforms. It is recommended to include all platforms.';
                logMessage(log.userLogger.warning, msg);
            }
        }
    }
    VerificationHelpers.verifyAssetCombinationValid = verifyAssetCombinationValid;
    function verifyInstallerCommandValid(installCommand, log) {
        if (!installCommand[util.Platform.LINUX]) {
            const msg = `No linux install command provided. Please check the submitted handoff.json and ensure a linux install command was provided`;
            logMessage(log.userLogger.error, msg);
            throw new errors_1.GracefulError('Linux install command missing');
        }
    }
    VerificationHelpers.verifyInstallerCommandValid = verifyInstallerCommandValid;
    async function verifyInstallerCommandInSync(installCommand, packageFolder, log) {
        const packageInfo = await PackageHelpers.getPackageInfo(packageFolder);
        if (!packageInfo) {
            throw new errors_1.GracefulError(`No package info found for ${packageFolder}`);
        }
        try {
            assert.deepStrictEqual(installCommand, packageInfo.installCommand);
        }
        catch (e) {
            if (e instanceof assert.AssertionError) {
                const msg = `Install command submitted does not match value in package.tirex.json. Please check the submitted handoff.json and ensure it matches the value in package.tirex.json`;
                logMessage(log.userLogger.error, msg);
                throw new errors_1.GracefulError('Install command not in sync');
            }
            else {
                throw e;
            }
        }
    }
    VerificationHelpers.verifyInstallerCommandInSync = verifyInstallerCommandInSync;
})(VerificationHelpers || (exports.VerificationHelpers = VerificationHelpers = {}));
function logMessage(logMethod, message) {
    logMethod(message, ['handoff']);
}
