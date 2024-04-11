"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverridesManager = void 0;
const path = require("path");
const fs = require("fs-extra");
/*
  Manage 'overrides' files for each package. The presence of these files indicate we do not want to process these packages in tirex. The purpose of these files is to maintain the state of showEntry outside of the package manager file. This gives us a way to restore the value of showEntry if we need to recreate the package manager file.
  In the future this file may store additional info in these overrides files, to override fields in already submitted packages.
*/
class OverridesManager {
    overridesDir;
    constructor(overridesDir) {
        this.overridesDir = overridesDir;
    }
    async updateOverridesFile(packageFolder, showEntry) {
        const overridesFile = OverridesManager.getOveridesFilePath(packageFolder, this.overridesDir);
        if (showEntry) {
            await fs.remove(overridesFile);
        }
        else {
            await fs.ensureFile(overridesFile);
        }
    }
    async getShowEntryValues(packageFolders) {
        return Promise.all(packageFolders.map(async (packageFolder) => {
            const overridesFile = OverridesManager.getOveridesFilePath(packageFolder, this.overridesDir);
            const exists = await fs.pathExists(overridesFile);
            return !exists;
        }));
    }
    static getOveridesFilePath(packageFolder, overridesDir) {
        return path.join(overridesDir, packageFolder, 'package-override.tirex.json');
    }
    getOverridesDir() {
        return this.overridesDir;
    }
}
exports.OverridesManager = OverridesManager;
