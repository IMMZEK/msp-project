"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineMetadataManager = void 0;
// native modules
const fs = require("fs-extra");
const path = require("path");
// 3rd party modules
const PQueue = require("p-queue");
const rexdb_split_1 = require("../rexdb/lib/rexdb-split");
const rexdb_1 = require("../rexdb/lib/rexdb");
const util_1 = require("./util");
const offline_product_tree_1 = require("./offline-metadata-internal/offline-product-tree");
const offline_package_metadata_1 = require("./offline-metadata-internal/offline-package-metadata");
const remove_package_metadata_1 = require("./offline-metadata-internal/remove-package-metadata");
const get_installed_packages_1 = require("./offline-metadata-internal/get-installed-packages");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * This class is responsible for managing the rex3 local database content
 *  - querying for what packages are local
 *  - detecting and removing database entries for removed packages
 *  - downloading new database content and updating the existing .db files when requested
 */
class OfflineMetadataManager {
    commonParams;
    databaseQueue = new PQueue({ concurrency: 1 });
    dbDevices;
    dbDevtools;
    dbResources;
    dbOverviews;
    dbPureBundles;
    constructor(commonParams) {
        this.commonParams = commonParams;
        const dbPath = this.commonParams.rex3Config.dbPath;
        fs.ensureDirSync(dbPath);
        this.dbDevices = new rexdb_1.RexDB(this.commonParams.logger, path.join(dbPath, 'devices.db'));
        this.dbDevtools = new rexdb_1.RexDB(this.commonParams.logger, path.join(dbPath, 'devtools.db'));
        this.dbResources = new rexdb_split_1.RexDBSplit(this.commonParams.logger, path.join(dbPath, 'resources.db'));
        this.dbOverviews = new rexdb_1.RexDB(this.commonParams.logger, path.join(dbPath, 'overviews.db'));
        this.dbPureBundles = new rexdb_1.RexDB(this.commonParams.logger, path.join(dbPath, 'bundles.db'));
    }
    /**
     *  Return package infos for all installed (offlined) packages based on dbOverviews
     */
    async getInstalledPackages() {
        return this.databaseQueue.add(() => (0, get_installed_packages_1.getInstalledPackagesNoQ)(this.dbOverviews));
    }
    /**
     * Queue up fetching the metadata of a software package and insertiing it into the offline DB.
     * Update the offline product tree (devices and devtools DB) if needed.
     * Send event that packages were updated.
     */
    async offlinePackageMetadata(packagePublicUid, installPackageFolder, onProgressUpdate, ignorePackageNotOnServer = false) {
        this.commonParams.logger.info(`start offlinePackageMetadata of package ${packagePublicUid}`);
        onProgressUpdate({
            progressType: "Indefinite" /* ProgressType.INDEFINITE */,
            name: 'Updating metadata'
        });
        const defaultInstallPath = this.commonParams.rex3Config.contentPath; // typically c:\ti or ~/ti
        const rex3Server = this.commonParams.rex3Config.remoteserverHost;
        const productTreeTempDirs = await (0, util_1.makeTempDirs)(defaultInstallPath, 'product-tree');
        const packageMetadataTempDirs = await (0, util_1.makeTempDirs)(defaultInstallPath, 'package-metadata');
        try {
            const dst = await (0, offline_package_metadata_1.downloadAndExtractPackageMetadata)(packagePublicUid, packageMetadataTempDirs, onProgressUpdate, rex3Server);
            await this.databaseQueue.add(async () => {
                // update product tree if needed
                this.commonParams.logger.info(`updateOfflineProductTree`);
                await (0, offline_product_tree_1.offlineProductTreeNoQ)({
                    dbDevices: this.dbDevices,
                    dbDevtools: this.dbDevtools,
                    rex3Server,
                    tempDirs: productTreeTempDirs,
                    installLocation: defaultInstallPath,
                    onProgressUpdate
                });
            });
            await this.databaseQueue.add(async () => {
                // fetch package metadata
                this.commonParams.logger.info(`offlinePackageMetadata: ${packagePublicUid}`);
                await (0, offline_package_metadata_1.offlinePackageMetadataNoQ)({
                    packagePublicUid,
                    dbResources: this.dbResources,
                    dbOverviews: this.dbOverviews,
                    dbPureBundles: this.dbPureBundles,
                    installPackageFolder,
                    onProgressUpdate,
                    rex3Server,
                    dstPath: dst
                });
                this.commonParams.logger.info(`done offlinePackageMetadata: ${packagePublicUid}`);
            });
        }
        catch (err) {
            if (ignorePackageNotOnServer &&
                err.message &&
                err.message.includes(`Bundle ${packagePublicUid} not found`)) {
                this.commonParams.logger.info(`offlinePackageMetadata: Ignoring that ${packagePublicUid} was not found on the remote server because it was removed or is not a tirex package`);
            }
            else {
                throw err;
            }
        }
        finally {
            try {
                onProgressUpdate({ progressType: "Indefinite" /* ProgressType.INDEFINITE */, name: 'Cleaning up' });
            }
            catch (e) {
                this.commonParams.logger.error('ignoring progress exception in finally: ' + e.message);
            }
            await Promise.all([
                (0, util_1.removeTempDirs)(productTreeTempDirs),
                (0, util_1.removeTempDirs)(packageMetadataTempDirs)
            ]);
        }
    }
    /**
     *  Queue up removing the offline metadata of a software package.
     *  Send event that packages were updated.
     */
    async removePackageMetadata(packagePublicUid, onProgressUpdate) {
        await this.databaseQueue.add(async () => {
            await (0, remove_package_metadata_1.removePackageMetadataNoQ)(packagePublicUid, this.dbResources, this.dbOverviews, this.dbPureBundles, onProgressUpdate);
        });
    }
}
exports.OfflineMetadataManager = OfflineMetadataManager;
