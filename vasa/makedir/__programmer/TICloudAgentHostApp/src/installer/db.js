"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB = void 0;
const path = require("path");
const fs = require("fs");
const util = require("../../util/util");
const logger = require("../logger");
const env = process.env;
function readConfigFile(fileName) {
    try {
        return JSON.parse(fs.readFileSync(fileName, "utf8"));
    }
    catch (err) {
        logger.info("Could not open fileName: " + err);
    }
    return {};
}
class DB {
    constructor(userDir, loadersDir) {
        this.loadersDir = loadersDir;
        this.dbRoot = path.join(userDir, "db");
        if (!fs.existsSync(this.dbRoot)) {
            logger.info("Creating db dir : " + this.dbRoot);
            fs.mkdirSync(this.dbRoot);
        }
        this.installedFilesJsonFile = path.join(this.dbRoot, "installedFiles.json");
        this.installedDriversJsonFile = path.join(this.dbRoot, "installedDrivers.json");
        this.installedFiles = readConfigFile(this.installedFilesJsonFile);
        this.installedDrivers = readConfigFile(this.installedDriversJsonFile);
        if (util.isWin) {
            const allDBRoot = path.join(env.ALLUSERSPROFILE, "Texas Instruments", "TICloudAgent", "db");
            logger.info("allDBRoot: " + allDBRoot);
            const allInstalledDriversJsonFile = path.join(allDBRoot, "installedDrivers.json");
            const allInstalledDrivers = readConfigFile(allInstalledDriversJsonFile);
            const allInstalledFilesJsonFile = path.join(allDBRoot, "installedFiles.json");
            const allInstalledFiles = readConfigFile(allInstalledFilesJsonFile);
            this.installedDrivers = Object.assign(Object.assign({}, this.installedDrivers), allInstalledDrivers);
            this.installedFiles = Object.assign(Object.assign({}, this.installedFiles), allInstalledFiles);
            logger.info("ALL installedDrivers : " + JSON.stringify(this.installedDrivers));
            logger.info("ALL installedFiles : " + JSON.stringify(this.installedFiles));
        }
    }
    // Return the set of files that are not already installed, and thus need to
    // be installed, based on the passed in file set and what we already have
    // installed
    getFilesToInstall(fileSet) {
        return fileSet.filter((file) => this.installedFiles[file.name] !== file.version);
    }
    // Notification that the following files were successfully installed
    // Update our list of installed files, and if any of them are in a
    // folder that needs to be registered, then marke that folder invalid
    filesInstalled(fileSet) {
        fileSet.forEach((file) => {
            this.installedFiles[file.name] = file.version;
            if (file.name.split("/")[0] in this.installedDrivers) {
                this.installedDrivers[file.name.split("/")[0]] = false;
            }
        });
        fs.writeFileSync(this.installedFilesJsonFile, JSON.stringify(this.installedFiles, null, "\t"));
        fs.writeFileSync(this.installedDriversJsonFile, JSON.stringify(this.installedDrivers, null, "\t"));
    }
    // Indicate if the given path has been previously registered
    // driverPath is undefined if there are no drivers to install
    // (mac/linux)
    registrationNeeded(driverPaths) {
        driverPaths = driverPaths || [];
        logger.info("registrationNeeded = " + driverPaths.join(","));
        return driverPaths.filter((driverPath) => {
            return !this.installedDrivers[driverPath];
        });
    }
    // Notification that the given path has been successfully registered
    driverRegistered(driverPaths) {
        driverPaths.forEach((driverPath) => {
            this.installedDrivers[driverPath] = true;
        });
        fs.writeFileSync(this.installedDriversJsonFile, JSON.stringify(this.installedDrivers, null, "\t"));
    }
    // Delete all information in the database so we start clean
    purge() {
        util.deleteFolderRecursive(this.dbRoot);
        util.deleteFolderRecursive(this.loadersDir);
        // recreate the folders
        fs.mkdirSync(this.dbRoot);
        this.installedFiles = {};
    }
}
exports.DB = DB;
