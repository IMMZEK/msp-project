"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageManagerAdapter = void 0;
// 3rd party
const path = require("path");
const fs = require("fs-extra");
const path_helpers_1 = require("../shared/path-helpers");
const package_manager_1 = require("./package-manager");
const PackageHelpers = require("./package-helpers");
const verification_helpers_1 = require("./verification-helpers");
const create_package_entries_1 = require("./create-package-entries");
const overrides_manager_1 = require("./overrides-manager");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Wraps the PackageManager methods with handoff specific steps / logic
 * Note: the methods of this class always take / return absolute paths.
 *
 */
class PackageManagerAdapter {
    contentFolder;
    zipsFolder;
    packageManager;
    overridesManager;
    constructor({ packageManagerFile, contentFolder, zipsFolder, overridesDir }) {
        this.contentFolder = contentFolder;
        this.zipsFolder = zipsFolder;
        this.packageManager = new package_manager_1.PackageManager(packageManagerFile, this.contentFolder, this.zipsFolder);
        this.overridesManager = new overrides_manager_1.OverridesManager(overridesDir);
    }
    ///////////////////////////////////////////////////////////////////////////////
    /// Public Methods
    ///////////////////////////////////////////////////////////////////////////////
    /**
     * Stage the package.
     *
     * 1. Get the packageInfo and see if the entry exists
     * 2. If no old entry, ensure the content & zips do not exist already
     * 3. Stage packages file and backup old assets
     * 4. Move the content & zips from extract/download folders to final destination
     *
     */
    async stageAddPackage({ packageFolders, zips, submissionId, email, downloadFolder, extractFolder, showEntry, log, isNonTirexPackage = false }) {
        // Get the packageInfo and see if the entry exists
        let packageInfo = null;
        if (isNonTirexPackage && packageFolders.length === 1) {
            packageInfo = PackageHelpers.getPlaceholderPackageInfo(packageFolders[0]);
        }
        else if (packageFolders.length > 0) {
            packageInfo = await PackageHelpers.getPackageInfo(packageFolders[0]);
        }
        if (!packageInfo) {
            throw new Error(`Invalid set of packageFolders ${packageFolders}`);
        }
        // Get the old entry
        const { entry: oldEntry } = await this.packageManager.getEntryFromPackagesFile({
            id: packageInfo.id,
            version: packageInfo.version,
            log
        });
        if (oldEntry) {
            const msg = `Replacing package ${packageInfo.id} version ${packageInfo.version}.`;
            logMessage(log.userLogger.info, msg);
        }
        else {
            const msg = `Adding package ${packageInfo.id} version ${packageInfo.version}.`;
            logMessage(log.userLogger.info, msg);
        }
        // Locations to stage content and zips
        const stageMappingZips = zips.map((src) => {
            const dst = path.join(this.zipsFolder, path_helpers_1.PathHelpers.getRelativePath(path.dirname(src), downloadFolder), path.basename(src));
            const relDst = path.join(path_helpers_1.PathHelpers.getRelativePath(path.dirname(dst), this.zipsFolder), path.basename(dst));
            return { src, dst, relDst };
        });
        const stageMappingPackageFolders = packageFolders.map((src) => {
            const dst = path.join(this.contentFolder, path_helpers_1.PathHelpers.getRelativePath(src, extractFolder));
            const relDst = path_helpers_1.PathHelpers.getRelativePath(dst, this.contentFolder);
            return { src, dst, relDst };
        });
        // If no old entry, ensure the content & zips do not exist already
        const oldEntryZipsNormalized = oldEntry
            ? oldEntry.zips.map((item) => path_helpers_1.PathHelpers.normalize(item))
            : [];
        const oldEntryContentNormalized = oldEntry
            ? oldEntry.content.map((item) => path_helpers_1.PathHelpers.normalize(item))
            : [];
        const items = stageMappingZips
            .filter((item) => !oldEntryZipsNormalized.includes(path_helpers_1.PathHelpers.normalize(item.relDst)))
            .map((zips) => zips.dst)
            .concat(stageMappingPackageFolders
            .filter((item) => !oldEntryContentNormalized.includes(path_helpers_1.PathHelpers.normalize(item.relDst)))
            .map((pkg) => pkg.dst));
        await log.handleErrorPromise(() => verification_helpers_1.VerificationHelpers.verifyItemsDoNotExist(items), {
            userMessage: `The items mentioned below already exist on the server. Check that the zip file and package folder are named appropriately.`
        });
        // Stage packages file and backup old assets
        const stagedEntry = await this.packageManager.stagePackagesFileAndBackupOldAssets({
            entry: {
                id: packageInfo.id,
                version: packageInfo.version,
                content: stageMappingPackageFolders.map((mapping) => mapping.relDst),
                zips: stageMappingZips.map((mapping) => mapping.relDst),
                submissionId,
                email,
                state: "valid" /* util.PackageEntryState.VALID */,
                showEntry
            },
            log
        });
        // Move the content & zips from extract/download folders to final destination
        await Promise.all(stageMappingZips
            .concat(stageMappingPackageFolders)
            .map(({ src, dst }) => fs.move(src, dst)));
        return stagedEntry;
    }
    async addPackage({ entry, log }) {
        // Create the entry
        const { id, version, content, zips, submissionId, email, showEntry } = entry;
        const entryValid = {
            id,
            version,
            content,
            zips,
            submissionId,
            email,
            state: "valid" /* util.PackageEntryState.VALID */,
            showEntry
        };
        // Sync overrides file
        await Promise.all(content.map((contentItem) => this.overridesManager.updateOverridesFile(contentItem, showEntry)));
        // Add the entry
        return this.packageManager.updatePackagesFileAndRemoveOldAssets({ entry: entryValid, log });
    }
    async stageRemovePackage({ packageInfo, log }) {
        await this.packageManager.stageDeletePackage({
            id: packageInfo.id,
            version: packageInfo.version,
            log
        });
    }
    /**
     * Remove the package.
     *
     * @param args
     *  @param args.packageInfo
     *  @param args.log
     *  @param args.refreshLog
     *  @param args.submissionId
     *
     * @returns {Promise} deletedPackageEntry or null if we didn't delete it
     */
    async removePackage({ packageInfo, log, processingSuccess }) {
        // Note we don't call this.packageManager deletePackage, instead we call
        // this.packageManager.updatePackagesFileAndRemoveOldAssets directly.
        // We do this since we need to handle processingSuccess, and
        // version for delete (which may result in multiple entries)
        const entries = await this.packageManager.getDeleteEntries(packageInfo.id, packageInfo.version, log);
        if (!entries) {
            throw new Error(`No entries for package ${packageInfo}`);
        }
        const result = await Promise.all(entries.map(async (entry) => {
            await Promise.all(entry.content.map((contentItem) => this.overridesManager.updateOverridesFile(contentItem, processingSuccess ? true : entry.showEntry)));
            return this.packageManager.updatePackagesFileAndRemoveOldAssets({
                entry,
                log,
                deletePackage: processingSuccess
            });
        }));
        return processingSuccess ? result : null;
    }
    async stageRollbackPackage({ entry, log }) {
        const stagedEntry = await this.packageManager.stageRollbackPackage({
            id: entry.id,
            version: entry.version,
            submissionId: entry.submissionId,
            log
        });
        if (!stagedEntry) {
            await this.packageManager.stageDeletePackage({
                id: entry.id,
                version: entry.version,
                log
            });
        }
        const request = stagedEntry && stagedEntry.showEntry ? 'add' : 'remove';
        return { request, stagedEntry };
    }
    async rollbackPackage({ entry, stagedEntry, log, processingSuccess }) {
        if (!processingSuccess) {
            throw new Error('Package failed processing');
        }
        if (stagedEntry) {
            await Promise.all(stagedEntry.content.map((item) => this.overridesManager.updateOverridesFile(item, stagedEntry.showEntry)));
            await this.packageManager.rollbackPackage({ entry: stagedEntry, log });
        }
        else {
            await Promise.all(entry.content.map((item) => this.overridesManager.updateOverridesFile(item, true)));
            await this.packageManager.deletePackage({ id: entry.id, version: entry.version, log });
        }
    }
    /**
     * Cleanup the submission after we are done with it.
     *
     * @param args
     *  @param args.downloadFolder
     *  @param args.extractFolder
     *
     * @returns {Promise} void
     */
    async cleanupPackageSubmission({ downloadFolder, extractFolder }) {
        await Promise.all([extractFolder, downloadFolder].map((item) => item ? fs.remove(item) : Promise.resolve()));
    }
    /**
     * Scan the content folder for any packages which we do not know about
     *
     * @returns {Promise} newEntries
     */
    async scanPackages(log) {
        await this.packageManager.initPackagesFiles();
        const { packageFolders, nonPackageFolders } = await PackageHelpers.getPackageFolders(path_helpers_1.PathHelpers.normalize(this.contentFolder));
        const allEntries = await this.packageManager.getPackageEntries(log);
        const newEntires = await (0, create_package_entries_1.createPackageEntries)({
            entries: allEntries,
            packageFolders,
            nonPackageFolders,
            contentFolder: this.contentFolder,
            zipsFolder: this.zipsFolder,
            overridesDir: this.overridesManager.getOverridesDir()
        });
        const deleteEntries = (await Promise.all(allEntries.map(async (entry) => {
            const pathExists = (await Promise.all(entry.content.map((item) => fs.pathExists(path.join(this.contentFolder, item))))).reduce((accum, curr) => accum || curr, false);
            return {
                keepEntry: pathExists || entry.state === "staged" /* util.PackageEntryState.STAGED */,
                entry
            };
        })))
            .filter((item) => !item.keepEntry)
            .map((item) => item.entry);
        return { newEntires, deleteEntries };
    }
    /**
     * Import the set of packages. Note no processing is done on the packages
     *
     * @param items
     * @param log
     *
     * @returns {Promise} void
     */
    async importPackages(items, log) {
        await Promise.all(items.map((item) => this.packageManager.updatePackagesFileAndRemoveOldAssets({
            entry: item,
            log,
            allowValid: true,
            keepItems: true
        })));
    }
    async getPackageEntry(id, version, log) {
        const { entry } = await this.packageManager.getEntryFromPackagesFile({ id, version, log });
        return entry;
    }
    async getStagedEntries(log) {
        const entries = await this.packageManager.getPackageEntries(log);
        return entries.filter((entry) => entry.state === "staged" /* util.PackageEntryState.STAGED */);
    }
    getAllEntries(log) {
        return this.packageManager.getPackageEntries(log);
    }
    // For test purposes only
    _getPackageManager() {
        return this.packageManager;
    }
}
exports.PackageManagerAdapter = PackageManagerAdapter;
function logMessage(logMethod, message) {
    logMethod(message, ['handoff']);
}
