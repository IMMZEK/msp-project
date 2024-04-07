"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Installer = void 0;
const Q = require("q");
const logger = require("../logger");
const util = require("../../util/util");
const userMessages = require("./user_messages");
const config = require("../config");
const db_1 = require("./db");
const install_dpinst_1 = require("./install_dpinst");
const remote_server_1 = require("./remote_server");
function isNonEmpty(files) {
    return 0 !== files.files.length || 0 !== files.drivers.length;
}
class Installer {
    constructor(cloudAgentInstallerServerURL, options) {
        this.driverInstaller = new install_dpinst_1.DriverInstaller(options);
        this.remoteServer = new remote_server_1.RemoteServer(cloudAgentInstallerServerURL);
        this.db = new db_1.DB(config.userDataRoot, config.loadersRoot);
    }
    // Full target support based on a ccxml file
    installFilesForCcxml(ccxmlFilePath, os) {
        const loader = "dslite";
        const fetchFunction = () => this.remoteServer.getSupportingFiles(ccxmlFilePath, os);
        return this.installFiles(fetchFunction, os)
            .thenResolve(loader);
    }
    installFilesForCategories(categories, os) {
        return this.installFiles(() => this.remoteServer.getFilesByCategory(categories, null, os), os);
    }
    areFilesMissing(categories) {
        return this.getMissingFiles(() => this.remoteServer.getFilesByCategory(categories))
            .then(isNonEmpty);
    }
    fetchClosestVersion(date) {
        return this.remoteServer.fetchClosestVersion(date);
    }
    // Generates an install based on a cloud instance
    // If version is undefined, the current stable version is used
    // If categories is undefined, all categories are fetched
    // If os is undefined, the current OS's files are fetched
    generateDesktopInstall(categories, version, os) {
        return this.remoteServer.generateDesktopDB(version, os)
            .then(() => {
            return this.installFiles(() => {
                return this.remoteServer.getFilesByCategory(categories, version, os);
            }, os);
        });
    }
    purge() {
        if (!config.desktopMode) {
            this.db.purge();
        }
        return Q();
    }
    getMissingFiles(fetchInstallInfo) {
        if (config.desktopMode) {
            return Q({
                files: [],
                drivers: [],
            });
        }
        // fetch the list of files needed from the server
        return fetchInstallInfo()
            .then((installInfo) => {
            // Use the database cache to determine what files we don't already have
            return {
                files: this.db.getFilesToInstall(installInfo.files),
                drivers: this.db.registrationNeeded(installInfo.drivers),
            };
        });
    }
    installFiles(fetchInstallInfo, os) {
        // keep an outer promise so we can pump out notify messages
        const deferred = Q.defer();
        this.getMissingFiles(fetchInstallInfo)
            .then((result) => {
            // Install missing files
            if (isNonEmpty(result)) {
                // target is supported so we can begin the installation process
                deferred.notify({
                    message: userMessages.beginInstallation(),
                    isFirstUpdate: true,
                });
                return this.remoteServer.downloadFiles(result.files, os)
                    .progress((progressData) => {
                    deferred.notify(progressData);
                })
                    .then(() => {
                    // Add the newly installed files to the database
                    this.db.filesInstalled(result.files);
                    // Determine if there are drivers we need to register
                    if (0 !== result.drivers.length && (util.isWin || os === "win")) {
                        deferred.notify({
                            message: userMessages.installingWinDriver(result.drivers.join(", ")),
                        });
                        return this.driverInstaller.install(result.drivers)
                            .then(() => {
                            return this.db.driverRegistered(result.drivers);
                        });
                    }
                    return Q();
                })
                    .finally(() => {
                    deferred.notify({
                        message: userMessages.endInstallation(),
                        isComplete: true,
                    });
                });
            }
            return Q();
        })
            .then(() => {
            // all components installed successfully
            deferred.resolve();
        })
            .catch((err) => {
            // Something went wrong
            logger.info(err.stack ? err.stack : err);
            deferred.reject({
                message: userMessages.installationFailed(err),
            });
        })
            .done();
        return deferred.promise;
    }
}
exports.Installer = Installer;
