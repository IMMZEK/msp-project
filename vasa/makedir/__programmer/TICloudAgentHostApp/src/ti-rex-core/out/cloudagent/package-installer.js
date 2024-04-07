"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageInstaller = void 0;
// native modules
const path = require("path");
// 3rd party
const fs = require("fs-extra");
const index_1 = require("../3rd_party/merge-dirs/src/index");
// our modules
const response_data_1 = require("../shared/routes/response-data");
const PackageHelpers = require("../handoff/package-helpers");
const util_1 = require("./util");
const util_2 = require("../handoff/util");
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
const ccs_adapter_1 = require("./ccs-adapter");
const counter_1 = require("../frontend/component-helpers/counter");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * This class is responsible for managing the file content of packages (ie stuff installed to c:\ti)
 *  - installing/uninstalling package content
 *  - notifying the rest of the system that content was added/removed
 */
class PackageInstaller {
    commonParams;
    progressManager;
    ccsAdapter;
    activeItems = {};
    notifyIDECounter = new counter_1.Counter();
    constructor(commonParams, progressManager, ccsAdapter) {
        this.commonParams = commonParams;
        this.progressManager = progressManager;
        this.ccsAdapter = ccsAdapter;
    }
    async installPackage(pkg, installLocation) {
        const item = this.activeItems[pkg.packagePublicUid];
        if (item) {
            if (item.action === 'install') {
                this.commonParams.logger.info('Received install request for package we are already installing ' +
                    pkg.packagePublicUid);
                return item.progressId;
            }
            else if (item.action === 'uninstall') {
                throw new Error('Trying to install a package being uninstalled ' + pkg.packagePublicUid);
            }
        }
        const { registerTask, onProgressUpdate } = this.progressManager.createProgressTask({
            progressType: "Indefinite" /* ProgressType.INDEFINITE */
        }, `Installing ${pkg.name} version ${pkg.packageVersion}`);
        const progressId = registerTask(this.doInstallPackage(pkg.packagePublicUid, installLocation, onProgressUpdate).then(() => this.cleanupActiveItem(pkg), (err) => {
            this.cleanupActiveItem(pkg);
            throw err;
        }));
        this.activeItems[pkg.packagePublicUid] = { action: 'install', progressId };
        return progressId;
    }
    async uninstallPackage(pkg) {
        const item = this.activeItems[pkg.packagePublicUid];
        if (item) {
            if (item.action === 'install') {
                throw new Error('Trying to uninstall a package being installed' + pkg.packagePublicUid);
            }
            else if (item.action === 'uninstall') {
                this.commonParams.logger.info('Received uninstall request for package we are already uninstalling ' +
                    pkg.packagePublicUid);
                return item.progressId;
            }
        }
        const { registerTask, onProgressUpdate } = this.progressManager.createProgressTask({
            progressType: "Indefinite" /* ProgressType.INDEFINITE */
        }, `Uninstalling ${pkg.name} version ${pkg.packageVersion}`);
        const progressId = registerTask(this.doUninstallPackage(pkg.packagePublicUid, onProgressUpdate).then(() => this.cleanupActiveItem(pkg), (err) => {
            this.cleanupActiveItem(pkg);
            throw err;
        }));
        this.activeItems[pkg.packagePublicUid] = { action: 'uninstall', progressId };
        return progressId;
    }
    ///////////////////////////////////////////////////////////////////////////////
    /// Private methods
    ///////////////////////////////////////////////////////////////////////////////
    /**
     * Queue a task that
     *  - download package (via tirex4) to specified install location
     *  - fetches its metadata (from tirex3) and add it to the tirex3 offline DB
     *  - notify CCS of the new package
     */
    async doInstallPackage(packagePublicUid, installLocation, onProgressUpdate) {
        const installTempDirs = await (0, util_1.makeTempDirs)(installLocation, 'install');
        try {
            await this.downloadAndExtractPackageFiles(packagePublicUid, installTempDirs, onProgressUpdate);
            await this.commonParams.desktopQueue.add(async () => {
                onProgressUpdate({
                    progressType: "Indefinite" /* ProgressType.INDEFINITE */,
                    name: 'Moving package to install location'
                });
                // Get all the package & nonPackageFolders
                const extractDir = installTempDirs.extractDir;
                const { packageFolders, nonPackageFolders } = await PackageHelpers.getPackageFolders(extractDir);
                const packageFoldersWithInfo = await Promise.all(packageFolders.map(async (item) => {
                    const info = await PackageHelpers.getPackageInfo(path.join(extractDir, item));
                    if (!info) {
                        throw new Error(`No package info ${item}`);
                    }
                    const uid = (0, dbBuilderUtils_1.formUid)(info.id, info.version);
                    return { item, uid };
                }));
                const nonPackageFoldersWithInfo = nonPackageFolders.map((item) => ({
                    item,
                    uid: null
                }));
                // Install
                const completedItems = [];
                let error = null;
                await Promise.all([...packageFoldersWithInfo, ...nonPackageFoldersWithInfo].map(async ({ item, uid }) => {
                    const extractItem = path.join(extractDir, item);
                    const installItem = path.join(installLocation, item);
                    try {
                        await fs.ensureDir(path.dirname(installItem));
                        onProgressUpdate({
                            name: 'Moving...',
                            subActivity: `Moving ${extractItem} to ${installItem}`,
                            progressType: "Indefinite" /* ProgressType.INDEFINITE */
                        });
                        await (0, index_1.mergeDirs)(extractItem, installItem);
                        completedItems.push({ item: installItem, uid });
                        this.commonParams.logger.info(`Installed item to ${installItem}`);
                    }
                    catch (err) {
                        this.commonParams.logger.error(`Error installing package ${packagePublicUid}`);
                        this.commonParams.logger.error(err);
                        error = (0, util_2.getCombinedError)(error, err);
                    }
                    if (error) {
                        throw error;
                    }
                }));
                try {
                    if (error) {
                        this.commonParams.logger.error(`Rolling back package ${packagePublicUid} after error`);
                        await Promise.all(completedItems.map(async ({ item }) => {
                            await fs.remove(item);
                        }));
                    }
                    else {
                        // Notify IDE, use a counter & wait until queue is empty.
                        // This way we avoid multiple updates from the IDE during install
                        this.notifyIDECounter.setValue();
                        const counterId = this.notifyIDECounter.getValue();
                        this.commonParams.desktopQueue
                            .onIdle()
                            .then(async () => {
                            if (counterId === this.notifyIDECounter.getValue()) {
                                if (this.ccsAdapter instanceof ccs_adapter_1.CCSAdapter) {
                                    await this.ccsAdapter.notifyIDEPackagesChanged();
                                }
                                else {
                                    await (0, util_1.removeTempDirs)(installTempDirs);
                                    await this.ccsAdapter.onPackagesChanged();
                                }
                            }
                        })
                            .catch((err) => {
                            console.error(err);
                        });
                    }
                }
                catch (err) {
                    error = (0, util_2.getCombinedError)(error, err);
                }
            });
        }
        finally {
            try {
                onProgressUpdate({ progressType: "Indefinite" /* ProgressType.INDEFINITE */, name: 'Cleaning up' });
            }
            catch (e) {
                this.commonParams.logger.error('ignoring progress exception in finally: ' + e.message);
            }
            try {
                await (0, util_1.removeTempDirs)(installTempDirs);
            }
            catch (e) {
                // Log error but don't throw. Some of the dirs might not be created
                // Depending when it was created
                this.commonParams.logger.error(e);
            }
        }
    }
    /**
     * Queue task that
     */
    async doUninstallPackage(packagePublicUid, onProgressUpdate) {
        await this.commonParams.desktopQueue.add(async () => {
            // Get packageData
            const installedPackages = await this.ccsAdapter.getInstalledPackages();
            const packageToUninstall = installedPackages.find((p) => p.packagePublicUid === packagePublicUid);
            if (!packageToUninstall) {
                throw new Error(`Package ${packagePublicUid} to be uninstalled does not exist`);
            }
            // Uninstall
            onProgressUpdate({
                progressType: "Indefinite" /* ProgressType.INDEFINITE */,
                name: 'Deleting package from install location'
            });
            await fs.remove(packageToUninstall.localPackagePath);
            if (this.ccsAdapter instanceof ccs_adapter_1.CCSAdapter) {
                await this.ccsAdapter.notifyIDEPackagesChanged();
            }
            else {
                await this.ccsAdapter.onPackagesChanged();
            }
        });
    }
    /**
     * Download and extract package zip files into temporary folders
     * The package zip is requested via tirex 4
     */
    async downloadAndExtractPackageFiles(packageUid, { downloadDir, extractDir }, onProgressUpdate) {
        const tirex4RemoteserverUrl = this.commonParams.vars.remoteserverUrl;
        // Generate the url to download the package from and download it
        const pkgs = await (0, util_1.doTirex4Request)(`${tirex4RemoteserverUrl}${"api/packages" /* RemoteserverAPI.GET_PACKAGES */}`);
        const pkg = pkgs.find((item) => item.packagePublicUid === packageUid);
        if (!pkg) {
            throw new Error(`${packageUid} not found`);
        }
        const downloadUrl = pkg.downloadUrl[(0, util_1.getPlatform)()];
        if (!downloadUrl) {
            throw new Error('platform not supported, missing downloadUrl');
        }
        const zip = await (0, util_2.downloadFile)(downloadUrl, downloadDir, onProgressUpdate);
        // Now extract or install the package zip / installer into a temporary extract folder
        const installCommand = pkg.installCommand && pkg.installCommand[(0, util_1.getPlatform)()];
        if (pkg.installCommand && !installCommand) {
            throw new Error('platform not supported, missing installCommand');
        }
        else if (installCommand) {
            const installLog = path.join(extractDir, 'install.log');
            await fs.outputFile(installLog, '');
            const installStream = fs.createWriteStream(installLog);
            let installCommandFinal = installCommand;
            if ((0, util_1.getPlatform)() === response_data_1.Platform.WINDOWS) {
                // Windows - installbuilder exits before install is done.
                // Wrap the installCommand in a bat file to workaround.
                await fs.outputFile(path.join(downloadDir, 'install-command.bat'), 'call ' + installCommand.replace('@install-location', '%1'));
                installCommandFinal = 'install-command.bat @install-location';
            }
            else if ((0, util_1.getPlatform)() === response_data_1.Platform.MACOS) {
                // OSX - Need to extract the .app folder first
                await (0, util_2.extract)(zip, downloadDir, onProgressUpdate);
            }
            else if ((0, util_1.getPlatform)() === response_data_1.Platform.LINUX) {
                // Set permissions (not needed on OSX since the zip will retain the permissions)
                await fs.chmod(zip, 0o775);
            }
            try {
                const items = await (0, util_2.install)(installCommandFinal, downloadDir, extractDir, onProgressUpdate, installStream);
                return items;
            }
            catch (e) {
                if (e instanceof Error) {
                    const dst = path.join(this.commonParams.rex3Config.logsDir, path.basename(installLog));
                    await fs.move(installLog, dst, { overwrite: true });
                    e.message = `Install failed, check ${dst}. ${e.message}`;
                    throw e;
                }
                else {
                    throw e;
                }
            }
        }
        else {
            const items = await (0, util_2.extract)(zip, extractDir, onProgressUpdate);
            return items;
        }
    }
    cleanupActiveItem(pkg) {
        delete this.activeItems[pkg.packagePublicUid];
    }
}
exports.PackageInstaller = PackageInstaller;
