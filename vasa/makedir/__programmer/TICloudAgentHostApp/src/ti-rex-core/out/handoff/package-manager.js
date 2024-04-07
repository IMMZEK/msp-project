"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageManager = void 0;
// 3rd party
const fs = require("fs-extra");
const path = require("path");
const PQueue = require("p-queue");
const util_1 = require("util");
const path_helpers_1 = require("../shared/path-helpers");
const util_2 = require("./util");
const verification_helpers_1 = require("./verification-helpers");
const errors_1 = require("../shared/errors");
const fsutils_1 = require("../utils/fsutils");
// Promisefied methods
const getUniqueFolderPath = (0, util_1.promisify)(path_helpers_1.PathHelpers.getUniqueFolderPath);
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Manages packages in a content folder.
 *
 */
class PackageManager {
    packageFile;
    contentFolder;
    zipsFolder;
    updateQueue = new PQueue({ concurrency: 1 });
    /**
     * Note: All paths are absolute.
     *
     * @param packageManagerFile - i.e tirex.json
     * @param contentFolder
     * @param zipsFolder
     */
    constructor(packageManagerFile, contentFolder, zipsFolder) {
        this.packageFile = packageManagerFile;
        this.contentFolder = contentFolder;
        this.zipsFolder = zipsFolder;
    }
    ///////////////////////////////////////////////////////////////////////////
    // Public Functions
    ///////////////////////////////////////////////////////////////////////////
    getEntryFromPackagesFile(args) {
        return this.updateQueue.add(() => this.getEntryFromPackagesFileInner(args));
    }
    // Note: we have a 2 phase approach. First you do the stage step, then perform the action (the commit step).
    // This way you can perform processing between the stage and commit steps.
    // Also if you crash at any point before finishing the commit we can recover.
    /**
     * Stage the package for adding (may be a new package or replace an existing package).
     * Note: you cannot stage a package that is already staged.
     *
     * @param args
     *  @param args.entry - The entry to stage.
     *  @param args.log
     *
     * @returns stagedEntry
     */
    stagePackagesFileAndBackupOldAssets(args) {
        return this.updateQueue.add(() => this.stagePackagesFileAndBackupOldAssetsInner(args).then(({ entry }) => entry));
    }
    updatePackagesFileAndRemoveOldAssets(args) {
        return this.updateQueue.add(() => this.updatePackagesFileAndRemoveOldAssetsInner(args).then(({ entry }) => entry));
    }
    /**
     * Revert the entry to the backup.
     * Returns an error if the package is not staged.
     * Returns null if there is no valid backup to revert to
     *
     * @param args
     *
     * @returns originalEntry or null
     */
    stageRollbackPackage(args) {
        return this.updateQueue.add(() => this.stageRollbackPackageInner(args));
    }
    rollbackPackage(args) {
        return this.updateQueue.add(() => this.rollbackPackageInner(args));
    }
    /**
     * Stage a delete. Only marks the package as to be deleted at this point.
     *
     * @param args
     *  @param args.id
     *  @param args.version - specify 'all' for version to delete all versions
     *  @param args.log
     */
    stageDeletePackage(args) {
        return this.updateQueue.add(() => this.stageDeletePackageInner(args));
    }
    deletePackage(args) {
        return this.updateQueue.add(() => this.deletePackageInner(args));
    }
    getPackageEntries(log) {
        return this.updateQueue.add(async () => {
            const { packages } = await this.getPackagesFileData(log);
            return packages;
        });
    }
    getDeleteEntries(id, version, log) {
        return this.updateQueue.add(() => this.getDeleteEntriesInner(id, version, log));
    }
    async initPackagesFiles() {
        const packagesFileExits = await fs.pathExists(this.packageFile);
        if (!packagesFileExits) {
            await fs.outputJson(this.packageFile, { packages: [] });
        }
    }
    // For test purposes only
    _stagePackagesFileAndBackupAssets(args) {
        return this.updateQueue.add(() => this.stagePackagesFileAndBackupOldAssetsInner(args));
    }
    _updatePackagesFileAndRemoveOldAssets(args) {
        return this.updateQueue.add(() => this.updatePackagesFileAndRemoveOldAssetsInner(args));
    }
    ///////////////////////////////////////////////////////////////////////////////
    // Private Functions
    ///////////////////////////////////////////////////////////////////////////////
    async getEntryFromPackagesFileInner({ id, version, log }) {
        const targetId = id;
        const targetVersion = version;
        const { packages } = await this.getPackagesFileData(log);
        const packageEntryIdx = packages.findIndex(({ id, version }) => {
            return id === targetId && version === targetVersion;
        });
        return {
            entry: packageEntryIdx > -1 ? packages[packageEntryIdx] : null,
            idx: packageEntryIdx
        };
    }
    async stagePackagesFileAndBackupOldAssetsInner({ entry, log }) {
        /**
         * Put the backup zips in a 'zips' subfolder
         * Put the backup content in a 'content' subfolder
         * We do this incase there is an overlap in the paths and the content / zips merge
         *
         * @param oldEntry
         * @param backupFolder
         *
         * @returns result
         */
        const backupZipsAndContent = async (oldEntry, backupFolder) => {
            if (!oldEntry) {
                return null;
            }
            // Ignore errors for moving content / zips to backup locations
            // The content / zips may not exist anymore for the oldEntry (manually moved / deleted)
            const { content, zips } = oldEntry;
            const [contentBackups, zipBackups] = await Promise.all([
                Promise.all(content.map(async (item) => {
                    if (!backupFolder) {
                        throw new Error('No backup folder');
                    }
                    const contentItem = path.join(this.contentFolder, item);
                    const backup = path.join(backupFolder, 'content', item);
                    if (await fs.pathExists(contentItem)) {
                        await fs.move(contentItem, backup);
                    }
                    return backup;
                })),
                Promise.all(zips.map(async (item) => {
                    if (!backupFolder) {
                        throw new Error('No backup folder');
                    }
                    const zipItem = path.join(this.zipsFolder, item);
                    const backup = path.join(backupFolder, 'zips', item);
                    if (await fs.pathExists(zipItem)) {
                        await fs.move(zipItem, backup);
                    }
                    return backup;
                }))
            ]);
            return {
                content: contentBackups.map((pkg) => {
                    return path_helpers_1.PathHelpers.getRelativePath(pkg, this.contentFolder);
                }),
                zips: zipBackups.map((zip) => {
                    const relZipFolder = path_helpers_1.PathHelpers.getRelativePath(path.dirname(zip), this.contentFolder);
                    return path.join(relZipFolder, path.basename(zip));
                })
            };
        };
        // Function body
        // Fetch the oldEntry
        const { entry: oldEntry, idx } = await this.getEntryFromPackagesFileInner({
            id: entry.id,
            version: entry.version,
            log
        });
        if (oldEntry && oldEntry.state === "staged" /* PackageEntryState.STAGED */) {
            const msg = 'Trying to stage an already staged package';
            logMessage(log.debugLogger.error, msg);
            throw new errors_1.GracefulError(msg);
        }
        // Stage before making fs changes
        if (oldEntry) {
            await this.updatePackagesFileWithPlaceholderEntry(oldEntry, log);
        }
        // Backup the old content & zips
        const backupFolder = oldEntry && (await getUniqueFolderPath(path.join(this.contentFolder, 'backup')));
        const backup = await backupZipsAndContent(oldEntry, backupFolder);
        const stagedEntry = {
            ...entry,
            state: "staged" /* PackageEntryState.STAGED */,
            backupContent: backup ? backup.content : [],
            backupZips: backup ? backup.zips : [],
            backupFolder: backupFolder
                ? path_helpers_1.PathHelpers.getRelativePath(backupFolder, this.contentFolder)
                : '',
            backupEntry: {
                email: oldEntry ? oldEntry.email : '',
                submissionId: oldEntry ? oldEntry.submissionId : '',
                showEntry: oldEntry ? oldEntry.showEntry : true
            }
        };
        // Update the list of packages with the staged entry
        const { packages } = await this.getPackagesFileData(log);
        const pkgsToWrite = this.updatePackageEntries(stagedEntry, idx, packages);
        // logMessage(
        //     log.debugLogger.info,
        //     `Writing to package-manager file ${JSON.stringify(pkgsToWrite)}`
        // );
        await fs.writeJson(this.packageFile, {
            packages: pkgsToWrite
        }, { spaces: 1 });
        return { entry: stagedEntry, oldEntry };
    }
    async stageRollbackPackageInner({ id, version, submissionId, log }) {
        const { entry } = await this.getEntryFromPackagesFileInner({ id, version, log });
        if (!entry || entry.state !== "staged" /* PackageEntryState.STAGED */) {
            const msg = `Trying to rollback an entry which is not staged ${JSON.stringify(entry)}`;
            throw new Error(msg);
        }
        else if (entry.submissionId !== submissionId) {
            const msg = `Submission Id does not match package manager file entry ${entry.submissionId}`;
            throw new Error(msg);
        }
        let deletePackage = true;
        if (entry.backupContent.length > 0) {
            // Figure out if there's a valid backup to revert to (need at least 1 backup content folder)
            const backupZips = entry.backupZips.map((item) => path.join(this.contentFolder, item));
            const backupContent = entry.backupContent.map((item) => path.join(this.contentFolder, item));
            const backupItems = backupZips.concat(backupContent);
            await (0, util_2.ignoreError)(async () => {
                await verification_helpers_1.VerificationHelpers.verifyItemsExist(backupItems);
                deletePackage = false;
            });
        }
        const backupFolder = entry.backupFolder;
        if (deletePackage) {
            return null;
        }
        else {
            const prevContent = entry.backupContent.map((content) => rollbackGetContentDst(content, backupFolder));
            const prevZips = entry.backupZips.map((zip) => rollbackGetZipDst(zip, backupFolder));
            // Remove the staged content + zips
            // Ignore remove errors as they may not be on the fs
            await Promise.all([
                Promise.all(entry.content.map((content) => fs.remove(path.join(this.contentFolder, content)))),
                Promise.all(entry.zips.map((zip) => fs.remove(path.join(this.zipsFolder, zip))))
            ]);
            await (0, fsutils_1.removeEmptyDirs)(this.zipsFolder); // keep the folder clean
            // Stage before making fs changes
            const stagedEntry = await this.updatePackagesFileWithPlaceholderEntry({
                ...entry,
                ...entry.backupEntry,
                content: prevContent,
                zips: prevZips
            }, log);
            // Move the backup to its original location
            await Promise.all([
                Promise.all(entry.backupContent.map((content) => fs.move(path.join(this.contentFolder, content), path.join(this.contentFolder, rollbackGetContentDst(content, backupFolder))))),
                Promise.all(entry.backupZips.map((zip) => fs.move(path.join(this.contentFolder, zip), path.join(this.zipsFolder, rollbackGetZipDst(zip, backupFolder)))))
            ]);
            // Remove the residual backup folder
            await fs.remove(path.join(this.contentFolder, entry.backupFolder));
            return stagedEntry;
        }
    }
    async rollbackPackageInner({ entry, log }) {
        return this.updatePackagesFileAndRemoveOldAssetsInner({ entry, log, keepItems: true });
    }
    async stageDeletePackageInner({ id, version, log }) {
        const entries = await this.getDeleteEntriesInner(id, version, log);
        if (!entries) {
            const logMsg = `Package does not exist on the server. Please ensure you have specified the correct package id and version to delete (received id: ${id}, version: ${version})`;
            logMessage(log.userLogger.error, logMsg);
            throw new errors_1.GracefulError(`No entry with ${id} ${version} exists`);
        }
        for (const entry of entries) {
            await this.updatePackagesFileWithPlaceholderEntry(entry, log);
        }
    }
    async deletePackageInner({ id, version, log }) {
        const entries = await this.getDeleteEntriesInner(id, version, log);
        if (!entries) {
            throw new Error('No entries');
        }
        let { packages } = await this.getPackagesFileData(log);
        for (const entry of entries) {
            const { content, zips } = entry;
            await Promise.all([
                Promise.all(content.map((item) => fs.remove(path.join(this.contentFolder, item)))),
                Promise.all(zips.map((item) => fs.remove(path.join(this.zipsFolder, item))))
            ]);
            packages = packages.filter((pkg) => pkg.id !== entry.id || pkg.version !== entry.version);
        }
        // logMessage(
        //     log.debugLogger.info,
        //     `Writing to package-manager file ${JSON.stringify(packages)}`
        // );
        await fs.writeJSON(this.packageFile, {
            packages
        }, { spaces: 1 });
        return entries[0];
    }
    /**
     * Update the package entry and it's content / zips (it may be a new entry).
     * By default this will:
     *    Update the package entry.
     *    If the entry already existed & it is staged delete the backup content / zips. Also make it valid
     *    If it isn't staged delete the content / zips.
     *
     * @param args
     *  @param args.entry
     *  @param args.log
     *  @param args.deletePackage - If true, delete the package entry along with it's content / zips.
     *  @param args.keepItems  - If true, don't delete the content / zips.
     *  @param args.allowValid - If true, allow updating an entry which is already valid
     *
     * @returns result
     */
    async updatePackagesFileAndRemoveOldAssetsInner({ entry, log, deletePackage = false, keepItems = false, allowValid = false }) {
        const removeOldContentAndZips = async (oldEntry) => {
            if (!oldEntry || keepItems) {
                return;
            }
            // Ignore the errors for fs.remove (i.e if one item contains another then
            // we try to delete it twice) or if it was manually deleted.
            if (oldEntry.state === "staged" /* PackageEntryState.STAGED */ && !deletePackage) {
                if (oldEntry.backupFolder) {
                    await fs.remove(path.join(this.contentFolder, oldEntry.backupFolder));
                }
            }
            else {
                const { content, zips } = oldEntry;
                await Promise.all([
                    Promise.all(content.map((item) => fs.remove(path.join(this.contentFolder, item)))),
                    Promise.all(zips.map((item) => fs.remove(path.join(this.zipsFolder, item))))
                ]);
            }
        };
        const updatePackagesFile = async (entry, idx) => {
            let entryToWrite = entry;
            if (entry.state === "staged" /* PackageEntryState.STAGED */ || allowValid) {
                entryToWrite = {
                    id: entry.id,
                    version: entry.version,
                    content: entry.content,
                    zips: entry.zips,
                    submissionId: entry.submissionId,
                    email: entry.email,
                    showEntry: entry.showEntry,
                    state: "valid" /* PackageEntryState.VALID */
                };
            }
            const { packages } = await this.getPackagesFileData(log);
            const pkgsToWrite = this.updatePackageEntries(entryToWrite, idx, packages, deletePackage);
            // logMessage(
            //     log.debugLogger.info,
            //     `Writing to package-manager file ${JSON.stringify(pkgsToWrite)}`
            // );
            await fs.writeJson(this.packageFile, {
                packages: pkgsToWrite
            }, { spaces: 1 });
            return entryToWrite;
        };
        // Function body
        const { entry: oldEntry, idx } = await this.getEntryFromPackagesFileInner({
            id: entry.id,
            version: entry.version,
            log
        });
        await removeOldContentAndZips(oldEntry);
        const newEntry = await updatePackagesFile(entry, idx);
        return { oldEntry, entry: newEntry };
    }
    async getPackagesFileData(_log) {
        const data = (await PackageManager.readJson(this.packageFile));
        // logMessage(log.debugLogger.info, `Read package-manager-file ${JSON.stringify(data)}`);
        return data;
    }
    /**
     * Read json from the file. Handles the case where the file is empty.
     *
     * @param file
     * @param emptyValue - The value of the json if the file is empty.
     */
    static async readJson(file, emptyValue = []) {
        const data = await fs.readFile(file);
        const cleanData = data
            .toString()
            .replace(/(\r?\n|\r)/g, '')
            .trim();
        return cleanData.length > 0 ? JSON.parse(cleanData) : emptyValue;
    }
    /**
     * Update the list of packages with a placeholder entry
     * This way if we crash during fs manipulation we know
     * we're in a irrecoverable state and will delete the entry
     *
     * @param placeholderEntry
     *
     */
    async updatePackagesFileWithPlaceholderEntry(entry, log) {
        const { idx } = await this.getEntryFromPackagesFileInner({
            id: entry.id,
            version: entry.version,
            log
        });
        const { packages } = await this.getPackagesFileData(log);
        const placeholderEntry = {
            ...entry,
            state: "staged" /* PackageEntryState.STAGED */,
            backupContent: [],
            backupZips: [],
            backupFolder: '',
            backupEntry: {
                email: '',
                submissionId: '',
                showEntry: true
            }
        };
        const pkgsToWrite = this.updatePackageEntries(placeholderEntry, idx, packages);
        // logMessage(
        //     log.debugLogger.info,
        //     `Writing to package-manager file ${JSON.stringify(pkgsToWrite)}`
        // );
        await fs.writeJson(this.packageFile, {
            packages: pkgsToWrite
        }, { spaces: 1 });
        return placeholderEntry;
    }
    async getDeleteEntriesInner(id, version, log) {
        if (version !== 'all') {
            const { entry: entry2 } = await this.getEntryFromPackagesFileInner({
                id,
                version,
                log
            });
            return entry2 ? [entry2] : null;
        }
        else {
            const targetId = id;
            const { packages } = await this.getPackagesFileData(log);
            const entries = packages.filter(({ id }) => {
                return id === targetId;
            });
            return entries.length > 0 ? entries : null;
        }
    }
    updatePackageEntries(entry, idx, packages, deletePackage = false) {
        packages = [...packages];
        if (idx > -1) {
            if (!deletePackage) {
                packages[idx] = entry;
            }
            else {
                packages.splice(idx, 1);
            }
        }
        else if (!deletePackage) {
            packages.push(entry);
        }
        return packages;
    }
}
exports.PackageManager = PackageManager;
function rollbackGetZipDst(backupZip, backupFolder) {
    const zipDstRel = path_helpers_1.PathHelpers.getRelativePath(path.dirname(backupZip), path.join(backupFolder, 'zips'));
    return path.join(zipDstRel, path.basename(backupZip));
}
function rollbackGetContentDst(backupContent, backupFolder) {
    return path_helpers_1.PathHelpers.getRelativePath(backupContent, path.join(backupFolder, 'content'));
}
function logMessage(logMethod, message) {
    logMethod(message, ['handoff']);
}
